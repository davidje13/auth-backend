import { join, dirname } from 'node:path';
import { fileServer, getAddressURL, Router, WebListener } from 'web-listener';
import { buildAuthAPI } from 'authentication-backend/backend';
import { buildMockSSO } from 'authentication-backend/mock';

const BASEDIR = dirname(new URL(import.meta.url).pathname);
const PORT = Number.parseInt(process.env['PORT'] ?? '8080');

const config = {
  google: {
    clientId:
      process.env['GOOGLE_CLIENT'] ??
      // Refacto Local Testing - http://localhost:8080/google.html, no scopes
      '199202234207-la0v05druske1f1qoimg3sgkpua2nvc7.apps.googleusercontent.com',
    authUrl: 'https://accounts.google.com/o/oauth2/auth',
    certsUrl: 'https://www.googleapis.com/oauth2/v3/certs',
  },
  github: {
    clientId: process.env['GITHUB_CLIENT'],
    clientSecret: process.env['GITHUB_SECRET'],
    authUrl: 'https://github.com/login/oauth/authorize',
    accessTokenUrl: 'https://github.com/login/oauth/access_token',
    userUrl: 'https://api.github.com/user',
  },
  gitlab: {
    clientId:
      process.env['GITLAB_CLIENT'] ??
      // Auth Backend Local Testing - http://localhost:8080/gitlab.html, 'email' scope
      '0f048a5b0edc29ff7b2697f827805b207f68f63db94507cfd9db57e4ac0f3531',
    authUrl: 'https://gitlab.com/oauth/authorize',
    accessTokenUrl: 'https://gitlab.com/oauth/token',
    tokenInfoUrl: 'https://gitlab.com/oauth/token/info',
  },
};

if (config.google.clientId === 'mock') {
  const mockServer = buildMockSSO();
  await new Promise((resolve) => mockServer.listen(0, 'localhost', resolve));
  const mockURL = getAddressURL(mockServer.address());
  config.google = {
    clientId: 'mock',
    authUrl: `${mockURL}/auth`,
    certsUrl: `${mockURL}/certs`,
  };
}

function tokenGranter(userId, service, externalId) {
  return `a token for ${userId} (${service} ${externalId})`;
}

const auth = buildAuthAPI(config, tokenGranter);
const listener = new WebListener(
  new Router().mount('/api/sso', auth.router()).use(await fileServer(join(BASEDIR, 'static'))),
);
listener.listen(PORT, 'localhost').then(() => {
  process.stdout.write(`Available at http://localhost:${PORT}/\n`);
  process.stdout.write('Press Ctrl+C to stop\n');
});
