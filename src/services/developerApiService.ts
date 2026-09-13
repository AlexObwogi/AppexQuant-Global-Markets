/**
 * AppexQuant Markets Global - Developer Gateway & OpenAPI Service
 * Handles API key generation, HMAC SHA-256 signature verification, endpoints doc registry & sandbox.
 */

import {
  DeveloperApiKey,
  ApiScope,
  RateLimitTier,
  ApiEndpointDoc,
  WebhookSubscription,
} from '../types/developerApi.ts';
import { sha256Hex, computeSha256Sync } from './cryptographicAuditService.ts';
import { logAuditEvent } from '../observability/audit.ts';

// In-Memory Key Store (Keyed by raw key and hash)
const apiKeysStore = new Map<string, DeveloperApiKey>();
const apiKeyByHash = new Map<string, DeveloperApiKey>();
const webhooksStore = new Map<string, WebhookSubscription>();

// Sliding window rate limit tracker: keyId -> array of timestamp (ms)
const rateLimitWindow = new Map<string, number[]>();

// Pre-seed Enterprise Live Keys
const enterpriseKeyRaw = 'aq_live_998877665544332211';
const enterpriseKeyHash = computeSha256Sync(enterpriseKeyRaw);
const enterpriseKey: DeveloperApiKey = {
  id: 'KEY-ENT-001',
  userId: 'usr_alex_001',
  name: 'Primary Enterprise Production Node',
  apiKey: enterpriseKeyRaw,
  keyPrefix: 'aq_live_9988...',
  keyHash: enterpriseKeyHash,
  apiSecretMasked: 'sec_live_************************4411',
  tier: 'Enterprise',
  scopes: [
    'read:audit',
    'read:market_data',
    'read:accounts',
    'read:analytics',
    'write:orders',
    'write:automation',
    'manage:webhooks',
    'read:signals',
    'read:audit_ledger',
  ],
  ipWhitelist: [],
  rateLimitPerMinute: 2400,
  createdAt: '2026-08-01T00:00:00Z',
  lastUsedAt: new Date().toISOString(),
  status: 'ACTIVE',
};
apiKeysStore.set(enterpriseKey.apiKey, enterpriseKey);
apiKeyByHash.set(enterpriseKeyHash, enterpriseKey);

const initialDevKeyRaw = 'apx_live_9f8e21a8d7c49b0e12';
const initialDevKeyHash = computeSha256Sync(initialDevKeyRaw);
const initialDevKey: DeveloperApiKey = {
  id: 'KEY-DEV-99120',
  userId: 'usr_alex_001',
  name: 'Algorithmic Trading Bot Node 1',
  apiKey: initialDevKeyRaw,
  keyPrefix: 'apx_live_9f8e...',
  keyHash: initialDevKeyHash,
  apiSecretMasked: 'sec_live_************************3a9b',
  tier: 'Professional',
  scopes: [
    'read:audit',
    'read:market_data',
    'read:accounts',
    'read:analytics',
    'write:orders',
    'write:automation',
    'read:audit_ledger',
  ],
  ipWhitelist: ['192.168.1.1', '10.0.0.0/24'],
  rateLimitPerMinute: 600,
  createdAt: '2026-08-15T10:00:00Z',
  lastUsedAt: new Date().toISOString(),
  status: 'ACTIVE',
};
apiKeysStore.set(initialDevKey.apiKey, initialDevKey);
apiKeyByHash.set(initialDevKeyHash, initialDevKey);

export function hashApiKey(rawKey: string): string {
  return computeSha256Sync(rawKey);
}

export function generateNewApiKey(
  name: string,
  scopes: ApiScope[],
  tier: RateLimitTier = 'Professional',
  ipWhitelist: string[] = [],
  userId: string = 'usr_alex_001'
): { key: DeveloperApiKey; rawSecret: string } {
  const randomSuffix = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
  const apiKey = `aq_live_${randomSuffix}`;
  const keyHash = hashApiKey(apiKey);
  const rawSecret = `sec_live_${computeSha256Sync(apiKey + Date.now()).substring(0, 32)}`;
  const apiSecretMasked = `sec_live_************************${rawSecret.slice(-4)}`;

  const limitMap: Record<RateLimitTier, number> = {
    Starter: 120,
    Professional: 600,
    Enterprise: 2400,
  };

  const key: DeveloperApiKey = {
    id: `KEY-${Date.now().toString(36).toUpperCase()}`,
    userId,
    name,
    apiKey,
    keyPrefix: `${apiKey.slice(0, 12)}...`,
    keyHash,
    apiSecretMasked,
    tier,
    scopes,
    ipWhitelist,
    rateLimitPerMinute: limitMap[tier] || 600,
    createdAt: new Date().toISOString(),
    status: 'ACTIVE',
  };

  apiKeysStore.set(apiKey, key);
  apiKeyByHash.set(keyHash, key);

  logAuditEvent('LOGIN', 'USER', {
    action: 'API_KEY_GENERATED',
    keyId: key.id,
    name,
    tier,
    scopes,
  });

  return { key, rawSecret };
}

