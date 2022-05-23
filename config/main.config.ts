/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config();
const EnvSettings = require('advanced-settings').EnvSettings;
const envSettings = new EnvSettings();

import path from 'path';
import ConfigGlobalDto from './config.dto';
import log4js from 'log4js';

const logAppenders = {
  logFile: {
    type: 'dateFile',
    filename: `logs.log`,
  },
  log: { type: 'console' },
};

log4js.configure({
  appenders: logAppenders,
  categories: {
    default: {
      appenders: ['logFile', 'log'],
      level: 'debug',
    },
    eventhos: {
      appenders: process.env.USE_FILE === 'true' ? ['logFile', 'log'] : ['log'],
      level: process.env.LOG_LEVEL || 'debug',
    },
  },
});

process.on('exit', () => log4js.shutdown());
process.on('SIGINT', () => log4js.shutdown());
process.on('SIGUSR1', () => log4js.shutdown());
process.on('SIGUSR2', () => log4js.shutdown());
process.on('uncaughtException', () => log4js.shutdown());

const logger = log4js.getLogger('eventhos');

// * Create un logger

let configuration: Partial<typeof ConfigGlobalDto>;

/**
 * @description Add the config variables here
 */
export const getConfig = () => {
  const settings = envSettings.loadJsonFileSync(
    path.resolve(__dirname, '../settings.json'),
  );

  configuration = settings;

  configuration.queue.active =
    settings.queue.active === true || settings.queue.active === 'true'
      ? true
      : false;

  const parsedPort = parseInt(settings.port);

  configuration.port = isNaN(parsedPort) ? 2109 : parsedPort;

  configuration.dataBase.port = parseInt(settings.dataBase.port);

  configuration.queue.port = parseInt(settings.queue.port);

  configuration.dataBase.acquireConnectionTimeout = parseInt(
    settings.dataBase.acquireConnectionTimeout,
  );

  configuration.dataBase.poolMin = parseInt(settings.dataBase.poolMin);

  configuration.dataBase.poolMax = parseInt(settings.dataBase.poolMax);

  configuration.cpuCount = parseInt(settings.cpuCount);

  configuration.log = (): log4js.Logger => logger;

  return configuration;
};
