import { createRouteSystem } from './../../../src/server/routes/systemRoutes';
import { Knex } from 'knex';

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

describe('System routes works', () => {
  it('Adds all routes', () => {
    const systemRouteResult = createRouteSystem(knex, oauthBoot);

    expect(mockSecureExpress.obPost).toHaveBeenCalledWith(
      '/',
      'system:create',
      expect.anything(),
    );

    expect(mockSecureExpress.obGet).toHaveBeenCalledWith(
      '/',
      'system:select',
      expect.anything(),
    );

    expect(mockSecureExpress.obGet).toHaveBeenCalledWith(
      '/:id/actions',
      'system:select',
      expect.anything(),
    );

    expect(mockSecureExpress.obPut).toHaveBeenCalledWith(
      '/:id',
      'system:update',
      expect.anything(),
    );

    expect(mockSecureExpress.obDelete).toHaveBeenCalledWith(
      '/:id',
      'system:delete',
      expect.anything(),
    );

    expect(systemRouteResult.route).toBe('/system');
  });
});
