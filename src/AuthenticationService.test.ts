import AuthenticationService from './AuthenticationService';

describe('AuthenticationService', () => {
  describe('clientConfig', () => {
    it('contains public information for configured services', () => {
      const service = new AuthenticationService({
        google: {
          clientId: 'google-client-id',
          authUrl: 'google-auth-url',
          tokenInfoUrl: 'google-token-info-url',
        },
        github: {
          clientId: 'github-client-id',
          authUrl: 'github-auth-url',
          clientSecret: 'github-client-secret',
          accessTokenUrl: 'github-access-token-url',
          userUrl: 'github-user-url',
        },
        gitlab: {
          clientId: 'gitlab-client-id',
          authUrl: 'gitlab-auth-url',
          tokenInfoUrl: 'gitlab-token-info-url',
        },
      });

      expect(service.clientConfig).toEqual({
        google: {
          clientId: 'google-client-id',
          authUrl: 'google-auth-url',
        },
        github: {
          clientId: 'github-client-id',
          authUrl: 'github-auth-url',
        },
        gitlab: {
          clientId: 'gitlab-client-id',
          authUrl: 'gitlab-auth-url',
        },
      });
    });

    it('is empty if no services are configured', () => {
      const service = new AuthenticationService({});

      expect(service.clientConfig).toEqual({});
    });
  });

  describe('supportsService', () => {
    it('returns true for configured services', () => {
      const service = new AuthenticationService({
        google: {
          clientId: 'google-client-id',
          authUrl: 'google-auth-url',
          tokenInfoUrl: 'google-token-info-url',
        },
      });

      expect(service.supportsService('google')).toEqual(true);
    });

    it('returns false for unconfigured services', () => {
      const service = new AuthenticationService({});

      expect(service.supportsService('google')).toEqual(false);
    });

    it('returns false for unknown services', () => {
      const service = new AuthenticationService({});

      expect(service.supportsService('nope')).toEqual(false);
    });
  });
});
