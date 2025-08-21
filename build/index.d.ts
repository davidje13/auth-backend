import express, { Express } from 'express';

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
    extractId(service: string, externalToken: string): Promise<string>;
    private _bindExtractor;
}

type TokenGranter = (userId: string, service: string, externalId: string) => string;
declare function buildAuthenticationRouter(authenticationService: AuthenticationService, tokenGranter: TokenGranter): express.Router;

declare function buildMockSsoApp(): Express;

interface AuthenticationBackend {
    router: express.Router;
    service: AuthenticationService;
}

declare function buildAuthenticationBackend(configs: Partial<AuthenticationConfiguration>, tokenGranter: TokenGranter): AuthenticationBackend;

export { AuthenticationService, buildAuthenticationBackend, buildAuthenticationRouter, buildMockSsoApp };
export type { AuthenticationClientConfiguration, AuthenticationConfiguration, TokenGranter };
