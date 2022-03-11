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

  const authRouter = oauthBoot.bootOauthExpressRouter(
    eventRoute.router,
    routeName,
  );

  authRouter.obPost('/', 'event:create', controllers.createEvent);

  authRouter.obPost(
    '/received',
    ':',
    controllers.eventValidation,
    controllers.getEventContracts,
    controllers.manageEvent,
  );

  authRouter.obGet('/received', 'event:select', controllers.listReceivedEvents);

  authRouter.obGet(
    '/received/:id',
    'event:select',
    controllers.getReceivedEventDetails,
  );

  authRouter.obGet(
    '/received/execution-detail/:id',
    'event:select',
    controllers.getContractExecutionDetail,
  );

  authRouter.obGet('/', 'event:select', controllers.getEvents);

  authRouter.obPut('/:id', 'event:update', controllers.updateEvent);

  authRouter.obDelete('/:id', 'event:delete', controllers.deleteEvent);

  return eventRoute;
};
