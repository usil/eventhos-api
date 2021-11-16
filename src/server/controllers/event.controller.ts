import { NextFunction, Request, Response } from 'express';
import { Knex } from 'knex';
import ReceivedEvent from '../dtos/RecivedEvent.dto';
import { paginator } from '../../helpers/general';

const eventControllers = (knexPool: Knex) => {
  const eventValidation = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
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

      const event = (await knexPool('event')
        .join('system', 'system.id', 'event.system_id')
        .first()
        .select('system.key', 'event.identifier', 'event.id')
        .where('event.identifier', eventIdentifier)) as {
        key: string;
        identifier: string;
        id: number;
      };

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
      console.log(error);
      return res
        .status(500)
        .json({ code: 50000, message: 'Server Internal Error' });
    }
  };

  const receiveEvent = async (req: Request, res: Response) => {
    try {
      const receivedEvent = await knexPool('received_event').insert({
        event_id: res.locals.eventId,
        header: JSON.stringify(req.headers),
        body: JSON.stringify(req.body),
      });

      //TODO LOGIC TO DO SOMETHING
      console.log(`${receivedEvent} sended`);
      return res.status(200).json({ code: 20000, message: 'success' });
    } catch (error) {
      console.log(error);
      if (error.sqlState) {
        return res.status(500).json({
          code: 500001,
          message: `Data base error, with code ${error.sqlState}`,
        });
      }
      return res
        .status(500)
        .json({ code: 500000, message: 'Server Internal Error' });
    }
  };

  const lisReceivedEvents = async (req: Request, res: Response) => {
    try {
      let pageSize = 4;

      if (req.query['page-size']) {
        pageSize = parseInt(req.query['page-size'] as string);
      }

      const receivedEvents = (await knexPool('received_event')
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
      console.log(error);
      if (error.sqlState) {
        return res.status(500).json({
          code: 500001,
          message: `Data base error, with code ${error.sqlState}`,
        });
      }
      return res
        .status(500)
        .json({ code: 500000, message: 'Server Internal Error' });
    }
  };

  return { receiveEvent, eventValidation, lisReceivedEvents };
};

export default eventControllers;
