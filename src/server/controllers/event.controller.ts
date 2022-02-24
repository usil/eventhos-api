import { NextFunction, Request, Response } from 'express';
import { Knex } from 'knex';
import ReceivedEvent from '../dtos/RecivedEvent.dto';
import axios, { AxiosRequestConfig } from 'axios';
import { defer, take } from 'rxjs';
import {
  Action,
  ActionSecurity,
  Contract,
  Event,
} from '../dtos/eventhosInterface';
import bcrypt from 'bcrypt';
import colors from 'colors';
import jwt from 'jsonwebtoken';
import { getConfig } from '../../../config/main.config';
import crypto from 'crypto';
import jp from 'jsonpath';
import { ParsedQs } from 'qs';
import controllerHelpers from './helpers/controller-helpers';

class EventControllers {
  knexPool: Knex;
  constructor(knexPool: Knex) {
    this.knexPool = knexPool;
  }
  /**
   *
   * @describe Validates the recived event
   */
  eventValidation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const systemKey = req.query['access-key'] as string;
      const eventIdentifier = req.query['event-identifier'] as string;

      if (!systemKey || !eventIdentifier) {
        return res.status(400).json({
          code: 400020,
          message:
            'Either the access key or the identifier for the event was not send.',
        });
      }

      const event = (await this.knexPool
        .select('system.client_id', 'event.identifier', 'event.id')
        .from('event')
        .join('system', 'system.id', 'event.system_id')
        .first()
        .where('event.identifier', eventIdentifier)
        .andWhere('event.deleted', false)) as {
        client_id: number;
        identifier: string;
        id: number;
      };

      if (!event) {
        return res.status(404).json({
          code: 400024,
          message: `The event ${eventIdentifier} does not exist.`,
        });
      }

      const client = (
        await this.knexPool
          .table('OAUTH2_Clients')
          .select()
          .where('id', event.client_id)
          .andWhere('deleted', false)
      )[0];

      if (!client) {
        return res.status(404).json({
          code: 400004,
          message: `The client does not exist.`,
        });
      }

      if (client.revoked) {
        return res.status(403).json({
          code: 400023,
          message: `The client access has been revoked.`,
        });
      }

      if (client.access_token) {
        const tokenResult = await bcrypt.compare(
          systemKey,
          client.access_token,
        );
        if (tokenResult) {
          res.locals.eventId = event.id;
          return next();
        }
        return res.status(401).json({
          code: 400001,
          message: 'Incorrect token',
        });
      }

