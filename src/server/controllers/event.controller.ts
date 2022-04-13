import { NextFunction, Request, Response } from 'express';
import { Knex } from 'knex';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { concat, defer, merge, Observable, take } from 'rxjs';
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
import util from 'util';
import Logger from 'bunyan';

interface EventContract {
  action: Action;
  event: Event;
  contract: Contract;
  action_security: ActionSecurity;
}
class EventControllers {
  knexPool: Knex;
  scryptPromise = util.promisify(crypto.scrypt);
  encryptionKey: Buffer;
  constructor(knexPool: Knex, encryptionKey: Buffer) {
    this.knexPool = knexPool;
    this.encryptionKey = encryptionKey;
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

      jwt.verify(
        systemKey,
        getConfig().oauth2.jwtSecret,
        (err: any, decode: any) => {
          if (err) {
            return res.status(401).json({
              code: 400001,
              message: 'Incorrect token',
            });
          }
          this.handleDecodeData(decode, client, res, next, event);
        },
      );
    } catch (error) {
      this.returnError(error, res);
    }
  };

  handleDecodeData = (
    decode: any,
    client: any,
    res: Response,
    next: NextFunction,
    event: {
      client_id: number;
      identifier: string;
      id: number;
    },
  ) => {
    const subject = decode.data;
    if (subject.id == client.client_id) {
      res.locals.eventId = event.id;
      return next();
    }
    return res.status(401).json({
      code: 400001,
      message: 'Incorrect token',
    });
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
        .orderBy('contract.order', 'asc')
        .where('contract.event_id', res.locals.eventId)
        .where('contract.active', true)
        .andWhere('contract.deleted', false)) as {
        action: Action;
        event: Event;
        contract: Contract;
        action_security: ActionSecurity;
      }[];
      if (eventContracts.length === 0) {
        const basicRequest = {
          headers: req.headers,
          query: req.query,
          body: req.body,
          method: req.method,
          url: req.protocol + '://' + req.get('host') + req.originalUrl,
        };

        const baseRequestEncryption = await this.encryptString(
          JSON.stringify(basicRequest),
        );

        await this.knexPool.table('received_event').insert({
          event_id: res.locals.eventId,
          received_request:
            baseRequestEncryption.hexedInitVector +
            '|.|' +
            baseRequestEncryption.encryptedData,
        });

        return res.status(203).json({
          code: 200310,
          message: 'Success, but no contracts exists for this event',
        });
      }
      res.locals.eventContracts = eventContracts;
      return next();
    } catch (error) {
      this.returnError(error, res);
    }
  };

  getContractExecutionDetail = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.knexPool
        .table('contract_exc_detail')
        .select()
        .join(
          'contract_exc_try',
          'contract_exc_try.contract_exc_detail_id',
          'contract_exc_detail.id',
        )
        .join('contract', 'contract.id', 'contract_exc_detail.contract_id')
        .where('contract_exc_detail.id', id);
      const parsedResult = result[0];
      parsedResult.request = JSON.parse(
        await this.decryptString(parsedResult.request),
      );
      parsedResult.response = JSON.parse(
        await this.decryptString(parsedResult.response),
      );
      return res.status(200).json({
        code: 200000,
        message: 'success',
        content: parsedResult,
      });
    } catch (error) {
      this.returnError(error.message, res);
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

      const eventContracts = res.locals.eventContracts as EventContract[];

      const basicRequest = {
        headers: req.headers,
        query: req.query,
        body: req.body,
        method: req.method,
        url: req.protocol + '://' + req.get('host') + req.originalUrl,
      };

      const baseRequestEncryption = await this.encryptString(
        JSON.stringify(basicRequest),
      );

      const receivedEvent = await this.knexPool.table('received_event').insert({
        event_id: eventId,
        received_request:
          baseRequestEncryption.hexedInitVector +
          '|.|' +
          baseRequestEncryption.encryptedData,
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

      const mergedContractExecutions: Observable<
        | {
            message: string;
            error?: undefined;
          }
        | {
            message: string;
            error: any;
          }
      >[] = [];

      const orderedContracts =
        this.generateOrderFromEventContracts(eventContracts);

      for (const ocKey in orderedContracts) {
        const contractsToExecute = orderedContracts[ocKey];
        const contractExecutions = contractsToExecute.map((eventContract) => {
          return defer(() =>
            this.executeContract(eventContract, receivedEvent, parsedReq),
          ).pipe(take(1));
        });
        const contractsExecution$ = merge(...contractExecutions);
        mergedContractExecutions.push(contractsExecution$);
      }

      concat(...mergedContractExecutions).subscribe((res) => {
        this.handlePostContractExecution(res, getConfig().log());
      });

      return res.status(200).json({ code: 20000, message: 'success' });
    } catch (error) {
      this.returnError(error, res);
    }
  };

  handlePostContractExecution = (
    res:
      | {
          message: string;
          error?: undefined;
        }
      | {
          message: string;
          error: any;
        },
    logger: Logger,
  ) => {
    if (res.error) {
      logger.error(res.message);
      logger.error(res.error);
      return;
    }
    logger.info(res.message);
  };

  generateOrderFromEventContracts = (eventContracts: EventContract[]) => {
    const orders: Record<string, EventContract[]> = {};
    for (const eventContract of eventContracts) {
      const orderString = eventContract.contract.order;
      if (orders[orderString] !== undefined) {
        orders[orderString].push(eventContract);
        continue;
      }
      orders[orderString] = [eventContract];
    }
    return orders;
  };

  executeContract = async (
    eventContract: EventContract,
    receivedEvent: number[],
    parsedReq: {
      headers: Record<any, any>;
      body: any;
      query: ParsedQs;
      oauthResponse: {
        headers: Record<string, string>;
        body: Record<string, any>;
      };
    },
  ) => {
    try {
      if (eventContract.action_security.type === 'oauth2_client') {
        const jsonAxiosBaseAuthConfig = JSON.parse(
          await this.decryptString(
            eventContract.action_security.http_configuration,
          ),
        ) as AxiosRequestConfig;

        const authResult = await axios({
          ...jsonAxiosBaseAuthConfig,
          timeout: getConfig().subscription.timeout,
        });

        parsedReq.oauthResponse = {
          body: authResult.data,
          headers: authResult.headers,
        };
      }

      const jsonAxiosBaseConfig = JSON.parse(
        await this.decryptString(eventContract.action.http_configuration),
      ) as AxiosRequestConfig;

      const parsedHeaders: Record<string, string> = {};
      const parsedQueryParams: Record<string, string> = {};
      let parsedBody: Record<string, any> = {};

      for (const headerKey in jsonAxiosBaseConfig.headers) {
        const header = jsonAxiosBaseConfig.headers[headerKey];
        const parsedHeader = this.getVariables(header, 0, parsedReq, 'header');
        parsedHeaders[headerKey] = parsedHeader;
      }

      for (const paramKey in jsonAxiosBaseConfig.params) {
        const param = jsonAxiosBaseConfig.params[paramKey];
        const parsedParam = this.getVariables(param, 0, parsedReq, 'param');
        parsedQueryParams[paramKey] = parsedParam;
      }

      const fullParsedBody = {
        ...this.parseBodyData(jsonAxiosBaseConfig.data, parsedReq),
      };

      if (JSON.stringify(jsonAxiosBaseConfig.data) === '{}') {
        parsedBody = { ...parsedReq.body };
      } else {
        parsedBody = {
          ...fullParsedBody,
        };
      }

      const httpConfiguration: AxiosRequestConfig = {
        url: jsonAxiosBaseConfig.url,
        method: jsonAxiosBaseConfig.method,
        headers: {
          ...parsedHeaders,
          eventhosStartDate: new Date().toISOString(),
        },
        params: { ...parsedQueryParams },
        data: parsedBody,
      };

      const result = await axios({
        ...httpConfiguration,
        timeout: getConfig().subscription.timeout,
      });

      await this.handleContractExecution(result, eventContract, receivedEvent);

      return {
        message: `Contract with id ${eventContract.contract.id} executed successfully`,
      };
    } catch (error) {
      if (error.isAxiosError) {
        this.handleContractExecutionError(
          error,
          eventContract,
          receivedEvent,
        ).then(() => getConfig().log().info('Error saved'));
      }
      return {
        message: `Error while executing contract with id ${eventContract.contract.id}`,
        error: error,
      };
    }
  };

  handleContractExecutionError = async (
    error: AxiosError,
    eventContract: EventContract,
    receivedEvent: number[],
  ) => {
    const logger = getConfig().log();
    try {
      const excDetail = await this.knexPool
        .table('contract_exc_detail')
        .insert({
          contract_id: eventContract.contract.id,
          received_event_id: receivedEvent[0],
          state: 'error',
        });
      const errorResponse = {
        headers: error.response?.headers || {},
        body: error.response?.data || {},
        status: error.response?.status || error.code,
        statusText: error.response?.statusText || error.message,
        endTime: new Date().toISOString(),
        startTime: error.config.headers.eventhosStartDate,
      };
      const errorRequest = {
        headers: error.config.headers,
        body: error.config.data,
        url: error.config.url,
        params: error.config.params,
        method: error.config.method,
      };
      const encryptResultResponse = await this.encryptString(
        JSON.stringify(errorResponse),
      );
      const encryptResultRequest = await this.encryptString(
        JSON.stringify(errorRequest),
      );
      await this.knexPool.table('contract_exc_try').insert({
        contract_exc_detail_id: excDetail[0],
        state: 'error',
        request:
          encryptResultRequest.hexedInitVector +
          '|.|' +
          encryptResultRequest.encryptedData,
        response:
          encryptResultResponse.hexedInitVector +
          '|.|' +
          encryptResultResponse.encryptedData,
      });
    } catch (error) {
      logger.error(error);
    }
  };

  handleContractExecution = async (
    res: AxiosResponse<any, any>,
    contract: {
      action: Action;
      event: Event;
      contract: Contract;
      action_security: ActionSecurity;
    },
    receivedEvent: number[],
  ) => {
    try {
      const excDetail = await this.knexPool
        .table('contract_exc_detail')
        .insert({
          contract_id: contract.contract.id,
          received_event_id: receivedEvent[0],
          state: 'processed',
        });
      const successResponse = {
        headers: res.headers,
        body: res.data,
        status: res.status,
        statusText: res.statusText,
        endTime: new Date().toISOString(),
        startTime: res.config.headers.eventhosStartDate,
      };
      const successRequest = {
        headers: res.config.headers,
        body: res.config.data,
        url: res.config.url,
        params: res.config.params,
        method: res.config.method,
      };
      const encryptResultResponse = await this.encryptString(
        JSON.stringify(successResponse),
      );
      const encryptResultRequest = await this.encryptString(
        JSON.stringify(successRequest),
      );
      await this.knexPool.table('contract_exc_try').insert({
        contract_exc_detail_id: excDetail[0],
        state: 'processed',
        response:
          encryptResultResponse.hexedInitVector +
          '|.|' +
          encryptResultResponse.encryptedData,
        request:
          encryptResultRequest.hexedInitVector +
          '|.|' +
          encryptResultRequest.encryptedData,
      });
    } catch (error) {
      getConfig().log().error(error);
    }
  };

  async encryptString(stringToEncrypt: string) {
    const algorithm = 'aes-256-ctr';
    const initVector = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      algorithm,
      this.encryptionKey,
      initVector,
    );
    let encryptedData = cipher.update(stringToEncrypt, 'utf-8', 'hex');
    const hexedInitVector = initVector.toString('hex');
    encryptedData += cipher.final('hex');
    return { hexedInitVector, encryptedData };
  }

  parseBodyData(
    originalData: Record<string, any>,
    parsedReq: {
      headers: Record<string, any>;
      query: ParsedQs;
      body: any;
      oauthResponse: {
        headers: Record<string, string>;
        body: Record<string, any>;
      };
    },
  ) {
    const parsedBody: Record<string, any> = {};

    for (const dataKey in originalData) {
      const value = originalData[dataKey];
      if (typeof value === 'string' || value instanceof String) {
        const parsedData = this.getVariables(
          value as string,
          0,
          parsedReq,
          'data',
        );
        parsedBody[dataKey] = parsedData;
      } else if (
        typeof value === 'object' &&
        Array.isArray(value) === false &&
        value !== null
      ) {
        parsedBody[dataKey] = this.parseBodyData(value, parsedReq);
      } else {
        parsedBody[dataKey] = value;
      }
    }
    return parsedBody;
  }

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
    type: string,
  ): any => {
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

    let jsonPath = '$' + variableString;

    const dividedPath = jsonPath.split('.');

    for (const variable of dividedPath) {
      if (variable.indexOf('-') > -1) {
        jsonPath = jsonPath.replace(`.${variable}`, `["${variable}"]`);
      }
    }

    const valueToReplace = '${' + variableString + '}';

    if (valueToReplace === value && type === 'data' && searchStartIndex === 0) {
      return jp.query(parsedRequest, jsonPath)[0];
    }

    let pathValue = jp.query(parsedRequest, jsonPath)[0];

    if (typeof pathValue !== 'string') {
      pathValue = JSON.stringify(pathValue);
    }

    const newValue = value.replace(valueToReplace, pathValue);

    return this.getVariables(
      newValue,
      variableEndIndex + 1,
      parsedRequest,
      type,
    );
  };

  /**
   *
   * @description List all of the received events
   */
  listReceivedEvents = async (req: Request, res: Response) => {
    try {
      const { itemsPerPage, offset, pageIndex, order } =
        controllerHelpers.getPaginationData(req);

      const { systemId, fromTime, toTime } = req.query;

      const totalReceivedEventCountQuery = this.knexPool('received_event')
        .join('event', 'event.id', 'received_event.event_id')
        .count();

      if (systemId) {
        totalReceivedEventCountQuery.where(
          'event.system_id',
          systemId as string,
        );
      }

      if (toTime) {
        const toTimeDate = new Date(toTime as string);
        toTimeDate.setHours(0);
        totalReceivedEventCountQuery.where(
          'received_at',
          '<=',
          toTime as string,
        );
      }

      if (fromTime) {
        const fromTimeDate = new Date(fromTime as string);
        fromTimeDate.setHours(0);
        totalReceivedEventCountQuery.where(
          'received_at',
          '>',
          fromTime as string,
        );
      }

      const receivedEventsQuery = this.knexPool('received_event')
        .offset(offset)
        .limit(itemsPerPage)
        .orderBy('received_event.id', order);

      if (toTime) {
        const toTimeDate = new Date(toTime as string);
        toTimeDate.setHours(0);
        receivedEventsQuery.where('received_at', '<=', toTimeDate);
      }

      if (fromTime) {
        const fromTimeDate = new Date(fromTime as string);
        fromTimeDate.setHours(0);
        receivedEventsQuery.where('received_at', '>', fromTimeDate);
      }

      if (systemId) {
        const systemEvents = await this.knexPool('event')
          .select('id')
          .where('system_id', systemId as string);
        const parsedSystemEvents = systemEvents.map((se) => se.id);
        receivedEventsQuery.where('event_id', 'in', parsedSystemEvents);
      }

      const totalReceivedEventCount = (await totalReceivedEventCountQuery)[0][
        'count(*)'
      ];

      const totalPages = Math.ceil(
        parseInt(totalReceivedEventCount as string) / itemsPerPage,
      );

      const receivedEventsFullQuery = this.knexPool({
        received_event: receivedEventsQuery,
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
          'received_request',
          'received_at as receivedAt',
        )
        .leftJoin(
          'contract_exc_detail',
          'contract_exc_detail.received_event_id',
          'received_event.id',
        )
        .join('event', 'event.id', 'received_event.event_id')
        .join('system', 'system.id', 'event.system_id')
        .orderBy('received_event.id', order);

      const receivedEvents = await receivedEventsFullQuery;

      // console.log(receivedEvents);

      const joinedSearch = this.joinSearch(receivedEvents, 'id', 'state');

      return res.status(200).json({
        code: 200000,
        message: 'success',
        content: {
          items: joinedSearch,
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

  getReceivedEventDetails = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const receivedEventSearch = await this.knexPool
        .table('received_event')
        .select(
          'received_event.id',
          'received_event.received_at',
          'received_event.received_request',
          'event.id as eventId',
          'event.identifier as eventIdentifier',
          'event.name as eventName',
          'event.operation as eventOperation',
          'event.description as eventDescription',
        )
        .join('event', 'received_event.event_id', 'event.id')
        .where('received_event.id', id);

      const receivedEvent = receivedEventSearch[0];

      receivedEvent.received_request = JSON.parse(
        await this.decryptString(receivedEvent.received_request),
      );

      const searchResult = await this.knexPool
        .table('contract_exc_detail')
        .select(
          'contract_exc_detail.id as detailId',
          'contract_exc_detail.state',
          'contract.id as contractId',
          'contract.identifier as contractIdentifier',
          'contract.name as contractName',
          'action.id as actionId',
          'action.identifier as actionIdentifier',
          'action.name as actionName',
          'action.operation as actionOperation',
          'action.description as actionDescription',
        )
        .leftJoin('contract', 'contract_exc_detail.contract_id', 'contract.id')
        .join('action', 'contract.action_id', 'action.id')
        .where('contract_exc_detail.received_event_id', id);

      return res.status(200).json({
        code: 200000,
        message: 'success',
        content: { receivedEvent, executedEventContracts: searchResult },
      });
    } catch (error) {
      this.returnError(error, res);
    }
  };

  async decryptString(stringToDecrypt: string) {
    const algorithm = 'aes-256-ctr';
    const keySplit = stringToDecrypt.split('|.|');
    const encryptedPart = keySplit[1];
    const initVector = Buffer.from(keySplit[0], 'hex');
    const decipher = crypto.createDecipheriv(
      algorithm,
      this.encryptionKey,
      initVector,
    );
    let decryptedData = decipher.update(encryptedPart, 'hex', 'utf-8');
    decryptedData += decipher.final('utf8');
    return decryptedData;
  }

  joinSearch = (
    baseSearch: any[],
    differentiator: string,
    ...similarFields: string[]
  ) => {
    const newArray = [];
    for (let index = 0; index < baseSearch.length; index++) {
      if (index === 0) {
        for (const similarField of similarFields) {
          const temporalFieldValue = baseSearch[index][similarField];
          baseSearch[index][similarField] = [temporalFieldValue];
        }
        newArray.push(baseSearch[index]);
      } else if (
        baseSearch[index][differentiator] !==
        baseSearch[index - 1][differentiator]
      ) {
        for (const similarField of similarFields) {
          const temporalFieldValue = baseSearch[index][similarField];
          baseSearch[index][similarField] = [temporalFieldValue];
        }
        newArray.push(baseSearch[index]);
      } else {
        for (const similarField of similarFields) {
          const temporalFieldValue = baseSearch[index][similarField];
          newArray[newArray.length - 1][similarField].push(temporalFieldValue);
        }
      }
    }
    return newArray;
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

      const eventInContracts = await this.knexPool
        .table('contract')
        .select('id')
        .where('event_id', id)
        .andWhere('deleted', false);

      if (eventInContracts.length > 0) {
        return res.status(400).json({
          code: 400500,
          message: 'Event has active contracts',
        });
      }

      await this.knexPool
        .table('event')
        .update('deleted', true)
        .andWhere('id', id);

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
      const { systemId, eventName } = req.query;

      const { itemsPerPage, offset, pageIndex, order, activeSort } =
        controllerHelpers.getPaginationData(req);

      const totalEventsCountQuery = this.knexPool
        .table('event')
        .count()
        .where('deleted', false);

      if (systemId) {
        totalEventsCountQuery.andWhere(
          'system_id',
          parseInt(systemId as string),
        );
      }

      if (eventName) {
        totalEventsCountQuery.andWhere(
          'name',
          'like',
          ('%' + eventName + '%') as string,
        );
      }

      const eventsQuery = this.knexPool
        .table('event')
        .offset(offset)
        .limit(itemsPerPage)
        .orderBy(activeSort, order)
        .where('deleted', false);

      if (systemId) {
        eventsQuery.andWhere('system_id', parseInt(systemId as string));
      }

      if (eventName) {
        eventsQuery.andWhere('name', 'like', ('%' + eventName + '%') as string);
      }

      const totalEventsCount = (await totalEventsCountQuery)[0]['count(*)'];

      const totalPages = Math.ceil(
        parseInt(totalEventsCount as string) / itemsPerPage,
      );

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
      console.log('xxx2', error);
      this.returnError(error.message, res);
    }
  };

  // ------------------------------------------- //

  /**
   *
   * @description Creates an observable given an axios config
   */
  createAxiosObservable = (axiosConfig: AxiosRequestConfig) => {
    return defer(() =>
      axios({ ...axiosConfig, timeout: getConfig().subscription.timeout }),
    ).pipe(take(1));
  };

  returnError = (error: any, res: Response) => {
    console.log('here is an error:', colors.red(error));
    if (error.sqlState) {
      return res.status(501).json({
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
