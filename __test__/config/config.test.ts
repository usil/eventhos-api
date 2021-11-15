import getConfig from '../../src/config/main.config';
import bunyan from 'bunyan';
import { ConfigGlobalDto } from '../../src/config/config.dto';

describe('Correct configuration declaration', () => {
  const configuration = getConfig();

  it('Correct environment', () => {
    expect(configuration).toBeInstanceOf(ConfigGlobalDto);
    expect(configuration.state).toBe('test');
  });

  it('Correct logger', () => {
    expect(configuration.log()).toBeInstanceOf(bunyan);
  });

  it('Correct port', () => {
    expect(configuration.port).toEqual(expect.any(Number));
    expect(configuration.port).toBeGreaterThan(-1);
  });

  it('Correct mysql port', () => {
    expect(configuration.dataBasePort).toEqual(expect.any(Number));
    expect(configuration.dataBasePort).toBeGreaterThan(-1);
  });

  it('Correct database host', () => {
    expect(configuration.dataBaseHost).toBeTruthy();
    expect(configuration.dataBaseHost).toEqual(expect.any(String));
  });

  it('Correct database password', () => {
    expect(configuration.dataBasePassword).toBeTruthy();
  });
});
