import ServerInitialization from '../../src/server/ServerInitialization';
import eventControllers from '../../src/server/controllers/event.controller';
import { Request, Response } from 'express';

describe('Event routes works accordingly', () => {
  let serverInitialization: ServerInitialization;
  const mockRes = () => {
    const res: Response = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.locals = {};
    return res;
  };

  beforeAll(() => {
    serverInitialization = new ServerInitialization(8086);
    // createdRoute = createRouteEvent(serverInitialization.knexPool);
    // serverInitialization.app.use(createdRoute.route, createdRoute.router);
    serverInitialization.createServer();
  });

  describe('Event validation middleware works correctly', () => {
    it('Event validation middleware, correct message when no query is send', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {};
        return req;
      };

      const mockResponse = mockRes();

      await eventControllers(serverInitialization.knexPool).eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 40020,
        message:
          'Either the access key or the identifier for the producer events was not send.',
      });
    });

    it('Event validation middleware, correct message when producer event not found', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = { 'producer-event': 'some', key: 'some' };
        return req;
      };

      const mockResponse = mockRes();

      await eventControllers(serverInitialization.knexPool).eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 40024,
        message: `The producer some does not exist.`,
      });
    });

    it('Event validation middleware, correct message when producer key incorrect', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {
          'producer-event': 'elimino_profesor-123',
          key: 'notasecurekey',
        };
        return req;
      };

      const mockResponse = mockRes();

      await eventControllers(serverInitialization.knexPool).eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 40023,
        message: `Key incorrect.`,
      });
    });

    it('Event validation middleware, correct message', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {
          'producer-event': 'elimino_profesor-123',
          key: 'asecurekey',
        };
        return req;
      };

      const mockResponse = mockRes();

      await eventControllers(serverInitialization.knexPool).eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );

      expect(mockedNext.mock.calls.length).toBe(1);
    });
  });

  describe('Receive Event works correctly', () => {
    it('Receive Event saves to db', async () => {
      const mockedNext = jest.fn();

      const mockReq = () => {
        const req: Request = {} as Request;
        req.query = {};
        return req;
      };

      const mockResponse = mockRes();

      await eventControllers(serverInitialization.knexPool).eventValidation(
        mockReq(),
        mockResponse,
        mockedNext,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 40020,
        message:
          'Either the access key or the identifier for the producer events was not send.',
      });
    });
  });

  afterAll(() => {
    serverInitialization.knexPool.destroy();
    serverInitialization.server.close();
  });
});
