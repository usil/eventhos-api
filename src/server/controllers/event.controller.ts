import { NextFunction, Request, Response } from 'express';
import { Knex } from 'knex';
import ReceivedEvent from '../dtos/RecivedEvent.dto';
import { paginator } from '../../helpers/general';
import axios, { AxiosRequestConfig, AxiosRequestHeaders } from 'axios';
import { defer, take } from 'rxjs';
import { Action, ActionSecurity, Contract } from '../dtos/eventhosInterface';
import colors from 'colors';

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
        .select('system.key', 'event.identifier', 'event.id')
        .from('event')
        .join('system', 'system.id', 'event.system_id')
        .first()
        .where('event.identifier', eventIdentifier)) as {
        key: string;
        identifier: string;
        id: number;
      };

      console.log(event);

      if (!event) {
        return res.status(404).json({
          code: 400024,
          message: `The event ${eventIdentifier} does not exist.`,
        });
      }

      if (event.key !== systemKey) {
        return res.status(403).json({
          code: 400023,
          message: `Key incorrect.`,
        });
      }

      res.locals.eventId = event.id;
      return next();
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
        .where('contract.event_id', res.locals.eventId)) as {
        action: Action;
        event: Event;
        contract: Contract;
        action_security: ActionSecurity;
      }[];
      if (eventContracts.length === 0) {
        return res.status(203).json({
          code: 20031,
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
      console.log('reach');
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

      console.log(
        colors.yellow.bgBlack(
          `${receivedEvent} wil be executed at ${new Date().toLocaleString()}:${new Date().getMilliseconds()}`,
        ),
      );

      //TODO: PARAMETERIZE FORWARD-HEADERS

      // delete req.headers['content-length'];

      // const nextRequestHeaders = req.headers as AxiosRequestHeaders;

      for (const contract of eventContracts) {
        this.createAxiosObservable({
          ...contract.action.http_configuration,
          data: req.body,
          headers: {
            // ...nextRequestHeaders,
            ...contract.action.http_configuration.headers,
          },
        })
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
            next: (res) => {
              console.log(
                'header',
                colors.magenta(JSON.stringify(res.headers)),
              );
              console.log('body', colors.green(JSON.stringify(res.data)));
            },
            error: (error) => {
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

  /**
   *
   * @description List all of the recived events
   */
  listReceivedEvents = async (req: Request, res: Response) => {
    try {
      let pageSize = 4;

      const recivedPageSize = parseInt(req.query['page-size'] as string);

      if (!isNaN(recivedPageSize)) {
        pageSize = recivedPageSize;
      }

      const receivedEvents = (await this.knexPool
        .from('received_event')
        .join('event', 'event.id', 'received_event.event_id')
        .join('system', 'system.id', 'event.system_id')
        .select(
          'received_event.id',
          'system.id as systemId',
          'event.id as eventId',
          'system.name as systemName',
          'system.identifier as systemIdentifier',
          'event.name as eventName',
          'event.identifier as eventIdentifier',
          'event.description as eventDescription',
          'header',
          'body',
          'recived_at as recivedAt',
        )
        .orderBy('received_event.id', 'desc')) as ReceivedEvent[];

      const pagination = paginator(receivedEvents, pageSize);

      return res.status(200).json({
        code: 200000,
        message: 'success',
        content: pagination.content,
        pagination: pagination.pagination,
      });
    } catch (error) {
      this.returnError(error, res);
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
