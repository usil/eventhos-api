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
      const producerKey = req.query['key'] as string;
      const producerEventIdentifier = req.query['producer-event'] as string;

      if (!producerKey || !producerEventIdentifier) {
        return res.status(400).json({
          code: 40020,
          message:
            'Either the access key or the identifier for the producer events was not send.',
        });
      }

      const producerEvent = (await knexPool('producer_event')
        .join('producer', 'producer.id', 'producer_event.producer_id')
        .first()
        .select(
          'producer.key',
          'producer_event.identifier',
          'producer_event.id',
        )
        .where('producer_event.identifier', producerEventIdentifier)) as {
        key: string;
        identifier: string;
        id: number;
      };

      if (!producerEvent) {
        return res.status(404).json({
          code: 40024,
          message: `The producer ${producerEventIdentifier} does not exist.`,
        });
      }

      if (producerEvent.key !== producerKey) {
        return res.status(403).json({
          code: 40023,
          message: `Key incorrect.`,
        });
      }

      res.locals.producerEventId = producerEvent.id;
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
        producer_event_id: res.locals.producerEventId,
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
          code: 50001,
          message: `Data base error, with code ${error.sqlState}`,
        });
      }
      return res
        .status(500)
        .json({ code: 50000, message: 'Server Internal Error' });
    }
  };

  const lisReceivedEvents = async (req: Request, res: Response) => {
    try {
      let pageSize = 4;

      if (req.query['page-size']) {
        pageSize = parseInt(req.query['page-size'] as string);
      }

      const receivedEvents = (await knexPool('received_event')
        .join(
          'producer_event',
          'producer_event.id',
          'received_event.producer_event_id',
        )
        .join('producer', 'producer.id', 'producer_event.producer_id')
        .select(
          'received_event.id',
          'producer.id as producerId',
          'producer_event.id as producerEventId',
          'producer.name as producerName',
          'producer.identifier as producerIdentifier',
          'producer_event.name as producerEventName',
          'producer_event.identifier as producerEventIdentifier',
          'header',
          'body',
          'recived_at as recivedAt',
        )
        .orderBy('received_event.id', 'desc')) as ReceivedEvent[];

      const pagination = paginator(receivedEvents, pageSize);

      return res.status(200).json({
        code: 20000,
        message: 'success',
        content: pagination.content,
        pagination: pagination.pagination,
      });
    } catch (error) {
      console.log(error);
      if (error.sqlState) {
        return res.status(500).json({
          code: 50001,
          message: `Data base error, with code ${error.sqlState}`,
        });
      }
      return res
        .status(500)
        .json({ code: 50000, message: 'Server Internal Error' });
    }
  };

  return { receiveEvent, eventValidation, lisReceivedEvents };
};

export default eventControllers;
