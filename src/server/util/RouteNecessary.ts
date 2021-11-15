/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express';

/**
 * @description Methods and parameters necessary to create a route
 */
export default abstract class RouteNecessary {
  protected abstract _router: Router;
  protected abstract _route: string;
  abstract get route(): string;
  abstract get router(): Router;
}
