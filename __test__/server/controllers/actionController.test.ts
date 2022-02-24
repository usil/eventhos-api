import ActionController from '../../../src/server/controllers/action.controller';
import { Request, Response } from 'express';
import { Knex } from 'knex';
import crypto from 'crypto';

const mockRes = () => {
  const res: Response = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res;
};

describe('Actions controller functions work', () => {
  it('Create action works, public security', async () => {
    const cipherSpy = jest.spyOn(crypto, 'createCipheriv').mockReturnValue({
      update: jest.fn().mockReturnValue('encrypted'),
      final: jest.fn().mockReturnValue('final'),
    } as any);

    const keyBuffer = Buffer.from('some', 'utf-8');

    const vectorBuffer = Buffer.from('some', 'utf-8');

    const hexedVector = vectorBuffer.toString('hex');

    const keySpy = jest.spyOn(crypto, 'scryptSync').mockReturnValue(keyBuffer);

    const vectorSpy = jest
      .spyOn(crypto, 'randomBytes')
      .mockReturnValue(vectorBuffer as any);

    const knex = {
      table: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue([1]),
    } as any as Knex;

    const res = mockRes();

    const req = {
      body: {
        system_id: 1,
        identifier: 'action_identifier',
        name: 'action name',
        operation: 'new',
        description: 'action description',
        url: 'action.com',
        method: 'get',
        headers: [{ key: 'some', value: 1 }],
        body: [{ key: 'some', value: 2 }],
        queryUrlParams: [{ key: 'some', value: 3 }],
        securityType: 1,
        securityUrl: null,
        clientId: null,
        clientSecret: null,
      },
    } as Request;

    const actionController = new ActionController(knex);

    await actionController.createAction(req, res);

    expect(cipherSpy).toHaveBeenCalledWith(
      'aes-256-ctr',
      keyBuffer,
      vectorBuffer,
    );

    expect(keySpy).toHaveBeenCalled();

    expect(vectorSpy).toHaveBeenCalledWith(16);

    expect(knex.insert).toHaveBeenCalledWith({
      system_id: 1,
      identifier: 'action_identifier',
      name: 'action name',
      http_configuration: hexedVector + '|.|' + 'encrypted' + 'final',
      operation: 'new',
      description: 'action description',
    });

    expect(knex.insert).toHaveBeenCalledWith({
      action_id: 1,
      type: 'public',
      http_configuration: hexedVector + '|.|' + 'encrypted' + 'final',
    });

    cipherSpy.mockRestore();
    vectorSpy.mockRestore();
    keySpy.mockRestore();
  });

  it('Create action works, oauth user security', async () => {
    const cipherReturn = {
      update: jest.fn().mockReturnValue('encrypted'),
      final: jest.fn().mockReturnValue('final'),
    };

    const cipherSpy = jest
      .spyOn(crypto, 'createCipheriv')
      .mockReturnValue(cipherReturn as any);

    const keyBuffer = Buffer.from('some', 'utf-8');

    const vectorBuffer = Buffer.from('some', 'utf-8');

    const hexedVector = vectorBuffer.toString('hex');

    const keySpy = jest.spyOn(crypto, 'scryptSync').mockReturnValue(keyBuffer);

    const vectorSpy = jest
      .spyOn(crypto, 'randomBytes')
      .mockReturnValue(vectorBuffer as any);

    const knex = {
      table: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue([1]),
    } as any as Knex;

    const res = mockRes();

    const req = {
      body: {
        system_id: 1,
        identifier: 'action_identifier',
        name: 'action name',
        operation: 'new',
        description: 'action description',
        url: 'action.com',
        method: 'get',
        headers: [{ key: 'some', value: 1 }],
        body: [{ key: 'some', value: 2 }],
        queryUrlParams: [{ key: 'some', value: 3 }],
        securityType: 2,
        securityUrl: 'token.com',
        clientId: 'clientId',
        clientSecret: 'clientSecret',
      },
    } as Request;

    const securityHttpConfiguration: Record<string, any> = {
      url: 'token.com',
      method: 'post',
      params: {
        client_id: 'clientId',
        client_secret: 'clientSecret',
        grant_type: 'client_credentials',
      },
    };

    const stringedSecurityHttpConfiguration = JSON.stringify(
      securityHttpConfiguration,
    );

    const actionController = new ActionController(knex);

    await actionController.createAction(req, res);

    expect(cipherSpy).toHaveBeenCalledWith(
      'aes-256-ctr',
      keyBuffer,
      vectorBuffer,
    );

    expect(cipherReturn.update).toHaveBeenCalledWith(
      stringedSecurityHttpConfiguration,
      'utf-8',
      'hex',
    );

    expect(keySpy).toHaveBeenCalled();

    expect(vectorSpy).toHaveBeenCalledWith(16);

    expect(knex.insert).toHaveBeenCalledWith({
      system_id: 1,
      identifier: 'action_identifier',
      name: 'action name',
      http_configuration: hexedVector + '|.|' + 'encrypted' + 'final',
      operation: 'new',
      description: 'action description',
    });

    expect(res.json).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);

    expect(knex.insert).toHaveBeenCalledWith({
      action_id: 1,
      type: 'oauth2_client',
      http_configuration: hexedVector + '|.|' + 'encrypted' + 'final',
    });

    cipherSpy.mockRestore();
    vectorSpy.mockRestore();
    keySpy.mockRestore();
  });

  it('Create action works, public api key', async () => {
    const cipherSpy = jest.spyOn(crypto, 'createCipheriv').mockReturnValue({
      update: jest.fn().mockReturnValue('encrypted'),
      final: jest.fn().mockReturnValue('final'),
    } as any);

    const keyBuffer = Buffer.from('some', 'utf-8');

    const vectorBuffer = Buffer.from('some', 'utf-8');

    const hexedVector = vectorBuffer.toString('hex');

    const keySpy = jest.spyOn(crypto, 'scryptSync').mockReturnValue(keyBuffer);

    const vectorSpy = jest
      .spyOn(crypto, 'randomBytes')
      .mockReturnValue(vectorBuffer as any);

    const knex = {
      table: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue([1]),
    } as any as Knex;

    const res = mockRes();

    const req = {
      body: {
        system_id: 1,
        identifier: 'action_identifier',
        name: 'action name',
        operation: 'new',
        description: 'action description',
        url: 'action.com',
        method: 'get',
        headers: [{ key: 'some', value: 1 }],
        body: [{ key: 'some', value: 2 }],
        queryUrlParams: [{ key: 'some', value: 3 }],
        securityType: 4,
        securityUrl: null,
        clientId: null,
        clientSecret: null,
      },
    } as Request;

    const actionController = new ActionController(knex);

    await actionController.createAction(req, res);

    expect(cipherSpy).toHaveBeenCalledWith(
      'aes-256-ctr',
      keyBuffer,
      vectorBuffer,
    );

    expect(keySpy).toHaveBeenCalled();

    expect(vectorSpy).toHaveBeenCalledWith(16);

    expect(knex.insert).toHaveBeenCalledWith({
      system_id: 1,
      identifier: 'action_identifier',
      name: 'action name',
      http_configuration: hexedVector + '|.|' + 'encrypted' + 'final',
      operation: 'new',
      description: 'action description',
    });

    expect(knex.insert).toHaveBeenCalledWith({
      action_id: 1,
      type: 'api_key',
      http_configuration: hexedVector + '|.|' + 'encrypted' + 'final',
    });

    expect(res.json).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);

    cipherSpy.mockRestore();
    vectorSpy.mockRestore();
    keySpy.mockRestore();
  });

  it('Create action fails', async () => {
    const cipherSpy = jest.spyOn(crypto, 'createCipheriv').mockReturnValue({
      update: jest.fn().mockReturnValue('encrypted'),
      final: jest.fn().mockReturnValue('final'),
    } as any);

    const keyBuffer = Buffer.from('some', 'utf-8');

    const vectorBuffer = Buffer.from('some', 'utf-8');

    const keySpy = jest.spyOn(crypto, 'scryptSync').mockReturnValue(keyBuffer);

    const vectorSpy = jest
      .spyOn(crypto, 'randomBytes')
      .mockReturnValue(vectorBuffer as any);

    const knex = {
      table: jest.fn().mockReturnThis(),
      insert: jest.fn().mockRejectedValue(new Error('Async error')),
    } as any as Knex;

    const res = mockRes();

    const req = {
      body: {
        system_id: 1,
        identifier: 'action_identifier',
        name: 'action name',
        operation: 'new',
        description: 'action description',
        url: 'action.com',
        method: 'get',
        headers: [{ key: 'some', value: 1 }],
        body: [{ key: 'some', value: 2 }],
        queryUrlParams: [{ key: 'some', value: 3 }],
        securityType: 1,
        securityUrl: null,
        clientId: null,
        clientSecret: null,
      },
    } as Request;

    const actionController = new ActionController(knex);

    await actionController.createAction(req, res);

    expect(cipherSpy).toHaveBeenCalledWith(
      'aes-256-ctr',
      keyBuffer,
      vectorBuffer,
    );

    expect(res.json).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(201);

    cipherSpy.mockRestore();
    vectorSpy.mockRestore();
    keySpy.mockRestore();
  });

  it('Get action works', async () => {
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

    const actionController = new ActionController(knex);

    await actionController.getActions(req, res);

    expect(knex.table).toHaveBeenCalledWith('action');
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

  it('Get action fails', async () => {
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

    const actionController = new ActionController(knex);

    await actionController.getActions(req, res);

    expect(res.status).not.toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
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

    const actionController = new ActionController(knex);

    await actionController.deleteAction(req, res);

    expect(knex.table).toHaveBeenCalledWith('action');
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

    const actionController = new ActionController(knex);

    await actionController.deleteAction(req, res);

    expect(res.status).not.toBeCalledWith(201);
  });

  it('Update action works', async () => {
    const req = {
      params: {
        id: 1,
      },
      body: {
        name: 'newName',
        operation: 'new',
        description: 'new description',
      },
    } as any as Request;

    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue(1),
    } as any as Knex;

    const actionController = new ActionController(knex);

    await actionController.updateAction(req, res);

    expect(knex.table).toHaveBeenCalledWith('action');
    expect(knex.update).toHaveBeenCalledWith({
      name: 'newName',
      operation: 'new',
      description: 'new description',
    });
    expect(knex.where).toHaveBeenCalledWith('id', 1);

    expect(res.status).toBeCalledWith(201);

    expect(res.json).toBeCalledWith({
      code: 200001,
      message: 'success',
    });
  });

  it('Update action fails', async () => {
    const req = {
      params: {
        id: 1,
      },
      body: {
        name: 'newName',
        operation: 'new',
        description: 'new description',
      },
    } as any as Request;

    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockRejectedValue(new Error('Async Error')),
    } as any as Knex;

    const actionController = new ActionController(knex);

    await actionController.updateAction(req, res);

    expect(knex.table).toHaveBeenCalledWith('action');
    expect(knex.update).toHaveBeenCalledWith({
      name: 'newName',
      operation: 'new',
      description: 'new description',
    });

    expect(res.status).not.toBeCalledWith(201);

    expect(res.json).toBeCalled();
  });

  it('Error function', () => {
    const knex = {} as any as Knex;
    const res = mockRes();
    const error = {
      sqlState: 1,
    };

    const actionController = new ActionController(knex);
    actionController.returnError(error, res);

    expect(res.status).toBeCalledWith(501);
  });
});
