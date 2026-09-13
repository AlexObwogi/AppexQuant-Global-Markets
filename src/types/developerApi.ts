/**
 * AppexQuant Markets Global - Public Developer API & Gateway Types
 */

export type ApiScope =
  | 'read:audit'
  | 'read:market_data'
  | 'read:accounts'
  | 'read:analytics'
  | 'write:orders'
  | 'write:automation'
  | 'manage:webhooks'
  | 'read:signals'
  | 'read:audit_ledger';

export type RateLimitTier = 'Starter' | 'Professional' | 'Enterprise';

export interface DeveloperApiKey {
  id: string;
  userId?: string;
  name: string;
  apiKey: string;
  keyPrefix?: string;
  keyHash?: string;
  apiSecretMasked: string;
  tier?: RateLimitTier;
  scopes: ApiScope[];
  ipWhitelist: string[];
  rateLimitPerMinute: number;
  createdAt: string;
  lastUsedAt?: string;
  status: 'ACTIVE' | 'REVOKED';
}

export interface ApiEndpointDoc {
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH';
  path: string;
  summary: string;
  description: string;
  requiredScope: ApiScope;
  rateLimit: string;
  parameters?: Array<{ name: string; in: 'query' | 'header' | 'path' | 'body'; required: boolean; type: string; description: string }>;
  sampleResponse: Record<string, any>;
}

export interface WebhookSubscription {
  id: string;
  url: string;
  events: Array<'trade.executed' | 'challenge.passed' | 'risk.circuit_breaker' | 'signal.emitted'>;
  secret: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  deliveriesCount: number;
}
