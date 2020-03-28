import type express from 'express';
import AuthenticationService, {
  AuthenticationConfiguration,
  AuthenticationClientConfiguration,
} from './AuthenticationService';
import {
  TokenGranter,
  buildAuthenticationRouter,
} from './router';
import buildMockSsoApp from './mock-sso/buildMockSsoApp';

interface AuthenticationBackend {
  router: express.Router;
  service: AuthenticationService;
}

export type {
  TokenGranter,
  AuthenticationConfiguration,
  AuthenticationClientConfiguration,
};

export {
  AuthenticationService,
  buildAuthenticationRouter,
  buildMockSsoApp,
};

export function buildAuthenticationBackend(
  configs: Partial<AuthenticationConfiguration>,
  tokenGranter: TokenGranter,
): AuthenticationBackend {
  const service = new AuthenticationService(configs);
  const router = buildAuthenticationRouter(service, tokenGranter);

  return {
    router,
    service,
  };
}
