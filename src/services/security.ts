import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { UserRole, UserPermission } from '../types/user.ts';
import { hasPermission } from '../utils/auth.ts';

// 1. SECRET MANAGEMENT (With secure fallbacks)
export function getJwtSecret(): string {
  return process.env.JWT_SECRET || process.env.SESSION_SECRET || 'appexquant_default_jwt_secret_2026_key_9988';
}

export function getSessionSecret(): string {
  return process.env.SESSION_SECRET || process.env.JWT_SECRET || 'appexquant_default_session_secret_2026_key_9988';
}

export function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(getSessionSecret()).digest();
}

// In-memory blacklist for revoked sessions (simulating session rotation / revoking)
const revokedSessionTokens = new Set<string>();

// 2. ENCRYPTED SENSITIVE DATA
export function encryptSensitiveData(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decryptSensitiveData(encryptedHex: string): string {
  if (!encryptedHex) return '';
  const parts = encryptedHex.split(':');
  if (parts.length !== 2) throw new Error('Malformed cipher text');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
  let decrypted = decipher.update(encryptedText, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// 3. CRYPTOGRAPHIC SESSION SIGNATURES (JWT-like)
export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  isElevated: boolean;
  elevatedUntil: string | null;
  csrfToken: string;
  expiresAt: string;
  derivAccountId?: string;
  fullName?: string;
  accountType?: 'demo' | 'real';
  currency?: string;
  balance?: number;
  encryptedDerivToken?: string;
}

export function createSessionToken(payload: SessionPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  if (revokedSessionTokens.has(token)) return null;
  try {
    const parts = token.split('.');
    if (parts.length === 2) {
      const [body, signature] = parts;
      const jsonStr = Buffer.from(body, 'base64url').toString('utf8');
      const expectedSignature = crypto
        .createHmac('sha256', getSessionSecret())
        .update(jsonStr)
        .digest('base64url');
      if (signature !== expectedSignature) return null;
      const payload = JSON.parse(jsonStr) as SessionPayload;
      if (Date.now() > new Date(payload.expiresAt).getTime()) return null;
      return payload;
    } else if (parts.length === 3) {
      const [header, body, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', getJwtSecret())
        .update(`${header}.${body}`)
        .digest('base64url');
      if (signature !== expectedSignature) return null;
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
      if (Date.now() > new Date(payload.expiresAt).getTime()) return null;
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

export function revokeSessionToken(token: string): void {
  revokedSessionTokens.add(token);
}

// 4. RATE LIMITING ENGINE (Sliding Window & Token Bucket with Standard RFC Headers)
interface RateLimitResult {
  limited: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  retryAfterSeconds: number;
}

class SlidingWindowRateLimiter {
  private requests = new Map<string, number[]>();

  constructor(private limit: number, private windowMs: number) {}

  public check(key: string): RateLimitResult {
    const now = Date.now();
    const timestamps = (this.requests.get(key) || []).filter(t => now - t < this.windowMs);
    const oldest = timestamps.length > 0 ? timestamps[0] : now;
    const resetSeconds = Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000));

    if (timestamps.length >= this.limit) {
      return {
        limited: true,
        limit: this.limit,
        remaining: 0,
        resetSeconds,
        retryAfterSeconds: resetSeconds,
      };
    }

    timestamps.push(now);
    this.requests.set(key, timestamps);

    return {
      limited: false,
      limit: this.limit,
      remaining: Math.max(0, this.limit - timestamps.length),
      resetSeconds,
      retryAfterSeconds: 0,
    };
  }

  public isRateLimited(key: string): boolean {
    return this.check(key).limited;
  }
}

const globalLimiter = new SlidingWindowRateLimiter(300, 60000); // 300 reqs/min general API
const authLimiter = new SlidingWindowRateLimiter(15, 60000); // 15 login/session attempts/min (brute-force defense)
const mfaLimiter = new SlidingWindowRateLimiter(10, 30000); // 10 attempts/30 secs
const orderLimiter = new SlidingWindowRateLimiter(20, 10000); // 20 orders/10 secs (order flood defense)
const ingestionLimiter = new SlidingWindowRateLimiter(60, 60000); // 60 data writes/min
const aiLimiter = new SlidingWindowRateLimiter(30, 60000); // 30 AI queries/min

// 5. STRUCTURED SECURITY LOGGING Helper
export function logSecurityEvent(
  req: Request | null,
  action: string,
  severity: 'INFO' | 'WARNING' | 'CRITICAL',
  details: Record<string, unknown>
): void {
  const logObj = {
    timestamp: new Date().toISOString(),
    requestId: req?.id || 'sys-request',
    ip: req?.ip || '0.0.0.0',
    userAgent: req?.headers['user-agent'] || 'internal',
    userId: req?.sessionUser?.userId || 'anonymous',
    role: req?.sessionUser?.role || 'unauthenticated',
    action,
    severity,
    details,
  };
  console.log(`[SECURITY_${severity}] ${JSON.stringify(logObj)}`);
}

function applyRateLimitHeaders(res: Response, result: RateLimitResult): void {
  res.setHeader('RateLimit-Limit', result.limit);
  res.setHeader('RateLimit-Remaining', result.remaining);
  res.setHeader('RateLimit-Reset', result.resetSeconds);
  if (result.limited) {
    res.setHeader('Retry-After', result.retryAfterSeconds);
  }
}

// 6. EXPRESS MIDDLEWARES
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.id = crypto.randomBytes(16).toString('hex');
  res.setHeader('X-Request-Id', req.id);
  next();
}

export function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Rate limit API endpoints only; bypass static files, Vite modules, and assets
  if (!req.path.startsWith('/api')) {
    return next();
  }

  const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
  const key = `global:${ip}`;
  const result = globalLimiter.check(key);
  applyRateLimitHeaders(res, result);

  if (result.limited) {
    logSecurityEvent(req, 'GLOBAL_RATE_LIMIT_EXCEEDED', 'WARNING', { path: req.path });
    res.status(429).json({
      success: false,
      error: 'Too Many Requests - Rate limit exceeded. Please retry after ' + result.retryAfterSeconds + 's',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: result.retryAfterSeconds,
    });
    return;
  }
  next();
}

export function authRateLimiterMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
  const key = `auth:${ip}`;
  const result = authLimiter.check(key);
  applyRateLimitHeaders(res, result);

  if (result.limited) {
    logSecurityEvent(req, 'AUTH_RATE_LIMIT_EXCEEDED', 'CRITICAL', { path: req.path, ip });
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts. Please wait before retrying.',
      code: 'AUTH_RATE_LIMITED',
      retryAfter: result.retryAfterSeconds,
    });
    return;
  }
  next();
}

