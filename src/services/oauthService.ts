export type Environment = 'development' | 'test' | 'staging' | 'production';

export interface AppConfig {
  env: Environment;
  appVersion: string;
  appName: string;
  appUrl: string;
  appOrigin: string;
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
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key]!.trim();
  }
  return fallback ? fallback.trim() : '';
}

function normalizeOrigin(raw: string): string {
  const value = raw.trim().replace(/\/$/, '');
  if (!value) return '';
  try {
    const parsed = new URL(value);
    return parsed.origin;
  } catch {
    return value;
  }
}

export function getCanonicalAppOrigin(): string {
  const env = getEnvVariable('NODE_ENV', 'development').toLowerCase();
  const configured = getEnvVariable('APP_URL') || getEnvVariable('NEXT_PUBLIC_SITE_URL');

  if (configured) {
    const normalized = normalizeOrigin(configured);
    if (normalized) {
      if ((env === 'production' || env === 'staging' || Boolean(process.env.VERCEL)) && !normalized.startsWith('https://')) {
        throw new Error('Production/staging app origin must use HTTPS.');
      }
      return normalized;
    }
  }

  if (env === 'production' || env === 'staging' || Boolean(process.env.VERCEL)) {
    throw new Error('APP_URL is required in production and must be a valid HTTPS origin.');
  }

  return 'http://localhost:3000';
}

export function loadAppConfig(): AppConfig {
  const rawEnv = getEnvVariable('NODE_ENV', 'development').toLowerCase();
  const env: Environment =
    rawEnv === 'production' ? 'production' :
    rawEnv === 'staging' ? 'staging' :
    rawEnv === 'test' ? 'test' : 'development';

  const appOrigin = getCanonicalAppOrigin();
  const appVersion = getEnvVariable('APP_VERSION', '0.1.0');
  const appName = 'AppexQuant Markets Global';

  return {
    env,
    appVersion,
    appName,
    appUrl: appOrigin,
    appOrigin,
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
