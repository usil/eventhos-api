import { Request } from 'express';

class ControllerHelpers {
  getPaginationData = (req: Request) => {
    let itemsPerPage = 5;
    let pageIndex = 0;
    let order = 'asc';
    let activeSort = 'id';

    if (
      req.query['itemsPerPage'] &&
      parseInt(req.query['itemsPerPage'] as string) >= 1
    ) {
      itemsPerPage = parseInt(req.query['itemsPerPage'] as string);
    }

    if (
      req.query['pageIndex'] &&
      parseInt(req.query['pageIndex'] as string) >= 0
    ) {
      pageIndex = parseInt(req.query['pageIndex'] as string);
    }

    if (
      req.query['order'] &&
      (req.query['order'] === 'desc' || req.query['order'] === 'asc')
    ) {
      order = req.query['order'];
    }

    if (req.query['activeSort']) {
      activeSort = req.query['activeSort'] as string;
    }

    const offset = itemsPerPage * pageIndex;

    return {
      offset,
      order,
      pageIndex,
      itemsPerPage,
      activeSort,
    };
  };
}

export default new ControllerHelpers();
