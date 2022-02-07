import { Knex } from 'knex';
import SystemController from '../controllers/system.controller';
import Route from '../util/Route';

/**
 * @description Create a route
 */
export const createRouteSystem = (knexPool: Knex, oauthBoot: any): Route => {
  const routeName = '/system';

  const eventRoute = new Route(routeName);

  const controllers = new SystemController(knexPool);

  const authRouter = oauthBoot.bootOauthExpressRouter(
    eventRoute.router,
    routeName,
  );

  authRouter.obPost('/', 'system:create', controllers.createSystem);

  return eventRoute;
};