      jwt.verify(systemKey, getConfig().jwtSecret, (err: any, decode: any) => {
        if (err) {
          return res.status(401).json({
            code: 400001,
            message: 'Incorrect token',
          });
        }
        const subject = decode.data;
        console.log(subject);
        console.log(client);
        if (subject.id == client.client_id) {
          res.locals.eventId = event.id;
          return next();
        }
        return res.status(401).json({
          code: 400001,
          message: 'Incorrect token',
        });
      });
    } catch (error) {
      this.returnError(error, res);
    }
  };

  /**
   *
   * @description Gets all the contracts of an event
   */
  getEventContracts = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!res.locals.eventId) {
        return res.status(400).json({
          code: 400020,
          message: 'Event Id was not send.',
        });
      }
      const eventContracts = (await this.knexPool
        .from('contract')
        .select()
        .join('event', 'contract.event_id', 'event.id')
        .join('action', 'contract.action_id', 'action.id')
        .join('action_security', 'action.id', 'action_security.action_id')
        .options({ nestTables: true })
        .where('contract.event_id', res.locals.eventId)
        .andWhere('contract.deleted', false)) as {
        action: Action;
        event: Event;
        contract: Contract;
        action_security: ActionSecurity;
      }[];
      if (eventContracts.length === 0) {
        return res.status(203).json({
          code: 200310,
          message: 'success, but no contracts exists for this event',
        });
      }
      res.locals.eventContracts = eventContracts;
      return next();
    } catch (error) {
      this.returnError(error, res);
    }
  };

  /**
   *
   * @description Manages the event logic
   */
  manageEvent = async (req: Request, res: Response) => {
    try {
      if (!res.locals.eventId || !res.locals.eventContracts) {
        return res.status(400).json({
          code: 400020,
          message: 'Event Id or Event Contract List was not send.',
        });
      }

      if (isNaN(res.locals.eventId)) {
        return res.status(400).json({
          code: 400020,
          message: 'Event Id is not a number.',
        });
      }

      if (!res.locals.eventContracts.length) {
        return res.status(400).json({
          code: 400020,
          message: 'Event Contract is not an array.',
        });
      }

      const eventId = res.locals.eventId as number;

      const eventContracts = res.locals.eventContracts as {
        action: Action;
        event: Event;
        contract: Contract;
        action_security: ActionSecurity;
      }[];

      const receivedEvent = await this.knexPool.table('received_event').insert({
        event_id: eventId,
        header: JSON.stringify(req.headers),
        body: JSON.stringify(req.body),
      });

      const parsedReq = {
        headers: req.headers,
        query: req.query,
        body: req.body,
        oauthResponse: {} as {
          headers: Record<string, string>;
          body: Record<string, any>;
        },
      };

      console.log(
        colors.yellow.bgBlack(
          `${receivedEvent} wil be executed at ${new Date().toLocaleString()}:${new Date().getMilliseconds()}`,
        ),
      );

      const algorithm = 'aes-256-ctr';

      for (const contract of eventContracts) {
        if (contract.action_security.type === 'oauth2_client') {
          const authKeySplit =
            contract.action_security.http_configuration.split('|.|');
          const encryptedAuthSecret = authKeySplit[1];
          const initAuthVector = Buffer.from(authKeySplit[0], 'hex');
          const authKey = crypto.scryptSync(getConfig().cryptoKey, 'salt', 32);
          const authDecipher = crypto.createDecipheriv(
            algorithm,
            authKey,
            initAuthVector,
          );

          let decryptedAuthData = authDecipher.update(
            encryptedAuthSecret,
            'hex',
            'utf-8',
          );

          decryptedAuthData += authDecipher.final('utf8');

          const jsonAxiosBaseAuthConfig = JSON.parse(
            decryptedAuthData,
          ) as AxiosRequestConfig;

          const authResult = await axios(jsonAxiosBaseAuthConfig);

          parsedReq.oauthResponse = {
            body: authResult.data,
            headers: authResult.headers,
          };
        }

        const keySplit = contract.action.http_configuration.split('|.|');
        const encryptedSecret = keySplit[1];
        const initVector = Buffer.from(keySplit[0], 'hex');
        const key = crypto.scryptSync(getConfig().cryptoKey, 'salt', 32);
        const decipher = crypto.createDecipheriv(algorithm, key, initVector);

        let decryptedData = decipher.update(encryptedSecret, 'hex', 'utf-8');

        decryptedData += decipher.final('utf8');

        const jsonAxiosBaseConfig = JSON.parse(
          decryptedData,
        ) as AxiosRequestConfig;

        const parsedHeaders: Record<string, string> = {};
        const parsedQueryParams: Record<string, string> = {};
        const parsedBody: Record<string, any> = {};

        for (const headerKey in jsonAxiosBaseConfig.headers) {
          const header = jsonAxiosBaseConfig.headers[headerKey];
          const parsedHeader = this.getVariables(header, 0, parsedReq);
          parsedHeaders[headerKey] = parsedHeader;
        }

        for (const paramKey in jsonAxiosBaseConfig.params) {
          const param = jsonAxiosBaseConfig.params[paramKey];
          const parsedParam = this.getVariables(param, 0, parsedReq);
          parsedQueryParams[paramKey] = parsedParam;
        }

        for (const dataKey in jsonAxiosBaseConfig.data) {
          const data = jsonAxiosBaseConfig.data[dataKey];
          const parsedData = this.getVariables(data, 0, parsedReq);
          let finalStageParsedData: any = parsedData;
          if (!isNaN(parsedData as any)) {
            finalStageParsedData = Number(parsedData);
          } else if (this.IsJsonString(finalStageParsedData)) {
            finalStageParsedData = JSON.parse(parsedData);
          }
          parsedBody[dataKey] = finalStageParsedData;
        }

        const httpConfiguration: AxiosRequestConfig = {
          url: jsonAxiosBaseConfig.url,
          method: jsonAxiosBaseConfig.method,
          headers: { ...parsedHeaders },
          params: { ...parsedQueryParams },
          data: { ...req.body, ...parsedBody },
        };

        this.createAxiosObservable(httpConfiguration)
          .pipe(take(1))
          .subscribe({
            complete: () =>
              console.log(
                colors.blue(
                  `Contract ${
                    contract.contract.identifier
                  } completed at ${new Date().toLocaleString()}:${new Date().getMilliseconds()}`,
                ),
              ),
            next: async (res) => {
              console.log(
                'header',
                colors.magenta(JSON.stringify(res.headers)),
              );
              console.log('body', colors.green(JSON.stringify(res.data)));
              const excDetail = await this.knexPool
                .table('contract_exc_detail')
                .insert({
                  contract_id: contract.contract.id,
                  recived_event_id: receivedEvent[0],
                  state: 'processed',
                });
              console.log(excDetail);
            },
            error: async (error) => {
              const excDetail = await this.knexPool
                .table('contract_exc_detail')
                .insert({
                  contract_id: contract.contract.id,
                  recived_event_id: receivedEvent[0],
                  state: 'error',
                });
              console.log(excDetail);
              if (error.response) {
                console.log(error.response.data);
                console.log(error.response.status);
                console.log(error.response.headers);
              } else if (error.request) {
                console.log(error.request);
              } else {
                console.log('Error', error.message);
              }
            },
          });
      }

      return res.status(200).json({ code: 20000, message: 'success' });
    } catch (error) {
      this.returnError(error, res);
    }
  };

  IsJsonString = (str: string) => {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  };

  getVariables = (
    value: string,
    searchStartIndex: number,
    parsedRequest: {
      headers: Record<string, string | string[]>;
      query: Record<string, string | ParsedQs | string[] | ParsedQs[]>;
      body: Record<string, any>;
    },
  ): string => {
    const variableStartIndex = value.indexOf('${', 0 + searchStartIndex);

    if (
      variableStartIndex === -1 &&
      value.charAt(variableStartIndex + 2) !== '.'
    ) {
      return value;
    }

    const variableEndIndex = value.indexOf('}', variableStartIndex + 1);

    if (variableEndIndex === -1) {
      return value;
    }

    const variableString = value.substring(
      variableStartIndex + 2,
      variableEndIndex,
    );

    const jsonPath = '$' + variableString;

    let pathValue = jp.query(parsedRequest, jsonPath)[0];

    if (typeof pathValue !== 'string') {
      pathValue = JSON.stringify(pathValue);
    }

    const valueToReplace = '${' + variableString + '}';

    const newValue = value.replace(valueToReplace, pathValue);

    return this.getVariables(newValue, variableEndIndex + 1, parsedRequest);
  };

  /**
   *
   * @description List all of the received events
   */
  listReceivedEvents = async (req: Request, res: Response) => {
    try {
      const { itemsPerPage, offset, pageIndex, order } =
        controllerHelpers.getPaginationData(req);

      const totalReceivedEventCount = (
        await this.knexPool('received_event').count()
      )[0]['count(*)'];

      const totalPages = Math.ceil(
        parseInt(totalReceivedEventCount as string) / itemsPerPage,
      );

      const receivedEvents = (await this.knexPool({
        received_event: this.knexPool('received_event')
          .limit(itemsPerPage)
          .offset(offset)
          .orderBy('received_event.id', order),
      } as any)
        .select(
          'received_event.id',
          'system.id as systemId',
          'event.id as eventId',
          'system.name as systemName',
          'contract_exc_detail.state',
          'system.identifier as systemIdentifier',
          'event.name as eventName',
          'event.identifier as eventIdentifier',
          'event.description as eventDescription',
          'header',
          'body',
          'recived_at as recivedAt',
        )
        .leftJoin(
          'contract_exc_detail',
          'contract_exc_detail.recived_event_id',
          'received_event.id',
        )
        .join('event', 'event.id', 'received_event.event_id')
        .join('system', 'system.id', 'event.system_id')) as ReceivedEvent[];

      return res.status(200).json({
        code: 200000,
        message: 'success',
        content: {
          items: receivedEvents,
          pageIndex,
          itemsPerPage,
          totalItems: totalReceivedEventCount,
          totalPages,
        },
      });
    } catch (error) {
      this.returnError(error, res);
    }
  };

  createEvent = async (req: Request, res: Response) => {
    try {
      const { system_id, identifier, name, operation, description } = req.body;
      const insertResult = await this.knexPool.table('event').insert({
        system_id,
        identifier,
        name,
        operation,
        description,
      });
      return res.status(201).json({
        code: 200001,
        message: 'success',
        content: { eventId: insertResult[0] },
      });
    } catch (error) {
      this.returnError(error, res);
    }
  };

  updateEvent = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, operation, description } = req.body;
      await this.knexPool
        .table('event')
        .update({
          name,
          operation,
          description,
        })
        .where('id', id);
      return res.status(201).json({
        code: 200001,
        message: 'success',
      });
    } catch (error) {
      this.returnError(error, res);
    }
  };

  deleteEvent = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await this.knexPool
        .table('event')
        .update('deleted', true)
        .where('id', id);

      return res.status(201).json({
        code: 200001,
        message: 'success',
      });
    } catch (error) {
      this.returnError(error.message, res);
    }
  };

  getEvents = async (req: Request, res: Response) => {
    try {
      const { itemsPerPage, offset, pageIndex, order, activeSort } =
        controllerHelpers.getPaginationData(req);

      const totalEventsCount = (
        await this.knexPool.table('event').where('deleted', false).count()
      )[0]['count(*)'];

      const totalPages = Math.ceil(
        parseInt(totalEventsCount as string) / itemsPerPage,
      );

      const eventsQuery = this.knexPool
        .table('event')
        .offset(offset)
        .limit(itemsPerPage)
        .orderBy(activeSort, order)
        .where('deleted', false);

      const systems = (await eventsQuery) as Event[];

      return res.status(200).json({
        code: 200000,
        message: 'success',
        content: {
          items: systems,
          pageIndex,
          itemsPerPage,
          totalItems: totalEventsCount,
          totalPages,
        },
      });
    } catch (error) {
      this.returnError(error.message, res);
    }
  };

  // ------------------------------------------- //

  /**
   *
   * @description Creates an observable given an axios config
   */
  createAxiosObservable = (axiosConfig: AxiosRequestConfig) => {
    return defer(() => axios(axiosConfig)).pipe(take(1));
  };

  returnError = (error: any, res: Response) => {
    console.log('here is an error:', colors.red(error));
    if (error.sqlState) {
      return res.status(500).json({
        code: 500001,
        message: `Data base error, with code ${error.sqlState}`,
      });
    }
    return res
      .status(500)
      .json({ code: 500000, message: 'Server Internal Error' });
  };
}

export default EventControllers;
