import { createRouteEvent } from './../../../src/server/routes/eventRoute';
import { Knex } from 'knex';

const knex = {} as any as Knex;

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
  it('Adds all routes', () => {
    const actionRouteResult = createRouteEvent(knex, oauthBoot);

    expect(mockSecureExpress.obPost).toHaveBeenCalledWith(
      '/',
      'event:create',
      expect.anything(),
    );

    expect(mockSecureExpress.obPost).toHaveBeenCalledWith(
      '/received',
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
  });
});
