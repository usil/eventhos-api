import { basicContent } from '../listRecivedEvents.mocked';
import EventControllers from '../../../src/server/controllers/event.controller';
import { Request, Response } from 'express';
import knex, { Knex } from 'knex';
import axios from 'axios';
import { firstValueFrom } from 'rxjs';
import ReceivedEvent from '../../../src/server/dtos/RecivedEvent.dto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

jest.mock('axios', () => jest.fn());
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
  const mockRes = () => {
    const res: Response = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.locals = {};
    return res;
  };

  it('Creates an axios observable from a json file', async () => {
    const eventControllers = new EventControllers(knex({}));
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

    const eventControllers = new EventControllers(mockKnex());

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
    const eventControllers = new EventControllers(knex({}));

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

      const eventControllersInternal = new EventControllers(mockedKnex);

      await eventControllersInternal.getEventContracts(
        mockReq(),
        mockResponse,
        mockNext,
      );
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

      const eventControllersInternal = new EventControllers(mockedKnex);

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
        req.query = { itemsPerPage: '10', pageIndex: '1', order: 'desc' };
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
        knex.orderBy = jest.fn();
        knex.select = jest.fn().mockReturnValue(knex);
        knex.where = jest.fn().mockReturnValue(knex);
        knex.table = jest.fn().mockReturnValue(knex);
        knex.leftJoin = jest.fn().mockReturnValue(knex);
        knex.count = jest.fn().mockResolvedValue([{ 'count(*)': 1 }]);
        knex.join = jest.fn().mockImplementation((some) => {
          knex.join = jest.fn().mockReturnValueOnce(receivedEvents);
          return knex;
        });
        return knex;
      });

      const eventControllers = new EventControllers(knexMock as any);
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

      const eventControllers = new EventControllers(knexMock as any);
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
      const eventControllers = new EventControllers(knexMock as any);
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

    it('Manage event correct not correct locals', async () => {
      const mockRes = () => {
        const res = {} as Response;
        res.locals = {
          eventId: 1,
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
      const eventControllers = new EventControllers(knexMock as any);
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
      const eventControllers = new EventControllers(knexMock as any);
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
      const eventControllers = new EventControllers(knexMock as any);
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
      const eventControllers = new EventControllers(knexMock as any);
      await eventControllers.manageEvent(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
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
    const eventControllers = new EventControllers({} as Knex);
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
    const eventControllers = new EventControllers({} as Knex);
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
    const eventControllers = new EventControllers(knexMock);
    eventControllers.decryptString = jest.fn().mockReturnValue('{}');
    const res = mockRes();
    await eventControllers.getContractExecutionDetail(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
  });
});
