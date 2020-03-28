export interface GitHubConfig {
    clientId: string;
    authUrl: string;
    clientSecret: string;
    accessTokenUrl: string;
    userUrl: string;
}
export default function extractId(config: GitHubConfig, externalToken: string): Promise<string>;
//# sourceMappingURL=GitHubSso.d.ts.map