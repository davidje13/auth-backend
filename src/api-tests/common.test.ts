import { createServer } from 'node:http';
import request from 'supertest';
import { testServerRunner } from './testServerRunner';
import { buildAuthenticationBackend } from '..';
import 'lean-test';

const GOOGLE_CONFIG = {
  clientId: 'my-client-id',
  authUrl: 'foo',
  certsUrl: 'anything',
};

describe('/', () => {
  const SERVER = testServerRunner(() => {
    const config = { google: GOOGLE_CONFIG };

    return createServer(buildAuthenticationBackend(config, () => '').router('/prefix'));
  });

  it('responds with client-visible configuration', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER)).get('/prefix').expect(200);

    expect(response.body.google.clientId).toEqual('my-client-id');
    expect(response.body.google.authUrl).toEqual('foo');
  });

  it('does not include sensitive information', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER)).get('/prefix').expect(200);

    expect(response.body.google.certsUrl).toBeUndefined();
  });

  it('does not include unconfigured services', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER)).get('/prefix').expect(200);

    expect(response.body.github).toBeUndefined();
  });

  it('responds HTTP Method Not Allowed for incorrect method', async ({ getTyped }) => {
    await request(getTyped(SERVER)).post('/prefix').expect(405);
  });

  it('responds HTTP Not Found for incorrect path', async ({ getTyped }) => {
    await request(getTyped(SERVER)).get('/').expect(404);
  });
});

describe('/service', () => {
  const SERVER = testServerRunner(() => {
    const config = { google: GOOGLE_CONFIG };

    return createServer(buildAuthenticationBackend(config, () => '').router('/prefix'));
  });

  it('responds HTTP Not Found for unknown services', async ({ getTyped }) => {
    await request(getTyped(SERVER)).post('/prefix/nope').expect(404);
  });

  it('responds HTTP Not Found for unconfigured services', async ({ getTyped }) => {
    await request(getTyped(SERVER)).post('/prefix/gitlab').expect(404);
  });

  it('responds HTTP Not Found for incorrect path', async ({ getTyped }) => {
    await request(getTyped(SERVER)).post('/nope/google').expect(404);
  });

  it('responds HTTP Not Found for sub-path', async ({ getTyped }) => {
    await request(getTyped(SERVER)).post('/prefix/nope/google').expect(404);
  });
});
