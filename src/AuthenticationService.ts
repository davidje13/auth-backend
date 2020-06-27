import extractGoogleId, { GoogleConfig } from './providers/GoogleSso';
import extractGitHubId, { GitHubConfig } from './providers/GitHubSso';
import extractGitLabId, { GitLabConfig } from './providers/GitLabSso';

type UnconfiguredExtractor<T> = (config: T, externalToken: string) => Promise<string>;
type ConfiguredExtractor = (externalToken: string) => Promise<string>;

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

export default class AuthenticationService {
  public readonly clientConfig: AuthenticationClientConfiguration = {};

  private readonly extractors = new Map<string, ConfiguredExtractor>();

  public constructor(configs: Partial<AuthenticationConfiguration>) {
    this.bindExtractor(configs, 'google', extractGoogleId);
    this.bindExtractor(configs, 'github', extractGitHubId);
    this.bindExtractor(configs, 'gitlab', extractGitLabId);
  }

  public supportsService(service: string): boolean {
    return this.extractors.has(service);
  }

  public extractId(
    service: string,
    externalToken: string,
  ): Promise<string> {
    const extractor = this.extractors.get(service);

    if (!extractor) {
      throw new Error(`Login integration with ${service} is not supported`);
    }

    return extractor(externalToken);
  }

  private bindExtractor<Service extends keyof AuthenticationConfiguration>(
    configs: Partial<AuthenticationConfiguration>,
    service: Service,
    extractor: UnconfiguredExtractor<AuthenticationConfiguration[Service]>,
  ): void {
    const config = configs[service];
    if (config?.clientId) {
      this.extractors.set(
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
