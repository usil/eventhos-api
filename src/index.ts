import { getConfig } from '../config/main.config';
import { newServer } from './server/createServer';
import cluster from 'cluster';
import os from 'os';

const configuration = getConfig();

const totalCPUs = os.cpus().length;

if (totalCPUs < configuration.cpuCount) {
  throw new Error('You dont have enough cpu cores');
}

const start = async () => {
  const port = configuration.port;
  // ? const maxHeapSz = v8.getHeapStatistics().heap_size_limit;
  // ? const maxHeapSz_GB = (maxHeapSz / 1024 ** 3).toFixed(1);
  // ? console.log(`${maxHeapSz_GB}GB`);
  // ? configuration.log().info(`Id Worker ${id}`);
  const serverApp = await newServer(port || 1000, configuration);
  const server = serverApp.server;

  server.on('listening', () => {    
    configuration.log().info('http://localhost:' + port+` on pid: ${process.pid}`);
  });

  server.on('close', () => {
    configuration.log().info('Server closed');
  });
};

console.log("configuration.cpuCount:"+configuration.cpuCount)
if(typeof configuration.cpuCount === 'undefined' || configuration.cpuCount == 1){
  console.log("single thread detected");
  start();
}else{
  console.log("multithread is enabled");

  if (cluster.isMaster) {
    for (let i = 0; i < configuration.cpuCount; i++) {
      console.log("launching thread: "+i)    
      cluster
        .fork()
        .on('listening', () => configuration.log().info(`Cluster #${i} created`));
    }
    cluster.on('exit', (worker, _code, _signal) => {
      configuration.log().warn(`worker ${worker.process.pid} died`);
      configuration.log().info('Trying to fork another');
      cluster.fork();
    });
  }else{
    start();
  }

}