import { Knex } from 'knex';
import { Request, Response } from 'express';
import colors from 'colors';
import controllerHelpers from './helpers/controller-helpers';
class SystemController {
  knexPool: Knex;

  constructor(knexPool: Knex) {
    this.knexPool = knexPool;
  }

  getSystemEvents = async (req: Request, res: Response) => {
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
      this.returnError(error.message, res);
    }
  };

  getSystemActions = async (req: Request, res: Response) => {
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
      this.returnError(error.message, res);
    }
  };

  createSystem = async (req: Request, res: Response) => {
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
          return res.status(404).json({
            code: 400024,
            message: `The client with id ${clientId} does not exist.`,
          });
        }

        const insert = await this.knexPool.table('system').insert({
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
          content: { systemId: insert[0] },
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
      this.returnError(error.message, res);
    }
  };

  getSystems = async (req: Request, res: Response) => {
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
      this.returnError(error.message, res);
    }
  };

  getSystem = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const system = await this.knexPool.table('system').where('id', id);

      return res.status(200).json({
        code: 200000,
        message: 'success',
        content: system[0],
      });
    } catch (error) {
      this.returnError(error.message, res);
    }
  };

  deleteSystem = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const systemEvents = await this.knexPool
        .table('event')
        .select('id')
        .where('system_id', id)
        .andWhere('deleted', false);

      if (systemEvents.length > 0) {
        return res.status(400).json({
          code: 400500,
          message: 'System has conflicting events',
        });
      }

      const systemActions = await this.knexPool
        .table('action')
        .select('id')
        .where('system_id', id)
        .andWhere('deleted', false);

      if (systemActions.length > 0) {
        return res.status(400).json({
          code: 400500,
          message: 'System has conflicting actions',
        });
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
      this.returnError(error.message, res);
    }
  };

  updateSystem = async (req: Request, res: Response) => {
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
      this.returnError(error.message, res);
    }
  };

  returnError = (errorMessage: string, res: Response) => {
    console.log('here is an error:', colors.red(errorMessage));
    return res.status(500).json({ code: 500000, message: errorMessage });
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
