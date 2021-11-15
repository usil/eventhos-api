import { NextFunction, Request, Response } from 'express';
import { Knex } from 'knex';
import ReceivedEvent from '../dtos/RecivedEvent.dto';

const eventControllers = (knexPool: Knex) => {
  const eventValidation = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const producerKey = req.query['key'];
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
        )) as {
        key: string;
        identifier: string;
        id: number;
      };

      if (!producerEvent) {
        return res.status(400).json({
          code: 40021,
          message: `The producer ${producerEventIdentifier} does not exist.`,
        });
      }
      if (producerEvent.key !== producerKey) {
        return res.status(403).json({
          code: 40021,
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

      const receivedEvents = (await knexPool(
        'received_event',
      ).select()) as ReceivedEvent[];

      const pagination = paginator(receivedEvents, pageSize);

      return res.status(200).json({
        code: 20000,
        message: 'success',
        content: receivedEvents,
        pagination,
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

  const paginator = (arrayToPaginate: any[], pageSize = 2) => {
    const pages = arrayToPaginate.reduce((acc, val, i) => {
      const idx = Math.floor(i / pageSize);
      const page = acc[idx] || (acc[idx] = []);
      page.push(val);
      return acc;
    }, []) as any[];
    return {
      totalElements: arrayToPaginate.length,
      totalPages: pages.length,
      page: 0,
      pageSize,
    };
  };
  return { receiveEvent, eventValidation, lisReceivedEvents };
};

export default eventControllers;
