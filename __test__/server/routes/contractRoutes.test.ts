import { createRouteContract } from './../../../src/server/routes/contractRoutes';
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

describe('contract routes works', () => {
  it('Adds all routes', () => {
    const contractRouteResult = createRouteContract(knex, oauthBoot);

    expect(mockSecureExpress.obPost).toHaveBeenCalledWith(
      '/',
      'contract:create',
      expect.anything(),
    );

    expect(mockSecureExpress.obGet).toHaveBeenCalledWith(
      '/',
      'contract:select',
      expect.anything(),
    );

    expect(mockSecureExpress.obPut).toHaveBeenCalledWith(
      '/:id',
      'contract:update',
      expect.anything(),
    );

    expect(mockSecureExpress.obDelete).toHaveBeenCalledWith(
      '/:id',
      'contract:delete',
      expect.anything(),
    );

    expect(contractRouteResult.route).toBe('/contract');
  });
});
