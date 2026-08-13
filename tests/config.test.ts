/**
 * AppexQuant Markets Global - Config Validation & Environment Safety Tests
 */

import { describe, it, expect } from 'vitest';
import { loadAppConfig } from '../src/config/appConfig';

describe('AppConfig Module', () => {
  it('loads valid default application configuration', () => {
    const config = loadAppConfig();
    expect(config.appName).toBe('AppexQuant Markets Global');
    expect(config.appVersion).toBe('0.1.0');
    expect(config.env).toBeDefined();
    expect(typeof config.isDevelopment).toBe('boolean');
  });

  it('provides safe default API parameters', () => {
    const config = loadAppConfig();
    expect(config.api.timeoutMs).toBeGreaterThan(0);
    expect(config.api.baseUrl).toBe('/api');
  });
});
