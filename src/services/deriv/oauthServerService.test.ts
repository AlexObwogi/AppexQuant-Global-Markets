import { describe, expect, it } from 'vitest';
import { getCanonicalAppOrigin, loadAppConfig } from './appConfig';

describe('app config', () => {
  it('prefers configured app origin in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_URL = 'https://appex-quant-global-markets.vercel.app';
    expect(getCanonicalAppOrigin()).toBe('https://appex-quant-global-markets.vercel.app');
  });

  it('rejects non-HTTPS production origins', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_URL = 'http://localhost:3000';
    expect(() => getCanonicalAppOrigin()).toThrow('Production/staging app origin must use HTTPS');
  });

  it('defaults to localhost for development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.APP_URL;
    expect(loadAppConfig().appUrl).toBe('http://localhost:3000');
  });
});

// Cleanup helper for test isolation
process.env.NODE_ENV = 'development';
delete process.env.APP_URL;
