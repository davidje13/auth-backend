const { Server } = require('node:http');
const { buildAuthAPI } = require('authentication-backend/backend');
const { buildMockSSO } = require('authentication-backend/mock');
const {
  encodeJWT,
  decodeJWT,
  makeRandomRS256,
  loadJWKSVerifiers,
} = require('authentication-backend/jwt');

const tokenGranter = (id) => `issued-${id}`;
const api = buildAuthAPI(
  { google: { clientId: 'my-client-id', authUrl: 'foo', certsUrl: 'anything' } },
  tokenGranter,
);

if (api.service.clientConfig.google.authUrl !== 'foo') {
  throw new Error('unexpected client config ' + JSON.stringify(api.service.clientConfig));
}

if (typeof api.router !== 'function') {
  throw new Error('unexpected router type');
}

const mockSSO = buildMockSSO();
if (!(mockSSO instanceof Server)) {
  throw new Error('unexpected mock SSO type');
}

const key = makeRandomRS256();
const jwt = encodeJWT(key, { foo: 'bar' });
const decoded = decodeJWT(jwt, {
  verifyKey: loadJWKSVerifiers([key.toJWK()]),
  verifyIss: false,
  verifyAud: false,
  verifyActive: false,
});
if (decoded.payload.foo !== 'bar') {
  throw new Error('unexpected JWT round-trip');
}
