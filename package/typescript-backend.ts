import { createServer } from 'node:http';
import { buildAuthAPI } from 'authentication-backend/backend';

buildAuthAPI({}, () => '');

//@ts-expect-error
buildAuthAPI({}, () => 0);

//@ts-expect-error
buildAuthAPI('', () => '');

//@ts-expect-error
buildAuthAPI();

const tokenGranter = (id: string): string => `issued-${id}`;
const api = buildAuthAPI(
  {
    google: {
      clientId: 'my-client-id',
      authUrl: 'foo',
      certsUrl: 'anything',
    },
    github: {
      clientId: 'my-client-id',
      authUrl: 'my-auth-url',
      clientSecret: 'my-client-secret',
      accessTokenUrl: 'my-access-token-url',
      userUrl: 'my-user-url',
    },
    gitlab: {
      clientId: 'my-client-id',
      authUrl: 'foo',
      accessTokenUrl: 'anything',
      tokenInfoUrl: 'anything',
    },
  },
  tokenGranter,
);

buildAuthAPI(
  {
    //@ts-expect-error
    nope: {
      clientId: 'my-client-id',
      authUrl: 'foo',
      tokenInfoUrl: 'anything',
    },
  },
  tokenGranter,
);

createServer(api.router()).listen(8080);

createServer(api.router('/foo')).listen(8080);
