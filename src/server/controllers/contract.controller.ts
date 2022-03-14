import { Request, Response } from 'express';
import { Knex } from 'knex';

import colors from 'colors';
import { ContractJoined } from '../dtos/eventhosInterface';
import controllerHelpers from './helpers/controller-helpers';

class ContractControllers {
  knexPool: Knex;
  constructor(knexPool: Knex) {
    this.knexPool = knexPool;
  }

  createContract = async (req: Request, res: Response) => {
    try {
      const { eventId, actionId, name, identifier } = req.body;

      const contractCreationResult = await this.knexPool
        .table('contract')
        .insert({
          name,
          identifier,
          event_id: eventId,
          action_id: actionId,
        });

      return res.status(201).json({
        code: 200001,
        message: 'success',
        content: { actionId: contractCreationResult[0] },
      });
    } catch (error) {
      this.returnError(error.message, res);
    }
  };

  getContracts = async (req: Request, res: Response) => {
    try {
      const { itemsPerPage, offset, pageIndex, order } =
        controllerHelpers.getPaginationData(req);

      const totalContractCount = (
        await this.knexPool('contract').where('deleted', false).count()
      )[0]['count(*)'];

      const totalPages = Math.ceil(
        parseInt(totalContractCount as string) / itemsPerPage,
      );

      const contractQuery = this.knexPool({
        contract: this.knexPool('contract').limit(itemsPerPage).offset(offset),
      } as any)
        .select(
          'contract.id',
          'contract.name',
          'contract.active',
          'event.id as eventId',
          'action.id as actionId',
          'producerSystem.name as producerName',
          'consumerSystem.name as consumerName',
          'event.identifier as eventIdentifier',
          'action.identifier as actionIdentifier',
        )
        .join('action', `contract.action_id`, 'action.id')
        .join('event', `contract.event_id`, 'event.id')
        .join(
          'system as producerSystem',
          `producerSystem.id`,
          'event.system_id',
        )
        .join(
          'system as consumerSystem',
          `consumerSystem.id`,
          'action.system_id',
        )
        .where('contract.deleted', false)
        .orderBy('contract.id', order);

      const contracts = (await contractQuery) as ContractJoined[];

      return res.status(200).json({
        code: 200000,
        message: 'success',
        content: {
          items: contracts,
          pageIndex,
          itemsPerPage,
          totalItems: totalContractCount,
          totalPages,
        },
      });
    } catch (error) {
      this.returnError(error.message, res);
    }
  };

  updateContract = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, active } = req.body;
      await this.knexPool
        .table('contract')
        .update({
          name,
          active,
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

  deleteContract = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await this.knexPool
        .table('contract')
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
}

export default ContractControllers;
