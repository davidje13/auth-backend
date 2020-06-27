export interface GitLabConfig {
    clientId: string;
    authUrl: string;
    tokenInfoUrl: string;
}
export default function extractId(config: GitLabConfig, externalToken: string): Promise<string>;
//# sourceMappingURL=GitLabSso.d.ts.map