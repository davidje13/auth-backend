import express from 'express';
import request from 'supertest';
import testServerRunner from './testServerRunner';
import { buildAuthenticationBackend } from '..';

const tokenGranter = (id: string): string => `issued-${id}`;
const GOOGLE_CONFIG = {
  clientId: 'my-client-id',
  authUrl: 'foo',
  tokenInfoUrl: 'anything',
};

describe('/', () => {
  const server = testServerRunner(() => {
    const config = { google: GOOGLE_CONFIG };

    return express()
      .use('/prefix', buildAuthenticationBackend(config, tokenGranter).router);
  });

  it('responds with client-visible configuration', async () => {
    const response = await request(server)
      .get('/prefix')
      .expect(200);

    expect(response.body.google.clientId).toEqual('my-client-id');
    expect(response.body.google.authUrl).toEqual('foo');
  });

  it('does not include sensitive information', async () => {
    const response = await request(server)
      .get('/prefix')
      .expect(200);

    expect(response.body.google.tokenInfoUrl).toBeUndefined();
  });

  it('does not include unconfigured services', async () => {
    const response = await request(server)
      .get('/prefix')
      .expect(200);

    expect(response.body.github).toBeUndefined();
  });
});

describe('/service', () => {
  const server = testServerRunner(() => {
    const config = {};

    return express()
      .use('/prefix', buildAuthenticationBackend(config, tokenGranter).router);
  });

  it('responds HTTP Not Found for unknown services', async () => {
    await request(server)
      .post('/prefix/nope')
      .expect(404);
  });

  it('responds HTTP Not Found for unconfigured services', async () => {
    await request(server)
      .post('/prefix/google')
      .expect(404);
  });
});
