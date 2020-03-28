export interface GoogleConfig {
    clientId: string;
    authUrl: string;
    tokenInfoUrl: string;
}
export default function extractId(config: GoogleConfig, externalToken: string): Promise<string>;
//# sourceMappingURL=GoogleSso.d.ts.map