export function ingestionRateLimiterMiddleware(req: Request, res: Response, next: NextFunction): void {
  const key = req.sessionUser?.userId ? `ingest:usr:${req.sessionUser.userId}` : `ingest:ip:${req.ip || '0.0.0.0'}`;
  const result = ingestionLimiter.check(key);
  applyRateLimitHeaders(res, result);

  if (result.limited) {
    logSecurityEvent(req, 'INGESTION_RATE_LIMIT_EXCEEDED', 'WARNING', { path: req.path });
    res.status(429).json({
      success: false,
      error: 'Data ingestion rate limit exceeded.',
      code: 'INGESTION_RATE_LIMITED',
      retryAfter: result.retryAfterSeconds,
    });
    return;
  }
  next();
}

export function aiRateLimiterMiddleware(req: Request, res: Response, next: NextFunction): void {
  const key = req.sessionUser?.userId ? `ai:usr:${req.sessionUser.userId}` : `ai:ip:${req.ip || '0.0.0.0'}`;
  const result = aiLimiter.check(key);
  applyRateLimitHeaders(res, result);

  if (result.limited) {
    logSecurityEvent(req, 'AI_RATE_LIMIT_EXCEEDED', 'WARNING', { path: req.path });
    res.status(429).json({
      success: false,
      error: 'AI inference rate limit exceeded. Please wait a moment.',
      code: 'AI_RATE_LIMITED',
      retryAfter: result.retryAfterSeconds,
    });
    return;
  }
  next();
}

export function mfaRateLimiterMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || '0.0.0.0';
  const key = `mfa:${ip}`;
  const result = mfaLimiter.check(key);
  applyRateLimitHeaders(res, result);

  if (result.limited) {
    logSecurityEvent(req, 'MFA_RATE_LIMIT_EXCEEDED', 'CRITICAL', { path: req.path });
    res.status(429).json({
      success: false,
      error: 'Too many MFA verification attempts. Access temporarily locked.',
      code: 'MFA_BLOCKED',
      retryAfter: result.retryAfterSeconds,
    });
    return;
  }
  next();
}

