import { Request, Response } from 'express';
import { Knex } from 'knex';
import SystemControllers from '../../../src/server/controllers/system.controller';

describe('System controllers works correctly', () => {
  it('Return error works', () => {
    const knex = {} as any as Knex;
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any as Response;
    const controller = new SystemControllers(knex);
    const error = 'Some error';

    controller.returnError(error, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      code: 500000,
      message: 'Some error',
    });
  });

  it('Creates a system', async () => {
    const knex = {
      table: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnValue([1]),
      andWhere: jest.fn().mockResolvedValue([{ id: 1 }]),
    } as any as Knex;
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any as Response;
    const req = {
      body: {
        identifier: 'systemIdentifier',
        name: 'System name',
        type: 'SASS',
        clientId: 1,
        description: 'System description',
      },
    } as any as Request;
    const controller = new SystemControllers(knex);
    await controller.createSystem(req, res);

    expect(knex.table).toHaveBeenCalledWith('OAUTH2_Clients');
    expect(knex.table).toHaveBeenCalledWith('system');
    expect(knex.select).toHaveBeenCalled();
    expect(knex.where).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('Creates a system no client found', async () => {
    const knex = {
      table: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnValue([1]),
      andWhere: jest.fn().mockResolvedValue([]),
    } as any as Knex;
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any as Response;
    const req = {
      body: {
        identifier: 'systemIdentifier',
        name: 'System name',
        type: 'SASS',
        clientId: 1,
        description: 'System description',
      },
    } as any as Request;
    const controller = new SystemControllers(knex);
    await controller.createSystem(req, res);

    expect(knex.table).toHaveBeenCalledWith('OAUTH2_Clients');
    expect(knex.select).toHaveBeenCalled();
    expect(knex.where).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('Creates a system no client found error', async () => {
    const knex = {
      table: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnValue([1]),
      andWhere: jest.fn().mockRejectedValue(new Error('Async error')),
    } as any as Knex;
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any as Response;
    const req = {
      body: {
        identifier: 'systemIdentifier',
        name: 'System name',
        type: 'SASS',
        clientId: 1,
        description: 'System description',
      },
    } as any as Request;
    const controller = new SystemControllers(knex);
    await controller.createSystem(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
