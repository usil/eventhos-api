import { newServer } from '../../src/server/createServer';
import { Server } from 'http';
import express from 'express';

describe('Correct app creation', () => {
  let server: Server;
  let expressApp: express.Application;

  beforeAll(() => {
    const serverFull = newServer(8083);
    server = serverFull.server;
    expressApp = serverFull.app;
  });

  it('Creates an instance of an express app', () => {
    expect(expressApp.name).toBe('app');
  });

  it('Creates an instance of an http server', () => {
    expect(server).toBeInstanceOf(Server);
  });

  beforeAll(() => {
    server.close();
  });
});
