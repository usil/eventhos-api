import bunyan from 'bunyan';

/**
 * @description The parameters that all environments should have
 */
export class ConfigGlobalDto {
  state: string;
  port: number;
  cpuCount: number;
  queue: {
    active: boolean;
    host: string;
    headersHost: string;
    port: number;
    user: string;
    password: string;
    destination: string;
    heartBeat: string;
  };
  dataBase: {
    name: string;
    host: string;
    port: number;
    user: string;
    password: string;
    acquireConnectionTimeout: number;
    poolMax: number;
    poolMin: number;
  };
  subscription: {
    timeout: number;
  };
  oauth2: {
    jwtSecret: string;
  };
  encryption: {
    key: string;
  };
  log: () => bunyan;
}

export default new ConfigGlobalDto();
