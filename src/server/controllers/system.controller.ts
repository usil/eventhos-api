import { Knex } from 'knex';
import { Request, Response } from 'express';
import colors from 'colors';

class SystemController {
  knexPool: Knex;

  constructor(knexPool: Knex) {
    this.knexPool = knexPool;
  }

  createSystem = async (req: Request, res: Response) => {
    try {
      const { identifier, name, type, clientId, description } = req.body;
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
        client_id: clientId,
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

  returnError = (errorMessage: string, res: Response) => {
    console.log('here is an error:', colors.red(errorMessage));
    return res.status(500).json({ code: 500000, message: errorMessage });
  };
}

export default SystemController;
