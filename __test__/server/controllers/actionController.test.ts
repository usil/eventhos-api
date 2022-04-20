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

    expect(knex.insert).toBeCalledTimes(2);

    // expect(knex.insert).toHaveBeenCalledWith({
    //   action_id: 1,
    //   description: 'action description',
    //   http_configuration: '736f6d65|.|encryptedfinal',
    //   type: 'custom',
    //   identifier: 'action_identifier',
    //   name: 'action name',
    //   operation: 'new',
    //   system_id: 1,
    // });

    // expect(knex.insert).toHaveBeenCalledWith({
    //   action_id: 1,
    //   http_configuration: '736f6d65|.|encryptedfinal',
    //   identifier: 'action_identifier',
    //   name: 'action name',
    //   operation: 'new',
    //   system_id: 1,
    //   type: 'custom',
    // });

    cipherSpy.mockRestore();
    vectorSpy.mockRestore();
    keySpy.mockRestore();
  });

  it('Create action works, raw body', async () => {
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
        rawBody: { key: 'some', value: 2 },
        queryUrlParams: [{ key: 'some', value: 3 }],
        securityType: 2,
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

    expect(knex.insert).toBeCalledTimes(2);

    // expect(knex.insert).toHaveBeenCalledWith({
    //   action_id: 1,
    //   description: 'action description',
    //   http_configuration: '736f6d65|.|encryptedfinal',
    //   type: 'custom',
    //   identifier: 'action_identifier',
    //   name: 'action name',
    //   operation: 'new',
    //   system_id: 1,
    // });

    // expect(knex.insert).toHaveBeenCalledWith({
    //   action_id: 1,
    //   http_configuration: '736f6d65|.|encryptedfinal',
    //   identifier: 'action_identifier',
    //   name: 'action name',
    //   operation: 'new',
    //   system_id: 1,
    //   type: 'custom',
    // });

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
        securityType: 1,
        securityUrl: 'token.com',
        clientId: 'clientId',
        clientSecret: 'clientSecret',
      },
    } as Request;

    const securityHttpConfiguration: Record<string, any> = {
      url: 'token.com',
      method: 'post',
      data: {
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

  it('Get actions works', async () => {
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

  it('Get actions fails', async () => {
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
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockResolvedValue([]),
    } as any as Knex;

    const actionController = new ActionController(knex);

    await actionController.deleteAction(req, res);

    expect(knex.table).toHaveBeenCalledWith('contract');
    expect(knex.update).toHaveBeenCalledWith('deleted', true);
    expect(knex.where).toHaveBeenCalledWith('action_id', 1);

    expect(res.status).toBeCalledWith(201);

    expect(res.json).toBeCalledWith({
      code: 200001,
      message: 'success',
    });
  });

  it('Delete action works, active contracts', async () => {
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

    const actionController = new ActionController(knex);

    await actionController.deleteAction(req, res);

    expect(res.status).toBeCalledWith(400);

    expect(res.json).toBeCalledWith({
      code: 400500,
      message: 'Action has active contracts',
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
        queryUrlParams: [
          {
            key: 'test',
            value: 1,
          },
        ],
        headers: [
          {
            key: 'test',
            value: 1,
          },
        ],
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

    const initVector = crypto.randomBytes(16);
    const hexedInitVector = initVector.toString('hex');
    actionController.encryptString = jest
      .fn()
      .mockReturnValue({ hexedInitVector, encryptedData: 'xx' });
    await actionController.updateAction(req, res);

    expect(knex.table).toHaveBeenCalledWith('action');
    expect(knex.update).toHaveBeenCalledWith({
      description: 'new description',
      name: 'newName',
      operation: 'new',
      http_configuration: `${hexedInitVector}|.|xx`,
    });
    expect(knex.where).toHaveBeenCalledWith('id', 1);

    expect(res.status).toBeCalledWith(201);

    expect(res.json).toBeCalledWith({
      code: 200001,
      message: 'success',
    });
  });

  it('Update action works with security', async () => {
    const req = {
      params: {
        id: 1,
      },
      body: {
        queryUrlParams: [
          {
            key: 'test',
            value: 1,
          },
        ],
        headers: [
          {
            key: 'test',
            value: 1,
          },
        ],
        name: 'newName',
        operation: 'new',
        description: 'new description',
        securityType: 1,
      },
    } as any as Request;

    const res = mockRes();

    const knex = {
      table: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue(1),
    } as any as Knex;

    const actionController = new ActionController(knex);

    const initVector = crypto.randomBytes(16);
    const hexedInitVector = initVector.toString('hex');
    actionController.encryptString = jest
      .fn()
      .mockReturnValue({ hexedInitVector, encryptedData: 'xx' });
    await actionController.updateAction(req, res);

    expect(knex.table).toHaveBeenCalledWith('action');
    expect(knex.update).toHaveBeenCalledWith({
      description: 'new description',
      name: 'newName',
      operation: 'new',
      http_configuration: `${hexedInitVector}|.|xx`,
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

  it('Get action, no action found', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;
    const res = mockRes();
    const knex = {
      table: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnValue([undefined]),
    } as any as Knex;

    const actionController = new ActionController(knex);
    await actionController.getAction(req, res);

    expect(knex.join).toHaveBeenCalledWith(
      'action_security',
      'action.id',
      'action_security.action_id',
    );
    expect(knex.where).toHaveBeenCalledWith('action.deleted', false);
    expect(knex.andWhere).toHaveBeenCalledWith('action.id', 1);
    expect(knex.table).toHaveBeenCalledWith('action');
    expect(knex.select).toHaveBeenCalledWith(
      'action.id as id',
      'action.identifier',
      'action.name',
      'action.http_configuration as httpConfiguration',
      'action.operation',
      'action.description',
      'action.deleted',
      'action.created_at',
      'action.updated_at',
      'action_security.type as securityType',
      'action_security.http_configuration as securityHttpConfiguration',
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      code: 400004,
      message: 'No action found',
      content: undefined,
    });
  });

  it('Get action works', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;
    const res = mockRes();
    const knex = {
      table: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest
        .fn()
        .mockReturnValue([
          { securityType: 'custom', httpConfiguration: '|.|' },
        ]),
    } as any as Knex;

    const actionController = new ActionController(knex);
    actionController.decryptString = jest
      .fn()
      .mockReturnValue('{"decrypted": 1}');
    await actionController.getAction(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(actionController.decryptString).toHaveBeenLastCalledWith('|.|');
  });

  it('Get action works deleted', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;
    const res = mockRes();
    const knex = {
      table: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnValue([
        {
          securityType: 'custom',
          httpConfiguration: '|.|',
          deleted: 0,
          id: 1,
          description: 'desc',
        },
      ]),
    } as any as Knex;

    const actionController = new ActionController(knex);
    actionController.decryptString = jest
      .fn()
      .mockReturnValue('{"decrypted": 1}');

    await actionController.getAction(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      code: 200000,
      message: 'success',
      content: {
        created_at: undefined,
        deleted: false,
        description: 'desc',
        httpConfiguration: {
          decrypted: 1,
        },
        id: 1,
        identifier: undefined,
        name: undefined,
        operation: undefined,
        security: {
          httpConfiguration: {},
          type: 'custom',
        },
        updated_at: undefined,
      },
    });
    expect(actionController.decryptString).toHaveBeenLastCalledWith('|.|');
  });

  it('Get action works, oauth2', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;
    const res = mockRes();
    const knex = {
      table: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest
        .fn()
        .mockReturnValue([
          { securityType: 'oauth2_client', httpConfiguration: '|.|' },
        ]),
    } as any as Knex;

    const actionController = new ActionController(knex);
    actionController.decryptString = jest
      .fn()
      .mockReturnValue('{"decrypted": 1}');
    await actionController.getAction(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(actionController.decryptString).toHaveBeenCalledTimes(2);
    expect(actionController.decryptString).toHaveBeenLastCalledWith('|.|');
  });

  it('Get action fails', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;
    const res = mockRes();
    const knex = {
      table: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockRejectedValue(new Error('some error`')),
    } as any as Knex;

    const actionController = new ActionController(knex);
    actionController.decryptString = jest
      .fn()
      .mockReturnValue('{"decrypted": 1}');
    await actionController.getAction(req, res);

    expect(res.status).not.toHaveBeenCalledWith(200);
  });

  it('Decrypt string', () => {
    const spyCryptoSpy = jest
      .spyOn(crypto, 'scryptSync')
      .mockReturnValue('key' as any);
    const spyCryptoSpyDecipher = jest
      .spyOn(crypto, 'createDecipheriv')
      .mockReturnValue({
        update: jest.fn().mockReturnValue('x'),
        final: jest.fn().mockReturnValue('x'),
      } as any);
    const actionController = new ActionController({} as Knex);
    actionController.decryptString('x|.|x');
    expect(spyCryptoSpy).toHaveBeenCalled();
    spyCryptoSpy.mockRestore();
    spyCryptoSpyDecipher.mockRestore();
  });

  it('Encrypt string', () => {
    const spyCryptoSpy = jest
      .spyOn(crypto, 'scryptSync')
      .mockReturnValue('key' as any);
    const spyCryptoSpyDecipher = jest
      .spyOn(crypto, 'createCipheriv')
      .mockReturnValue({
        update: jest.fn().mockReturnValue('x'),
        final: jest.fn().mockReturnValue('x'),
      } as any);
    const actionController = new ActionController({} as Knex);
    actionController.encryptString('x|.|x');
    expect(spyCryptoSpy).toHaveBeenCalled();
    spyCryptoSpy.mockRestore();
    spyCryptoSpyDecipher.mockRestore();
  });
});
