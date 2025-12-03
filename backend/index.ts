import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  AuthenticationService,
  type AuthenticationConfiguration,
  type AuthenticationClientConfiguration,
} from './AuthenticationService';
import { type TokenGranter, requestHandler } from './api';

interface AuthenticationBackend {
  router: (basePath?: string) => (req: IncomingMessage, res: ServerResponse) => void;
  service: AuthenticationService;
}

export type { TokenGranter, AuthenticationConfiguration, AuthenticationClientConfiguration };

export { AuthenticationService, requestHandler };

export function buildAuthAPI(
  configs: Partial<AuthenticationConfiguration>,
  tokenGranter: TokenGranter,
): AuthenticationBackend {
  const service = new AuthenticationService(configs);
  const router = requestHandler(service, tokenGranter);

  return { router, service };
}
