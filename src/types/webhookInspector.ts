/**
 * AppexQuant Markets Global - Webhook Payload Inspector Types
 * Contracts for logging, filtering, diffing, and replaying raw JSON payloads
 * across third-party social integrations (Telegram, Discord, Meta, TikTok, WhatsApp, etc.).
 */

import { SocialPlatform } from './socialAutomation.ts';

export type WebhookDirection = 'INCOMING' | 'OUTGOING';

export type WebhookSchemaStatus =
  | 'VALID'
  | 'DEPRECATED_FIELDS'
  | 'UNKNOWN_FIELDS'
  | 'SCHEMA_ERROR'
  | 'MISSING_REQUIRED';

export type ExtendedIntegrationPlatform =
  | SocialPlatform
  | 'CUSTOM_WEBHOOK'
  | 'TRADINGVIEW'
  | 'STRIPE'
  | 'MT5_BRIDGE';

export interface WebhookSchemaDiff {
  addedFields: string[];
  removedFields: string[];
  typeMismatches: string[];
  notes?: string[];
}

export interface WebhookPayloadRecord {
  id: string;
  timestamp: string; // ISO 8601 UTC
  direction: WebhookDirection;
  platform: ExtendedIntegrationPlatform;
  endpointUrl: string;
  httpMethod: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE';
  httpStatus: number;
  headers: Record<string, string>;
  rawPayload: Record<string, any>;
  responseBody?: Record<string, any>;
  latencyMs: number;
  eventType: string;
  ipAddress?: string;
  signatureVerified?: boolean;
  schemaValidation: {
    status: WebhookSchemaStatus;
    details: string[];
    detectedSchemaVersion: string;
    diff?: WebhookSchemaDiff;
  };
}

export interface WebhookFilterOptions {
  platform?: string; // 'ALL' or specific
  direction?: 'ALL' | WebhookDirection;
  status?: 'ALL' | 'SUCCESS' | 'ERROR' | 'SCHEMA_WARNING';
  schemaStatus?: 'ALL' | WebhookSchemaStatus;
  searchQuery?: string;
}

export interface WebhookReplayRequest {
  platform: ExtendedIntegrationPlatform;
  direction: WebhookDirection;
  endpointUrl: string;
  httpMethod: 'POST' | 'GET' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  payload: Record<string, any>;
}

export interface WebhookReplayResponse {
  success: boolean;
  executedRecord: WebhookPayloadRecord;
  message: string;
}
