import express from 'express';
import request from 'supertest';
import testServerRunner, { addressToString } from './testServerRunner';
import { buildAuthenticationBackend } from '..';

describe('/google', () => {
  const mockSsoServer = testServerRunner(() => {
    const ssoApp = express();
    ssoApp.use(express.urlencoded({ extended: false }));
    ssoApp.get('/', (req, res) => {
      switch (req.query.id_token) {
        case 'my-successful-external-token':
          res.json({ aud: 'my-client-id', sub: 'my-external-id' });
          return;
        case 'my-bad-external-token':
          res.json({ error: 'nope' });
          return;
        case 'my-other-external-token':
          res.json({ aud: 'another-client-id', sub: 'my-external-id' });
          return;
        default:
          res.status(500).end();
      }
    });
    return ssoApp;
  });

  const server = testServerRunner(() => {
    const tokenGranter = (id: string): string => `issued-${id}`;
    const config = {
      google: {
        clientId: 'my-client-id',
        authUrl: 'foo',
        tokenInfoUrl: addressToString(mockSsoServer.address()!),
      },
    };

    return express()
      .use('/prefix', buildAuthenticationBackend(config, tokenGranter).router);
  });

  it('responds with a token for valid external tokens', async () => {
    const response = await request(server)
      .post('/prefix/google')
      .send({ externalToken: 'my-successful-external-token' })
      .expect(200)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).toEqual('issued-google-my-external-id');
    expect(response.body.error).not.toBeTruthy();
  });

  it('responds HTTP 4xx for non-POST requests', async () => {
    await request(server)
      .get('/prefix/google')
      .expect(404); // Should be 405 but this is the default and is good enough
  });

  it('responds HTTP Bad Request for missing external token', async () => {
    const response = await request(server)
      .post('/prefix/google')
      .send({})
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).not.toBeTruthy();
    expect(response.body.error).toEqual('no externalToken provided');
  });

  it('responds HTTP Bad Request for rejected external tokens', async () => {
    const response = await request(server)
      .post('/prefix/google')
      .send({ externalToken: 'my-bad-external-token' })
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).not.toBeTruthy();
    expect(response.body.error).toEqual('validation error nope');
  });

  it('responds HTTP Bad Request for audience mismatch', async () => {
    const response = await request(server)
      .post('/prefix/google')
      .send({ externalToken: 'my-other-external-token' })
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).not.toBeTruthy();
    expect(response.body.error).toEqual('audience mismatch');
  });

  it('responds HTTP Internal Server Error if service fails', async () => {
    await request(server)
      .post('/prefix/google')
      .send({ externalToken: 'derp' })
      .expect(500);
  });
});
