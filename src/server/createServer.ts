import ServerInitialization from './ServerInitialization';
import { createRouteEvent } from './routes/eventRoute';
import { createRouteSystem } from './routes/systemRoutes';

/**
 * @description Creates the server
 */
export const newServer = async (port: number) => {
  const serverInit = new ServerInitialization(port);

  /**
   * * Creates the routes for the example.
   */

  await serverInit.init();

  const routeEvent = createRouteEvent(
    serverInit.knexPool,
    serverInit.oauthBoot,
  );
  serverInit.addRoutes(routeEvent);

  const routeSystem = createRouteSystem(
    serverInit.knexPool,
    serverInit.oauthBoot,
  );
  serverInit.addRoutes(routeSystem);

  const server = serverInit.createServer();

  return { server, app: serverInit.app };
};
