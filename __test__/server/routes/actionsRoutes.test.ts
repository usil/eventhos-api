import { Knex } from 'knex';
import { createRouteAction } from './../../../src/server/routes/actionRoutes';

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

describe('Action routes works', () => {
  it('Adds all routes', () => {
    const actionRouteResult = createRouteAction(knex, oauthBoot);

    expect(mockSecureExpress.obPost).toHaveBeenCalledWith(
      '/',
      'action:create',
      expect.anything(),
    );

    expect(mockSecureExpress.obGet).toHaveBeenCalledWith(
      '/',
      'action:select',
      expect.anything(),
    );

    expect(mockSecureExpress.obPut).toHaveBeenCalledWith(
      '/:id',
      'action:update',
      expect.anything(),
    );

    expect(mockSecureExpress.obDelete).toHaveBeenCalledWith(
      '/:id',
      'action:delete',
      expect.anything(),
    );

    expect(actionRouteResult.route).toBe('/action');
  });
});
