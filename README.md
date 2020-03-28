# Auth Backend

Provides minimal backend functionality for integrating with external
authentication providers.

Currently supports GitHub and Google.

## Install dependency

```bash
npm install --save git+https://github.com/davidje13/auth-backend.git#semver:^1.0.2
```

## Usage

```javascript
import express from 'express';
import { buildAuthenticationBackend } from 'auth-backend';

const config =
  google: {
    clientId: 'my-google-client-id',
    authUrl: 'https://accounts.google.com/o/oauth2/auth',
    tokenInfoUrl: 'https://oauth2.googleapis.com/tokeninfo',
  },
  github: {
    clientId: 'my-github-client-id',
    clientSecret: 'my-github-client-secret',
    authUrl: 'https://github.com/login/oauth/authorize',
    accessTokenUrl: 'https://github.com/login/oauth/access_token',
    userUrl: 'https://api.github.com/user',
  },
};

function tokenGranter(userId, service, externalId) {
  // database-based example:
  const myUserSessionToken = uuidv4();
  myDatabase.recordUserSession(myUserSessionToken, userId);
  return myUserSessionToken;
}

const auth = buildAuthenticationBackend(config, tokenGranter);
express()
  .use('/my-prefix', auth.router)
  .listen(8080);
```

### Mock SSO server

This package also contains a mock SSO server, which can be run alongside your app
(this is useful for local development and testing):

```javascript
import express from 'express';
import { buildAuthenticationBackend, buildMockSsoApp } from 'auth-backend';

buildMockSsoApp().listen(9000);

const config =
  google: {
    clientId: 'my-google-client-id',
    authUrl: 'http://localhost:9000/auth',
    tokenInfoUrl: 'http://localhost:9000/tokeninfo',
  },
}

// ...

const auth = buildAuthenticationBackend(config, tokenGranter);
express()
  .use('/my-prefix', auth.router)
  .listen(8080);
```

## API

This expects you to create a frontend which handles the user interaction and propagates returned data to the API.

### GET `/`

This will return the public parts of your config (i.e. `clientId` and `authUrl` for each service).

Example:

```json
{
  "google": {
    "clientId": "my-google-client-id",
    "authUrl": "https://accounts.google.com/o/oauth2/auth"
  },
  "github": {
    "clientId": "my-github-client-id",
    "authUrl": "https://github.com/login/oauth/authorize"
  }
}
```

Any services which have not been configured will be omitted from the response.

### POST `/<service-name>`

Where `<service-name>` is `google` or `github`.

This expects to receive JSON-encoded data:

```json
{
  "externalToken": "token-returned-by-service"
}
```

It will check the token with the service, and if successful, will invoke the configured
`tokenGranter` function with a user ID, service name, and service user ID. The string
returned by `tokenGranter` will be sent to the user in a JSON response:

```json
{
  "userToken": "returned-token-granter-value"
}
```

If the check fails, an error will be returned instead, with a status code of 4xx or 5xx:

```json
{
  "error": "an error message"
}
```
