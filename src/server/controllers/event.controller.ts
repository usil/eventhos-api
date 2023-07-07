import { NextFunction, Request, Response } from 'express';
import { Knex } from 'knex';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { concat, defer, merge, Observable, take } from 'rxjs';
import {
  Action,
  ActionSecurity,
  Contract,
  Event,
  System,
} from '../dtos/eventhosInterface';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getConfig } from '../../../config/main.config';
import crypto from 'crypto';
import jp from 'jsonpath';
import { ParsedQs } from 'qs';
import controllerHelpers from './helpers/controller-helpers';
import util from 'util';
import { Logger } from 'log4js';
import { Client } from 'stompit';
import { ConfigGlobalDto } from '../../../config/config.dto';
import ErrorForNext from './helpers/ErrorForNext';
import { nanoid } from 'nanoid';
import fs from 'fs';
import { promisify } from 'util';
import MailService from '../util/Mailer';

const readFile = promisify(fs.readFile);
const JavaScriptHelpers = require('../../helpers/javaScriptHelpers');


interface ContractsExecutionBody {
  orderedContracts: Record<string, EventContract[]>;
  receivedEvent: number[];
  parsedReq: {
    headers: Record<any, any>;
    body: any;
    query: ParsedQs;
    url: string;
    oauthResponse: {
      headers: Record<string, string>;
      body: Record<string, any>;
    };
  };
}
export interface EventContract {
  action: Action;
  event: Event;
  contract: Contract;
  action_security: ActionSecurity;
  system_producer?: System;
  system_consumer?: System;
}

class EventControllers {
  configuration = getConfig();
  knexPool: Knex;
  scryptPromise = util.promisify(crypto.scrypt);
  encryptionKey: Buffer;
  queueClient: Client;
  mailService = new MailService();

  constructor(knexPool: Knex, encryptionKey: Buffer, queueClient?: Client) {
    this.knexPool = knexPool;
    this.encryptionKey = encryptionKey;
    if (queueClient) {
      this.queueClient = queueClient;
      this.subscribeToQueue(this.queueClient, getConfig());
    }
  }

  subscribeToQueue(client: Client, configuration: Partial<ConfigGlobalDto>) {
    const subscribeHeaders = {
      destination: `/queue/${configuration.queue.destination}`,
      ack: 'client-individual',
    };

    return client.subscribe(subscribeHeaders, (err, message) => {
      this.clientSubscriptionHandler(err, message, configuration, client);
    });
  }

  clientSubscriptionHandler(
    err: Error,
    message: Client.Message,
    configuration: Partial<ConfigGlobalDto>,
    client: Client,
  ) {
    if (err) {
      configuration.log().error(`subscribe error ${err.message}`);
      return;
    }

    message.readString('utf-8', (messageError, rawMessage) => {
      this.handleMessageReading(
        messageError,
        rawMessage,
        configuration,
        client,
        message,
      );
    });
  }

  handleMessageReading(
    messageError: Error,
    rawMessage: string,
    configuration: Partial<ConfigGlobalDto>,
    client: Client,
    message: Client.Message,
  ) {
    if (messageError) {
      configuration.log().error('read message error ' + messageError.message);
      return;
    }

    configuration.log().info('received message: ' + rawMessage);

    const parsedMessage = JSON.parse(rawMessage) as ContractsExecutionBody;

    this.executeMultipleContracts(
      parsedMessage.orderedContracts,
      parsedMessage.receivedEvent,
      parsedMessage.parsedReq,
    );

    client.ack(message);
  }
  sendMailToEventhosManagersOnError = async (message: string) => {
    const smtpParams = {
      to: this.configuration.smtp.defaultRecipients,
      text: message,
      html: `<b>${message}</b>`,
      subject: this.mailService.getSubject(),
      smtpHost: this.configuration.smtp.host,
      smtpPort: this.configuration.smtp.port,
      smtpUser: this.configuration.smtp.user,
      smtpPassword: this.configuration.smtp.password,
      smtpTlsCiphers: this.configuration.smtp.tlsCiphers,
      smtpSecure: this.configuration.smtp.enableSSL,
      smtpAlias: this.configuration.smtp.alias
    }

    if (this.configuration.smtp.host && !this.configuration.smtp.host.includes("${")) {
      return await this.mailService.sendMail(smtpParams);
    }

  };
  /**
   *
   * @describe Validates the recived event
   */
// event validation internal
  eventValidation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const systemKey = (req.query['access-key'] ||
        req.headers['access-key']) as string;
      const eventIdentifier = req.query['event-identifier'] as string;

