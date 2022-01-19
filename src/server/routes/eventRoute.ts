import { Knex } from 'knex';
import EventControllers from '../controllers/event.controller';
import Route from '../util/Route';

/**
 * @description Create a route
 */
export const createRouteEvent = (knexPool: Knex, oauthBoot: any): Route => {
  const routeName = '/event';

  const eventRoute = new Route(routeName);

  const controllers = new EventControllers(knexPool);

  const authRouter = oauthBoot.bootOauthExpressRouter(eventRoute.router);

  authRouter.obPost(
    '/',
    'event:create',
    controllers.eventValidation,
    controllers.getEventContracts,
    controllers.manageEvent,
  );

  authRouter.get('/', controllers.listReceivedEvents);

  return eventRoute;
};
