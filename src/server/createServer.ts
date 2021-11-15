import ServerInitialization from './ServerInitialization';
import { createRouteExample } from './routes/exampleRoute';
import { createRouteEvent } from './routes/eventRoute';

/**
 * @description Creates the server
 */
export const newServer = (port: number) => {
  const serverInit = new ServerInitialization(port);

  /**
   * * Creates the routes for the example.
   */

  const routeExample = createRouteExample();
  serverInit.addRoutes(routeExample);

  const routeEvent = createRouteEvent(serverInit.knexPool);
  serverInit.addRoutes(routeEvent);

  const server = serverInit.createServer();

  return { server, app: serverInit.app };
};
