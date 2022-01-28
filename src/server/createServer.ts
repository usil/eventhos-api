import ServerInitialization from './ServerInitialization';
import { createRouteExample } from './routes/exampleRoute';
import { createRouteEvent } from './routes/eventRoute';

/**
 * @description Creates the server
 */
export const newServer = async (port: number) => {
  const serverInit = new ServerInitialization(port);

  /**
   * * Creates the routes for the example.
   */

  await serverInit.init();

  const routeExample = createRouteExample();
  serverInit.addRoutes(routeExample);

  const routeEvent = createRouteEvent(
    serverInit.knexPool,
    serverInit.oauthBoot,
  );
  serverInit.addRoutes(routeEvent);

  const server = serverInit.createServer();

  return { server, app: serverInit.app };
};