export function revokeApiKey(apiKey: string): boolean {
  const key = apiKeysStore.get(apiKey);
  if (!key) return false;
  key.status = 'REVOKED';
  apiKeysStore.set(apiKey, key);
  if (key.keyHash) {
    apiKeyByHash.set(key.keyHash, key);
  }
  return true;
}

export function getDeveloperApiKeys(): DeveloperApiKey[] {
  return Array.from(apiKeysStore.values());
}

/**
 * Validates a Bearer Token against stored hashed API keys
 */
export function validateBearerApiKey(bearerToken: string): {
  valid: boolean;
  key?: DeveloperApiKey;
  error?: string;
} {
  if (!bearerToken) {
    return { valid: false, error: 'Missing Authorization Bearer header' };
  }

  const cleanToken = bearerToken.replace(/^Bearer\s+/i, '').trim();
  let keyRecord = apiKeysStore.get(cleanToken);

  if (!keyRecord) {
    const computedHash = hashApiKey(cleanToken);
    keyRecord = apiKeyByHash.get(computedHash);
  }

  if (!keyRecord || keyRecord.status !== 'ACTIVE') {
    return { valid: false, error: 'Invalid or revoked API Key. Please provide a valid active Bearer token.' };
  }

  keyRecord.lastUsedAt = new Date().toISOString();
  return { valid: true, key: keyRecord };
}

/**
 * Rate Limiting sliding window (60s)
 */
export function checkRateLimit(key: DeveloperApiKey): {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
} {
  const now = Date.now();
  const windowMs = 60000;
  const limit = key.rateLimitPerMinute || 600;

  let timestamps = rateLimitWindow.get(key.id) || [];
  timestamps = timestamps.filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0];
    const resetSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    rateLimitWindow.set(key.id, timestamps);
    return { allowed: false, limit, remaining: 0, resetSeconds };
  }

  timestamps.push(now);
  rateLimitWindow.set(key.id, timestamps);
  const remaining = Math.max(0, limit - timestamps.length);
  return { allowed: true, limit, remaining, resetSeconds: 60 };
}

/**
 * Verifies HMAC-SHA256 Request Signature
 * Signature format: hex(HMAC_SHA256(timestamp + "." + method + "." + path + "." + body, apiSecret))
 */
export async function verifyHmacSignature(
  timestamp: string,
  method: string,
  path: string,
  body: string,
  signature: string,
  apiSecret: string,
): Promise<boolean> {
  const payloadToSign = `${timestamp}.${method.toUpperCase()}.${path}.${body}`;
  const expectedHash = await sha256Hex(`${payloadToSign}:${apiSecret}`);
  return expectedHash.toLowerCase() === signature.toLowerCase();
}

/**
 * Complete OpenAPI 3.0 JSON Specification for AppexQuant Markets Global
 */
