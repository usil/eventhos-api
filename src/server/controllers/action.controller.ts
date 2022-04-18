import { Request, Response } from 'express';
import { Knex } from 'knex';

import colors from 'colors';
import { getConfig } from '../../../config/main.config';
import crypto from 'crypto';
import controllerHelpers from './helpers/controller-helpers';
import { Action } from '../dtos/eventhosInterface';
import { AxiosRequestConfig } from 'axios';

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
        rawBody,
        queryUrlParams,
        securityType,
        securityUrl,
        clientId,
        clientSecret,
      } = req.body;

      const parsedHeaders: Record<string, any> = {};
      let parsedBody: Record<string, any> = {};
      const parsedQueryUrlParams: Record<string, any> = {};

      for (const header of headers as {
        key: string;
        value: string | number;
      }[]) {
        parsedHeaders[header.key] = header.value;
      }

      if (!rawBody) {
        for (const b of body as {
          key: string;
          value: string | number;
        }[]) {
          parsedBody[b.key] = b.value;
        }
      } else {
        parsedBody = { ...rawBody };
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
      const key = crypto.scryptSync(getConfig().encryption.key, 'salt', 32);
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

      let parsedSecurity = 'custom';

      const securityHttpConfiguration: Record<string, any> = {
        url: securityUrl,
        method: 'post',
      };

      if (securityType === 1) {
        securityHttpConfiguration['data'] = {
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
        };
        parsedSecurity = 'oauth2_client';
      }

      const stringedSecurityHttpConfiguration = JSON.stringify(
        securityHttpConfiguration,
      );

      const initSecurityVector = crypto.randomBytes(16);
      const securityKey = crypto.scryptSync(
        getConfig().encryption.key,
        'salt',
        32,
      );
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

  getAction = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const action = (
        await this.knexPool
          .table('action')
          .select(
            'action.id as id',
            'action.identifier',
            'action.name',
            'action.http_configuration as httpConfiguration',
            'action.operation',
            'action.description',
            'action.deleted',
            'action.created_at',
            'action.updated_at',
            'action_security.type as securityType',
            'action_security.http_configuration as securityHttpConfiguration',
          )
          .join('action_security', 'action.id', 'action_security.action_id')
          .where('action.deleted', false)
          .andWhere('action.id', id)
      )[0];

      if (!action) {
        return res.status(404).json({
          code: 400004,
          message: 'No action found',
          content: action,
        });
      }

      let jsonAxiosBaseAuthConfig: AxiosRequestConfig = {};

      if (action.securityType === 'oauth2_client') {
        const decryptedAuthData = this.decryptString(
          action.securityHttpConfiguration,
        );

        jsonAxiosBaseAuthConfig = JSON.parse(
          decryptedAuthData,
        ) as AxiosRequestConfig;
      }

      const decryptedData = this.decryptString(action.httpConfiguration);

      const jsonAxiosBaseConfig = JSON.parse(
        decryptedData,
      ) as AxiosRequestConfig;

      const parsedAction = {
        id: action.id,
        identifier: action.identifier,
        name: action.name,
        httpConfiguration: jsonAxiosBaseConfig,
        operation: action.operation,
        description: action.description,
        deleted: action.deleted === 0 ? false : true,
        created_at: action.created_at,
        updated_at: action.updated_at,
        security: {
          type: action.securityType,
          httpConfiguration: jsonAxiosBaseAuthConfig,
        },
      };

      return res.status(200).json({
        code: 200000,
        message: 'success',
        content: parsedAction,
      });
    } catch (error) {
      this.returnError(error.message, res);
    }
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

  decryptString(stringToDecrypt: string) {
    const algorithm = 'aes-256-ctr';
    const keySplit = stringToDecrypt.split('|.|');
    const encryptedPart = keySplit[1];
    const initVector = Buffer.from(keySplit[0], 'hex');
    const key = crypto.scryptSync(getConfig().encryption.key, 'salt', 32);
    const decipher = crypto.createDecipheriv(algorithm, key, initVector);
    let decryptedData = decipher.update(encryptedPart, 'hex', 'utf-8');
    decryptedData += decipher.final('utf8');
    return decryptedData;
  }

  updateAction = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const {
        name,
        operation,
        description,
        method,
        securityType,
        url,
        securityUrl,
        headers,
        rawBody,
        queryUrlParams,
        clientSecret,
        clientId,
      } = req.body;

      const parsedHeaders: Record<string, any> = {};
      const parsedQueryUrlParams: Record<string, any> = {};

      for (const header of headers as {
        key: string;
        value: string | number;
      }[]) {
        parsedHeaders[header.key] = header.value;
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
        data: rawBody,
        params: parsedQueryUrlParams,
      };
      const stringedHttpConfiguration = JSON.stringify(httpConfiguration);

      const httpConfigurationEncrypted = this.encryptString(
        stringedHttpConfiguration,
      );

      await this.knexPool
        .table('action')
        .update({
          name,
          operation,
          description,
          http_configuration:
            httpConfigurationEncrypted.hexedInitVector +
            '|.|' +
            httpConfigurationEncrypted.encryptedData,
        })
        .where('id', id);

      let parsedSecurity = 'custom';

      const securityHttpConfiguration: Record<string, any> = {
        url: securityUrl,
        method: 'post',
      };

      if (securityType === 1) {
        securityHttpConfiguration['data'] = {
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
        };
        parsedSecurity = 'oauth2_client';
      }

      const stringedSecurityHttpConfiguration = JSON.stringify(
        securityHttpConfiguration,
      );

      const encryptedResponse = this.encryptString(
        stringedSecurityHttpConfiguration,
      );

      await this.knexPool
        .table('action_security')
        .update({
          type: parsedSecurity,
          http_configuration:
            encryptedResponse.hexedInitVector +
            '|.|' +
            encryptedResponse.encryptedData,
        })
        .where('action_id', id);

      return res.status(201).json({
        code: 200001,
        message: 'success',
      });
    } catch (error) {
      this.returnError(error, res);
    }
  };

  encryptString(stringToEncrypt: string) {
    const algorithm = 'aes-256-ctr';
    const initVector = crypto.randomBytes(16);
    const key = crypto.scryptSync(getConfig().encryption.key, 'salt', 32);
    const cipher = crypto.createCipheriv(algorithm, key, initVector);
    let encryptedData = cipher.update(stringToEncrypt, 'utf-8', 'hex');
    const hexedInitVector = initVector.toString('hex');
    encryptedData += cipher.final('hex');
    return { hexedInitVector, encryptedData };
  }

  deleteAction = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const actionInContracts = await this.knexPool
        .table('contract')
        .select('id')
        .where('action_id', id)
        .andWhere('deleted', false);

      if (actionInContracts.length > 0) {
        return res.status(400).json({
          code: 400500,
          message: 'Action has active contracts',
        });
      }

      await this.knexPool
        .table('action')
        .update('deleted', true)
        .andWhere('id', id);

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
