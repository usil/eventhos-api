import bunyan from 'bunyan';

/**
 * @description The parameters that all environments should have
 */
export class ConfigGlobalDto {
  state: string;
  port: number;
  dataBaseName: string;
  log: () => bunyan;
  dataBaseHost: string;
  dataBasePort: number;
  dataBaseUser: string;
  dataBasePassword: string;
  cpuCount: number;
}

export default new ConfigGlobalDto();
