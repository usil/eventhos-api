import { Request, Response } from 'express';
import { Knex } from 'knex';

import colors from 'colors';
import { getConfig } from '../../../config/main.config';
import crypto from 'crypto';
import controllerHelpers from './helpers/controller-helpers';
import { Action } from '../dtos/eventhosInterface';

class ActionControllers {
  knexPool: Knex;
  constructor(knexPool: Knex) {
    this.knexPool = knexPool;
  }

  createAction = async (req: Request, res: Response) => {
    try {
      const {
        system_id,
        identifier,
        name,
        operation,
        description,
        url,
        method,
        headers,
        body,
        queryUrlParams,
        securityType,
        securityUrl,
        clientId,
        clientSecret,
      } = req.body;

      const parsedHeaders: Record<string, any> = {};
      const parsedBody: Record<string, any> = {};
      const parsedQueryUrlParams: Record<string, any> = {};

      for (const header of headers as {
        key: string;
        value: string | number;
      }[]) {
        parsedHeaders[header.key] = header.value;
      }

      for (const b of body as {
        key: string;
        value: string | number;
      }[]) {
        parsedBody[b.key] = b.value;
      }

      for (const queryUrlParam of queryUrlParams as {
        key: string;
        value: string | number;
      }[]) {
        parsedQueryUrlParams[queryUrlParam.key] = queryUrlParam.value;
      }

      const httpConfiguration = {
        url,
        method,
        headers: parsedHeaders,
        data: parsedBody,
        params: parsedQueryUrlParams,
      };

      const stringedHttpConfiguration = JSON.stringify(httpConfiguration);

      const algorithm = 'aes-256-ctr';
      const initVector = crypto.randomBytes(16);
      const key = crypto.scryptSync(getConfig().cryptoKey, 'salt', 32);
      const cipher = crypto.createCipheriv(algorithm, key, initVector);

      let encryptedData = cipher.update(
        stringedHttpConfiguration,
        'utf-8',
        'hex',
      );

      const hexedInitVector = initVector.toString('hex');

      encryptedData += cipher.final('hex');

      const actionCreationResult = await this.knexPool.table('action').insert({
        system_id,
        identifier,
        name,
        http_configuration: hexedInitVector + '|.|' + encryptedData,
        operation,
        description,
      });

      let parsedSecurity = 'public';

      const securityHttpConfiguration: Record<string, any> = {
        url: securityUrl,
        method: 'post',
      };

      switch (securityType) {
        case 2:
          securityHttpConfiguration['params'] = {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials',
          };
          parsedSecurity = 'oauth2_client';
          break;
        case 4:
          parsedSecurity = 'api_key';
          break;
        default:
          parsedSecurity = 'public';
          break;
      }

      const stringedSecurityHttpConfiguration = JSON.stringify(
        securityHttpConfiguration,
      );

      const initSecurityVector = crypto.randomBytes(16);
      const securityKey = crypto.scryptSync(getConfig().cryptoKey, 'salt', 32);
      const securityCipher = crypto.createCipheriv(
        algorithm,
        securityKey,
        initSecurityVector,
      );

      let encryptedSecurityData = securityCipher.update(
        stringedSecurityHttpConfiguration,
        'utf-8',
        'hex',
      );

      const hexedSecurityInitVector = initSecurityVector.toString('hex');

      encryptedSecurityData += securityCipher.final('hex');

      await this.knexPool.table('action_security').insert({
        action_id: actionCreationResult[0],
        type: parsedSecurity,
        http_configuration:
          hexedSecurityInitVector + '|.|' + encryptedSecurityData,
      });

      return res.status(201).json({
        code: 200001,
        message: 'success',
        content: { actionId: actionCreationResult[0] },
      });
    } catch (error) {
      this.returnError(error.message, res);
    }
  };

  returnError = (error: any, res: Response) => {
    console.log('here is an error:', colors.red(error));
    if (error.sqlState) {
      return res.status(501).json({
        code: 500001,
        message: `Data base error, with code ${error.sqlState}`,
      });
    }
    return res
      .status(500)
      .json({ code: 500000, message: 'Server Internal Error' });
  };

  getActions = async (req: Request, res: Response) => {
    try {
      const { itemsPerPage, offset, pageIndex, order, activeSort } =
        controllerHelpers.getPaginationData(req);

      const totalActionsCount = (
        await this.knexPool.table('action').where('deleted', false).count()
      )[0]['count(*)'];

      const totalPages = Math.ceil(
        parseInt(totalActionsCount as string) / itemsPerPage,
      );

      const actionsQuery = this.knexPool
        .table('action')
        .offset(offset)
        .limit(itemsPerPage)
        .where('deleted', false)
        .orderBy(activeSort, order);

      const systems = (await actionsQuery) as Action[];

      return res.status(200).json({
        code: 200000,
        message: 'success',
        content: {
          items: systems,
          pageIndex,
          itemsPerPage,
          totalItems: totalActionsCount,
          totalPages,
        },
      });
    } catch (error) {
      this.returnError(error.message, res);
    }
  };

  updateAction = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, operation, description } = req.body;
      await this.knexPool
        .table('action')
        .update({
          name,
          operation,
          description,
        })
        .where('id', id);
      return res.status(201).json({
        code: 200001,
        message: 'success',
      });
    } catch (error) {
      this.returnError(error, res);
    }
  };

  deleteAction = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await this.knexPool
        .table('action')
        .update('deleted', true)
        .where('id', id);

      return res.status(201).json({
        code: 200001,
        message: 'success',
      });
    } catch (error) {
      this.returnError(error.message, res);
    }
  };
}

export default ActionControllers;
