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

  authRouter.obGet('/', 'system:select', controllers.getSystems);

  authRouter.obGet('/:id', 'system:select', controllers.getSystem);

  authRouter.obGet(
    '/:id/actions',
    'system:select',
    controllers.getSystemActions,
  );

  authRouter.obPut('/:id', 'system:update', controllers.updateSystem);

  authRouter.obDelete('/:id', 'system:delete', controllers.deleteSystem);

  authRouter.obGet('/:id/events', 'system:select', controllers.getSystemEvents);

  authRouter.obGet(
    '/:id/actions',
    'system:select',
    controllers.getSystemActions,
  );

  return eventRoute;
};
