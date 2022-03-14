import { createRouteContract } from './routes/contractRoutes';
import ServerInitialization from './ServerInitialization';
import { createRouteEvent } from './routes/eventRoute';
import { createRouteSystem } from './routes/systemRoutes';
import { createRouteAction } from './routes/actionRoutes';

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

  const routeAction = createRouteAction(
    serverInit.knexPool,
    serverInit.oauthBoot,
  );
  serverInit.addRoutes(routeAction);

  const routeContract = createRouteContract(
    serverInit.knexPool,
    serverInit.oauthBoot,
  );
  serverInit.addRoutes(routeContract);

  const server = serverInit.createServer();

  return { server, app: serverInit.app };
};
