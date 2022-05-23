import { getConfig } from '../../config/main.config';

describe('Correct configuration declaration', () => {
  process.env.USE_QUEUE = 'false';
  process.env.PORT = '2109';

  const configuration = getConfig();

  it('Correct environment', () => {
    expect(configuration).toBeTruthy();
    expect(configuration.state).toBe('test');
  });

  it('Correct logger', () => {
    expect(configuration.log()).toBeTruthy();
  });

  it('Correct port', () => {
    expect(configuration.port).toEqual(expect.any(Number));
    expect(configuration.port).toBeGreaterThan(-1);
  });

  it('Correct database host', () => {
    expect(configuration.dataBase.host).toBeTruthy();
    expect(configuration.dataBase.host).toEqual(expect.any(String));
  });

  it('Correct database password', () => {
    expect(configuration.dataBase.password).toBeTruthy();
  });
});

describe('Correct configuration declaration with queue', () => {
  process.env.USE_QUEUE = 'true';
  process.env.PORT = 'noNumber';

  const configuration = getConfig();

  it('Correct queue', () => {
    expect(configuration).toBeTruthy();
    expect(configuration.queue.active).toBe(true);
  });

  it('Correct port configuration', () => {
    expect(configuration).toBeTruthy();
    expect(configuration.port).toBe(2109);
  });
});
