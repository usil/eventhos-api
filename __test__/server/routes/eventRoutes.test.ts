import { createRouteEvent } from './../../../src/server/routes/eventRoute';
import { Knex } from 'knex';
import util from 'util';
import crypto from 'crypto';

const knex = {} as any as Knex;

jest.mock('nanoid', () => {
  return { nanoid: () => '1234' };
});

const mockSecureExpress = {
  obPost: jest.fn(),
  obGet: jest.fn(),
  obPut: jest.fn(),
  obDelete: jest.fn(),
};

const oauthBoot = {
  bootOauthExpressRouter: jest.fn().mockReturnValue(mockSecureExpress),
};

describe('Event routes works', () => {
  const scryptPromise = util.promisify(crypto.scrypt);

  it('Adds all routes', async () => {
    const encryptKey = (await scryptPromise('secret', 'salt', 32)) as Buffer;

    const actionRouteResult = createRouteEvent(knex, oauthBoot, encryptKey);

    expect(mockSecureExpress.obPost).toHaveBeenCalledWith(
      '/',
      'event:create',
      expect.anything(),
    );

    expect(mockSecureExpress.obPost).toHaveBeenCalledWith(
      '/send',
      ':',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );

    expect(mockSecureExpress.obGet).toHaveBeenCalledWith(
      '/received',
      'event:select',
      expect.anything(),
    );

    expect(mockSecureExpress.obGet).toHaveBeenCalledWith(
      '/',
      'event:select',
      expect.anything(),
    );

    expect(mockSecureExpress.obPut).toHaveBeenCalledWith(
      '/:id',
      'event:update',
      expect.anything(),
    );

    expect(mockSecureExpress.obDelete).toHaveBeenCalledWith(
      '/:id',
      'event:delete',
      expect.anything(),
    );

    expect(actionRouteResult.route).toBe('/event');

    expect(mockSecureExpress.obPost).toHaveBeenCalledWith(
      '/send/contract',
      ':',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });
});
