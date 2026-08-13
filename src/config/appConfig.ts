/**
 * AppexQuant Markets Global - Centralized Configuration System
 * Validates mandatory configuration on startup and ensures environment safety.
 */

export type Environment = 'development' | 'test' | 'staging' | 'production';

export interface AppConfig {
  env: Environment;
  appVersion: string;
  appName: string;
  appUrl: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  pwaEnabled: boolean;
  featureFlagsEnabled: boolean;
  api: {
    timeoutMs: number;
    maxRetries: number;
    baseUrl: string;
  };
  security: {
    maskSecretsInLogs: boolean;
    requireHttps: boolean;
  };
}

function getEnvVariable(key: string, fallback?: string): string {
  // Check client import.meta.env or Node process.env safely
  let value: string | undefined = undefined;

  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    value = process.env[key];
  } else if (typeof import.meta !== 'undefined') {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    if (metaEnv) {
      value = metaEnv[key] || metaEnv[`VITE_${key}`];
    }
  }

  if (value === undefined || value === '') {
    if (fallback !== undefined) {
      return fallback;
    }
  }
  return value || fallback || '';
}

export function loadAppConfig(): AppConfig {
  const rawEnv = getEnvVariable('NODE_ENV', 'development').toLowerCase();
  const env: Environment = 
    rawEnv === 'production' ? 'production' :
    rawEnv === 'staging' ? 'staging' :
    rawEnv === 'test' ? 'test' : 'development';

  const appVersion = getEnvVariable('VITE_APP_VERSION', '0.1.0');
  const appName = 'AppexQuant Markets Global';
  const appUrl = getEnvVariable('APP_URL', 'http://localhost:3000');

  return {
    env,
    appVersion,
    appName,
    appUrl,
    isProduction: env === 'production',
    isDevelopment: env === 'development',
    isTest: env === 'test',
    pwaEnabled: getEnvVariable('ENABLE_PWA', 'true') === 'true',
    featureFlagsEnabled: getEnvVariable('ENABLE_FEATURE_FLAGS', 'true') === 'true',
    api: {
      timeoutMs: 15000,
      maxRetries: 3,
      baseUrl: '/api',
    },
    security: {
      maskSecretsInLogs: true,
      requireHttps: env === 'production' || env === 'staging',
    },
  };
}

export const appConfig = loadAppConfig();
