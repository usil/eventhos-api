import { basicContent } from '../listRecivedEvents.mocked';
import EventControllers from '../../../src/server/controllers/event.controller';
import { Request, Response } from 'express';
import knex, { Knex } from 'knex';
import axios, { AxiosError, AxiosResponse } from 'axios';
import ReceivedEvent from '../../../src/server/dtos/RecivedEvent.dto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import util from 'util';

const scryptPromise = util.promisify(crypto.scrypt);

const mockNext = jest.fn();

jest.mock('nanoid', () => {
  return { nanoid: () => '1234' };
});

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
  //----------------------------------|||||||||||---------------------------------------
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

    eventControllers.returnError = jest.fn();

    it('Event validation middleware, correct message when no query is send', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {};
        req.headers = {};
        return req;
      };

      const mockResponse = mockRes();
      eventControllers.returnError = jest.fn();
      await eventControllers.eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );
      expect(eventControllers.returnError).toHaveBeenCalledWith(
        'Either the access key or the identifier for the event was not send.',
        'Either the access key or the identifier for the event was not send.',
        400201,
        400,
        'eventValidation',
        mockedNext,
      );
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

      eventControllers.returnError = jest.fn();

      await eventControllers.eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );

      expect(eventControllers.returnError).toHaveBeenCalledWith(
        'The event some does not exist.',
        'The event some does not exist.',
        400202,
        400,
        'eventValidation',
        mockedNext,
      );
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

      eventControllers.returnError = jest.fn();

      await eventControllers.eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );

      expect(eventControllers.returnError).toHaveBeenCalledWith(
        'The client access has been revoked.',
        'The client access has been revoked.',
        403201,
        403,
        'eventValidation',
        mockedNext,
      );
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

      eventControllers.returnError = jest.fn();

      await eventControllers.eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );

      expect(eventControllers.returnError).toHaveBeenCalledWith(
        'The client does not exist.',
        'The client does not exist.',
        404201,
        404,
        'eventValidation',
        mockedNext,
      );
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

      eventControllers.returnError = jest.fn();

      await eventControllers.eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );

      expect(eventControllers.returnError).toHaveBeenCalledWith(
        'Incorrect token',
        'Incorrect token',
        401202,
        401,
        'eventValidation',
        mockedNext,
      );

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

      eventControllers.returnError = jest.fn();

      await eventControllers.eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );

      expect(eventControllers.returnError).toHaveBeenCalledWith(
        'Incorrect token',
        'Incorrect token',
        401201,
        401,
        'eventValidation',
        mockedNext,
      );

      expect(bcryptSpy).toHaveBeenCalled();

      bcryptSpy.mockRestore();
    });
    //--------------------   |||||<<<<>>>>>>   ----------------------------------------------------------------
    // eslint-disable-next-line jest/expect-expect
    it('Error 500', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {
          'event-identifier': 'new_profesor',
          'access-key': 'asecurekey',
        };
        req.headers = {};
        return req;
      };

      const mockResponse = mockRes();

      const localKnexMock = mockKnex();

      localKnexMock.where = jest
        .fn()
        .mockReturnValue(localKnexMock)
        .mockImplementation(() => {
          throw new Error();
        });
      eventControllers.knexPool = localKnexMock;
      eventControllers.returnError = jest.fn();
      const r = await eventControllers.eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );
      expect(eventControllers.returnError).toHaveBeenCalled();
    });
  });

  //------------------------------------------------|||||||||||||||||------------------------------------

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
      eventControllers.returnError = jest.fn();
      await eventControllers.getEventContracts(
        mockReq(),
        mockResponse,
        mockedNext,
      );
      expect(eventControllers.returnError).toHaveBeenCalledWith(
        'Event Id was not send.',
        'Event Id was not send.',
        400203,
        400,
        'getEventContracts',
        mockedNext,
      );
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

      eventControllers.returnError = jest.fn();

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

      eventControllers.returnError = jest.fn();

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

      expect(eventControllers.returnError).toHaveBeenCalled();
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
        knex.orWhere = jest.fn().mockReturnValue(knex);
        knex.table = jest.fn().mockReturnValue(knex);
        knex.leftJoin = jest.fn().mockReturnValue(knex);
        knex.count = jest.fn().mockResolvedValue([{ 'count(*)': 1 }]);
        knex.countDistinct = jest.fn().mockResolvedValue([{ 'count(distinct `received_event`.`id`)': 1 }]);
        knex.join = jest.fn().mockReturnValue(knex);
        return knex;
      });

      const eventControllers = new EventControllers(
        knexMock as any,
        encryptKey,
      );

      eventControllers.returnError = jest.fn();
      await eventControllers.listReceivedEvents(
        mockReq(),
        mockResponse,
        mockNext,
      );
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

    it.skip('List received events with filters', async () => {
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
        knex.countDistinct = jest.fn().mockResolvedValue([{ 'count(distinct `received_event`.`id`)': 1 }]);
        knex.join = jest.fn().mockReturnValue(knex);
        return knex;
      });

      const eventControllers = new EventControllers(
        knexMock as any,
        encryptKey,
      );

      eventControllers.returnError = jest.fn();
      await eventControllers.listReceivedEvents(
        mockReq(),
        mockResponse,
        mockNext,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      // expect(whereMock).toHaveBeenCalledTimes(6);
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

      eventControllers.returnError = jest.fn();
      await eventControllers.listReceivedEvents(
        mockReq(),
        mockResponse,
        mockNext,
      );
      expect(eventControllers.returnError).toHaveBeenCalled();
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

      eventControllers.returnError = jest.fn();
      eventControllers.getVariables = jest.fn().mockReturnValue('goodDATA');
      eventControllers.decryptString = jest
        .fn()
        .mockReturnValue(
          '{"headers": {"X": 1}, "params": {"X": 1}, "data": {"X": 1}}',
        );
      await eventControllers.manageEvent(req, res, mockNext);
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

      eventControllers.returnError = jest.fn();
      eventControllers.getVariables = jest.fn().mockReturnValue('goodDATA');
      eventControllers.decryptString = jest
        .fn()
        .mockReturnValue(
          '{"headers": {"X": 1}, "params": {"X": 1}, "data": {}}',
        );
      await eventControllers.manageEvent(req, res, mockNext);
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

      eventControllers.returnError = jest.fn();

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

      eventControllers.returnError = jest.fn();

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

      eventControllers.returnError = jest.fn();

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

      eventControllers.returnError = jest.fn();
      await eventControllers.manageEvent(req, res, mockNext);
      expect(eventControllers.returnError).toHaveBeenCalledWith(
        'Event Id or Event Contract List was not send.',
        'Event Id or Event Contract List was not send.',
        400204,
        400,
        'manageEvent',
        mockNext,
      );
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

      eventControllers.returnError = jest.fn();
      await eventControllers.manageEvent(req, res, mockNext);
      expect(eventControllers.returnError).toHaveBeenCalledWith(
        'Event Id is not a number.',
        'Event Id is not a number.',
        400205,
        400,
        'manageEvent',
        mockNext,
      );
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

      eventControllers.returnError = jest.fn();
      await eventControllers.manageEvent(req, res, mockNext);
      expect(eventControllers.returnError).toHaveBeenCalledWith(
        'Event Contract is not an array.',
        'Event Contract is not an array.',
        400206,
        400,
        'manageEvent',
        mockNext,
      );
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

      eventControllers.returnError = jest.fn();
      await eventControllers.manageEvent(req, res, mockNext);
      expect(eventControllers.returnError).toHaveBeenCalled();
    });
  });
  // NEW TEST TO
  describe('Get Event Contract Flow', () => {
    it('Get event contract - correct', async () => {
      const mockedNext = jest.fn();
      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {
          'contract-id': '10',
        };
        req.headers = {};
        req.body = {
          contractDetailId: 1,
          receivedEventId: 2,
        };
        req.method = 'get';
        req.protocol = 'https';
        req.get = jest.fn().mockReturnValue('host');
        req.originalUrl = 'original.www';
        return req;
      };
      const mockRes = () => {
        const res = {} as Response;
        res.locals = {
          eventId: 10,
        };
        return res;
      };
      const knexMock = {
        where: jest.fn().mockReturnThis(),
        table: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        join: jest.fn().mockReturnThis(),
      } as any as Knex;
      const eventControllers = new EventControllers(knexMock, encryptKey);
      await eventControllers.getEventContract(mockReq(), mockRes(), mockedNext);
      expect(mockedNext.mock.calls.length).toBe(1);
      expect(knexMock.from).toHaveBeenCalledWith('contract');
      expect(knexMock.join).toHaveBeenCalledWith(
        'event',
        'contract.event_id',
        'event.id',
      );
      expect(knexMock.join).toHaveBeenCalledWith(
        'action',
        'contract.action_id',
        'action.id',
      );
      expect(knexMock.join).toHaveBeenCalledWith(
        'action_security',
        'action.id',
        'action_security.action_id',
      );
    });
    it('Get event contract - without received event id', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = { 'contract-id': '10' };
        req.body = { contractDetailId: 15 };
        return req;
      };

      const mockResponse = mockRes();
      mockResponse.locals = { eventId: 10 };
      const eventControllers = new EventControllers(knex({}), encryptKey);
      eventControllers.returnError = jest.fn();
      await eventControllers.getEventContract(
        mockReq(),
        mockResponse,
        mockedNext,
      );
      expect(eventControllers.returnError).toHaveBeenCalledWith(
        'Received event Id was not send.',
        'Received event Id was not send.',
        400203,
        400,
        'getEventContract',
        mockedNext,
      );
    });
    it('Get event contract - without event id', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = { 'contract-id': '10' };
        req.body = { contractDetailId: 15, receivedEventId: 1 };
        return req;
      };

      const mockResponse = mockRes();
      const eventControllers = new EventControllers(knex({}), encryptKey);
      eventControllers.returnError = jest.fn();
      await eventControllers.getEventContract(
        mockReq(),
        mockResponse,
        mockedNext,
      );
      expect(eventControllers.returnError).toHaveBeenCalledWith(
        'Event Id was not send.',
        'Event Id was not send.',
        400203,
        400,
        'getEventContract',
        mockedNext,
      );
    });
    it('Get event contract - without contract detail id', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = { 'contract-id': '1' };
        req.body = { receivedEventId: 10 };
        return req;
      };

      const mockResponse = mockRes();
      mockResponse.locals = { eventId: 10 };
      const eventControllers = new EventControllers(knex({}), encryptKey);
      eventControllers.returnError = jest.fn();
      await eventControllers.getEventContract(
        mockReq(),
        mockResponse,
        mockedNext,
      );
      expect(eventControllers.returnError).toHaveBeenCalledWith(
        'Contract detail Id was not send.',
        'Contract detail Id was not send.',
        400203,
        400,
        'getEventContract',
        mockedNext,
      );
    });
    it('Get event contract - Error 500', async () => {
      const mockedNext = jest.fn();
      const eventControllers = new EventControllers(knex({}), encryptKey);
      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {};
        return req;
      };

      const mockResponse = mockRes();

      mockResponse.locals.eventId = 1;
      eventControllers.returnError = jest.fn();

      await eventControllers.getEventContract(
        mockReq(),
        mockResponse,
        mockedNext,
      );
      expect(eventControllers.returnError).toHaveBeenCalled();
      expect(eventControllers.returnError).toHaveBeenCalledTimes(1);
    });
  });
  describe('Manage Event Contract Flow', () => {
    it('Manage Event Contract - without event id', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        return req;
      };

      const mockResponse = mockRes();
      mockResponse.locals = {
        eventContract: {},
        contractDetailId: 1,
      };
      const eventControllers = new EventControllers(knex({}), encryptKey);
      eventControllers.returnError = jest.fn();
      await eventControllers.manageEventContract(
        mockReq(),
        mockResponse,
        mockedNext,
      );
      expect(eventControllers.returnError).toHaveBeenCalledWith(
        'Event Id or Event Contract List was not send.',
        'Event Id or Event Contract List was not send.',
        400204,
        400,
        'manageEventContract',
        mockedNext,
      );
    });
    it('Manage Event Contract - without event contract', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        return req;
      };

      const mockResponse = mockRes();
      mockResponse.locals = {
        eventId: 1,
        contractDetailId: 1,
      };
      const eventControllers = new EventControllers(knex({}), encryptKey);
      eventControllers.returnError = jest.fn();
      await eventControllers.manageEventContract(
        mockReq(),
        mockResponse,
        mockedNext,
      );
      expect(eventControllers.returnError).toHaveBeenCalledWith(
        'Event Id or Event Contract List was not send.',
        'Event Id or Event Contract List was not send.',
        400204,
        400,
        'manageEventContract',
        mockedNext,
      );
    });
    it('Manage Event Contract - without contract detail id', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        return req;
      };

      const mockResponse = mockRes();
      mockResponse.locals = {
        eventId: 1,
        eventConract: {},
      };
      const eventControllers = new EventControllers(knex({}), encryptKey);
      eventControllers.returnError = jest.fn();
      await eventControllers.manageEventContract(
        mockReq(),
        mockResponse,
        mockedNext,
      );
      expect(eventControllers.returnError).toHaveBeenCalledWith(
        'Event Id or Event Contract List was not send.',
        'Event Id or Event Contract List was not send.',
        400204,
        400,
        'manageEventContract',
        mockedNext,
      );
    });
  });
  it('Handle message reading no error', () => {
    const eventControllers = new EventControllers({} as any, encryptKey);
    eventControllers.executeMultipleContracts = jest.fn();

    const message = {
      mock: 1,
    };

    const mockRawMessage = JSON.stringify(message);

    const logMock = {
      info: jest.fn(),
    };

    const configuration = {
      log: jest.fn().mockReturnValue(logMock),
    };

    const client = {
      ack: jest.fn(),
    } as any;

    const messageObj = { mock: 1 } as any;

    eventControllers.handleMessageReading(
      null as any,
      mockRawMessage,
      configuration,
      client,
      messageObj,
    );

    expect(configuration.log).toHaveBeenCalled();
    expect(logMock.info).toHaveBeenCalledWith(
      'received message: ' + mockRawMessage,
    );

    expect(eventControllers.executeMultipleContracts).toHaveBeenCalled();
    expect(client.ack).toHaveBeenCalledWith(messageObj);
  });

  it('Handle message reading with error', () => {
    const eventControllers = new EventControllers({} as any, encryptKey);
    eventControllers.executeMultipleContracts = jest.fn();

    const message = {
      mock: 1,
    };

    const mockRawMessage = JSON.stringify(message);

    const logMock = {
      error: jest.fn(),
    };

    const configuration = {
      log: jest.fn().mockReturnValue(logMock),
    };

    const client = {
      ack: jest.fn(),
    } as any;

    const messageObj = { mock: 1 } as any;

    eventControllers.handleMessageReading(
      { message: 'error' } as any,
      mockRawMessage,
      configuration,
      client,
      messageObj,
    );

    expect(logMock.error).toHaveBeenCalledWith('read message error ' + 'error');
  });

  it('Error function', () => {
    const knex = {} as any as Knex;
    const eventController = new EventControllers(knex, encryptKey);

    const nextErrorMock = jest.fn();

    eventController.returnError(
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
      onFile: 'event.controller.ts',
      logMessage: 'some error',
      errorObject: undefined,
      originalError: undefined,
    });

    eventController.returnError(
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
      onFile: 'event.controller.ts',
      logMessage: 'some error',
      errorObject: true,
      originalError: undefined,
    });

    eventController.returnError(
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
      onFile: 'event.controller.ts',
      logMessage: 'some error',
      errorObject: undefined,
      originalError: { sqlState: true },
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
    const eventControllers = new EventControllers({} as Knex, encryptKey);
    eventControllers.handleDecodeData(decode, client, res, nextFunction, event);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('Handle client subscription no error', () => {
    const eventControllers = new EventControllers({} as any, encryptKey);
    eventControllers.handleMessageReading = jest.fn();
    const message = {
      readString: jest.fn(),
    } as any;

    const logMock = {
      info: jest.fn(),
    };

    const configuration = {
      log: jest.fn().mockReturnValue(logMock),
    };

    const client = {
      ack: jest.fn(),
    } as any;

    eventControllers.clientSubscriptionHandler(
      null as any,
      message,
      configuration,
      client,
    );

    expect(message.readString).toHaveBeenCalled();
  });

  it('Handle client subscription with error', () => {
    const eventControllers = new EventControllers({} as any, encryptKey);
    eventControllers.handleMessageReading = jest.fn();
    const message = {
      readString: jest.fn(),
    } as any;

    const logMock = {
      error: jest.fn(),
    };

    const configuration = {
      log: jest.fn().mockReturnValue(logMock),
    };

    const client = {
      ack: jest.fn(),
    } as any;

    eventControllers.clientSubscriptionHandler(
      { message: 'error' } as any,
      message,
      configuration,
      client,
    );

    expect(logMock.error).toHaveBeenCalledWith('subscribe error error');
  });

  it('Subscribe to queue works', () => {
    const eventControllers = new EventControllers({} as any, encryptKey);
    eventControllers.clientSubscriptionHandler = jest.fn();

    const client = {
      subscribe: jest.fn(),
    } as any;

    const configuration = {
      queue: {
        destination: 'destiny',
      },
    };

    eventControllers.subscribeToQueue(client, configuration as any);

    expect(client.subscribe).toHaveBeenCalled();
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
    eventControllers.returnError = jest.fn();
    eventControllers.handleDecodeData(decode, client, res, nextFunction, event);
    expect(eventControllers.returnError).toHaveBeenCalledWith(
      'Incorrect token',
      'Incorrect token',
      401202,
      401,
      'handleDecodeData',
      nextFunction,
    );
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
    await eventControllers.getContractExecutionDetail(req, res, mockNext);
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
    await eventControllers.getContractExecutionDetail(req, res, mockNext);
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
    await eventControllers.getEvents(req, res, mockNext);

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
    await eventControllers.getEvents(req, res, mockNext);

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
    await eventControllers.getEvents(req, res, mockNext);

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
    await eventControllers.deleteEvent(req, res, mockNext);

    expect(knexMock.table).toBeCalledWith('contract');
    expect(knexMock.table).toBeCalledWith('event');

    expect(knexMock.update).toBeCalledWith('deleted', true);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      code: 200001,
      message: 'success',
    });
  });

  describe('Event routes work accordingly event with queue', () => {
    it('Constructor queue works', () => {
      const spy = jest
        .spyOn(EventControllers.prototype, 'subscribeToQueue')
        .mockImplementation(() => {
          return true as any;
        });

      const eventController = new EventControllers(
        {} as Knex,
        0 as any,
        {
          mock: true,
        } as any,
      );
      expect(eventController.subscribeToQueue).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('Manage event correct', async () => {
      const spy = jest
        .spyOn(EventControllers.prototype, 'subscribeToQueue')
        .mockImplementation(() => {
          return true as any;
        });

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

      const frame = {
        write: jest.fn(),
        end: jest.fn(),
      };

      const client = {
        send: jest.fn().mockReturnValue(frame),
      };

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
        client as any,
      );
      eventControllers.getVariables = jest.fn().mockReturnValue('goodDATA');
      eventControllers.decryptString = jest
        .fn()
        .mockReturnValue(
          '{"headers": {"X": 1}, "params": {"X": 1}, "data": {"X": 1}}',
        );
      await eventControllers.manageEvent(req, res, mockNext);

      expect(client.send).toHaveBeenCalled();
      expect(frame.end).toHaveBeenCalled();
      expect(frame.write).toHaveBeenCalled();

      spy.mockRestore();
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
    eventControllers.returnError = jest.fn();
    await eventControllers.deleteEvent(req, res, mockNext);

    expect(knexMock.table).toBeCalledWith('contract');

    expect(eventControllers.returnError).toHaveBeenCalledWith(
      'Event has active contracts',
      'Event has active contracts',
      400207,
      400,
      'manageEvent',
      mockNext,
    );
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
    await eventControllers.deleteEvent(req, res, mockNext);

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
    await eventControllers.updateEvent(req, res, mockNext);

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
    await eventControllers.updateEvent(req, res, mockNext);

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
    await eventControllers.createEvent(req, res, mockNext);

    expect(knexMock.table).toHaveBeenCalledWith('event');
    expect(knexMock.insert).toHaveBeenCalledWith({
      system_id: 1,
      identifier: 'Identifier-1234',
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
    await eventControllers.createEvent(req, res, mockNext);

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
    ) as any;

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
    await eventControllers.getReceivedEventDetails(req, res, mockNext);

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
      'contract_exc_detail.attempts as attempts',
      'contract_exc_detail.is_aborted as isAborted',
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
    await eventControllers.getReceivedEventDetails(req, res, mockNext);

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
