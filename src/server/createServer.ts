import ServerInitialization from './ServerInitialization';
import { createRouteExample } from './routes/exampleRoute';

/**
 * @description Creates the server
 */
export const newServer = (port: number) => {
  const serverInit = new ServerInitialization(port);

  /**
   * * Creates the routes for the example.
   */

  const routesExample = createRouteExample();
  serverInit.addRoutes(routesExample);

  const server = serverInit.createServer();

  return { server, app: serverInit.app };
};