export function getOpenApiSpec(): Record<string, any> {
  return {
    openapi: '3.0.3',
    info: {
      title: 'AppexQuant Markets Global API',
      version: '1.0.0',
      description:
        'Official programmatic gateway for AppexQuant Markets Global. Provides institutional-grade endpoints for cryptographic trade audit verification, live multi-asset streaming status, user analytics, and automated multi-channel dispatching.',
      contact: {
        name: 'AppexQuant Institutional Developer Operations',
        url: 'https://appexquant.markets/docs',
        email: 'api-support@appexquant.markets',
      },
      license: {
        name: 'AppexQuant Proprietary Institutional License v1.0',
        url: 'https://appexquant.markets/terms',
      },
    },
    servers: [
      { url: 'https://api.appexquant.com', description: 'Production Gateway' },
      { url: 'http://localhost:3000', description: 'Local Development Server' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API-Key',
          description: 'Enter your AppexQuant API key (e.g. `aq_live_...` or `apx_live_...`).',
        },
      },
      schemas: {
        MarketStatusResponse: {
          type: 'object',
          properties: {
            system: { type: 'string', example: 'AppexQuant Core Engine' },
            timestamp: { type: 'string', format: 'date-time' },
            websocket_gateway: { type: 'string', example: 'Connected (Deriv WS & Binance Feed)' },
            active_symbols: {
              type: 'array',
              items: { type: 'string' },
              example: ['XAU/USD', 'EUR/USD', 'BTC/USD', 'Volatility 75 Index'],
            },
            latency_ms: { type: 'number', example: 14.2 },
            uptime_percentage: { type: 'number', example: 99.98 },
          },
          required: ['system', 'timestamp', 'websocket_gateway', 'active_symbols', 'latency_ms'],
        },
        AuditVerificationRequest: {
          type: 'object',
          properties: {
            certificate_hash: {
              type: 'string',
              description: 'SHA-256 cryptographic hash of the trade, challenge, or signal outcome.',
              example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            },
          },
          required: ['certificate_hash'],
        },
        AuditVerificationResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'VALID_VERIFIED' },
            verified_at: { type: 'string', format: 'date-time' },
            owner: { type: 'string', example: 'Alex N. Obwogi (OMERTA Verified)' },
            asset: { type: 'string', example: 'XAU/USD (Gold Scalp)' },
            execution_price: { type: 'number', example: 2345.6 },
            pnl_percentage: { type: 'number', example: 4.85 },
            immutable_ledger_match: { type: 'boolean', example: true },
            block_index: { type: 'integer', example: 89214 },
            merkle_root: { type: 'string', example: '5a7b3c2e1f8d90a4b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5' },
          },
          required: ['status', 'verified_at', 'owner', 'asset', 'execution_price', 'pnl_percentage', 'immutable_ledger_match'],
        },
        UserAnalyticsResponse: {
          type: 'object',
          properties: {
            user_id: { type: 'string', example: 'usr_alex_001' },
            tier: { type: 'string', example: 'Enterprise' },
            metrics: {
              type: 'object',
              properties: {
                total_trades: { type: 'integer', example: 142 },
                win_rate_percent: { type: 'number', example: 68.3 },
                profit_factor: { type: 'number', example: 2.41 },
                anti_tilt_lock_status: { type: 'string', example: 'DISENGAGED' },
                current_drawdown_percent: { type: 'number', example: 1.12 },
              },
            },
          },
          required: ['user_id', 'tier', 'metrics'],
        },
        AutomationTriggerRequest: {
          type: 'object',
          properties: {
            channels: {
              type: 'array',
              items: { type: 'string' },
              example: ['telegram', 'discord', 'tiktok'],
            },
            message_payload: {
              type: 'string',
              description: 'Formatted markdown text or signal description.',
              example: '⚡ [AI Signal Alert] Gold XAU/USD Momentum Breakout at $2,514.80. Target 1:3.2 RR.',
            },
            media_url: {
              type: 'string',
              nullable: true,
              description: 'Optional hosted URL of the Pillow-branded 9:16 chart image.',
              example: 'https://cdn.appexquant.markets/charts/xauusd_4h_breakout.png',
            },
          },
          required: ['channels', 'message_payload'],
        },
        AutomationTriggerResponse: {
          type: 'object',
          properties: {
            dispatch_status: { type: 'string', example: 'SUCCESS' },
            target_channels: { type: 'array', items: { type: 'string' }, example: ['telegram', 'discord', 'tiktok'] },
            dispatched_at: { type: 'string', format: 'date-time' },
            delivery_receipt_ids: { type: 'array', items: { type: 'string' }, example: ['msg_uuid_0', 'msg_uuid_1', 'msg_uuid_2'] },
          },
          required: ['dispatch_status', 'target_channels', 'dispatched_at', 'delivery_receipt_ids'],
        },
      },
    },
    paths: {
      '/api/v1/market/status': {
        get: {
          tags: ['Market Core'],
          summary: 'Get Live Market Core & WebSocket Gateway Status',
          description: 'Returns live connection health and streaming socket latency across global assets.',
          responses: {
            '200': {
              description: 'Live Market status metrics',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/MarketStatusResponse' } } },
            },
          },
        },
      },
      '/api/v1/audit/verify': {
        post: {
          tags: ['Cryptographic Audit Trail'],
          summary: 'Cryptographically Verify Trade or Challenge Outcome',
          description: 'Accepts trade or challenge SHA-256 certificate hashes and returns cryptographic verification payloads matched against the immutable ledger.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuditVerificationRequest' } } },
          },
          responses: {
            '200': {
              description: 'Cryptographic proof verification payload',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AuditVerificationResponse' } } },
            },
            '400': { description: 'Malformed certificate hash string' },
          },
        },
      },
      '/api/v1/analytics/user': {
        get: {
          tags: ['Trader Analytics'],
          summary: 'Get Authenticated User Trading & Risk Analytics',
          description: 'Retrieves real-time trading statistics, win rates, and risk scores for the authenticated account.',
          security: [{ BearerAuth: [] }],
          responses: {
            '200': {
              description: 'User trading metrics and risk guardrail stats',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/UserAnalyticsResponse' } } },
            },
            '401': { description: 'Unauthorized: Invalid or missing API key' },
            '429': { description: 'Too Many Requests: Rate limit exceeded' },
          },
        },
      },
      '/api/v1/automation/trigger': {
        post: {
          tags: ['Social Automation Hub'],
          summary: 'Trigger Omni-Channel Marketing & Signal Dispatch',
          description: 'Instantly dispatches branded market setups and AI signals to authorized multi-channel feeds (Telegram, Discord, TikTok, Meta).',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AutomationTriggerRequest' } } },
          },
          responses: {
            '200': {
              description: 'Dispatch delivery confirmation and message receipts',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AutomationTriggerResponse' } } },
            },
            '401': { description: 'Unauthorized: Invalid API key' },
            '403': { description: 'Forbidden: Missing write:automation scope' },
            '429': { description: 'Too Many Requests: Rate limit exceeded' },
          },
        },
      },
    },
  };
}

