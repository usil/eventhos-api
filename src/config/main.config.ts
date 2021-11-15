// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

import bunyan from 'bunyan';
import pjs from '../../package.json';
import ConfigGlobalDto from './config.dto';

// * Obtains the JSON package
const { version } = pjs;

// * Create un logger
const getLogger = (serviceName: string, serviceVersion: string) =>
  bunyan.createLogger({ name: `${serviceName}:${serviceVersion}` });

/**
 * @description Add the config variables here
 */
const getConfig = () => {
  const config = ConfigGlobalDto;

  config.log = (): bunyan =>
    getLogger(process.env.NODE_ENV.toUpperCase(), version);

  config.port = parseInt(process.env.PORT) || 2000;

  config.state = process.env.NODE_ENV;

  config.dataBaseName = process.env.DATA_BASE_NAME;

  config.dataBaseHost = process.env.DATA_BASE_HOST;

  config.dataBasePassword = process.env.DATA_BASE_PASSWORD;

  config.dataBaseUser = process.env.DATA_BASE_USER;

  config.dataBasePort = parseInt(process.env.DATA_BASE_PORT);

  return config;
};

export default getConfig;
