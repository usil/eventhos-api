import { createRouteContract } from './routes/contractRoutes';
import ServerInitialization from './ServerInitialization';
import { createRouteEvent } from './routes/eventRoute';
import { createRouteSystem } from './routes/systemRoutes';
import { createRouteAction } from './routes/actionRoutes';
import util from 'util';
import crypto from 'crypto';
import { getConfig } from '../../config/main.config';
import queueHelpers from './controllers/helpers/QueueHelpers';
import { Client } from 'stompit';
/**
 * @description Creates the server
 */
export const newServer = async (port: number) => {
  const configuration = getConfig();
  const scryptPromise = util.promisify(crypto.scrypt);

  const serverInit = new ServerInitialization(port);

  /**
   * * Creates the routes for the example.
   */

  await serverInit.init();

  const encryptKey = (await scryptPromise(
    configuration.encryption.key,
    'salt',
    32,
  )) as Buffer;

  let queueClient: Client;

  if (configuration.queue.active) {
    queueClient = await queueHelpers.connect({
      host: configuration.queue.host,
      port: configuration.queue.port,
      connectHeaders: {
        host: '/',
        login: configuration.queue.user,
        passcode: configuration.queue.password,
        'heart-beat': '5000,5000',
      },
    });

    [
      `exit`,
      `SIGINT`,
      `SIGUSR1`,
      `SIGUSR2`,
      `uncaughtException`,
      `SIGTERM`,
    ].forEach((eventType) => {
      process.on(eventType, () => {
        queueClient.disconnect();
      });
    });
  }

  const routeEvent = createRouteEvent(
    serverInit.knexPool,
    serverInit.oauthBoot,
    encryptKey,
    queueClient,
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
