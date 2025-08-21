import express from 'express';
import request from 'supertest';
import { testServerRunner } from './testServerRunner';
import { buildAuthenticationBackend } from '..';
import 'lean-test';

const tokenGranter = (id: string): string => `issued-${id}`;
const GOOGLE_CONFIG = {
  clientId: 'my-client-id',
  authUrl: 'foo',
  tokenInfoUrl: 'anything',
};

describe('/', () => {
  const SERVER = testServerRunner(() => {
    const config = { google: GOOGLE_CONFIG };

    return express().use(
      '/prefix',
      buildAuthenticationBackend(config, tokenGranter).router,
    );
  });

  it('responds with client-visible configuration', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER)).get('/prefix').expect(200);

    expect(response.body.google.clientId).toEqual('my-client-id');
    expect(response.body.google.authUrl).toEqual('foo');
  });

  it('does not include sensitive information', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER)).get('/prefix').expect(200);

    expect(response.body.google.tokenInfoUrl).toBeUndefined();
  });

  it('does not include unconfigured services', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER)).get('/prefix').expect(200);

    expect(response.body.github).toBeUndefined();
  });
});

describe('/service', () => {
  const SERVER = testServerRunner(() => {
    const config = {};

    return express().use(
      '/prefix',
      buildAuthenticationBackend(config, tokenGranter).router,
    );
  });

  it('responds HTTP Not Found for unknown services', async ({ getTyped }) => {
    await request(getTyped(SERVER)).post('/prefix/nope').expect(404);
  });

  it('responds HTTP Not Found for unconfigured services', async ({
    getTyped,
  }) => {
    await request(getTyped(SERVER)).post('/prefix/google').expect(404);
  });
});
