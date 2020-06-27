const path = require('path');
const express = require('express');
const { buildAuthenticationBackend } = require('../build');

const config = {
  google: {
    clientId: process.env.GOOGLE_CLIENT,
    authUrl: 'https://accounts.google.com/o/oauth2/auth',
    tokenInfoUrl: 'https://oauth2.googleapis.com/tokeninfo',
  },
  github: {
    clientId: process.env.GITHUB_CLIENT,
    clientSecret: process.env.GITHUB_SECRET,
    authUrl: 'https://github.com/login/oauth/authorize',
    accessTokenUrl: 'https://github.com/login/oauth/access_token',
    userUrl: 'https://api.github.com/user',
  },
  gitlab: {
    // Auth Backend Local Testing - http://localhost:8080/gitlab.html, no scopes
    clientId: '0f048a5b0edc29ff7b2697f827805b207f68f63db94507cfd9db57e4ac0f3531',
    authUrl: 'https://gitlab.com/oauth/authorize',
    tokenInfoUrl: 'https://gitlab.com/oauth/token/info',
  },
};

function tokenGranter(userId, service, externalId) {
  return `a token for ${userId} (${service} ${externalId})`;
}

const auth = buildAuthenticationBackend(config, tokenGranter);
express()
  .use('/api/sso', auth.router)
  .use(express.static(path.join(__dirname, 'static')))
  .listen(8080, 'localhost', () => {
    process.stdout.write('Available at http://localhost:8080/\n');
    process.stdout.write('Press Ctrl+C to stop\n');
  });