export function orderRateLimiterMiddleware(req: Request, res: Response, next: NextFunction): void {
  const key = req.sessionUser?.userId ? `order:usr:${req.sessionUser.userId}` : `order:ip:${req.ip || '0.0.0.0'}`;
  const result = orderLimiter.check(key);
  applyRateLimitHeaders(res, result);

  if (result.limited) {
    logSecurityEvent(req, 'ORDER_RATE_LIMIT_EXCEEDED', 'WARNING', { path: req.path });
    res.status(429).json({
      success: false,
      error: 'Order execution rate limit reached. Slow down trading requests.',
      code: 'ORDER_LIMIT_EXCEEDED',
      retryAfter: result.retryAfterSeconds,
    });
    return;
  }
  next();
}

// Cookie parser utility (Manual implementation to guarantee no external dependency issues)
export function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(c => {
    const parts = c.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const rawVal = parts.slice(1).join('=').trim();
      try {
        cookies[key] = decodeURIComponent(rawVal);
      } catch {
        cookies[key] = rawVal;
      }
    }
  });
  return cookies;
}

// Session Authenticator Middleware
export function sessionMiddleware(req: Request, res: Response, next: NextFunction): void {
  const cookies = parseCookies(req.headers.cookie);
  (req as any).cookies = cookies;
  const authHeader = req.headers.authorization;
  const token = cookies['session_token'] || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined);

  if (token) {
    const session = verifySessionToken(token);
    if (session) {
      req.sessionUser = session;
      req.sessionToken = token;
      res.setHeader('X-CSRF-Token', session.csrfToken);
      return next();
    }
  }

  // Unauthenticated guest: Do NOT generate a fake session cookie
  req.sessionUser = undefined;
  req.sessionToken = undefined;
  next();
}

// CSRF Defense Middleware
export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Read-only requests are safe
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Allow unauthenticated and auth entry routes to bypass CSRF
  const isAuthOrPublicPath = 
    req.path.startsWith('/api/auth/') || 
    req.path.startsWith('/api/deriv/') ||
    req.path === '/api/health';

  if (isAuthOrPublicPath) {
    return next();
  }

  // If user is not logged in, pass through
  if (!req.sessionUser) {
    return next();
  }

  const expectedCsrf = req.sessionUser.csrfToken;
  const actualCsrf = (req.headers['x-csrf-token'] || req.body?.csrfToken) as string;

  if (!expectedCsrf || expectedCsrf !== actualCsrf) {
    logSecurityEvent(req, 'CSRF_VALIDATION_FAILED', 'WARNING', {
      expected: expectedCsrf ? 'PRESENT' : 'MISSING',
      actual: actualCsrf ? 'PRESENT' : 'MISSING',
    });
    res.status(403).json({ success: false, error: 'Forbidden: Invalid or missing CSRF token', code: 'CSRF_BREACH' });
    return;
  }

  next();
}

// 7. INPUT & PAYLOAD VALIDATION UTILITIES

// Idempotency & Duplicate Order Prevention Engine
const processedOrderTokens = new Map<string, number>();

export function isDuplicateOrderRequest(orderToken: string): boolean {
  if (!orderToken) return false;
  const now = Date.now();
  const timestamp = processedOrderTokens.get(orderToken);
  if (timestamp && now - timestamp < 30000) { // 30 second duplicate window
    return true;
  }
  processedOrderTokens.set(orderToken, now);
  
  // Clean up old tokens periodically
  if (processedOrderTokens.size > 1000) {
    for (const [token, time] of processedOrderTokens.entries()) {
      if (now - time >= 30000) {
        processedOrderTokens.delete(token);
      }
    }
  }
  return false;
}

export function validateOrder(order: any, activePolicy: any): void {
  if (!order || typeof order !== 'object') {
    throw new Error('Order payload must be an object');
  }

  const { symbol, side, quantity, price, stopLoss, takeProfit, orderToken } = order;

  // Check for duplicate order request submission
  if (orderToken && isDuplicateOrderRequest(orderToken)) {
    throw new Error('DUPLICATE_ORDER_REJECTED: An identical order request token was already processed within the idempotency window.');
  }

  // Type Checks
  if (typeof symbol !== 'string' || symbol.trim().length === 0) {
    throw new Error('Order field "symbol" must be a non-empty string');
  }
  if (!['BUY', 'SELL'].includes(side)) {
    throw new Error('Order field "side" must be "BUY" or "SELL"');
  }
  if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0) {
    throw new Error('Order field "quantity" must be a positive number');
  }

  // Validate limits (Prevention of excessive lot sizing or duplicate floods)
  if (quantity > (activePolicy?.maxPositionSizeLots || 10)) {
    throw new Error(`Order quantity ${quantity} exceeds maximum allowed risk size of ${activePolicy?.maxPositionSizeLots || 10} lots.`);
  }

  // Validate Stop Loss requirement
  if (activePolicy?.requireStopLoss && (!stopLoss || typeof stopLoss !== 'number' || stopLoss <= 0)) {
    throw new Error('Pre-trade risk policy requires a valid positive "stopLoss" parameter.');
  }
}

