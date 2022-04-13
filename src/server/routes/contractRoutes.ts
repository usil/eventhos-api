import { Knex } from 'knex';
import ContractControllers from '../controllers/contract.controller';
import Route from '../util/Route';

/**
 * @description Create a route
 */
export const createRouteContract = (knexPool: Knex, oauthBoot: any): Route => {
  const routeName = '/contract';

  const contractRoute = new Route(routeName);

  const controllers = new ContractControllers(knexPool);

  const authRouter = oauthBoot.bootOauthExpressRouter(
    contractRoute.router,
    routeName,
  );

  authRouter.obPost('/', 'contract:create', controllers.createContract);

  authRouter.obGet('/', 'contract:select', controllers.getContracts);

  authRouter.obPut('/order', 'contract:update', controllers.editContractOrders);

  authRouter.obPut('/:id', 'contract:update', controllers.updateContract);

  authRouter.obDelete('/:id', 'contract:delete', controllers.deleteContract);

  authRouter.obGet(
    '/event/:eventId',
    'contract:select',
    controllers.getContractsFromEvent,
  );

  return contractRoute;
};