      if (!systemKey || !eventIdentifier) {
        await this.sendMailToEventhosManagersOnError(
          'Either the access key or the identifier for the event was not send.',
        );
        return this.returnError(
          'Either the access key or the identifier for the event was not send.',
          'Either the access key or the identifier for the event was not send.',
          400201,
          400,
          'eventValidation',
          next,
        );
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
        await this.sendMailToEventhosManagersOnError(
          `The event ${eventIdentifier} does not exist.`,
        );
        return this.returnError(
          `The event ${eventIdentifier} does not exist.`,
          `The event ${eventIdentifier} does not exist.`,
          400202,
          400,
          'eventValidation',
          next,
        );
      }

      const client = (
        await this.knexPool
          .table('OAUTH2_Clients')
          .select()
          .where('id', event.client_id)
          .andWhere('deleted', false)
      )[0];
      

      if (!client) {
        await this.sendMailToEventhosManagersOnError(`The client does not exist.`);
        return this.returnError(
          `The client does not exist.`,
          `The client does not exist.`,
          404201,
          404,
          'eventValidation',
          next,client
        );
      }

      if (client.revoked) {
        await this.sendMailToEventhosManagersOnError(
          `The client access has been revoked.`,
        );
        return this.returnError(
          `The client access has been revoked.`,
          `The client access has been revoked.`,
          403201,
          403,
          'eventValidation',
          next,
        );
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
        await this.sendMailToEventhosManagersOnError(`Incorrect token`);
        return this.returnError(
          'Incorrect token',
          'Incorrect token',
          401201,
          401,
          'eventValidation',
          next,
        );
      }

