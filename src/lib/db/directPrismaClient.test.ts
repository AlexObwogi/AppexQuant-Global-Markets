import { describe, expect, it } from 'vitest';
import { getDerivOAuthConfig, initiateDerivOAuth } from './oauthServerService';

describe('Deriv OAuth config', () => {
  it('uses the canonical server-side redirect URL', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_URL = 'https://appex-quant-global-markets.vercel.app';
    process.env.DERIV_REDIRECT_URI = 'https://appex-quant-global-markets.vercel.app/api/auth/deriv/callback';
    process.env.DERIV_CLIENT_ID = 'test-client';
    process.env.SESSION_SECRET = 'test-session-secret';

    const config = getDerivOAuthConfig();
    expect(config.redirectUri).toBe('https://appex-quant-global-markets.vercel.app/api/auth/deriv/callback');
  });

  it('rejects a caller-supplied redirect mismatch', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_URL = 'https://appex-quant-global-markets.vercel.app';
    process.env.DERIV_REDIRECT_URI = 'https://appex-quant-global-markets.vercel.app/api/auth/deriv/callback';
    process.env.DERIV_CLIENT_ID = 'test-client';
    process.env.SESSION_SECRET = 'test-session-secret';

    expect(() => initiateDerivOAuth({ redirectUri: 'https://evil.example/callback' })).toThrow('Caller-supplied redirect_uri does not match');
  });
});

process.env.NODE_ENV = 'development';
delete process.env.APP_URL;
delete process.env.DERIV_REDIRECT_URI;
delete process.env.DERIV_CLIENT_ID;
delete process.env.SESSION_SECRET;
