import { basicContent } from '../listRecivedEvents.mocked';
import EventControllers from '../../../src/server/controllers/event.controller';
import { Request, Response } from 'express';
import knex, { Knex } from 'knex';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import ReceivedEvent from '../../../src/server/dtos/RecivedEvent.dto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import util from 'util';

jest.mock('axios', () => jest.fn().mockReturnValue({ data: 1, headers: 1 }));
jest.mock('knex', () => {
  const mKnex = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    first: jest.fn().mockReturnThis(),
    table: jest.fn().mockReturnThis(),
    count: jest.fn().mockResolvedValue([{ 'count(*)': 2 }]),
    insert: jest
      .fn()
      .mockReturnThis()
      .mockResolvedValue(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockRejectedValueOnce({ sqlState: 1 }),
    orderBy: jest
      .fn()
      .mockReturnThis()
      .mockResolvedValue([])
      .mockResolvedValueOnce(basicContent)
      .mockResolvedValueOnce(basicContent)
      .mockRejectedValueOnce({ sqlState: 1 }),
    where: jest
      .fn()
      .mockReturnThis()
      .mockResolvedValue(undefined)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { action: '', event: '', contract: '', action_security: '' },
      ])
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce({ sqlState: 1 }),
    andWhere: jest
      .fn()
      .mockResolvedValueOnce([
        { action: '', event: '', contract: '', action_security: '' },
      ]),
    options: jest.fn().mockReturnThis(),
  };
  return jest.fn(() => mKnex);
});
describe('Event routes work accordingly', () => {
  const scryptPromise = util.promisify(crypto.scrypt);
  let encryptKey: Buffer;

  beforeAll(async () => {
    encryptKey = (await scryptPromise('secret', 'salt', 32)) as Buffer;
  });

  const mockRes = () => {
    const res: Response = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.locals = {};
    return res;
  };

  it('Creates an axios observable from a json file', async () => {
    const eventControllers = new EventControllers(knex({}), encryptKey);
    const obs = eventControllers.createAxiosObservable({
      url: 'url',
    });
    (axios as unknown as jest.Mock).mockResolvedValueOnce({ data: 'ok' });
    await expect(firstValueFrom(obs)).resolves.toEqual({ data: 'ok' });
  });

  describe('Event validation middleware works correctly', () => {
    const mockKnex = () => {
      const knex = {} as Knex;
      knex.select = jest.fn().mockReturnValue(knex);
      knex.from = jest.fn().mockReturnValue(knex);
      knex.join = jest.fn().mockReturnValue(knex);
      knex.first = jest.fn().mockReturnValue(knex);
      knex.select = jest.fn().mockReturnValue(knex);
      knex.where = jest.fn().mockReturnValue(knex);
      knex.andWhere = jest.fn().mockReturnValue(knex);
      return knex;
    };

    const eventControllers = new EventControllers(mockKnex(), encryptKey);

    it('Event validation middleware, correct message when no query is send', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {};
        return req;
      };

      const mockResponse = mockRes();

      await eventControllers.eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 400020,
        message:
          'Either the access key or the identifier for the event was not send.',
      });
    });

    it('Event validation middleware, correct message when producer event not found', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {
          'event-identifier': 'some',
          'access-key': 'some',
        };
        return req;
      };

      const mockResponse = mockRes();

      const localKnexMock = mockKnex();

      localKnexMock.andWhere = jest
        .fn()
        .mockReturnValue(localKnexMock)
        .mockResolvedValue(undefined);

      eventControllers.knexPool = localKnexMock;

      await eventControllers.eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 400024,
        message: `The event some does not exist.`,
      });
    });

    it('Event validation middleware, correct message when producer revoked', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {
          'event-identifier': 'new_profesor',
          'access-key': 'notasecurekey',
        };
        return req;
      };

      const mockResponse = mockRes();

      const localKnexMock = mockKnex();

      localKnexMock.andWhere = jest.fn().mockResolvedValue([
        {
          revoked: true,
          identifier: 'new_profesor',
          id: 1,
        },
      ]);

      localKnexMock.table = jest.fn().mockReturnValue(localKnexMock);

      localKnexMock.where = jest.fn().mockReturnValue(localKnexMock);

      eventControllers.knexPool = localKnexMock;

      await eventControllers.eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 400023,
        message: `The client access has been revoked.`,
      });
    });

    it('Event validation middleware, correct message when client does not exist', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {
          'event-identifier': 'new_profesor',
          'access-key': 'notasecurekey',
        };
        return req;
      };

      const mockResponse = mockRes();

      const localKnexMock = mockKnex();

      localKnexMock.andWhere = jest.fn().mockResolvedValue([]);

      localKnexMock.table = jest.fn().mockReturnValue(localKnexMock);

      localKnexMock.where = jest.fn().mockReturnValue(localKnexMock);

      eventControllers.knexPool = localKnexMock;

      await eventControllers.eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 400004,
        message: `The client does not exist.`,
      });
    });

    it('Event validation middleware, correct message when client has access_token', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {
          'event-identifier': 'new_profesor',
          'access-key': 'notasecurekey',
        };
        return req;
      };

      const bcryptSpy = jest
        .spyOn(bcrypt, 'compare')
        .mockResolvedValue(true as never);

      const mockResponse = mockRes();

      const localKnexMock = mockKnex();

      localKnexMock.andWhere = jest.fn().mockResolvedValue([
        {
          revoked: false,
          access_token: 'token',
          identifier: 'new_profesor',
          id: 1,
        },
      ]);

      localKnexMock.table = jest.fn().mockReturnValue(localKnexMock);

      localKnexMock.where = jest.fn().mockReturnValue(localKnexMock);

      eventControllers.knexPool = localKnexMock;

      await eventControllers.eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );

      expect(bcryptSpy).toHaveBeenCalled();
      expect(mockedNext).toHaveBeenCalled();

      expect(mockResponse.locals.eventId).toBe(undefined);

      bcryptSpy.mockRestore();
    });

    it('Event validation middleware, correct message when client has no access_token', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {
          'event-identifier': 'new_profesor',
          'access-key': 'notasecurekey',
        };
        return req;
      };

      const jwtSpy = jest.spyOn(jwt, 'verify');

      const mockResponse = mockRes();

      const localKnexMock = mockKnex();

      localKnexMock.andWhere = jest.fn().mockResolvedValue([
        {
          revoked: false,
          identifier: 'new_profesor',
          id: 1,
        },
      ]);

      localKnexMock.table = jest.fn().mockReturnValue(localKnexMock);

      localKnexMock.where = jest.fn().mockReturnValue(localKnexMock);

      eventControllers.knexPool = localKnexMock;

      await eventControllers.eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );

      expect(mockResponse.status).toHaveBeenCalled();
      expect(jwtSpy).toHaveBeenCalled();

      expect(mockResponse.locals.eventId).toBe(undefined);
      jwtSpy.mockRestore();
    });

    it('Event validation middleware, correct message when client has access_token but incorrect', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {
          'event-identifier': 'new_profesor',
          'access-key': 'notasecurekey',
        };
        return req;
      };

      const bcryptSpy = jest
        .spyOn(bcrypt, 'compare')
        .mockResolvedValue(false as never);

      const mockResponse = mockRes();

      const localKnexMock = mockKnex();

      localKnexMock.andWhere = jest.fn().mockResolvedValue([
        {
          revoked: false,
          access_token: 'token',
          identifier: 'new_profesor',
          id: 1,
        },
      ]);

      localKnexMock.table = jest.fn().mockReturnValue(localKnexMock);

      localKnexMock.where = jest.fn().mockReturnValue(localKnexMock);

      eventControllers.knexPool = localKnexMock;

      await eventControllers.eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 400001,
        message: `Incorrect token`,
      });

      expect(bcryptSpy).toHaveBeenCalled();

      bcryptSpy.mockRestore();
    });

    it('Error 500', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {
          'event-identifier': 'new_profesor',
          'access-key': 'asecurekey',
        };
        return req;
      };

      const mockResponse = mockRes();

      const localKnexMock = mockKnex();

      localKnexMock.where = jest
        .fn()
        .mockReturnValue(localKnexMock)
        .mockRejectedValue({ error: 'an error' });
      eventControllers.knexPool = localKnexMock;

      await eventControllers.eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 500000,
        message: 'Server Internal Error',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Gets the contract list for an event', () => {
    const eventControllers = new EventControllers(knex({}), encryptKey);

    it('Not event id send', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {};
        return req;
      };

      const mockResponse = mockRes();

      mockResponse.locals.eventId = undefined;

      await eventControllers.getEventContracts(
        mockReq(),
        mockResponse,
        mockedNext,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 400020,
        message: 'Event Id was not send.',
      });
    });
    it('No contracts for an event', async () => {
      const mockedKnex = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        join: jest.fn().mockReturnThis(),
        options: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockResolvedValue([]),
        table: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue([1]),
      } as any as Knex;

      const mockNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {};
        req.headers = {};
        req.body = {};
        req.method = 'get';
        req.protocol = 'https';
        req.get = jest.fn().mockReturnValue('host');
        req.originalUrl = 'original.www';
        return req;
      };

      const mockResponse = mockRes();

      mockResponse.locals.eventId = 1;

      const eventControllersInternal = new EventControllers(
        mockedKnex,
        encryptKey,
      );

      await eventControllersInternal.getEventContracts(
        mockReq(),
        mockResponse,
        mockNext,
      );
      expect(mockedKnex.orderBy).toHaveBeenCalledWith('contract.order', 'asc');
      expect(mockedKnex.from).toHaveBeenCalledWith('contract');
      expect(mockedKnex.table).toHaveBeenCalledWith('received_event');
      expect(mockedKnex.select).toHaveBeenCalled();
      expect(mockedKnex.join).toHaveBeenCalledWith(
        'event',
        'contract.event_id',
        'event.id',
      );
      expect(mockedKnex.join).toHaveBeenCalledWith(
        'action_security',
        'action.id',
        'action_security.action_id',
      );
      expect(mockedKnex.where).toHaveBeenCalledTimes(2);
      expect(mockedKnex.insert).toHaveBeenCalledTimes(1);

      expect(mockResponse.status).toHaveBeenCalledWith(203);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 200310,
        message: 'Success, but no contracts exists for this event',
      });
    });
    it('Next is called', async () => {
      const mockedKnex = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        join: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        options: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest
          .fn()
          .mockResolvedValue([
            { action: '', event: '', contract: '', action_security: '' },
          ]),
        table: jest.fn().mockReturnThis(),
      } as any as Knex;
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {};
        return req;
      };

      const mockResponse = mockRes();

      mockResponse.locals.eventId = 1;

      const eventControllersInternal = new EventControllers(
        mockedKnex,
        encryptKey,
      );

      await eventControllersInternal.getEventContracts(
        mockReq(),
        mockResponse,
        mockedNext,
      );

      expect(mockResponse.locals.eventContracts).toStrictEqual([
        { action: '', event: '', contract: '', action_security: '' },
      ]);
      expect(mockedNext.mock.calls.length).toBe(1);
    });
    it('500 error', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {};
        return req;
      };

      const mockResponse = mockRes();

      mockResponse.locals.eventId = 1;

      await eventControllers.getEventContracts(
        mockReq(),
        mockResponse,
        mockedNext,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 500000,
        message: 'Server Internal Error',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Received events listing', () => {
    it('List received events', async () => {
      const receivedEvents: ReceivedEvent[] = [
        {
          id: 1,
          producer_event_id: 1,
          header: { someHeader: 'some' },
          received_at: new Date(),
        },
      ];

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {
          itemsPerPage: '10',
          pageIndex: '1',
          order: 'desc',
        };
        req.headers = {};
        req.body = {};
        req.method = 'get';
        req.protocol = 'https';
        req.get = jest.fn().mockReturnValue('host');
        req.originalUrl = 'original.www';
        return req;
      };

      const mockResponse = mockRes();

      const knexMock = jest.fn().mockImplementation((objectOrString) => {
        const knex: Record<string, any> = {};
        knex.limit = jest.fn().mockReturnValue(knex);
        knex.offset = jest.fn().mockReturnValue(knex);
        knex.orderBy = jest.fn().mockReturnValue(receivedEvents);
        knex.select = jest.fn().mockReturnValue(knex);
        knex.where = jest.fn().mockReturnValue(knex);
        knex.table = jest.fn().mockReturnValue(knex);
        knex.leftJoin = jest.fn().mockReturnValue(knex);
        knex.count = jest.fn().mockResolvedValue([{ 'count(*)': 1 }]);
        knex.join = jest.fn().mockReturnValue(knex);
        return knex;
      });

      const eventControllers = new EventControllers(
        knexMock as any,
        encryptKey,
      );
      await eventControllers.listReceivedEvents(mockReq(), mockResponse);
      expect(knexMock).toHaveBeenCalledTimes(3);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 200000,
        message: 'success',
        content: {
          items: receivedEvents,
          pageIndex: 1,
          itemsPerPage: 10,
          totalItems: 1,
          totalPages: 1,
        },
      });
    });

    it('List received events with filters', async () => {
      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {
          itemsPerPage: '10',
          pageIndex: '1',
          order: 'desc',
          systemId: '1',
          toTime: 'December 17, 1995 03:24:00',
          fromTime: 'December 17, 1995 03:24:00',
        };
        req.headers = {};
        req.body = {};
        req.method = 'get';
        req.protocol = 'https';
        req.get = jest.fn().mockReturnValue('host');
        req.originalUrl = 'original.www';
        return req;
      };

      const mockResponse = mockRes();

      const whereMock = jest.fn();

      const knexMock = jest.fn().mockImplementation((objectOrString) => {
        const knex: Record<string, any> = {};
        knex.limit = jest.fn().mockReturnValue(knex);
        knex.offset = jest.fn().mockReturnValue(knex);
        knex.orderBy = jest.fn().mockReturnValue(knex);
        knex.select = jest.fn().mockReturnValue(knex);
        knex.where = whereMock;
        knex.table = jest.fn().mockReturnValue(knex);
        knex.leftJoin = jest.fn().mockReturnValue(knex);
        knex.count = jest.fn().mockReturnValue(knex);
        knex.join = jest.fn().mockReturnValue(knex);
        return knex;
      });

      const eventControllers = new EventControllers(
        knexMock as any,
        encryptKey,
      );
      await eventControllers.listReceivedEvents(mockReq(), mockResponse);
      expect(whereMock).toHaveBeenCalledTimes(6);
    });

    it('List received events fails', async () => {
      const receivedEvents: ReceivedEvent[] = [
        {
          id: 1,
          producer_event_id: 1,
          header: { someHeader: 'some' },
          received_at: new Date(),
        },
      ];

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = { itemsPerPage: '10', pageIndex: '1', order: 'desc' };
        return req;
      };

      const mockResponse = mockRes();

      const knexMock = jest.fn().mockImplementation((objectOrString) => {
        const knex: Record<string, any> = {};
        knex.limit = jest.fn().mockReturnValue(knex);
        knex.offset = jest.fn().mockReturnValue(knex);
        knex.orderBy = jest.fn();
        knex.select = jest.fn().mockReturnValue(knex);
        knex.where = jest.fn().mockReturnValue(knex);
        knex.table = jest.fn().mockReturnValue(knex);
        knex.count = jest.fn().mockRejectedValue(new Error('Async error'));
        knex.join = jest.fn().mockImplementation((some) => {
          knex.join = jest.fn().mockReturnValueOnce(receivedEvents);
          return knex;
        });
        return knex;
      });

      const eventControllers = new EventControllers(
        knexMock as any,
        encryptKey,
      );
      await eventControllers.listReceivedEvents(mockReq(), mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Manage event', () => {
    it('Manage event correct', async () => {
      const mockRes = () => {
        const res = {} as Response;
        res.locals = {
          eventId: 1,
          eventContracts: [
            {
              action: {
                id: 1,
                system_id: 1,
                identifier: 'identifier',
                name: 'name',
                http_configuration: `x|.|x`,
                operation: 'select',
                description: 'description',
                deleted: 1,
                created_at: new Date(),
                updated_at: new Date(),
              },
              event: {
                id: 1,
                system_id: 1,
                identifier: 'identifier',
                name: 'name',
                operation: 'select',
                description: 'description',
                deleted: 0,
                created_at: new Date(),
                updated_at: new Date(),
              },
              contract: {
                id: 1,
                action_id: 1,
                event_id: 1,
                identifier: 'ident',
                name: 'name',
                active: 1,
                deleted: 0,
                created_at: new Date(),
                updated_at: new Date(),
              },
              action_security: {
                id: 1,
                action_id: 1,
                type: 'select',
                http_configuration: { url: 'http' },
                json_path_exp: 'exp',
                updated_at: new Date(),
              },
            },
          ],
        };
        res.json = jest.fn();
        res.status = jest.fn().mockReturnThis();
        return res;
      };
      const res = mockRes();

      const req = {
        body: { bod: 'x' },
        headers: { auth: 'x' },
        query: {},
        method: 'get',
        protocol: 'https',
        get: jest.fn().mockReturnValue('host'),
        originalUrl: 'original.www',
      } as any as Request;

      const knexMock = {
        table: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue([1]),
      };
      const eventControllers = new EventControllers(
        knexMock as any,
        encryptKey,
      );
      eventControllers.getVariables = jest.fn().mockReturnValue('goodDATA');
      eventControllers.decryptString = jest
        .fn()
        .mockReturnValue(
          '{"headers": {"X": 1}, "params": {"X": 1}, "data": {"X": 1}}',
        );
      await eventControllers.manageEvent(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        code: 20000,
        message: 'success',
      });
    });

    it('Manage event correct oauth2 security and no data', async () => {
      const mockRes = () => {
        const res = {} as Response;
        res.locals = {
          eventId: 1,
          eventContracts: [
            {
              action: {
                id: 1,
                system_id: 1,
                identifier: 'identifier',
                name: 'name',
                http_configuration: `x|.|x`,
                operation: 'select',
                description: 'description',
                deleted: 1,
                created_at: new Date(),
                updated_at: new Date(),
              },
              event: {
                id: 1,
                system_id: 1,
                identifier: 'identifier',
                name: 'name',
                operation: 'select',
                description: 'description',
                deleted: 0,
                created_at: new Date(),
                updated_at: new Date(),
              },
              contract: {
                id: 1,
                action_id: 1,
                event_id: 1,
                identifier: 'ident',
                name: 'name',
                active: 1,
                deleted: 0,
                created_at: new Date(),
                updated_at: new Date(),
              },
              action_security: {
                id: 1,
                action_id: 1,
                type: 'oauth2_client',
                http_configuration: { url: 'http' },
                json_path_exp: 'exp',
                updated_at: new Date(),
              },
            },
          ],
        };
        res.json = jest.fn();
        res.status = jest.fn().mockReturnThis();
        return res;
      };
      const res = mockRes();

      const req = {
        body: { bod: 'x' },
        headers: { auth: 'x' },
        query: {},
        method: 'get',
        protocol: 'https',
        get: jest.fn().mockReturnValue('host'),
        originalUrl: 'original.www',
      } as any as Request;

      const knexMock = {
        table: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue([1]),
      };
      const eventControllers = new EventControllers(
        knexMock as any,
        encryptKey,
      );
      eventControllers.getVariables = jest.fn().mockReturnValue('goodDATA');
      eventControllers.decryptString = jest
        .fn()
        .mockReturnValue(
          '{"headers": {"X": 1}, "params": {"X": 1}, "data": {}}',
        );
      await eventControllers.manageEvent(req, res);
      expect(eventControllers.decryptString).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        code: 20000,
        message: 'success',
      });
    });

    it('Generates order from event contracts', () => {
      const knexMock = {};

      const eventControllers = new EventControllers(
        knexMock as any,
        encryptKey,
      );

      const eventContracts = [
        { contract: { order: 1 } },
        { contract: { order: 1 } },
        { contract: { order: 2 } },
      ];

      const order = eventControllers.generateOrderFromEventContracts(
        eventContracts as any,
      );

      expect(order['1']).toBeTruthy();
      expect(order['1'].length).toBe(2);
      expect(order['2']).toBeTruthy();
    });

    it('Handle post contract execution when error', () => {
      const knexMock = {};
      const eventControllers = new EventControllers(
        knexMock as any,
        encryptKey,
      );

      const response = { message: 'error message', error: true };

      const logger = {
        error: jest.fn(),
        info: jest.fn(),
      };

      eventControllers.handlePostContractExecution(response, logger as any);
      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('Handle post contract execution when success', () => {
      const knexMock = {};
      const eventControllers = new EventControllers(
        knexMock as any,
        encryptKey,
      );

      const response = { message: 'success message' };

      const logger = {
        error: jest.fn(),
        info: jest.fn(),
      };

      eventControllers.handlePostContractExecution(response, logger as any);
      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('Manage event correct not correct locals', async () => {
      const mockRes = () => {
        const res = {} as Response;
        res.locals = {};
        res.json = jest.fn();
        res.status = jest.fn().mockReturnThis();
        return res;
      };
      const res = mockRes();

      const req = {
        body: { bod: 'x' },
        headers: { auth: 'x' },
      } as any as Request;

      const knexMock = {
        table: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue([1]),
      };
      const eventControllers = new EventControllers(
        knexMock as any,
        encryptKey,
      );
      await eventControllers.manageEvent(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400020,
        message: 'Event Id or Event Contract List was not send.',
      });
    });

    it('Manage event correct not a number for eventId', async () => {
      const mockRes = () => {
        const res = {} as Response;
        res.locals = {
          eventId: 'nan',
          eventContracts: [
            {
              action: {
                id: 1,
                system_id: 1,
                identifier: 'identifier',
                name: 'name',
                http_configuration: {
                  auth: 'x',
                },
                operation: 'select',
                description: 'description',
                deleted: 1,
                created_at: new Date(),
                updated_at: new Date(),
              },
              event: {
                id: 1,
                system_id: 1,
                identifier: 'identifier',
                name: 'name',
                operation: 'select',
                description: 'description',
                deleted: 0,
                created_at: new Date(),
                updated_at: new Date(),
              },
              contract: {
                id: 1,
                action_id: 1,
                event_id: 1,
                identifier: 'ident',
                name: 'name',
                active: 1,
                deleted: 0,
                created_at: new Date(),
                updated_at: new Date(),
              },
              action_security: {
                id: 1,
                action_id: 1,
                type: 'select',
                http_configuration: { url: 'http' },
                json_path_exp: 'exp',
                updated_at: new Date(),
              },
            },
          ],
        };
        res.json = jest.fn();
        res.status = jest.fn().mockReturnThis();
        return res;
      };
      const res = mockRes();

      const req = {
        body: { bod: 'x' },
        headers: { auth: 'x' },
      } as any as Request;

      const knexMock = {
        table: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue([1]),
      };
      const eventControllers = new EventControllers(
        knexMock as any,
        encryptKey,
      );
      await eventControllers.manageEvent(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400020,
        message: 'Event Id is not a number.',
      });
    });

    it('Manage event correct not an array', async () => {
      const mockRes = () => {
        const res = {} as Response;
        res.locals = {
          eventId: 1,
          eventContracts: 1,
        };
        res.json = jest.fn();
        res.status = jest.fn().mockReturnThis();
        return res;
      };
      const res = mockRes();

      const req = {
        body: { bod: 'x' },
        headers: { auth: 'x' },
      } as any as Request;

      const knexMock = {
        table: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue([1]),
      };
      const eventControllers = new EventControllers(
        knexMock as any,
        encryptKey,
      );
      await eventControllers.manageEvent(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400020,
        message: 'Event Contract is not an array.',
      });
    });

    it('Manage event fails', async () => {
      const mockRes = () => {
        const res = {} as Response;
        res.locals = {
          eventId: 1,
          eventContracts: [
            {
              action: {
                id: 1,
                system_id: 1,
                identifier: 'identifier',
                name: 'name',
                http_configuration: {
                  auth: 'x',
                },
                operation: 'select',
                description: 'description',
                deleted: 1,
                created_at: new Date(),
                updated_at: new Date(),
              },
              event: {
                id: 1,
                system_id: 1,
                identifier: 'identifier',
                name: 'name',
                operation: 'select',
                description: 'description',
                deleted: 0,
                created_at: new Date(),
                updated_at: new Date(),
              },
              contract: {
                id: 1,
                action_id: 1,
                event_id: 1,
                identifier: 'ident',
                name: 'name',
                active: 1,
                deleted: 0,
                created_at: new Date(),
                updated_at: new Date(),
              },
              action_security: {
                id: 1,
                action_id: 1,
                type: 'select',
                http_configuration: { url: 'http' },
                json_path_exp: 'exp',
                updated_at: new Date(),
              },
            },
          ],
        };
        res.json = jest.fn();
        res.status = jest.fn().mockReturnThis();
        return res;
      };
      const res = mockRes();

      const req = {
        body: { bod: 'x' },
        headers: { auth: 'x' },
      } as any as Request;

      const knexMock = {
        table: jest.fn().mockReturnThis(),
        insert: jest.fn().mockRejectedValue(new Error('Async Error')),
      };
      const eventControllers = new EventControllers(
        knexMock as any,
        encryptKey,
      );
      await eventControllers.manageEvent(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  it('Error function', () => {
    const knex = {} as any as Knex;
    const res = mockRes();
    const error = {
      sqlState: 1,
    };

    const actionController = new EventControllers(knex, encryptKey);
    actionController.returnError(error, res);

    expect(res.status).toBeCalledWith(501);
  });

  it('Handles decoded data', () => {
    const decode = {
      data: {
        id: 1,
      },
    };
    const client = {
      client_id: 1,
    };
    const res = {
      locals: {
        eventId: 0,
      },
    } as any;
    const nextFunction = jest.fn();
    const event = {
      client_id: 1,
      identifier: 'event',
      id: 1,
    };
    const eventControllers = new EventControllers({} as Knex, encryptKey);
    eventControllers.handleDecodeData(decode, client, res, nextFunction, event);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('Handles decoded data, incorrect token', () => {
    const decode = {
      data: {
        id: 4,
      },
    };
    const client = {
      client_id: 1,
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        eventId: 0,
      },
    } as any;
    const nextFunction = jest.fn();
    const event = {
      client_id: 2,
      identifier: 'event',
      id: 3,
    };
    const eventControllers = new EventControllers({} as Knex, encryptKey);
    eventControllers.handleDecodeData(decode, client, res, nextFunction, event);
    expect(nextFunction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('Gets contract execution detail', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;
    const knexMock = {
      table: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnValue([{ request: '{}', response: '{}' }]),
    } as any as Knex;
    const eventControllers = new EventControllers(knexMock, encryptKey);
    eventControllers.decryptString = jest.fn().mockReturnValue('{}');
    const res = mockRes();
    await eventControllers.getContractExecutionDetail(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
  });

  it('Gets contract execution detail fails', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;
    const knexMock = {
      table: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      where: jest.fn().mockRejectedValue(new Error('Async error')),
    } as any as Knex;
    const eventControllers = new EventControllers(knexMock, encryptKey);
    eventControllers.decryptString = jest.fn().mockReturnValue('{}');
    const res = mockRes();
    await eventControllers.getContractExecutionDetail(req, res);
    expect(res.status).not.toHaveBeenCalledWith(200);
  });

  it('Gets Events', async () => {
    const req = {
      query: {
        itemsPerPage: 10,
        offset: 10,
        pageIndex: 0,
        order: 'desc',
        activeSort: 'id',
      },
    } as any as Request;
    const res = mockRes();
    const knex = {
      table: jest.fn().mockReturnThis(),
      where: jest
        .fn()
        .mockResolvedValue([{ id: 1 }])
        .mockResolvedValueOnce([{ 'count(*)': 1 }]),
      count: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
    } as any as Knex;

    const eventControllers = new EventControllers(knex, encryptKey);
    await eventControllers.getEvents(req, res);

    expect(knex.table).toHaveBeenCalledWith('event');
    expect(knex.offset).toHaveBeenCalledWith(0);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('Gets Events with system id', async () => {
    const req = {
      query: {
        itemsPerPage: 10,
        offset: 10,
        pageIndex: 0,
        order: 'desc',
        activeSort: 'id',
        systemId: 1,
        eventName: 'name',
      },
    } as any as Request;
    const res = mockRes();
    const knex = {
      table: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
    } as any as Knex;

    const eventControllers = new EventControllers(knex, encryptKey);
    await eventControllers.getEvents(req, res);

    expect(knex.andWhere).toHaveBeenCalledTimes(4);
  });

  it('Gets Events fails', async () => {
    const req = {
      query: {
        itemsPerPage: 10,
        offset: 10,
        pageIndex: 0,
        order: 'desc',
        activeSort: 'id',
      },
    } as any as Request;
    const res = mockRes();
    const knex = {
      table: jest.fn().mockReturnThis(),
      where: jest.fn().mockRejectedValueOnce(new Error('Some error')),
      count: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
    } as any as Knex;

    const eventControllers = new EventControllers(knex, encryptKey);
    await eventControllers.getEvents(req, res);

    expect(res.status).not.toHaveBeenCalledWith(200);
  });

  it('Delete event works', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;

    const knexMock = {
      table: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([1]),
    } as any as Knex;

    const res = mockRes();

    const eventControllers = new EventControllers(knexMock, encryptKey);
    await eventControllers.deleteEvent(req, res);

    expect(knexMock.table).toBeCalledWith('contract');
    expect(knexMock.table).toBeCalledWith('event');

    expect(knexMock.update).toBeCalledWith('deleted', true);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      code: 200001,
      message: 'success',
    });
  });

  it('Delete event works, conflict', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;

    const knexMock = {
      table: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockResolvedValueOnce([1]),
    } as any as Knex;

    const res = mockRes();

    const eventControllers = new EventControllers(knexMock, encryptKey);
    await eventControllers.deleteEvent(req, res);

    expect(knexMock.table).toBeCalledWith('contract');

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      code: 400500,
      message: 'Event has active contracts',
    });
  });

  it('Delete event fails', async () => {
    const req = {
      params: {
        id: 1,
      },
    } as any as Request;

    const knexMock = {
      table: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockRejectedValue(new Error('Async Error')),
    } as any as Knex;

    const res = mockRes();

    const eventControllers = new EventControllers(knexMock, encryptKey);
    await eventControllers.deleteEvent(req, res);

    expect(res.status).not.toHaveBeenCalledWith(201);
  });

  it('Update event works', async () => {
    const req = {
      params: {
        id: 1,
      },
      body: {
        name: 'new name',
        operation: 'new',
        description: 'Updated description',
      },
    } as any as Request;
    const knexMock = {
      table: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([1]),
    } as any as Knex;
    const res = mockRes();

    const eventControllers = new EventControllers(knexMock, encryptKey);
    await eventControllers.updateEvent(req, res);

    expect(knexMock.table).toHaveBeenCalledWith('event');
    expect(knexMock.update).toHaveBeenCalledWith({
      name: 'new name',
      operation: 'new',
      description: 'Updated description',
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      code: 200001,
      message: 'success',
    });
  });

  it('Update event fails', async () => {
    const req = {
      params: {
        id: 1,
      },
      body: {
        name: 'new name',
        operation: 'new',
        description: 'Updated description',
      },
    } as any as Request;
    const knexMock = {
      table: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockRejectedValue(new Error('Async error')),
    } as any as Knex;
    const res = mockRes();

    const eventControllers = new EventControllers(knexMock, encryptKey);
    await eventControllers.updateEvent(req, res);

    expect(res.status).not.toHaveBeenLastCalledWith(201);
  });

  it('Create event works', async () => {
    const req = {
      params: {
        id: 1,
      },
      body: {
        system_id: 1,
        identifier: 'Identifier',
        name: 'new name',
        operation: 'new',
        description: 'Updated description',
      },
    } as any as Request;

    const knexMock = {
      table: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue([1]),
    } as any as Knex;
    const res = mockRes();

    const eventControllers = new EventControllers(knexMock, encryptKey);
    await eventControllers.createEvent(req, res);

    expect(knexMock.table).toHaveBeenCalledWith('event');
    expect(knexMock.insert).toHaveBeenCalledWith({
      system_id: 1,
      identifier: 'Identifier',
      name: 'new name',
      operation: 'new',
      description: 'Updated description',
    });

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('Create event fails', async () => {
    const req = {
      params: {
        id: 1,
      },
      body: {
        system_id: 1,
        identifier: 'Identifier',
        name: 'new name',
        operation: 'new',
        description: 'Updated description',
      },
    } as any as Request;

    const knexMock = {
      table: jest.fn().mockReturnThis(),
      insert: jest.fn().mockRejectedValue(new Error('Async error')),
    } as any as Knex;
    const res = mockRes();

    const eventControllers = new EventControllers(knexMock, encryptKey);
    await eventControllers.createEvent(req, res);

    expect(res.status).not.toHaveBeenCalledWith(201);
  });

  it('Join Search works', () => {
    const baseSearchResult = [
      { id: 1, randomField: 'x', similarField: 'y' },
      { id: 1, randomField: 'x2', similarField: 'y2' },
      { id: 1, randomField: 'x3', similarField: 'y3' },
      { id: 1, randomField: 'x4', similarField: 'y4' },
      { id: 2, randomField: 'p', similarField: 'z' },
      { id: 2, randomField: 'p1', similarField: 'z1' },
    ];
    const eventControllers = new EventControllers({} as any, encryptKey);
    const joinResult = eventControllers.joinSearch(
      baseSearchResult,
      'id',
      'similarField',
    );

    expect(joinResult[2]).toBe(undefined);
    expect(joinResult.length).toBe(2);
    expect(joinResult[0].similarField.length).toBe(4);
  });

  it('Get received event details works', async () => {
    const req = {
      params: {
        id: 1,
      },
      body: {
        system_id: 1,
        identifier: 'Identifier',
        name: 'new name',
        operation: 'new',
        description: 'Updated description',
      },
    } as any as Request;
    const res = mockRes();
    const knexMock = {
      table: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ received_request: 'x' }]),
    } as any as Knex;

    const eventControllers = new EventControllers(knexMock, encryptKey);
    eventControllers.decryptString = jest.fn().mockReturnValue('{"x": 1}');
    await eventControllers.getReceivedEventDetails(req, res);

    expect(knexMock.table).toHaveBeenCalledWith('contract_exc_detail');
    expect(knexMock.table).toHaveBeenCalledWith('received_event');

    expect(knexMock.select).toHaveBeenCalledWith(
      'received_event.id',
      'received_event.received_at',
      'received_event.received_request',
      'event.id as eventId',
      'event.identifier as eventIdentifier',
      'event.name as eventName',
      'event.operation as eventOperation',
      'event.description as eventDescription',
    );
    expect(knexMock.select).toHaveBeenCalledWith(
      'contract_exc_detail.id as detailId',
      'contract_exc_detail.state',
      'contract.id as contractId',
      'contract.identifier as contractIdentifier',
      'contract.name as contractName',
      'action.id as actionId',
      'action.identifier as actionIdentifier',
      'action.name as actionName',
      'action.operation as actionOperation',
      'action.description as actionDescription',
    );

    expect(knexMock.join).toHaveBeenCalledWith(
      'event',
      'received_event.event_id',
      'event.id',
    );

    expect(knexMock.join).toHaveBeenCalledWith(
      'action',
      'contract.action_id',
      'action.id',
    );

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('Get received event details fails', async () => {
    const req = {
      params: {
        id: 1,
      },
      body: {
        system_id: 1,
        identifier: 'Identifier',
        name: 'new name',
        operation: 'new',
        description: 'Updated description',
      },
    } as any as Request;
    const res = mockRes();
    const knexMock = {
      table: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockRejectedValue(new Error('Async error')),
    } as any as Knex;

    const eventControllers = new EventControllers(knexMock, encryptKey);
    eventControllers.decryptString = jest.fn().mockReturnValue('{"x": 1}');
    await eventControllers.getReceivedEventDetails(req, res);

    expect(res.status).not.toHaveBeenCalledWith(200);
  });

  it('Decrypt string', async () => {
    const spyCryptoSpyDecipher = jest
      .spyOn(crypto, 'createDecipheriv')
      .mockReturnValue({
        update: jest.fn().mockReturnValue('x'),
        final: jest.fn().mockReturnValue('x'),
      } as any);
    const eventController = new EventControllers({} as Knex, encryptKey);
    const result = await eventController.decryptString('x|.|x');
    expect(result).toBe('xx');
    spyCryptoSpyDecipher.mockRestore();
  });

  it('Encrypt string', async () => {
    const spyCryptoSpyDecipher = jest
      .spyOn(crypto, 'createCipheriv')
      .mockReturnValue({
        update: jest.fn().mockReturnValue('x'),
        final: jest.fn().mockReturnValue('x'),
      } as any);
    const eventController = new EventControllers({} as Knex, encryptKey);
    const result = await eventController.encryptString('x|.|x');
    expect(result.encryptedData).toBe('xx');
    spyCryptoSpyDecipher.mockRestore();
  });

  it('Handle axios next', async () => {
    const res = {
      headers: {
        test: 1,
      },
      data: {
        test: 1,
      },
      status: 200,
      statusText: 'ok',
      config: {
        data: {
          test: 1,
        },
        url: '/url',
        params: {
          test: 1,
        },
        method: 'get',
        headers: {
          eventhosStartDate: 'now',
        },
      },
    } as any as AxiosResponse<any, any>;
    const contract = {
      contract: {
        id: 1,
      },
    } as any;
    const knexMock = {
      table: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue([1]),
    } as any as Knex;
    const eventController = new EventControllers(knexMock, encryptKey);
    await eventController.handleContractExecution(res, contract, [1]);
    expect(knexMock.table).toHaveBeenCalledWith('contract_exc_detail');
    expect(knexMock.insert).toHaveBeenCalledTimes(2);
  });

  it('Handle axios error', async () => {
    const error = {
      response: {
        headers: {
          test: 1,
        },
        data: {
          test: 1,
        },
        status: 200,
        statusText: 'ok',
      },
      config: {
        data: {
          test: 1,
        },
        url: '/url',
        params: {
          test: 1,
        },
        method: 'get',
        headers: {
          eventhosStartDate: 'now',
        },
      },
    } as any as AxiosError<any, any>;
    const contract = {
      contract: {
        id: 1,
      },
    } as any;
    const knexMock = {
      table: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue([1]),
    } as any as Knex;
    const eventController = new EventControllers(knexMock, encryptKey);
    await eventController.handleContractExecutionError(error, contract, [1]);
    expect(knexMock.table).toHaveBeenCalledWith('contract_exc_detail');
    expect(knexMock.insert).toHaveBeenCalledTimes(2);
  });

  it('Parse body works', () => {
    const dataMock = {
      testString: 'someString',
      testObj: {
        test: 1,
      },
    };
    const eventController = new EventControllers({} as any, encryptKey);
    eventController.getVariables = jest.fn().mockReturnValue('test');
    const result = eventController.parseBodyData(dataMock, {} as any);
    expect(eventController.getVariables).toBeCalledTimes(1);
    expect(result.testString).toBe('test');
  });

  it('IsJsonString function works', () => {
    const eventController = new EventControllers({} as any, encryptKey);
    const isJsonFirst = eventController.IsJsonString('2');
    const isJsonSecond = eventController.IsJsonString('x:x');
    expect(isJsonFirst).toBe(true);
    expect(isJsonSecond).toBe(false);
  });

  it('Get variables works', () => {
    const req = {
      headers: {
        test: '1',
      },
      query: {
        test: '1',
      },
      body: {
        test: 1,
        testData: 1,
        'test-two': {
          test: 1,
        },
      },
    };
    const eventController = new EventControllers({} as any, encryptKey);
    const variableOne = eventController.getVariables(
      'notVariable',
      0,
      req,
      'params',
    );
    const variableTwo = eventController.getVariables(
      '${.headers.test}',
      0,
      req,
      'params',
    );

    const variableThree = eventController.getVariables(
      '${.body.test-two}',
      0,
      req,
      'params',
    );

    const variableFour = eventController.getVariables(
      '${.body.testData}',
      0,
      req,
      'data',
    );
    expect(variableOne).toBe('notVariable');
    expect(variableTwo).toBe('1');
    expect(variableFour).toBe(1);
    expect(JSON.parse(variableThree)).toStrictEqual({
      test: 1,
    });
  });
});
