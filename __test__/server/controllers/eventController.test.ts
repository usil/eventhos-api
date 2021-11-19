import {
  basicContent,
  listPaginatedSizeFour,
  listPaginatedSizeTwo,
} from '../listRecivedEvents.mocked';
import EventControllers from '../../../src/server/controllers/event.controller';
import { Request, Response } from 'express';
import knex, { Knex } from 'knex';
import axios from 'axios';
import { firstValueFrom, of, throwError } from 'rxjs';
jest.mock('axios', () => jest.fn());
jest.mock('knex', () => {
  const mKnex = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    first: jest.fn().mockReturnThis(),
    table: jest.fn().mockReturnThis(),
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

      localKnexMock.where = jest
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

    it('Event validation middleware, correct message when producer key incorrect', async () => {
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

      localKnexMock.where = jest
        .fn()
        .mockReturnValue(localKnexMock)
        .mockResolvedValue({
          key: 'asecurekey',
          identifier: 'new_profesor',
          id: 1,
        });

      eventControllers.knexPool = localKnexMock;
      await eventControllers.eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 400023,
        message: `Key incorrect.`,
      });
    });

    it('Event validation middleware, correct message', async () => {
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
        .mockResolvedValue({
          key: 'asecurekey',
          identifier: 'new_profesor',
          id: 1,
        });
      eventControllers.knexPool = localKnexMock;

      await eventControllers.eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );

      expect(mockedNext.mock.calls.length).toBe(1);
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
      expect(mockResponse.status).toHaveBeenCalledWith(203);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 20031,
        message: 'success, but no contracts exists for this event',
      });
    });
    it('Next is called', async () => {
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
    it('500 error sql', async () => {
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

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 500001,
        message: `Data base error, with code 1`,
      });
    });
  });

  describe('Correct Event Management', () => {
    let eventControllers: EventControllers;
    beforeAll(() => {
      eventControllers = new EventControllers(knex({}));
    });
    it('Not event id or contract list is sended', async () => {
      const mockReq = () => {
        const req: Request = {} as Request;
        return req;
      };

      const localRes = mockRes();

      localRes.locals.eventId = 1;

      const mockResponse = mockRes();

      await eventControllers.manageEvent(mockReq(), mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 400020,
        message: 'Event Id or Event Contract List was not send.',
      });
    });

    it('Not event id is NaN', async () => {
      const mockReq = () => {
        const req: Request = {} as Request;
        return req;
      };

      const localRes = mockRes();

      localRes.locals.eventId = 'xsd';
      localRes.locals.eventContracts = [];

      await eventControllers.manageEvent(mockReq(), localRes);
      expect(localRes.status).toHaveBeenCalledWith(400);
      expect(localRes.json).toHaveBeenCalledWith({
        code: 400020,
        message: 'Event Id is not a number.',
      });
    });

    it('Contract is not an array', async () => {
      const mockReq = () => {
        const req: Request = {} as Request;
        return req;
      };

      const localRes = mockRes();

      localRes.locals.eventId = 1;
      localRes.locals.eventContracts = 2;

      await eventControllers.manageEvent(mockReq(), localRes);
      expect(localRes.status).toHaveBeenCalledWith(400);
      expect(localRes.json).toHaveBeenCalledWith({
        code: 400020,
        message: 'Event Contract is not an array.',
      });
    });

    it('Correct management', async () => {
      const mockReq = () => {
        const req: Request = {} as Request;
        return req;
      };

      const localRes = mockRes();

      localRes.locals.eventId = 1;
      localRes.locals.eventContracts = [
        {
          action: { http_configuration: { url: 'url' } },
          contract: { identifier: 'aniden' },
        },
      ];

      const spy = jest
        .spyOn(eventControllers, 'createAxiosObservable')
        .mockReturnValue(
          of({
            data: { someData: 'someData' },
            status: 200,
            statusText: '',
            headers: { someData: 'someData' },
            config: { url: 'someData' },
          }),
        );
      await eventControllers.manageEvent(mockReq(), localRes);
      expect(spy).toBeCalledTimes(1);
      spy.mockRestore();
      expect(localRes.status).toHaveBeenCalledWith(200);
      expect(localRes.json).toHaveBeenCalledWith({
        code: 20000,
        message: 'success',
      });
    });

    it('Correct management but it errors', async () => {
      const mockReq = () => {
        const req: Request = {} as Request;
        return req;
      };

      const localRes = mockRes();

      localRes.locals.eventId = 1;
      localRes.locals.eventContracts = [
        {
          action: { http_configuration: { url: 'url' } },
          contract: { identifier: 'aniden' },
        },
      ];

      const spy = jest
        .spyOn(eventControllers, 'createAxiosObservable')
        .mockReturnValue(throwError(() => new Error('test')));
      await eventControllers.manageEvent(mockReq(), localRes);
      expect(spy).toBeCalledTimes(1);
      spy.mockRestore();
      expect(localRes.status).toHaveBeenCalledWith(200);
      expect(localRes.json).toHaveBeenCalledWith({
        code: 20000,
        message: 'success',
      });
    });

    it('500 error sql', async () => {
      const mockReq = () => {
        const req: Request = {} as Request;
        return req;
      };

      const localRes = mockRes();

      localRes.locals.eventId = 1;
      localRes.locals.eventContracts = [
        {
          action: { http_configuration: { url: 'url' } },
          contract: { identifier: 'aniden' },
        },
      ];

      await eventControllers.manageEvent(mockReq(), localRes);

      expect(localRes.status).toHaveBeenCalledWith(500);
      expect(localRes.json).toHaveBeenCalledWith({
        code: 500001,
        message: `Data base error, with code 1`,
      });
    });
  });

  describe('Gets all of the recived event', () => {
    let eventControllers: EventControllers;
    beforeAll(() => {
      eventControllers = new EventControllers(knex({}));
    });
    it('Validates that receives a page size and that it is a number, not receives it', async () => {
      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {
          'page-size': 'xsd',
        };
        return req;
      };
      const mockResponse = mockRes();
      await eventControllers.listReceivedEvents(mockReq(), mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(listPaginatedSizeFour);
    });

    it('Validates that receives a page size and that it is a number, receives it', async () => {
      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {
          'page-size': '2',
        };
        return req;
      };
      const mockResponse = mockRes();
      await eventControllers.listReceivedEvents(mockReq(), mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(listPaginatedSizeTwo);
    });

    it('500 error sql', async () => {
      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {
          'page-size': '2',
        };
        return req;
      };

      const mockResponse = mockRes();

      mockResponse.locals.eventId = 1;

      await eventControllers.listReceivedEvents(mockReq(), mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 500001,
        message: `Data base error, with code 1`,
      });
    });
  });
});
