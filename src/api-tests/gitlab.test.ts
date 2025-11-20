import express from 'express';
import request from 'supertest';
import { testServerRunner, addressToString } from './testServerRunner';
import { buildAuthenticationBackend } from '..';
import 'lean-test';

describe('/gitlab', () => {
  const MOCK_SSO_SERVER = testServerRunner(() => {
    const ssoApp = express();
    ssoApp.get('/', (req, res) => {
      switch (req.headers.authorization) {
        case 'Bearer my-successful-external-token':
          res.json({
            application: { uid: 'my-client-id' },
            resource_owner_id: 1234,
          });
          return;
        case 'Bearer my-bad-external-token':
          res.json({ error: 'nope' });
          return;
        case 'Bearer my-other-external-token':
          res.json({
            application: { uid: 'another-client-id' },
            resource_owner_id: 1234,
          });
          return;
        default:
          res.status(500).end();
      }
    });
    return ssoApp;
  });

  const SERVER = testServerRunner(({ getTyped }) => {
    const tokenGranter = (id: string): string => `issued-${id}`;
    const config = {
      gitlab: {
        clientId: 'my-client-id',
        authUrl: 'foo',
        tokenInfoUrl: addressToString(getTyped(MOCK_SSO_SERVER).address()!),
      },
    };

    return express().use('/prefix', buildAuthenticationBackend(config, tokenGranter).router);
  });

  it('responds with a token for valid external tokens', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER))
      .post('/prefix/gitlab')
      .send({ externalToken: 'my-successful-external-token' })
      .expect(200)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).toEqual('issued-gitlab-1234');
    expect(response.body.error).not(toBeTruthy());
  });

  it('responds HTTP 4xx for non-POST requests', async ({ getTyped }) => {
    await request(getTyped(SERVER)).get('/prefix/gitlab').expect(404); // Should be 405 but this is the default and is good enough
  });

  it('responds HTTP Bad Request for missing external token', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER))
      .post('/prefix/gitlab')
      .send({})
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).not(toBeTruthy());
    expect(response.body.error).toEqual('no externalToken provided');
  });

  it('responds HTTP Bad Request for rejected external tokens', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER))
      .post('/prefix/gitlab')
      .send({ externalToken: 'my-bad-external-token' })
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).not(toBeTruthy());
    expect(response.body.error).toEqual('validation error: nope');
  });

  it('responds HTTP Bad Request for audience mismatch', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER))
      .post('/prefix/gitlab')
      .send({ externalToken: 'my-other-external-token' })
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).not(toBeTruthy());
    expect(response.body.error).toEqual('audience mismatch');
  });

  it('responds HTTP Internal Server Error if service fails', async ({ getTyped }) => {
    await request(getTyped(SERVER))
      .post('/prefix/gitlab')
      .send({ externalToken: 'derp' })
      .expect(500);
  });
});
