/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express';
import RouteNecessary from './RouteNecessary';

/**
 * @description Use r.router to get the routes and r.route to get the route
 */
class Route extends RouteNecessary {
  protected _router: Router;
  protected _route: string;

  constructor(route: string) {
    super();
    this._router = Router();
    this._route = route[0] === '/' ? route : '/' + route;
  }

  /**
   * @description Acquires the route with the format /<a given route>
   *
   */
  public get route(): string {
    return this._route;
  }

  /**
   * Acquires the express.Router
   */
  public get router(): Router {
    return this._router;
  }
}

export default Route;
