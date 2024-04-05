import compression from 'compression';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import http from 'http';
import Route from './util/Route';
import {
  IExpressNecessaryFunctions,
  IExpressNecessaryParams,
} from './util/ExpressNecessary';
import knex, { Knex } from 'knex';
import { getConfig } from '../../config/main.config';
import OauthBoot from 'nodeboot-oauth2-starter';
import { v4 as uuidv4 } from 'uuid';
import bodyParser from 'body-parser';
/**
 *
 * @description Use this class to create and serve an application
 */
class ServerInitialization
  implements IExpressNecessaryFunctions, IExpressNecessaryParams
{
  app: any;
  server: http.Server;
  port: number;
  routes: string[] = [];
  knexPool: Knex;

  oauthBoot: any;

  configuration = getConfig();

  /**
   *Creates an instance of ExpressAPP.
   * @memberof ExpressAPP
   */
  constructor(port: number) {
    this.addKnexjsConfig();

    const localApp = express();

    const oauthBoot = new OauthBoot(
      localApp,
      this.knexPool,
      this.configuration.log(),
      {
        jwtSecret: this.configuration.oauth2.jwtSecret,
        cryptoSecret: this.configuration.encryption.key,
        extraResources: ['contract', 'action', 'event', 'system'],
        mainApplicationName: 'eventhos_api',
        clientIdSuffix: '::usil.app',
        expiresIn: this.configuration.oauth2.jwtTokenExpiresIn,
      },
    );

    this.app = oauthBoot.expressSecured;

    this.port = port;

    this.addBasicConfiguration();

    this.oauthBoot = oauthBoot;
  }

  async init() {
    try {
      await this.oauthBoot.init();
    } catch (error) {
      this.configuration.log().fatal(error);
      process.exit(0);
    }
  }

  /**
   * @description Adds the necessary knexjs configuration
   */
  addKnexjsConfig(): void {

    const knexConfig = {
      client: 'mysql2',
      version: '5.7',
      connection: {
        host: this.configuration.dataBase.host,
        port: this.configuration.dataBase.port,
        user: this.configuration.dataBase.user,
        password: this.configuration.dataBase.password,
        database: this.configuration.dataBase.name,
        timezone: this.configuration.dataBase.timezone
      },
      acquireConnectionTimeout:
        this.configuration.dataBase.acquireConnectionTimeout,
      pool: {
        min: this.configuration.dataBase.poolMin,
        max: this.configuration.dataBase.poolMax,
      },
    };

    const safeKnexConfigToLog = JSON.parse(JSON.stringify(knexConfig));
    safeKnexConfigToLog.connection.password = '***';

    this.configuration
      .log()
      .debug('Starting knex with configuration', safeKnexConfigToLog);

    this.knexPool = knex(knexConfig);
  }

  /**
   * @description Adds the basic configuration for the app
   */
  addBasicConfiguration(): void {
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(cors());
    this.app.use(express.json({limit: this.configuration.server.httpBodySizeLimit}));
    this.app.use(bodyParser.json({limit: this.configuration.server.httpBodySizeLimit}));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.obGet('/', ':', this.healthEndpoint);
  }

  healthEndpoint(_req: Request, res: Response) {
    return res.status(200).send('Ok');
  }

  /**
   *
   * @description A function to add the routes
   */
  addRoutes(fullRoute: Route): void {
    this.routes.push(fullRoute.route);
    this.app.use(fullRoute.route, fullRoute.router);
  }

  errorHandle = (
    err: {
      message: string;
      statusCode?: number;
      errorCode?: number;
      onFunction?: string;
      onLibrary?: string;
      onFile?: string;
      logMessage?: string;
      path?: string;
      errorObject?: Record<string, any>;
    },
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const uudid = uuidv4();
    let error = new Error();
    this.configuration
      .log()
      .error(error);
    this.configuration
      .log()
      .error(uudid, '-', err.logMessage || err.message, { ...err });
    return res.status(err.statusCode || 500).json({
      message: err.message,
      code: err.errorCode || 500000,
      errorUUID: uudid,
      path: err?.path,
    });
  };

  /**
   * @description Creates the server
   */
  createServer(): http.Server {
    this.server = http.createServer(this.app);
    this.server.listen(this.port);
    this.app.use(this.errorHandle);
    return this.server;
  }
}

export default ServerInitialization;
