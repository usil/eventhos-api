/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config();
const EnvSettings = require('advanced-settings').EnvSettings;
const envSettings = new EnvSettings();

import path from 'path';
import bunyan from 'bunyan';
import pjs from '../../package.json';
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
    path.resolve(
      __dirname,
      process.env.NODE_ENV === 'production'
        ? '../settings.json'
        : '../../settings.json',
    ),
  );

  configuration = settings;

  configuration.port = parseInt(settings.port);

  configuration.dataBasePort = parseInt(settings.dataBasePort);

  configuration.port = parseInt(settings.port);

  configuration.log = (): bunyan =>
    getLogger(process.env.NODE_ENV.toUpperCase(), version);

  return configuration;
};
