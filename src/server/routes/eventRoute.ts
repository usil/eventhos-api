import { Knex } from 'knex';
import EventControllers from '../controllers/event.controller';
import Route from '../util/Route';

/**
 * @description Create a route
 */
export const createRouteEvent = (knexPool: Knex): Route => {
  const routeName = '/event';

  const eventRoute = new Route(routeName);

  const controllers = new EventControllers(knexPool);

  eventRoute.router.post(
    '/',
    controllers.eventValidation,
    controllers.getEventContracts,
    controllers.manageEvent,
  );

  eventRoute.router.get('/', controllers.listReceivedEvents);

  return eventRoute;
};
