import Route from '../../src/server/util/Route';

describe('Correct Route functionally', () => {
  it('Creates an instance of route', () => {
    const routeInstance = new Route('/test');
    const instanceRouteTwo = new Route('testTwo');

    expect(routeInstance).toBeInstanceOf(Route);
    expect(routeInstance.route).toBe('/test');
    expect(instanceRouteTwo.route).toBe('/testTwo');
  });

  it('Router is correct', () => {
    const instanceRoute = new Route('/test');
    expect(instanceRoute.router).toBeTruthy();
    expect(instanceRoute.router.get).toBeInstanceOf(Function);
  });
});