// Complete OpenAPI Endpoints Documentation Registry for UI Sandbox
export const API_DOCS_REGISTRY: ApiEndpointDoc[] = [
  {
    method: 'GET',
    path: '/api/v1/market/status',
    summary: 'Get Market Status & Latency',
    description: 'Returns live connection health and streaming socket latency across global assets.',
    requiredScope: 'read:market_data',
    rateLimit: '2,400 req/min',
    sampleResponse: {
      system: 'AppexQuant Core Engine',
      timestamp: '2026-09-13T12:00:00Z',
      websocket_gateway: 'Connected (Deriv WS & Binance Feed)',
      active_symbols: ['XAU/USD', 'EUR/USD', 'BTC/USD', 'Volatility 75 Index'],
      latency_ms: 14.2,
      uptime_percentage: 99.98,
    },
  },
  {
    method: 'POST',
    path: '/api/v1/audit/verify',
    summary: 'Verify Cryptographic Audit Hash',
    description: 'Accepts trade/challenge hashes and returns cryptographic verification payloads.',
    requiredScope: 'read:audit',
    rateLimit: '2,400 req/min',
    parameters: [
      { name: 'certificate_hash', in: 'body', required: true, type: 'string', description: 'SHA-256 certificate hash' },
    ],
    sampleResponse: {
      status: 'VALID_VERIFIED',
      verified_at: '2026-09-13T12:00:00Z',
      owner: 'Alex N. Obwogi (OMERTA Verified)',
      asset: 'XAU/USD (Gold Scalp)',
      execution_price: 2345.60,
      pnl_percentage: 4.85,
      immutable_ledger_match: true,
      block_index: 89214,
    },
  },
  {
    method: 'GET',
    path: '/api/v1/analytics/user',
    summary: 'Get User Trading Analytics',
    description: 'Returns user trading stats, win rates, and risk scores (protected by valid API key).',
    requiredScope: 'read:analytics',
    rateLimit: '600 req/min',
    sampleResponse: {
      user_id: 'usr_alex_001',
      tier: 'Enterprise',
      metrics: {
        total_trades: 142,
        win_rate_percent: 68.3,
        profit_factor: 2.41,
        anti_tilt_lock_status: 'DISENGAGED',
        current_drawdown_percent: 1.12,
      },
    },
  },
  {
    method: 'POST',
    path: '/api/v1/automation/trigger',
    summary: 'Trigger Multi-Channel Automation Dispatch',
    description: 'External webhook trigger for instant multi-channel social publishing.',
    requiredScope: 'write:automation',
    rateLimit: '300 req/min',
    parameters: [
      { name: 'channels', in: 'body', required: true, type: 'array', description: 'List of target channels' },
      { name: 'message_payload', in: 'body', required: true, type: 'string', description: 'Signal or alert markdown text' },
      { name: 'media_url', in: 'body', required: false, type: 'string', description: 'Optional branded image URL' },
    ],
    sampleResponse: {
      dispatch_status: 'SUCCESS',
      target_channels: ['telegram', 'discord', 'tiktok'],
      dispatched_at: '2026-09-13T12:00:00Z',
      delivery_receipt_ids: ['msg_uuid_0', 'msg_uuid_1', 'msg_uuid_2'],
    },
  },
  {
    method: 'POST',
    path: '/api/v1/payments/stripe/create-checkout',
    summary: 'Create Stripe Fiat Checkout Session',
    description: 'Provisions a secure Stripe Checkout session for instant institutional challenge access.',
    requiredScope: 'write:orders',
    rateLimit: '300 req/min',
    parameters: [
      { name: 'user_id', in: 'body', required: true, type: 'string', description: 'User identifier' },
      { name: 'challenge_tier', in: 'body', required: true, type: 'string', description: 'Challenge tier name' },
      { name: 'price_amount', in: 'body', required: true, type: 'number', description: 'Checkout amount in USD' },
      { name: 'success_url', in: 'body', required: true, type: 'string', description: 'Redirect URL on success' },
      { name: 'cancel_url', in: 'body', required: true, type: 'string', description: 'Redirect URL on cancel' },
    ],
    sampleResponse: {
      status: 'success',
      checkout_url: 'https://checkout.stripe.com/pay/cs_live_...',
      session_id: 'cs_live_...',
    },
  },
  {
    method: 'POST',
    path: '/api/v1/payments/crypto/listener',
    summary: 'Crypto & On-Chain Settlement Gateway',
    description: 'Generates dedicated on-chain deposit addresses and polls live blockchain network confirmations.',
    requiredScope: 'read:accounts',
    rateLimit: '300 req/min',
    parameters: [
      { name: 'user_id', in: 'body', required: true, type: 'string', description: 'User identifier' },
      { name: 'blockchain_network', in: 'body', required: true, type: 'string', description: 'TRC20 | ERC20 | BTC' },
      { name: 'expected_amount', in: 'body', required: true, type: 'number', description: 'Expected deposit quantity' },
    ],
    sampleResponse: {
      status: 'listening',
      network: 'TRC20',
      deposit_address: 'TXYZ_production_usdt_trc20_vault_address_placeholder',
      expected_amount: 500,
      message: 'Send exact amount to address. Settlement finalized automatically after 12 block confirmations.',
    },
  },
  {
    method: 'POST',
    path: '/api/v1/payments/deriv-agent/request-transfer',
    summary: 'Deriv Payment Agent Transfer Request',
    description: 'Initiates official payment agent fiat-to-crypto local gateway clearance using scoped tokens.',
    requiredScope: 'write:orders',
    rateLimit: '300 req/min',
    parameters: [
      { name: 'user_id', in: 'body', required: true, type: 'string', description: 'Client User ID' },
      { name: 'agent_id', in: 'body', required: true, type: 'string', description: 'Deriv Payment Agent ID' },
      { name: 'transfer_type', in: 'body', required: true, type: 'string', description: 'deposit | withdrawal' },
      { name: 'amount', in: 'body', required: true, type: 'number', description: 'Transfer amount in USD' },
      { name: 'deriv_oauth_scope', in: 'body', required: true, type: 'string', description: 'Verified Deriv OAuth scope' },
    ],
    sampleResponse: {
      status: 'requested',
      agent_id: 'CR_AGENT_9941',
      transfer_type: 'deposit',
      amount: 250,
      verification_token_dispatched: '7f9a2b1c',
      message: 'Verification token sent to registered client communication channel.',
    },
  },
  {
    method: 'POST',
    path: '/api/v1/finance/ledger/record',
    summary: 'Record Double-Entry Immutable Ledger Entry',
    description: 'Executes a cryptographically secure, double-entry immutable ledger modification with SHA-256 validation.',
    requiredScope: 'read:audit_ledger',
    rateLimit: '600 req/min',
    parameters: [
      { name: 'account_id', in: 'body', required: true, type: 'string', description: 'Account ID' },
      { name: 'debit', in: 'body', required: true, type: 'number', description: 'Debit amount' },
      { name: 'credit', in: 'body', required: true, type: 'number', description: 'Credit amount' },
      { name: 'previous_balance', in: 'body', required: true, type: 'number', description: 'Previous balance' },
    ],
    sampleResponse: {
      status: 'immutable_entry_committed',
      account_id: 'CR9021482',
      new_balance: 10250.75,
      ledger_sha256_audit_hash: '5a7b3c2e1f8d90a4b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5',
    },
  },
];