      jwt.verify(
        systemKey,
        getConfig().oauth2.jwtSecret,
        async (err: any, decode: any) => {
          if (err) {
            await this.sendMailToEventhosManagersOnError(`Incorrect token`);
            return this.returnError(
              'Incorrect token',
              'Incorrect token',
              401202,
              401,
              'eventValidation',
              next,
            );
          }
          this.handleDecodeData(decode, client, res, next, event);
        },
      );
    } catch (error) {      
      await this.sendMailToEventhosManagersOnError(error.message);
      return this.returnError(
        error.message,
        error.message,
        500201,
        500,
        'eventValidation',
        next,
        error,
      );
    }
  };

  eventValidationInternal = async (req: any) => {
    const eventIdentifier = req.eventIdentifier;
    if (!eventIdentifier) {
      await this.sendMailToEventhosManagersOnError(
        'There isnt event identifier',
      );
      return this.returnError(
        'There isnt event identifier',
        'There isnt event identifier',
        400201,
        400,
        'eventValidationInternal',
        () => console.error("There isnt event identifier"),
      );
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
      await this.sendMailToEventhosManagersOnError(
        `The event ${eventIdentifier} does not exist.`,
      );
      return this.returnError(
        `The event ${eventIdentifier} does not exist.`,
        `The event ${eventIdentifier} does not exist.`,
        400202,
        400,
        'eventValidationInternal',
        () => console.error("There isnt event identifier"),
      );
    }

    return event.id
  }

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
    return this.returnError(
      'Incorrect token',
      'Incorrect token',
      401202,
      401,
      'handleDecodeData',
      next,
    );
  };

  /**
   *
   * @description Gets all the contracts of an event
   */
  getEventContract = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const contractId = req.query['contract-id'] ?? 0;
      const contractDetailId = req.body['contractDetailId'];
      const receivedEventId = req.body['receivedEventId'];
      if (!res.locals.eventId) {
        await this.sendMailToEventhosManagersOnError('Event Id was not send.');
        return this.returnError(
          'Event Id was not send.',
          'Event Id was not send.',
          400203,
          400,
          'getEventContract',
          next,
        );
      }
      if (!receivedEventId) {
        await this.sendMailToEventhosManagersOnError(
          'Received event Id was not send.',
        );
        return this.returnError(
          'Received event Id was not send.',
          'Received event Id was not send.',
          400203,
          400,
          'getEventContract',
          next,
        );
      }
      if (!contractDetailId) {
        await this.sendMailToEventhosManagersOnError(
          'Contract detail Id was not send.',
        );
        return this.returnError(
          'Contract detail Id was not send.',
          'Contract detail Id was not send.',
          400203,
          400,
          'getEventContract',
          next,
        );
      }
      const eventContract = await this.knexPool
        .from('contract')
        .select()
        .join('event', 'contract.event_id', 'event.id')
        .join('action', 'contract.action_id', 'action.id')
        .join('action_security', 'action.id', 'action_security.action_id')
        .join(
          'system AS system_producer',
          'event.system_id',
          'system_producer.id',
        )
        .join(
          'system AS system_consumer',
          'action.system_id',
          'system_consumer.id',
        )
        .options({ nestTables: true })
        .where('contract.id', contractId as any)
        .where('contract.event_id', res.locals.eventId)
        .where('contract.active', true)
        .andWhere('contract.deleted', false)
        .first();
      res.locals.eventContract = eventContract;
      res.locals.contractDetailId = contractDetailId;
      res.locals.receivedEventId = receivedEventId;

      return next();
    } catch (error) {
      await this.sendMailToEventhosManagersOnError(error.message);
      return this.returnError(
        error.message,
        error.message,
        500202,
        500,
        'getEventContract',
        next,
        error,
      );
    }
  };

  // TODO
  getEventContracts = async (
    req: Request,
    res: Response,
    next?: NextFunction,
    typeInvoke: string = "middleware"
  ) => {
    try {
      if (!res.locals.eventId) {
        await this.sendMailToEventhosManagersOnError('Event Id was not send');
        return this.returnError(
          'Event Id was not send.',
          'Event Id was not send.',
          400203,
          400,
          'getEventContracts',
          next,
        );
      }
      const eventContracts = (await this.knexPool
        .from('contract')
        .select()
        .join('event', 'contract.event_id', 'event.id')
        .join('action', 'contract.action_id', 'action.id')
        .join('action_security', 'action.id', 'action_security.action_id')
        .join(
          'system AS system_producer',
          'event.system_id',
          'system_producer.id',
        )
        .join(
          'system AS system_consumer',
          'action.system_id',
          'system_consumer.id',
        )
        .options({ nestTables: true })
        .orderBy('contract.order', 'asc')
        .where('contract.event_id', res.locals.eventId)
        .where('contract.active', true)
        .andWhere('contract.deleted', false)) as {
          action: Action;
          event: Event;
          contract: Contract;
          action_security: ActionSecurity;
          system_producer: any;
          system_consumer: any;
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
      if (typeInvoke !== 'middleware' ) {
        return eventContracts;
      }
      return next();
    } catch (error) {
      await this.sendMailToEventhosManagersOnError(error.message);
      return this.returnError(
        error.message,
        error.message,
        500202,
        500,
        'getEventContracts',
        next,
        error,
      );
    }
  };
  getContractDetailAndTry = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const contractDetailId = req.body['contractDetailId'];

      if (!contractDetailId) {
        return this.returnError(
          'Contract Detail Id was not send.',
          'Contract Detail Id was not send.',
          400203,
          400,
          'getContractDetail',
          next,
        );
      }
      const contractDetail = await this.knexPool
        .from('contract_exc_detail')
        .select()
        .where('id', contractDetailId)
        .first();
      const contractTry = await this.knexPool
        .from('contract_exc_try')
        .select()
        .where('contract_exc_detail_id', contractDetailId)
        .first();
      if (!contractDetail) {
        return this.returnError(
          'Contract Detail was not found.',
          'Contract Detail was not found.',
          400203,
          400,
          'getContractDetail',
          next,
        );
      }
      if (!contractTry) {
        return this.returnError(
          'Contract Try was not found.',
          'Contract Try was not found.',
          400203,
          400,
          'getContractDetail',
          next,
        );
      }
      res.locals.contractDetail = contractDetail;
      res.locals.contractTry = contractTry;
      return next();
    } catch (error) {
      return this.returnError(
        error.message,
        error.message,
        500202,
        500,
        'getContractDetail',
        next,
        error,
      );
    }
  };
  handleRetryAborted = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (
        res.locals.contractDetail.state != 'error' ||
        res.locals.contractDetail.is_aborted == 1 ||
        res.locals.contractDetail.attempts > 0
      ) {
        return this.returnError(
          'Contract Detail was prosecuted.',
          'Contract Detail was was prosecuted.',
          400203,
          400,
          'handleRetryAborted',
          next,
        );
      }
      if (
        res.locals.contractTry.state != 'error' ||
        res.locals.contractTry.is_aborted == 1 ||
        res.locals.contractTry.attempts > 0
      ) {
        return this.returnError(
          'Contract Try was prosecuted.',
          'Contract Try was prosecuted.',
          400203,
          400,
          'handleRetryAborted',
          next,
        );
      }
      await this.knexPool
        .table('contract_exc_detail')
        .update({ is_aborted: true })
        .where('id', res.locals.contractDetail.id);
      await this.knexPool
        .table('contract_exc_try')
        .update({ is_aborted: true })
        .where('contract_exc_detail_id', res.locals.contractDetail.id);
      return res.status(200).json({
        code: 200000,
        message: 'success',
      });
    } catch (error) {
      return this.returnError(
        error.message,
        error.message,
        500203,
        500,
        'handleRetryAborted',
        next,
        error,
      );
    }
  };
  getContractExecutionDetail = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
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
      return this.returnError(
        error.message,
        error.message,
        500203,
        500,
        'getContractExecutionDetail',
        next,
        error,
      );
    }
  };

  /**
   *
   * @description Manages the event logic
   */
  manageEventContract = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (
        !res.locals.eventId ||
        !res.locals.eventContract ||
        !res.locals.contractDetailId
      ) {
        await this.sendMailToEventhosManagersOnError(
          'Event Id or Event Contract List was not send.',
        );
        return this.returnError(
          'Event Id or Event Contract List was not send.',
          'Event Id or Event Contract List was not send.',
          400204,
          400,
          'manageEventContract',
          next,
        );
      }

      if (isNaN(res.locals.eventId)) {
        await this.sendMailToEventhosManagersOnError('Event Id is not a number.');
        return this.returnError(
          'Event Id is not a number.',
          'Event Id is not a number.',
          400205,
          400,
          'manageEventContract',
          next,
        );
      }

      if (!res.locals.eventContract) {
        await this.sendMailToEventhosManagersOnError(
          'Event Contract is not an array',
        );
        return this.returnError(
          'Event Contract is not an array.',
          'Event Contract is not an array.',
          400206,
          400,
          'manageEventContract',
          next,
        );
      }

      const eventId = res.locals.eventId as number;

      const eventContract = res.locals.eventContract as EventContract;

      const receivedEventExist = await this.knexPool
        .table('received_event')
        .where('id', res.locals.receivedEventId)
        .first();

      const receivedEventExistRequest = JSON.parse(
        await this.decryptString(receivedEventExist.received_request),
      );
      const basicRequest = {
        headers: receivedEventExistRequest.headers,
        query: receivedEventExistRequest.query,
        body: receivedEventExistRequest.body,
        method: receivedEventExistRequest.method,
        url: req.protocol + '://' + req.get('host') + req.originalUrl,
      };
      const baseRequestEncryption = await this.encryptString(
        JSON.stringify(basicRequest),
      );
      const contractDetailId = res.locals.contractDetailId;
      const contractExcDetailExist = await this.knexPool
        .table('contract_exc_detail')
        .increment('attempts', 1)
        .where('id', contractDetailId)
        .where('attempts', 0)
        .where('state', 'error')
        .where('is_aborted', 0);
      const contractExcTryExist = await this.knexPool
        .table('contract_exc_try')
        .increment('attempts', 1)
        .where('contract_exc_detail_id', contractDetailId)
        .where('attempts', 0)
        .where('state', 'error')
        .where('is_aborted', 0);

      if (!contractExcDetailExist || !contractExcTryExist) {
        await this.sendMailToEventhosManagersOnError(
          'Detail of the contract does not exist or has already been processed',
        );
        return this.returnError(
          'Detail of the contract does not exist or has already been processed',
          'Detail of the contract does not exist or has already been processed',
          400206,
          400,
          'manageEventContract',
          next,
        );
      }
      const receivedEvent = await this.knexPool.table('received_event').insert({
        event_id: eventId,
        received_request:
          baseRequestEncryption.hexedInitVector +
          '|.|' +
          baseRequestEncryption.encryptedData,
      });
      const parsedReq = {
        headers: receivedEventExistRequest?.headers,
        query: receivedEventExistRequest?.query,
        body: receivedEventExistRequest?.body,
        url: receivedEventExistRequest?.url,
        oauthResponse: {} as {
          headers: Record<string, string>;
          body: Record<string, any>;
        },
      };
      await this.executeContract(eventContract, receivedEvent, parsedReq);

      return res.status(200).json({ code: 20000, message: 'success' });
    } catch (error) {
      await this.sendMailToEventhosManagersOnError(error.message);
      return this.returnError(
        error.message,
        error.message,
        500204,
        500,
        'manageEventContract',
        next,
        error,
      );
    }
  };

  manageEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!res.locals.eventId || !res.locals.eventContracts) {
        await this.sendMailToEventhosManagersOnError(
          'Event Id or Event Contract List was not send.',
        );
        return this.returnError(
          'Event Id or Event Contract List was not send.',
          'Event Id or Event Contract List was not send.',
          400204,
          400,
          'manageEvent',
          next,
        );
      }

      if (isNaN(res.locals.eventId)) {
        await this.sendMailToEventhosManagersOnError('Event Id is not a number');
        return this.returnError(
          'Event Id is not a number.',
          'Event Id is not a number.',
          400205,
          400,
          'manageEvent',
          next,
        );
      }

      if (!res.locals.eventContracts.length) {
        await this.sendMailToEventhosManagersOnError(
          'Event Contracts is not an array',
        );
        return this.returnError(
          'Event Contract is not an array.',
          'Event Contract is not an array.',
          400206,
          400,
          'manageEvent',
          next,
        );
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
        url: req.protocol + '://' + req.get('host') + req.originalUrl,
        oauthResponse: {} as {
          headers: Record<string, string>;
          body: Record<string, any>;
        },
      };

      const orderedContracts =
        this.generateOrderFromEventContracts(eventContracts);

      // * Start of rxjs contracts execution

      if (this.queueClient === undefined) {
        this.executeMultipleContracts(
          orderedContracts,
          receivedEvent,
          parsedReq,
        );
      } else {
        const sendHeaders = {
          destination: `/queue/${getConfig().queue.destination}`,
          'content-type': 'text/plain',
        };

        const messageToSend = {
          orderedContracts,
          receivedEvent,
          parsedReq,
        };

        const stringMessage = JSON.stringify(messageToSend);

        const frame = this.queueClient.send(sendHeaders);
        frame.write(stringMessage);
        frame.end();
      }

      // * End of rxjs contracts execution

      return res.status(200).json({ code: 20000, message: 'success' });
    } catch (error) {
    this.configuration.log().error(error.message)

      await this.sendMailToEventhosManagersOnError(error.message);
      return this.returnError(
        error.message,
        error.message,
        500204,
        500,
        'manageEvent',
        next,
        error,
      );
    }
  };

  executeMultipleContracts = (
    orderedContracts: Record<string, EventContract[]>,
    receivedEvent: number[],
    parsedReq: {
      headers: Record<any, any>;
      body: any;
      query: ParsedQs;
      url: string;
      oauthResponse: {
        headers: Record<string, string>;
        body: Record<string, any>;
      };
    },
  ) => {
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

    concat(...mergedContractExecutions).subscribe((mergedRes) => {
      this.handlePostContractExecution(mergedRes, getConfig().log());
    });
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
      const orderString = eventContract.contract?.order;
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
      url: string;
      oauthResponse: {
        headers: Record<string, string>;
        body: Record<string, any>;
      };
    },
  ) => {
    const parsedHeaders: Record<string, string> = {};
    const parsedQueryParams: Record<string, string> = {};
    let parsedBody: Record<string, any> = {};
    try {
      if (eventContract.action_security.type === 'oauth2_client') {
        const jsonAxiosBaseAuthConfig = JSON.parse(
          await this.decryptString(
            eventContract.action_security.http_configuration,
          ),
        ) as AxiosRequestConfig;

        jsonAxiosBaseAuthConfig.headers = {
          ...jsonAxiosBaseAuthConfig.headers,
          eventhosStartDate: new Date().toISOString(),
        };
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
      ) as AxiosRequestConfig & { rawFunctionBody: string };

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
      //TODO: diferencia fullParsedBody
      const fullParsedBody = {
        ...this.parseBodyData(jsonAxiosBaseConfig.data, parsedReq),
      };

      if (jsonAxiosBaseConfig?.rawFunctionBody) {
        const javaScriptHelpers = new JavaScriptHelpers();
        const eventContext = {
          httpRequest:
          {
            body: { ...parsedReq?.body }
          }
        }
        try {
          parsedBody = {
            ...await javaScriptHelpers.executeSingleFunction(
              jsonAxiosBaseConfig?.rawFunctionBody,
              eventContext
            )
          };
        } catch (error) {
          parsedBody = {
            "code": 40001,
            "message": `Failed while custom function was executed to create the request : ${error?.message}`
          }
        }
      } else if (JSON.stringify(jsonAxiosBaseConfig.data) === '{}') {
        parsedBody = { ...parsedReq.body };
      } else {
        parsedBody = {
          ...fullParsedBody,
        };
      }
      jsonAxiosBaseConfig.url = this.parsedUrlParams(jsonAxiosBaseConfig.url, parsedReq)
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
      
      if(eventContract?.action?.reply_to) {
        try {
          const params = {
            eventIdentifier: eventContract.action.reply_to
          }
          const eventId= await this.eventValidationInternal(params);

          const reqInternal = {
            headers: {},
            query: {},
            body: result?.data,
            method: "POST",
            protocol: "http",
            originalUrl: "/event-identifier=" + eventContract.action.reply_to,
            get: (param: string) => {
              let customUrl: any = {
                host: "localhost:" + this.configuration.port
              }
  
              return customUrl[param]
            },
          }
  
          let resInternal: any = {
            locals: {
              eventId: eventId
            },
            status: () => {
              const json = () => {
                return "OK"
              }
              return {json}
            }
          }
          const eventContracts = await this.getEventContracts(reqInternal as Request, resInternal as unknown as Response, () => console.log("next"), "function")
          resInternal.locals.eventContracts = eventContracts
          await this.manageEvent(reqInternal as Request, resInternal as Response, () => console.log("next"))
        } catch (error) {
          this.configuration.log().error(error.message)
        }
      }
      return {
        message: `Contract with id ${eventContract.contract.id} executed successfully`,
      };
    } catch (error) {
      if (error.isAxiosError) {
        await this.handleContractExecutionError(
          error,
          eventContract,
          receivedEvent,
        ).then((data) => {
          getConfig().log().info('Error saved');
        });
        let receptorsOnError = '';
        if (
          eventContract.contract.mail_recipients_on_error.length === 0 ||
          eventContract.contract.mail_recipients_on_error.length === null
        ) {
          receptorsOnError = this.configuration.smtp.defaultRecipients;
        } else {
          receptorsOnError = eventContract.contract.mail_recipients_on_error;
        };
        let mailTemplate = await readFile(
          'src/mail/templates/mailRecipientsOnError.html',
          'utf8',
        );
        const today = new Date();
        const now = today.toLocaleString();
        const jsonAxiosBaseConfig = JSON.parse(
          await this.decryptString(eventContract.action.http_configuration),
        ) as AxiosRequestConfig;
        const rawSensibleParams = this.configuration.smtp.rawSensibleParams;
        const receivedEventId = receivedEvent[0].toString();
        const paramsHtml = {
          eventContractContractIdentifier: eventContract.contract.identifier,
          eventContractEventIdentifier: eventContract.event.identifier,
          eventContractEventDescription: eventContract.event.description,
          eventContractSystemProducerName: eventContract.system_producer.name,
          eventContractSystemProducerDescription: eventContract.system_producer.description,
          eventContractActionIdentifier: eventContract.action.identifier,
          eventContractActionDescription: eventContract.action.description,
          eventContractSystemConsumerName: eventContract.system_consumer.name,
          eventContractSystemConsumerDescription: eventContract.system_consumer.description,
          receivedEventId: receivedEventId,
          parsedBody: parsedBody,
          parsedReqUrl: parsedReq.url,
          parsedReqHeaders: parsedReq.headers,
          errorResponseRequestResponseUrl: error?.response?.request?.res?.responseUrl ?? jsonAxiosBaseConfig.url,
          errorResponseStatus: error.response?.status ?? 500,
          errorResponseData: error.response?.data,
          errorResponseHeaders: error.response?.headers
        }
        const html =
          this.mailService.replaceHtmlToSendByMail(
            mailTemplate,
            now,
            rawSensibleParams,
            paramsHtml
          );
        if (this.configuration.smtp.host && !this.configuration.smtp.host.includes("${")) {
          await this.mailService.sendMail({
            to: receptorsOnError,
            text: 'There are errors in subscribe system',
            subject: this.mailService.getSubject(),
            html: html,
            smtpHost: this.configuration.smtp.host,
            smtpPort: this.configuration.smtp.port,
            smtpUser: this.configuration.smtp.user,
            smtpPassword: this.configuration.smtp.password,
            smtpTlsCiphers: this.configuration.smtp.tlsCiphers,
            smtpSecure: this.configuration.smtp.enableSSL,
            smtpAlias: this.configuration.smtp.alias
          });
        }
      }
      return {
        message: `Error while executing contract with id ${eventContract.contract.id}`,
        error: error,
      };
    }
  };

  /**
   * 
   * @param jsonAxiosBaseConfigUrl url
   * @param parsedReq request
   * @description parsed all parameters that have json path syntax
   */
  parsedUrlParams = (jsonAxiosBaseConfigUrl: string, parsedReq: {
    headers: Record<string, string | string[]>;
    query: Record<string, string | ParsedQs | string[] | ParsedQs[]>;
    body: Record<string, any>;
  }): string => {
    if (jsonAxiosBaseConfigUrl.includes('${.')) {
      let parsedUrl = jsonAxiosBaseConfigUrl;
      const parseUrlArr = parsedUrl.split('/$');
      parseUrlArr.shift();
      parseUrlArr.map((key, index) => {
        key = key.replace(/\/.*/g, '');
        const parsedUrlParam = this.getVariables(
          '$' + key,
          0,
          parsedReq,
          'urlParam',
        );
        parsedUrl = parsedUrl.replace('$' + key, parsedUrlParam);
      });
      return parsedUrl;
    }
    return jsonAxiosBaseConfigUrl;
  }

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
      return excDetail[0];
    } catch (lastError) {
      logger.error(lastError);
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

  // TODO: documentar que hace la función
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
  listReceivedEvents = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {
      const { itemsPerPage, offset, pageIndex, order } =
        controllerHelpers.getPaginationData(req);

      const { systemId, fromTime, toTime, state, idSearch, eventIdentifierSearch } = req.query;

      const totalReceivedEventCountQuery = this.knexPool('received_event')
        .join('event', 'event.id', 'received_event.event_id')
        .countDistinct('received_event.id');

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
          toTimeDate,
        );
      }

      if (fromTime) {
        const fromTimeDate = new Date(fromTime as string);
        fromTimeDate.setHours(0);
        totalReceivedEventCountQuery.where(
          'received_at',
          '>',
          fromTimeDate,
        );
      }
      if (state) {
        totalReceivedEventCountQuery.join(
          'contract_exc_detail',
          'contract_exc_detail.received_event_id',
          'received_event.id',
        ).where('contract_exc_detail.state', "=", state as string)
      }
      if (eventIdentifierSearch) {
        totalReceivedEventCountQuery
          .where('event.identifier', "=", eventIdentifierSearch as string)
      }

      if (idSearch) {
        totalReceivedEventCountQuery
        .where('received_event.id', idSearch as string);
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
      if (idSearch) {
        receivedEventsQuery.where('received_event.id', idSearch as string);
      }
      if (state) {
        receivedEventsQuery.where(this.knexPool.raw("(SELECT GROUP_CONCAT(state) FROM contract_exc_detail as CED WHERE received_event.id = CED.received_event_id)"), "like", `%${state}%`)
      }
      const totalReceivedEventCount = (await totalReceivedEventCountQuery)[0][
        'count(distinct `received_event`.`id`)'
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
          // 'contract_exc_detail.state as state',
          'system.identifier as systemIdentifier',
          'event.name as eventName',
          'event.identifier as eventIdentifier',
          'event.description as eventDescription',
          'received_request',
          'received_at as receivedAt',
          this.knexPool.raw("(SELECT GROUP_CONCAT(state) FROM contract_exc_detail as CED WHERE received_event.id = CED.received_event_id) as state")
        )
        /* .leftJoin(
          'contract_exc_detail',
          'contract_exc_detail.received_event_id',
          'received_event.id',
        ) */
        .join('event', 'event.id', 'received_event.event_id')
        .join('system', 'system.id', 'event.system_id')
        .orderBy('received_event.id', order)
        .groupBy('received_event.id');
          
      if (eventIdentifierSearch) {
        receivedEventsFullQuery.where('event.identifier', "=", eventIdentifierSearch as string);
      };
      const receivedEvents = await receivedEventsFullQuery;
      const finalData = receivedEvents.map(event => {
        const arrStates = event.state?.split(",") ?? [null]
        event.state = arrStates
        return event;
      })
      
      // const joinedSearch = this.joinSearch(receivedEvents, 'id', 'state');
      // let filteredData = [];
      /* if (state) {
        const eventLogs = joinedSearch.filter((item) => {
          return item.state.find((eachState: string) => eachState === state)
        })
        filteredData = eventLogs;
      } else {
        filteredData = joinedSearch;
      } */
      return res.status(200).json({
        code: 200000,
        message: 'success',
        content: {
          items: finalData,
          pageIndex,
          itemsPerPage,
          totalItems: totalReceivedEventCount,
          totalPages,
        },
      });
    } catch (error) {
      return this.returnError(
        error.message,
        error.message,
        500205,
        500,
        'listReceivedEvents',
        next,
        error,
      );
    }
  };

  getReceivedEventDetails = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
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
          'contract_exc_detail.attempts as attempts',
          'contract_exc_detail.is_aborted as isAborted',
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
      return this.returnError(
        error.message,
        error.message,
        500206,
        500,
        'getReceivedEventDetails',
        next,
        error,
      );
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
      if (
        index === 0 ||
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

  createEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { system_id, identifier, name, operation, description } = req.body;
      const insertResult = await this.knexPool.table('event').insert({
        system_id,
        identifier: `${identifier}-${nanoid(10)}`,
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
      return this.returnError(
        error.message,
        error.message,
        500207,
        500,
        'createEvent',
        next,
        error,
      );
    }
  };

  updateEvent = async (req: Request, res: Response, next: NextFunction) => {
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
      return this.returnError(
        error.message,
        error.message,
        500208,
        500,
        'updateEvent',
        next,
        error,
      );
    }
  };

  deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const eventInContracts = await this.knexPool
        .table('contract')
        .select('id')
        .where('event_id', id)
        .andWhere('deleted', false);

      if (eventInContracts.length > 0) {
        return this.returnError(
          'Event has active contracts',
          'Event has active contracts',
          400207,
          400,
          'manageEvent',
          next,
        );
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
      return this.returnError(
        error.message,
        error.message,
        500209,
        500,
        'deleteEvent',
        next,
        error,
      );
    }
  };

  getEvents = async (req: Request, res: Response, next: NextFunction) => {
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
        totalEventsCountQuery.andWhere('name', 'like', '%' + eventName + '%');
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
        eventsQuery.andWhere('name', 'like', '%' + eventName + '%');
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
      return this.returnError(
        error.message,
        error.message,
        500210,
        500,
        'getEvents',
        next,
        error,
      );
    }
  };

  returnError = (
    message: string,
    logMessage: string,
    errorCode: number,
    statusCode: number,
    onFunction: string,
    next: NextFunction,
    error?: any,
  ) => {
    const errorForNext = new ErrorForNext(
      message,
      statusCode,
      errorCode,
      onFunction,
      'event.controller.ts',
    ).setLogMessage(logMessage);

    if (error && error.response === undefined)
      errorForNext.setOriginalError(error);

    if (error && error.response) errorForNext.setErrorObject(error.response);

    if (error && error.sqlState)
      errorForNext.setMessage(`Data base error. ${message}`);

    return next(errorForNext.toJSON());
  };
}

export default EventControllers;
