import { GoogleConfig } from './providers/GoogleSso';
import { GitHubConfig } from './providers/GitHubSso';
interface ClientProperties {
    authUrl: string;
    clientId: string;
}
export interface AuthenticationConfiguration {
    google: GoogleConfig;
    github: GitHubConfig;
}
export declare type AuthenticationClientConfiguration = Record<string, ClientProperties>;
export default class AuthenticationService {
    readonly clientConfig: AuthenticationClientConfiguration;
    private readonly extractors;
    constructor(configs: Partial<AuthenticationConfiguration>);
    supportsService(service: string): boolean;
    extractId(service: string, externalToken: string): Promise<string>;
    private bindExtractor;
}
export {};
//# sourceMappingURL=AuthenticationService.d.ts.map