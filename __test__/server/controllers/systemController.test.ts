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

const mockNext = jest.fn();

describe('System controllers works correctly', () => {
  it('Error function', () => {
    const knex = {} as any as Knex;
    const systemController = new SystemControllers(knex);

    const nextErrorMock = jest.fn();

    systemController.returnError(
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
      onFile: 'system.controller.ts',
      logMessage: 'some error',
      errorObject: undefined,
      originalError: undefined,
    });

    systemController.returnError(
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
      onFile: 'system.controller.ts',
      logMessage: 'some error',
      errorObject: true,
      originalError: undefined,
    });

    systemController.returnError(
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
      onFile: 'system.controller.ts',
      logMessage: 'some error',
      errorObject: undefined,
      originalError: { sqlState: true },
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
    await controller.createSystem(req, res, mockNext);

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
    await controller.createSystem(req, res, mockNext);

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
    controller.returnError = jest.fn();
    await controller.createSystem(req, res, mockNext);

    expect(controller.returnError).toHaveBeenCalledWith(
      'The client with id 1 does not exist.',
      'The client with id 1 does not exist.',
      400301,
      404,
      'manageEvent',
      mockNext,
    );
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
    controller.returnError = jest.fn();
    await controller.createSystem(req, res, mockNext);

    expect(controller.returnError).toHaveBeenCalled();
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

    systemController.returnError = jest.fn();
    await systemController.getSystemEvents(req, res, mockNext);

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

    systemController.returnError = jest.fn();
    await systemController.getSystemEvents(req, res, mockNext);

    expect(systemController.returnError).toHaveBeenCalled();
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

    systemController.returnError = jest.fn();
    await systemController.getSystemActions(req, res, mockNext);

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

    systemController.returnError = jest.fn();
    await systemController.getSystemActions(req, res, mockNext);

    expect(systemController.returnError).toHaveBeenCalled();
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

    systemController.returnError = jest.fn();

    await systemController.getSystems(req, res, mockNext);

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

    systemController.returnError = jest.fn();

    await systemController.getSystems(req, res, mockNext);

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

    systemController.returnError = jest.fn();

    await systemController.getSystems(req, res, mockNext);

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

    systemController.returnError = jest.fn();

    await systemController.getSystems(req, res, mockNext);

    expect(systemController.returnError).toHaveBeenCalled();
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

    systemController.returnError = jest.fn();
    await systemController.getSystem(req, res, mockNext);

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

    systemController.returnError = jest.fn();
    await systemController.getSystem(req, res, mockNext);

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

    systemController.returnError = jest.fn();

    await systemController.updateSystem(req, res, mockNext);

    expect(knex.table).toHaveBeenCalledWith('system');
    expect(knex.update).toHaveBeenCalledWith({
      name: 'new name',
      type: 'new',
      client_id: null,
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

  it('Update system works not client null', async () => {
    const req = {
      params: {
        id: 1,
      },
      body: {
        name: 'new name',
        type: 'new',
        description: 'new description',
        systemClass: 'hybrid',
        clientId: 1,
      },
    } as any as Request;

    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue(1),
    } as any as Knex;

    const systemController = new SystemControllers(knex);

    systemController.returnError = jest.fn();

    await systemController.updateSystem(req, res, mockNext);

    expect(knex.table).toHaveBeenCalledWith('system');
    expect(knex.update).toHaveBeenCalledWith({
      name: 'new name',
      type: 'new',
      client_id: 1,
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

    systemController.returnError = jest.fn();

    await systemController.updateSystem(req, res, mockNext);

    expect(systemController.returnError).toHaveBeenCalled();
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
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockResolvedValue(1),
    } as any as Knex;

    const systemController = new SystemControllers(knex);

    systemController.returnError = jest.fn();

    await systemController.deleteSystem(req, res, mockNext);

    expect(knex.table).toHaveBeenCalledWith('event');
    expect(knex.update).toHaveBeenCalledWith('deleted', true);
    expect(knex.where).toHaveBeenCalledWith('id', 1);

    expect(res.status).toBeCalledWith(201);

    expect(res.json).toBeCalledWith({
      code: 200001,
      message: 'success',
    });
  });

  it('Delete system works, with conflicting events', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;

    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockResolvedValue([1]),
    } as any as Knex;

    const systemController = new SystemControllers(knex);

    systemController.returnError = jest.fn();

    await systemController.deleteSystem(req, res, mockNext);

    expect(systemController.returnError).toBeCalledWith(
      'System has conflicting events',
      'System has conflicting events',
      400302,
      400,
      'manageEvent',
      mockNext,
    );
  });

  it('Delete system works, with conflicting actions', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;

    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([1]),
    } as any as Knex;

    const systemController = new SystemControllers(knex);

    systemController.returnError = jest.fn();

    await systemController.deleteSystem(req, res, mockNext);

    expect(systemController.returnError).toBeCalledWith(
      'System has conflicting actions',
      'System has conflicting actions',
      400303,
      400,
      'manageEvent',
      mockNext,
    );
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

    systemController.returnError = jest.fn();

    await systemController.deleteSystem(req, res, mockNext);

    expect(res.status).not.toBeCalledWith(201);
  });
});
