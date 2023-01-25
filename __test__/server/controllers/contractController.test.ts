import ContractController from '../../../src/server/controllers/contract.controller';
import controllerHelpers from '../../../src/server/controllers/helpers/controller-helpers';
import { Request, Response } from 'express';
import { Knex } from 'knex';

jest.mock('nanoid', () => {
  return { nanoid: () => '1234' };
});

const mockRes = () => {
  const res: Response = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res;
};

const mockNext = jest.fn();

describe('Controller helpers', () => {
  it('Test get pagination data', () => {
    const pagination = controllerHelpers.getPaginationData({
      query: {
        order: 'asc',
      },
    } as any);
    expect(pagination.order).toBe('asc');
  });
});

describe('Contract controller works', () => {
  it('Create a contract works', async () => {
    const req = {
      body: {
        eventId: 1,
        actionId: 2,
        name: 'contract name',
        identifier: 'contract_identifier',
      },
    } as any as Request;

    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnValue([]),
      insert: jest.fn().mockResolvedValue([1]),
    } as any as Knex;

    const contractController = new ContractController(knex);

    contractController.returnError = jest.fn();
    await contractController.createContract(req, res, mockNext);

    expect(knex.table).toHaveBeenCalledWith('contract');
    expect(knex.insert).toHaveBeenCalledWith({
      name: 'contract name',
      identifier: 'contract_identifier-1234',
      event_id: 1,
      action_id: 2,
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      code: 200001,
      message: 'success',
      content: { actionId: 1 },
    });
  });

  it('Create a contract identifier already exist', async () => {
    const req = {
      body: {
        eventId: 1,
        actionId: 2,
        name: 'contract name',
        identifier: 'contract_identifier',
      },
    } as any as Request;

    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnValue([1]),
      insert: jest.fn().mockResolvedValue([1]),
    } as any as Knex;

    const contractController = new ContractController(knex);

    contractController.returnError = jest.fn();
    await contractController.createContract(req, res, mockNext);

    expect(knex.table).toHaveBeenCalledWith('contract');
    expect(knex.where).toHaveBeenCalledWith(
      'identifier',
      'contract_identifier',
    );

    expect(contractController.returnError).toHaveBeenCalledWith(
      'Contract identifier already exist',
      'Contract identifier already exist',
      400101,
      400,
      'createContract',
      mockNext,
    );
  });

  it('Create a contract fails', async () => {
    const req = {
      body: {
        eventId: 1,
        actionId: 2,
        name: 'contract name',
        identifier: 'contract_identifier',
      },
    } as any as Request;

    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      insert: jest.fn().mockRejectedValue(new Error('Async Error')),
    } as any as Knex;

    const contractController = new ContractController(knex);

    contractController.returnError = jest.fn();
    await contractController.createContract(req, res, mockNext);

    expect(contractController.returnError).toHaveBeenCalled();
  });

  it('Get contracts works', async () => {
    const req = {
      query: {
        itemsPerPage: 10,
        pageIndex: 0,
        order: 'desc',
        activeSort: 'id',
      },
    } as any as Request;

    const res = mockRes();

    const knex = {
      select: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockResolvedValue([{ id: 1 }]),
      count: jest.fn().mockResolvedValue([{ 'count(*)': 8 }]),
    } as any as Knex;

    const knexFunction = jest.fn().mockReturnValue(knex);

    const contractController = new ContractController(knexFunction as any);

    await contractController.getContracts(req, res, mockNext);

    expect(knex.offset).toHaveBeenCalledWith(0);
    expect(knex.select).toHaveBeenCalledWith(
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
      'mail_recipients_on_error as mailRecipientsOnError',
    );
    expect(knex.where).toHaveBeenCalledWith('deleted', false);
    expect(knex.count).toHaveBeenCalled();
    expect(knex.limit).toHaveBeenCalledWith(10);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
  });

  it('Get contracts from events', async () => {
    const req = {
      params: {
        eventId: 10,
      },
    } as any as Request;
    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockResolvedValue([{ id: 1 }]),
    } as any as Knex;
    const contractController = new ContractController(knex);

    contractController.returnError = jest.fn();

    await contractController.getContractsFromEvent(req, res, mockNext);

    expect(knex.table).toHaveBeenCalledWith('contract');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
  });

  it('Get contracts from events fails', async () => {
    const req = {
      params: {
        eventId: 10,
      },
    } as any as Request;
    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockRejectedValue(new Error('some error')),
    } as any as Knex;
    const contractController = new ContractController(knex);

    contractController.returnError = jest.fn();

    await contractController.getContractsFromEvent(req, res, mockNext);

    expect(contractController.returnError).toHaveBeenCalled();
  });

  it('Edits contracts orders', async () => {
    const req = {
      body: {
        orders: [{ contractId: 1, order: 1 }],
      },
    } as any as Request;
    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ id: 1 }]),
    } as any as Knex;
    const contractController = new ContractController(knex);

    contractController.returnError = jest.fn();

    await contractController.editContractOrders(req, res, mockNext);
    expect(knex.table).toHaveBeenCalledWith('contract');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalled();
  });

  it('Edits contracts orders fails', async () => {
    const req = {
      body: {
        orders: [{ contractId: 1, order: 1 }],
      },
    } as any as Request;
    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockRejectedValue(new Error('some error')),
    } as any as Knex;
    const contractController = new ContractController(knex);

    contractController.returnError = jest.fn();

    await contractController.editContractOrders(req, res, mockNext);
    expect(contractController.returnError).toHaveBeenCalled();
  });

  it('Get contracts fails', async () => {
    const req = {
      query: {
        itemsPerPage: 10,
        pageIndex: 0,
        order: 'desc',
        activeSort: 'id',
      },
    } as any as Request;

    const res = mockRes();

    const knex = {
      select: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockResolvedValue([{ id: 1 }]),
      count: jest.fn().mockRejectedValue(new Error('Async error')),
    } as any as Knex;

    const knexFunction = jest.fn().mockReturnValue(knex);

    const contractController = new ContractController(knexFunction as any);

    await contractController.getContracts(req, res, mockNext);

    expect(res.status).not.toHaveBeenCalledWith(200);
  });

  it('Update contract works', async () => {
    const req = {
      params: {
        id: 1,
      },
      body: {
        name: 'newName',
        active: false,
      },
    } as any as Request;

    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue(1),
    } as any as Knex;

    const contractController = new ContractController(knex);

    contractController.returnError = jest.fn();

    await contractController.updateContract(req, res, mockNext);

    expect(knex.table).toHaveBeenCalledWith('contract');
    expect(knex.update).toHaveBeenCalledWith({
      name: 'newName',
      active: false,
    });
    expect(knex.where).toHaveBeenCalledWith('id', 1);

    expect(res.status).toBeCalledWith(201);

    expect(res.json).toBeCalledWith({
      code: 200001,
      message: 'success',
    });
  });

  it('Update contract fails', async () => {
    const req = {
      params: {
        id: 1,
      },
      body: {
        name: 'newName',
        active: false,
      },
    } as any as Request;

    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockRejectedValue(new Error('Async Error')),
    } as any as Knex;

    const contractController = new ContractController(knex);

    contractController.returnError = jest.fn();

    await contractController.updateContract(req, res, mockNext);

    expect(contractController.returnError).toHaveBeenCalled();
  });

  it('Delete action works', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;

    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue(1),
    } as any as Knex;

    const contractController = new ContractController(knex);

    contractController.returnError = jest.fn();

    await contractController.deleteContract(req, res, mockNext);

    expect(knex.table).toHaveBeenCalledWith('contract');
    expect(knex.update).toHaveBeenCalledWith('deleted', true);
    expect(knex.where).toHaveBeenCalledWith('id', 1);

    expect(res.status).toBeCalledWith(201);

    expect(res.json).toBeCalledWith({
      code: 200001,
      message: 'success',
    });
  });

  it('Delete action fails', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;

    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockRejectedValue(new Error('Async Error')),
    } as any as Knex;

    const contractController = new ContractController(knex);

    contractController.returnError = jest.fn();

    await contractController.deleteContract(req, res, mockNext);

    expect(contractController.returnError).toHaveBeenCalled();
  });
  it('Error function', () => {
    const knex = {} as any as Knex;
    const contractController = new ContractController(knex);

    const nextErrorMock = jest.fn();

    contractController.returnError(
      'some error',
      'some error',
      500000,
      500,
      'test',
      nextErrorMock,
    );

    expect(nextErrorMock).toBeCalledWith({
      message: 'some error',
      statusCode: 500,
      errorCode: 500000,
      onFunction: 'test',
      onFile: 'contract.controller.ts',
      logMessage: 'some error',
      errorObject: undefined,
      originalError: undefined,
    });

    contractController.returnError(
      'some error',
      'some error',
      500000,
      500,
      'test',
      nextErrorMock,
      { response: true },
    );

    expect(nextErrorMock).toBeCalledWith({
      message: 'some error',
      statusCode: 500,
      errorCode: 500000,
      onFunction: 'test',
      onFile: 'contract.controller.ts',
      logMessage: 'some error',
      errorObject: true,
      originalError: undefined,
    });

    contractController.returnError(
      'some error',
      'some error',
      500000,
      500,
      'test',
      nextErrorMock,
      { sqlState: true },
    );

    expect(nextErrorMock).toBeCalledWith({
      message: 'Data base error. some error',
      statusCode: 500,
      errorCode: 500000,
      onFunction: 'test',
      onFile: 'contract.controller.ts',
      logMessage: 'some error',
      errorObject: undefined,
      originalError: { sqlState: true },
    });
  });
});
