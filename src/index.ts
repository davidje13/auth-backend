import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  AuthenticationService,
  AuthenticationConfiguration,
  AuthenticationClientConfiguration,
} from './AuthenticationService';
import { type TokenGranter, buildAuthenticationRouter } from './router';
export { buildMockSsoApp } from './mock-sso/buildMockSsoApp';

interface AuthenticationBackend {
  router: (basePath?: string) => (req: IncomingMessage, res: ServerResponse) => void;
  service: AuthenticationService;
}

export type { TokenGranter, AuthenticationConfiguration, AuthenticationClientConfiguration };

export { AuthenticationService, buildAuthenticationRouter };

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
