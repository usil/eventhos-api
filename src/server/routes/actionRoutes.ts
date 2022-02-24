import { Knex } from 'knex';
import ActionControllers from '../controllers/action.controller';
import Route from '../util/Route';

/**
 * @description Create a route
 */
export const createRouteAction = (knexPool: Knex, oauthBoot: any): Route => {
  const routeName = '/action';

  const actionRoute = new Route(routeName);

  const controllers = new ActionControllers(knexPool);

  const authRouter = oauthBoot.bootOauthExpressRouter(
    actionRoute.router,
    routeName,
  );

  authRouter.obPost('/', 'action:create', controllers.createAction);

  authRouter.obGet('/', 'action:select', controllers.getActions);

  authRouter.obPut('/:id', 'action:update', controllers.updateAction);

  authRouter.obDelete('/:id', 'action:delete', controllers.deleteAction);

  return actionRoute;
};
