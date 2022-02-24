import ContractController from '../../../src/server/controllers/contract.controller';
import { Request, Response } from 'express';
import { Knex } from 'knex';

const mockRes = () => {
  const res: Response = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res;
};

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
      insert: jest.fn().mockResolvedValue([1]),
    } as any as Knex;

    const contractController = new ContractController(knex);
    await contractController.createContract(req, res);

    expect(knex.table).toHaveBeenCalledWith('contract');
    expect(knex.insert).toHaveBeenCalledWith({
      name: 'contract name',
      identifier: 'contract_identifier',
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
    await contractController.createContract(req, res);

    expect(res.status).not.toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalled();
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

    const totalPages = Math.ceil(parseInt('8' as string) / 10);

    const contractController = new ContractController(knexFunction as any);

    await contractController.getContracts(req, res);

    expect(knex.offset).toHaveBeenCalledWith(0);
    expect(knex.select).toHaveBeenCalledWith(
      'contract.id',
      'contract.name',
      'contract.active',
      'event.id as eventId',
      'action.id as actionId',
      'producerSystem.name as producerName',
      'consumerSystem.name as consumerName',
      'event.identifier as eventIdentifier',
      'action.identifier as actionIdentifier',
    );
    expect(knex.where).toHaveBeenCalledWith('deleted', false);
    expect(knex.count).toHaveBeenCalled();
    expect(knex.limit).toHaveBeenCalledWith(10);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      code: 200000,
      message: 'success',
      content: {
        items: [{ id: 1 }],
        pageIndex: 0,
        itemsPerPage: 10,
        totalItems: 8,
        totalPages,
      },
    });
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

    await contractController.getContracts(req, res);

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

    await contractController.updateContract(req, res);

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

    await contractController.updateContract(req, res);

    expect(knex.table).toHaveBeenCalledWith('contract');
    expect(knex.update).toHaveBeenCalledWith({
      name: 'newName',
      active: false,
    });

    expect(res.status).not.toBeCalledWith(201);

    expect(res.json).toBeCalled();
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

    await contractController.deleteContract(req, res);

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

    await contractController.deleteContract(req, res);

    expect(res.status).not.toBeCalledWith(201);
  });

  it('Error function', () => {
    const knex = {} as any as Knex;
    const res = mockRes();
    const error = {
      sqlState: 1,
    };

    const contractController = new ContractController(knex);
    contractController.returnError(error, res);

    expect(res.status).toBeCalledWith(501);
  });
});
