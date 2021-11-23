import throng from 'throng';
import { getConfig } from './config/main.config';
import { newServer } from './server/createServer';
import v8 from 'v8';

const WORKERS = 1;

const start = (id: number) => {
  const configuration = getConfig();
  const port = configuration.port;
  const maxHeapSz = v8.getHeapStatistics().heap_size_limit;
  const maxHeapSz_GB = (maxHeapSz / 1024 ** 3).toFixed(1);
  console.log(`${maxHeapSz_GB}GB`);
  configuration.log().info(`Id Worker ${id}`);
  const serverApp = newServer(port || 1000);
  const server = serverApp.server;

  server.on('listening', () => {
    configuration.log().info('http://localhost:' + port);
  });

  server.on('close', () => {
    configuration.log().info('Server closed');
  });
};

throng({ worker: start, count: WORKERS });
