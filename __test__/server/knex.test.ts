import ServerInitialization from '../../src/server/ServerInitialization';

describe('Example routes works accordingly', () => {
  let serverInitialization: ServerInitialization;

  beforeAll(() => {
    serverInitialization = new ServerInitialization(8085);
    serverInitialization.createServer();
  });

  it('Correct connection', async () => {
    const connection = await serverInitialization.knexPool.raw('SELECT 1');
    expect(connection).toBeTruthy();
  });

  afterAll(() => {
    serverInitialization.server.close();
    serverInitialization.knexPool.destroy();
  });
});
