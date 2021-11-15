import throng from 'throng';
import { getConfig } from './config/main.config';
import { newServer } from './server/createServer';

const WORKERS = 1;

const start = (id: number) => {
  const configuration = getConfig();

  const port = configuration.port;

  configuration.log().info(`Id Worker ${id}`);
  const serverApp = newServer(port);
  const server = serverApp.server;

  server.on('listening', () => {
    configuration.log().info('http://localhost:' + port);
  });

  server.on('close', () => {
    configuration.log().info('Server closed');
  });
};

throng({ worker: start, count: WORKERS });
