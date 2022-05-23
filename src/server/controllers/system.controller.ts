import { Knex } from 'knex';
import { NextFunction, Request, Response } from 'express';
import controllerHelpers from './helpers/controller-helpers';
import ErrorForNext from './helpers/ErrorForNext';
class SystemController {
  knexPool: Knex;

  constructor(knexPool: Knex) {
    this.knexPool = knexPool;
  }

  getSystemEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const events = await this.knexPool
        .table('event')
        .select()
        .where('system_id', id)
        .andWhere('deleted', false);
      return res.status(200).json({
        code: 200000,
        message: 'success',
        content: events,
      });
    } catch (error) {
      return this.returnError(
        error.message,
        error.message,
        500301,
        500,
        'getSystemEvents',
        next,
        error,
      );
    }
  };

  getSystemActions = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id } = req.params;
      const actions = await this.knexPool
        .table('action')
        .select(
          'id',
          'system_id',
          'identifier',
          'name',
          'operation',
          'description',
          'deleted',
          'created_at',
          'updated_at',
        )
        .where('system_id', id)
        .andWhere('deleted', false);
      return res.status(200).json({
        code: 200000,
        message: 'success',
        content: actions,
      });
    } catch (error) {
      return this.returnError(
        error.message,
        error.message,
        500302,
        500,
        'getSystemActions',
        next,
        error,
      );
    }
  };

  createSystem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { systemClass, identifier, name, type, clientId, description } =
        req.body;

      if (clientId) {
        const client = (
          await this.knexPool
            .table('OAUTH2_Clients')
            .select()
            .where('id', clientId)
            .andWhere('deleted', false)
        )[0];

        if (!client) {
          return this.returnError(
            `The client with id ${clientId} does not exist.`,
            `The client with id ${clientId} does not exist.`,
            400301,
            404,
            'manageEvent',
            next,
          );
        }

        const systemInsert = await this.knexPool.table('system').insert({
          identifier,
          name,
          type,
          class: systemClass,
          client_id: clientId,
          description,
        });

        return res.status(201).json({
          code: 20001,
          message: `New system created`,
          content: { systemId: systemInsert[0] },
        });
      }

      const insert = await this.knexPool.table('system').insert({
        identifier,
        name,
        type,
        class: systemClass,
        description,
      });

      return res.status(201).json({
        code: 20001,
        message: `New system created`,
        content: { systemId: insert[0] },
      });
    } catch (error) {
      return this.returnError(
        error.message,
        error.message,
        500303,
        500,
        'createSystem',
        next,
        error,
      );
    }
  };

  getSystems = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { itemsPerPage, offset, pageIndex, order, activeSort } =
        controllerHelpers.getPaginationData(req);

      const { systemClass } = req.query;

      const totalSystemsCount = (
        await this.knexPool.table('system').where('deleted', false).count()
      )[0]['count(*)'];

      const totalPages = Math.ceil(
        parseInt(totalSystemsCount as string) / itemsPerPage,
      );

      let systemsQuery = this.knexPool
        .table('system')
        .offset(offset)
        .limit(itemsPerPage)
        .where('deleted', false)
        .orderBy(activeSort, order);

      if (systemClass) {
        systemsQuery = systemsQuery
          .where({ class: systemClass })
          .orWhere('class', 'hybrid');
      }

      const systems = (await systemsQuery) as System[];

      return res.status(200).json({
        code: 200000,
        message: 'success',
        content: {
          items: systems,
          pageIndex,
          itemsPerPage,
          totalItems: totalSystemsCount,
          totalPages,
        },
      });
    } catch (error) {
      return this.returnError(
        error.message,
        error.message,
        500304,
        500,
        'getSystems',
        next,
        error,
      );
    }
  };

  getSystem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const system = await this.knexPool.table('system').where('id', id);

      return res.status(200).json({
        code: 200000,
        message: 'success',
        content: system[0],
      });
    } catch (error) {
      return this.returnError(
        error.message,
        error.message,
        500305,
        500,
        'getSystem',
        next,
        error,
      );
    }
  };

  deleteSystem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const systemEvents = await this.knexPool
        .table('event')
        .select('id')
        .where('system_id', id)
        .andWhere('deleted', false);

      if (systemEvents.length > 0) {
        return this.returnError(
          'System has conflicting events',
          'System has conflicting events',
          400302,
          400,
          'manageEvent',
          next,
        );
      }

      const systemActions = await this.knexPool
        .table('action')
        .select('id')
        .where('system_id', id)
        .andWhere('deleted', false);

      if (systemActions.length > 0) {
        return this.returnError(
          'System has conflicting actions',
          'System has conflicting actions',
          400303,
          400,
          'manageEvent',
          next,
        );
      }

      await this.knexPool
        .table('system')
        .update('deleted', true)
        .where('id', id);

      return res.status(201).json({
        code: 200001,
        message: 'success',
      });
    } catch (error) {
      return this.returnError(
        error.message,
        error.message,
        500306,
        500,
        'deleteSystem',
        next,
        error,
      );
    }
  };

  updateSystem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, type, description, systemClass, clientId } = req.body;

      await this.knexPool
        .table('system')
        .update({
          name,
          type,
          description,
          class: systemClass,
          client_id: clientId ? clientId : null,
        })
        .where('id', id);

      return res.status(201).json({
        code: 200001,
        message: 'success',
      });
    } catch (error) {
      return this.returnError(
        error.message,
        error.message,
        500307,
        500,
        'updateSystem',
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
      'system.controller.ts',
    ).setLogMessage(logMessage);

    if (error && error.response === undefined)
      errorForNext.setOriginalError(error);

    if (error && error.response) errorForNext.setErrorObject(error.response);

    if (error && error.sqlState)
      errorForNext.setMessage(`Data base error. ${message}`);

    return next(errorForNext.toJSON());
  };
}

interface System {
  id: number;
  client_id: number;
  class: string;
  identifier: string;
  name: string;
  type: string;
  description: string;
  deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export default SystemController;
