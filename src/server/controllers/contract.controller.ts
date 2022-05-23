import { NextFunction, Request, Response } from 'express';
import { Knex } from 'knex';

import { ContractJoined } from '../dtos/eventhosInterface';
import controllerHelpers from './helpers/controller-helpers';
import ErrorForNext from './helpers/ErrorForNext';

class ContractControllers {
  knexPool: Knex;
  constructor(knexPool: Knex) {
    this.knexPool = knexPool;
  }

  createContract = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId, actionId, name, identifier, order } = req.body;

      const contract = await this.knexPool
        .table('contract')
        .where('identifier', identifier);

      if (contract && contract.length > 0) {
        return this.returnError(
          'Contract identifier already exist',
          'Contract identifier already exist',
          400101,
          400,
          'createContract',
          next,
        );
      }

      const contractCreationResult = await this.knexPool
        .table('contract')
        .insert({
          name,
          identifier,
          event_id: eventId,
          action_id: actionId,
          order,
        });

      return res.status(201).json({
        code: 200001,
        message: 'success',
        content: { actionId: contractCreationResult[0] },
      });
    } catch (error) {
      return this.returnError(
        error.message,
        error.message,
        500101,
        500,
        'createContract',
        next,
        error,
      );
    }
  };

  getContracts = async (req: Request, res: Response, next: NextFunction) => {
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
        contract: this.knexPool('contract')
          .limit(itemsPerPage)
          .offset(offset)
          .orderBy('contract.id', order),
      } as any)
        .select(
          'contract.id',
          'contract.name',
          'contract.active',
          'contract.order',
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
        .where('contract.deleted', false);

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
      return this.returnError(
        error.message,
        error.message,
        500102,
        500,
        'getContracts',
        next,
        error,
      );
    }
  };

  getContractsFromEvent = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { eventId } = req.params;

      const contractQuery = this.knexPool
        .table('contract')
        .where('event_id', eventId)
        .orderBy('order', 'asc');

      const contracts = (await contractQuery) as ContractJoined[];

      return res.status(200).json({
        code: 200000,
        message: 'success',
        content: contracts,
      });
    } catch (error) {
      return this.returnError(
        error.message,
        error.message,
        500103,
        500,
        'getContractsFromEvent',
        next,
        error,
      );
    }
  };

  updateContract = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, active, order } = req.body;
      await this.knexPool
        .table('contract')
        .update({
          name,
          order,
          active,
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
        500104,
        500,
        'updateContract',
        next,
        error,
      );
    }
  };

  deleteContract = async (req: Request, res: Response, next: NextFunction) => {
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
      return this.returnError(
        error.message,
        error.message,
        500105,
        500,
        'deleteContract',
        next,
        error,
      );
    }
  };

  editContractOrders = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const orders = req.body.orders as { contractId: number; order: number }[];
      for (const order of orders) {
        await this.knexPool
          .table('contract')
          .update('order', order.order)
          .where('id', order.contractId);
      }

      return res.status(201).json({
        code: 200001,
        message: 'success',
      });
    } catch (error) {
      return this.returnError(
        error.message,
        error.message,
        500106,
        500,
        'editContractOrders',
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
      'contract.controller.ts',
    ).setLogMessage(logMessage);

    if (error && error.response === undefined)
      errorForNext.setOriginalError(error);

    if (error && error.response) errorForNext.setErrorObject(error.response);

    if (error && error.sqlState)
      errorForNext.setMessage(`Data base error. ${message}`);

    return next(errorForNext.toJSON());
  };
}

export default ContractControllers;
