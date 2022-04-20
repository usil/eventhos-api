/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config();
const EnvSettings = require('advanced-settings').EnvSettings;
const envSettings = new EnvSettings();

import path from 'path';
import bunyan from 'bunyan';
import pjs from '../package.json';
import ConfigGlobalDto from './config.dto';

// * Obtains the JSON package
const { version } = pjs;

// * Create un logger
const getLogger = (serviceName: string, serviceVersion: string) =>
  bunyan.createLogger({ name: `${serviceName}:${serviceVersion}` });

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

  configuration.log = (): bunyan =>
    getLogger(process.env.NODE_ENV.toUpperCase(), version);

  return configuration;
};