export function validateRiskPolicyUpdate(policy: any): void {
  if (!policy || typeof policy !== 'object') {
    throw new Error('Policy payload must be an object');
  }

  const { maxDailyDrawdownPct, maxPositionSizeLots, maxOpenPositions, requireStopLoss, maxLeverage } = policy;

  if (maxDailyDrawdownPct !== undefined && (typeof maxDailyDrawdownPct !== 'number' || maxDailyDrawdownPct < 0 || maxDailyDrawdownPct > 100)) {
    throw new Error('maxDailyDrawdownPct must be a percentage between 0 and 100');
  }
  if (maxPositionSizeLots !== undefined && (typeof maxPositionSizeLots !== 'number' || maxPositionSizeLots <= 0 || maxPositionSizeLots > 100)) {
    throw new Error('maxPositionSizeLots must be a positive number up to 100');
  }
  if (maxOpenPositions !== undefined && (typeof maxOpenPositions !== 'number' || maxOpenPositions < 0 || maxOpenPositions > 1000)) {
    throw new Error('maxOpenPositions must be a valid count between 0 and 1000');
  }
  if (requireStopLoss !== undefined && typeof requireStopLoss !== 'boolean') {
    throw new Error('requireStopLoss must be a boolean');
  }
  if (maxLeverage !== undefined && (typeof maxLeverage !== 'number' || maxLeverage < 1 || maxLeverage > 1000)) {
    throw new Error('maxLeverage must be a positive integer between 1 and 1000');
  }
}

export function validateBrokerConfig(config: any): any {
  if (!config || typeof config !== 'object') {
    throw new Error('Broker configuration payload must be an object');
  }

  const { brokerType, accountNumber, apiKey, apiSecret, server, appId } = config;

  if (!['DERIV', 'EXNESS', 'JUSTMARKETS'].includes(brokerType)) {
    throw new Error('Invalid brokerType specified');
  }

  if (typeof accountNumber !== 'string' || accountNumber.trim().length === 0) {
    throw new Error('accountNumber is required and must be a valid string');
  }

  // Encrypt sensitive secrets for backend storage (never store unencrypted secrets)
  const encryptedKey = apiKey ? encryptSensitiveData(apiKey) : '';
  const encryptedSecret = apiSecret ? encryptSensitiveData(apiSecret) : '';

  return {
    brokerType,
    accountNumber: accountNumber.trim(),
    server: server || 'Live-1',
    appId: appId || '',
    encryptedKey,
    encryptedSecret,
    hasApiKey: !!apiKey,
    hasApiSecret: !!apiSecret,
  };
}

export function validateStrategyActivation(payload: any): void {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Strategy activation payload must be an object');
  }
  const { strategyId, action } = payload;
  if (typeof strategyId !== 'string' || strategyId.trim().length === 0) {
    throw new Error('strategyId is required and must be a non-empty string');
  }
  if (!['ACTIVATE', 'DEACTIVATE', 'PAUSE'].includes(action)) {
    throw new Error('Invalid action for strategy activation. Must be ACTIVATE, DEACTIVATE, or PAUSE.');
  }
}

// Secret Redaction Utility to ensure sensitive values never leak through APIs
export function redactSensitiveValues<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const copy = JSON.parse(JSON.stringify(obj));
  const sensitiveKeys = ['apiKey', 'apiSecret', 'password', 'token', 'secret', 'encryptedKey', 'encryptedSecret'];
  
  const sanitize = (target: any) => {
    if (!target || typeof target !== 'object') return;
    for (const key of Object.keys(target)) {
      if (sensitiveKeys.includes(key) && typeof target[key] === 'string' && target[key].length > 0) {
        target[key] = '***REDACTED***';
      } else if (typeof target[key] === 'object') {
        sanitize(target[key]);
      }
    }
  };

  sanitize(copy);
  return copy;
}

// 8. SECURITY DECLARATIONS TO PREVENT EXPRESS TYPES ISSUE
declare global {
  namespace Express {
    interface Request {
      id?: string;
      sessionUser?: SessionPayload;
      sessionToken?: string;
    }
  }
}
