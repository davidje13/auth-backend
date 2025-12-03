import { extractId as extractGoogleId, type GoogleConfig } from './providers/GoogleSso';
import { extractId as extractGitHubId, type GitHubConfig } from './providers/GitHubSso';
import { extractId as extractGitLabId, type GitLabConfig } from './providers/GitLabSso';
import type { Details, Extractor } from './providers/types';

type ConfiguredExtractor = (details: Details) => Promise<string>;

interface ClientProperties {
  authUrl: string;
  clientId: string;
}

export interface AuthenticationConfiguration {
  google: GoogleConfig;
  github: GitHubConfig;
  gitlab: GitLabConfig;
}

export type AuthenticationClientConfiguration = Record<string, ClientProperties>;

export class AuthenticationService {
  public readonly clientConfig: AuthenticationClientConfiguration = {};

  private readonly _extractors = new Map<string, ConfiguredExtractor>();

  public constructor(configs: Partial<AuthenticationConfiguration>) {
    this._bindExtractor(configs, 'google', extractGoogleId);
    this._bindExtractor(configs, 'github', extractGitHubId);
    this._bindExtractor(configs, 'gitlab', extractGitLabId);
  }

  public supportsService(service: string): boolean {
    return this._extractors.has(service);
  }

  public supportedServices(): string[] {
    return [...this._extractors.keys()];
  }

  public extractId(service: string, details: Details): Promise<string> {
    const extractor = this._extractors.get(service);

    if (!extractor) {
      throw new Error(`Login integration with ${service} is not supported`);
    }

    return extractor(details);
  }

  private _bindExtractor<Service extends keyof AuthenticationConfiguration>(
    configs: Partial<AuthenticationConfiguration>,
    service: Service,
    extractor: Extractor<AuthenticationConfiguration[Service]>,
  ): void {
    const config = configs[service];
    if (config?.clientId) {
      this._extractors.set(
        service,
        extractor.bind(null, config as AuthenticationConfiguration[Service]),
      );
      this.clientConfig[service] = {
        authUrl: config.authUrl,
        clientId: config.clientId,
      };
    }
  }
}
