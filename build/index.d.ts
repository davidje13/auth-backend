import { IncomingMessage, ServerResponse, Server } from 'node:http';

interface Details {
    externalToken: string;
    redirectUri?: string;
    codeVerifier?: string;
}

interface GoogleConfig {
    clientId: string;
    authUrl: string;
    tokenInfoUrl: string;
}

interface GitHubConfig {
    clientId: string;
    authUrl: string;
    clientSecret: string;
    accessTokenUrl: string;
    userUrl: string;
}

interface GitLabConfig {
    clientId: string;
    authUrl: string;
    accessTokenUrl: string;
    tokenInfoUrl: string;
}

interface ClientProperties {
    authUrl: string;
    clientId: string;
}
interface AuthenticationConfiguration {
    google: GoogleConfig;
    github: GitHubConfig;
    gitlab: GitLabConfig;
}
type AuthenticationClientConfiguration = Record<string, ClientProperties>;
declare class AuthenticationService {
    readonly clientConfig: AuthenticationClientConfiguration;
    private readonly _extractors;
    constructor(configs: Partial<AuthenticationConfiguration>);
    supportsService(service: string): boolean;
    supportedServices(): string[];
    extractId(service: string, details: Details): Promise<string>;
    private _bindExtractor;
}

type TokenGranter = (userId: string, service: string, externalId: string) => string;
declare function buildAuthenticationRouter(authenticationService: AuthenticationService, tokenGranter: TokenGranter): (basePath?: string) => (req: IncomingMessage, res: ServerResponse) => void;

declare function buildMockSsoApp(): Server;

interface AuthenticationBackend {
    router: (basePath?: string) => (req: IncomingMessage, res: ServerResponse) => void;
    service: AuthenticationService;
}

declare function buildAuthenticationBackend(configs: Partial<AuthenticationConfiguration>, tokenGranter: TokenGranter): AuthenticationBackend;

export { AuthenticationService, buildAuthenticationBackend, buildAuthenticationRouter, buildMockSsoApp };
export type { AuthenticationClientConfiguration, AuthenticationConfiguration, TokenGranter };
