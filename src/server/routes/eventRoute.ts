import { Knex } from 'knex';
import eventControllers from '../controllers/event.controller';
import Route from '../util/Route';

/**
 * @description Create a route
 */
export const createRouteEvent = (knexPool: Knex): Route => {
  const routeName = '/event';

  const eventRoute = new Route(routeName);

  const controllers = eventControllers(knexPool);

  eventRoute.router.post(
    '/',
    controllers.eventValidation,
    controllers.receiveEvent,
  );

  eventRoute.router.get('/', controllers.lisReceivedEvents);

  return eventRoute;
};
