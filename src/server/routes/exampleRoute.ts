import exampleControllers from '../controllers/example.controller';
import Route from '../util/Route';

/**
 * @description Create a route
 */
export const createRouteExample = (): Route => {
  const routeName = '/example';

  const exampleRoute = new Route(routeName);

  const controllers = exampleControllers(routeName);

  // * Add all of the routes for /example here

  exampleRoute.router.get('/', controllers.getWorksMessage);

  return exampleRoute;
};
