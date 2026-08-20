/**
 * AppexQuant Markets Global - Structured Observability Logger
 * Safely masks secrets, API keys, tokens, and passwords in all log levels.
 */

const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'apikey',
  'api_key',
  'credential',
  'privatekey',
  'private_key',
  'authorization',
];

function sanitizeString(str: string): string {
  return str.trim().replace(/\r?\n+/g, ' ');
}

function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((k) => lowerKey.includes(k))) {
      sanitized[key] = '***[REDACTED_SECRET]***';
    } else if (typeof val === 'string') {
      sanitized[key] = sanitizeString(val);
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeObject(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, context ? sanitizeObject(context) : '');
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, context ? sanitizeObject(context) : '');
  },
  error: (message: string, context?: Record<string, unknown>) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, context ? sanitizeObject(context) : '');
  },
  debug: (message: string, context?: Record<string, unknown>) => {
    if (process.env.APP_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, context ? sanitizeObject(context) : '');
    }
  },
};
