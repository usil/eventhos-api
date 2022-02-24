import { Request, Response } from 'express';
import { Knex } from 'knex';
import SystemControllers from '../../../src/server/controllers/system.controller';

const mockRes = () => {
  const res: Response = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res;
};

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

  it('Creates a system no client', async () => {
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
        clientId: null,
        description: 'System description',
        systemClass: 'producer',
      },
    } as any as Request;
    const controller = new SystemControllers(knex);
    await controller.createSystem(req, res);

    expect(knex.table).toHaveBeenCalledWith('system');
    expect(knex.insert).toHaveBeenCalledWith({
      identifier: 'systemIdentifier',
      name: 'System name',
      type: 'SASS',
      class: 'producer',
      description: 'System description',
    });

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

  it('Get system events works', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;

    const knex = {
      table: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockResolvedValue([{ id: 1 }]),
    } as any as Knex;

    const res = mockRes();

    const systemController = new SystemControllers(knex);
    await systemController.getSystemEvents(req, res);

    expect(knex.table).toHaveBeenCalledWith('event');
    expect(knex.select).toBeCalled();
    expect(knex.where).toHaveBeenCalledWith('system_id', 1);
    expect(knex.andWhere).toHaveBeenCalledWith('deleted', false);

    expect(res.json).toHaveBeenCalledWith({
      code: 200000,
      message: 'success',
      content: [{ id: 1 }],
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('Get system events fails', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;

    const knex = {
      table: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockRejectedValue(new Error('Async error')),
    } as any as Knex;

    const res = mockRes();

    const systemController = new SystemControllers(knex);
    await systemController.getSystemEvents(req, res);

    expect(res.json).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(200);
  });

  it('Get system actions works', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;

    const knex = {
      table: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockResolvedValue([{ id: 1 }]),
    } as any as Knex;

    const res = mockRes();

    const systemController = new SystemControllers(knex);
    await systemController.getSystemActions(req, res);

    expect(knex.table).toHaveBeenCalledWith('action');
    expect(knex.select).toBeCalled();
    expect(knex.where).toHaveBeenCalledWith('system_id', 1);
    expect(knex.andWhere).toHaveBeenCalledWith('deleted', false);
    expect(knex.select).toHaveBeenCalledWith(
      'id',
      'system_id',
      'identifier',
      'name',
      'operation',
      'description',
      'deleted',
      'created_at',
      'updated_at',
    );

    expect(res.json).toHaveBeenCalledWith({
      code: 200000,
      message: 'success',
      content: [{ id: 1 }],
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('Get system actions fails', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;

    const knex = {
      table: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockRejectedValue(new Error('Async error')),
    } as any as Knex;

    const res = mockRes();

    const systemController = new SystemControllers(knex);
    await systemController.getSystemActions(req, res);

    expect(res.json).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(200);
  });

  it('Get systems works without system class', async () => {
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
      table: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockResolvedValue([{ id: 1 }]),
      count: jest.fn().mockResolvedValue([{ 'count(*)': 8 }]),
    } as any as Knex;

    const totalPages = Math.ceil(parseInt('8' as string) / 10);

    const systemController = new SystemControllers(knex);

    await systemController.getSystems(req, res);

    expect(knex.table).toHaveBeenCalledWith('system');
    expect(knex.offset).toHaveBeenCalledWith(0);
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

  it('Get systems works', async () => {
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
      table: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockResolvedValue([{ id: 1 }]),
      count: jest.fn().mockResolvedValue([{ 'count(*)': 8 }]),
      orWhere: jest.fn().mockResolvedValue([{ id: 1 }]),
    } as any as Knex;

    const totalPages = Math.ceil(parseInt('8' as string) / 10);

    const systemController = new SystemControllers(knex);

    await systemController.getSystems(req, res);

    expect(knex.table).toHaveBeenCalledWith('system');
    expect(knex.offset).toHaveBeenCalledWith(0);
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

  it('Get systems works, with class', async () => {
    const req = {
      query: {
        itemsPerPage: 10,
        pageIndex: 0,
        order: 'desc',
        activeSort: 'id',
        systemClass: 'producer',
      },
    } as any as Request;

    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue([{ 'count(*)': 8 }]),
      orWhere: jest.fn().mockResolvedValue([{ id: 1 }]),
    } as any as Knex;

    const totalPages = Math.ceil(parseInt('8' as string) / 10);

    const systemController = new SystemControllers(knex);

    await systemController.getSystems(req, res);

    expect(knex.table).toHaveBeenCalledWith('system');
    expect(knex.orWhere).toHaveBeenCalledWith('class', 'hybrid');
    expect(knex.offset).toHaveBeenCalledWith(0);
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

  it('Get systems fails', async () => {
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
      table: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockResolvedValue([{ id: 1 }]),
      count: jest.fn().mockRejectedValue(new Error('Async error')),
    } as any as Knex;

    const systemController = new SystemControllers(knex);

    await systemController.getSystems(req, res);

    expect(res.status).not.toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
  });

  it('Gets a system works', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;
    const res = mockRes();
    const knex = {
      table: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ id: 1 }]),
    } as any as Knex;

    const systemController = new SystemControllers(knex);
    await systemController.getSystem(req, res);

    expect(knex.table).toHaveBeenCalledWith('system');
    expect(knex.where).toHaveBeenCalledWith('id', 1);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      code: 200000,
      message: 'success',
      content: { id: 1 },
    });
  });

  it('Gets a system fails', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;
    const res = mockRes();
    const knex = {
      table: jest.fn().mockReturnThis(),
      where: jest.fn().mockRejectedValue(new Error('Async error')),
    } as any as Knex;

    const systemController = new SystemControllers(knex);
    await systemController.getSystem(req, res);

    expect(knex.table).toHaveBeenCalledWith('system');
    expect(knex.where).toHaveBeenCalledWith('id', 1);

    expect(res.status).not.toHaveBeenCalledWith(200);
  });

  it('Update system works', async () => {
    const req = {
      params: {
        id: 1,
      },
      body: {
        name: 'new name',
        type: 'new',
        description: 'new description',
        systemClass: 'hybrid',
      },
    } as any as Request;

    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue(1),
    } as any as Knex;

    const systemController = new SystemControllers(knex);

    await systemController.updateSystem(req, res);

    expect(knex.table).toHaveBeenCalledWith('system');
    expect(knex.update).toHaveBeenCalledWith({
      name: 'new name',
      type: 'new',
      description: 'new description',
      class: 'hybrid',
    });
    expect(knex.where).toHaveBeenCalledWith('id', 1);

    expect(res.status).toBeCalledWith(201);

    expect(res.json).toBeCalledWith({
      code: 200001,
      message: 'success',
    });
  });

  it('Update system fails', async () => {
    const req = {
      params: {
        id: 1,
      },
      body: {
        name: 'new name',
        type: 'new',
        description: 'new description',
        systemClass: 'hybrid',
      },
    } as any as Request;

    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockRejectedValue(new Error('Async Error')),
    } as any as Knex;

    const systemController = new SystemControllers(knex);

    await systemController.updateSystem(req, res);

    expect(knex.table).toHaveBeenCalledWith('system');
    expect(knex.update).toHaveBeenCalledWith({
      name: 'new name',
      type: 'new',
      description: 'new description',
      class: 'hybrid',
    });

    expect(res.status).not.toBeCalledWith(201);

    expect(res.json).toBeCalled();
  });

  it('Delete system works', async () => {
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

    const systemController = new SystemControllers(knex);

    await systemController.deleteSystem(req, res);

    expect(knex.table).toHaveBeenCalledWith('system');
    expect(knex.update).toHaveBeenCalledWith('deleted', true);
    expect(knex.where).toHaveBeenCalledWith('id', 1);

    expect(res.status).toBeCalledWith(201);

    expect(res.json).toBeCalledWith({
      code: 200001,
      message: 'success',
    });
  });

  it('Delete system fails', async () => {
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

    const systemController = new SystemControllers(knex);

    await systemController.deleteSystem(req, res);

    expect(res.status).not.toBeCalledWith(201);
  });
});
