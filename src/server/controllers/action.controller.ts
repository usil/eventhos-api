import { NextFunction, Request, Response } from 'express';
import { Knex } from 'knex';

import { getConfig } from '../../../config/main.config';
import crypto from 'crypto';
import controllerHelpers from './helpers/controller-helpers';
import { Action, ActionWithSystem } from '../dtos/eventhosInterface';
import { AxiosRequestConfig } from 'axios';
import ErrorForNext from './helpers/ErrorForNext';
import { nanoid } from 'nanoid';

class ActionControllers {
  knexPool: Knex;
  configuration = getConfig();

  constructor(knexPool: Knex) {
    this.knexPool = knexPool;
  }

  createAction = async (req: Request, res: Response, next: NextFunction) => {
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

      const action = await this.knexPool
        .table('action')
        .where('identifier', identifier);

      if (action && action.length > 0) {
        return this.returnError(
          'Action identifier already exist',
          'Action identifier already exist',
          400001,
          400,
          'createAction',
          next,
        );
      }

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
      const key = crypto.scryptSync(
        this.configuration.encryption.key,
        'salt',
        32,
      );
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
        identifier: `${identifier}-${nanoid(10)}`,
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
        this.configuration.encryption.key,
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
      return this.returnError(
        error.message,
        error.message,
        500001,
        500,
        'createAction',
        next,
        error,
      );
    }
  };

  returnError = (
    message: string,
    logMessage: string,
    errorCode: number,
    statusCode: number,
    onFunction: string,
    next: NextFunction,
    error?: any,
  ) => {
    const errorForNext = new ErrorForNext(
      message,
      statusCode,
      errorCode,
      onFunction,
      'action.controllers.ts',
    ).setLogMessage(logMessage);

    if (error && error.response === undefined)
      errorForNext.setOriginalError(error);

    if (error && error.response) errorForNext.setErrorObject(error.response);

    if (error && error.sqlState)
      errorForNext.setMessage(`Data base error. ${message}`);

    return next(errorForNext.toJSON());
  };

  getAction = async (req: Request, res: Response, next: NextFunction) => {
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
        return this.returnError(
          'Action does not exist',
          'Action does not exist',
          400002,
          404,
          'getAction',
          next,
        );
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
      return this.returnError(
        error.message,
        error.message,
        500002,
        500,
        'getAction',
        next,
        error,
      );
    }
  };

  getActions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { actionName } = req.query;
      const { itemsPerPage, offset, pageIndex, order, activeSort } =
        controllerHelpers.getPaginationData(req);

      const totalActionsCountQuery = this.knexPool.table('action').where('deleted', false).count();

      if (actionName) {
        totalActionsCountQuery.andWhere('name', 'like', '%' + actionName + '%');
      }
      
      const totalActionsCount = (await totalActionsCountQuery)[0]['count(*)'];
      const totalPages = Math.ceil(
        parseInt(totalActionsCount as string) / itemsPerPage,
      );

      const actionsQuery = this.knexPool
        .table('action')
        .select("action.*", "system.name as system_name")
        .join("system", "action.system_id", "system.id")
        .offset(offset)
        .limit(itemsPerPage)
        .where('action.deleted', false)
        .orderBy(activeSort, order);

      if (actionName) {
        actionsQuery.andWhere('action.name', 'like', '%' + actionName + '%');
      }

      const systems = (await actionsQuery) as ActionWithSystem[];

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
      return this.returnError(
        error.message,
        error.message,
        500003,
        500,
        'getActions',
        next,
        error,
      );
    }
  };

  decryptString(stringToDecrypt: string) {
    const algorithm = 'aes-256-ctr';
    const keySplit = stringToDecrypt.split('|.|');
    const encryptedPart = keySplit[1];
    const initVector = Buffer.from(keySplit[0], 'hex');
    const key = crypto.scryptSync(
      this.configuration.encryption.key,
      'salt',
      32,
    );
    const decipher = crypto.createDecipheriv(algorithm, key, initVector);
    let decryptedData = decipher.update(encryptedPart, 'hex', 'utf-8');
    decryptedData += decipher.final('utf8');
    return decryptedData;
  }

  updateAction = async (req: Request, res: Response, next: NextFunction) => {
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
      return this.returnError(
        error.message,
        error.message,
        500004,
        500,
        'updateAction',
        next,
        error,
      );
    }
  };

  encryptString(stringToEncrypt: string) {
    const algorithm = 'aes-256-ctr';
    const initVector = crypto.randomBytes(16);
    const key = crypto.scryptSync(
      this.configuration.encryption.key,
      'salt',
      32,
    );
    const cipher = crypto.createCipheriv(algorithm, key, initVector);
    let encryptedData = cipher.update(stringToEncrypt, 'utf-8', 'hex');
    const hexedInitVector = initVector.toString('hex');
    encryptedData += cipher.final('hex');
    return { hexedInitVector, encryptedData };
  }

  deleteAction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const actionInContracts = await this.knexPool
        .table('contract')
        .select('id')
        .where('action_id', id)
        .andWhere('deleted', false);

      if (actionInContracts.length > 0) {
        return this.returnError(
          'Action has active contracts',
          'Action has active contracts',
          400003,
          404,
          'getAction',
          next,
        );
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
      return this.returnError(
        error.message,
        error.message,
        500005,
        500,
        'deleteAction',
        next,
        error,
      );
    }
  };
}

export default ActionControllers;
