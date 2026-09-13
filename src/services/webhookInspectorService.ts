/**
 * AppexQuant Markets Global - Webhook Payload Inspector Service
 * Manages raw JSON ingress/egress logging, real-time schema validation diffs,
 * schema regression detection, and payload replay debugging.
 */

import {
  WebhookPayloadRecord,
  WebhookFilterOptions,
  WebhookReplayRequest,
  WebhookReplayResponse,
  WebhookSchemaDiff,
  WebhookSchemaStatus,
  ExtendedIntegrationPlatform,
} from '../types/webhookInspector.ts';

// Standard Baseline Schemas for diffing & regression detection
export const INTEGRATION_SCHEMAS: Record<
  string,
  {
    version: string;
    requiredFields: string[];
    allowedFields: string[];
    deprecatedFields?: string[];
  }
> = {
  TELEGRAM_BOT: {
    version: 'Bot API v7.8',
    requiredFields: ['update_id'],
    allowedFields: [
      'update_id',
      'message',
      'edited_message',
      'channel_post',
      'edited_channel_post',
      'inline_query',
      'chosen_inline_result',
      'callback_query',
      'shipping_query',
      'pre_checkout_query',
      'poll',
      'poll_answer',
      'my_chat_member',
      'chat_member',
      'chat_join_request',
      'business_connection',
      'business_message',
    ],
    deprecatedFields: ['inline_message_id_old'],
  },
  DISCORD_WEBHOOK: {
    version: 'Discord API v10',
    requiredFields: ['content'],
    allowedFields: [
      'content',
      'username',
      'avatar_url',
      'tts',
      'embeds',
      'allowed_mentions',
      'components',
      'files',
      'payload_json',
      'attachments',
      'flags',
      'thread_name',
      'applied_tags',
    ],
    deprecatedFields: [],
  },
  META_INSTAGRAM: {
    version: 'Meta Graph API v20.0',
    requiredFields: ['object', 'entry'],
    allowedFields: ['object', 'entry', 'id', 'time', 'changes', 'messaging', 'standby'],
    deprecatedFields: ['legacy_token_field', 'ig_user_name_deprecated'],
  },
  META_FACEBOOK: {
    version: 'Meta Graph API v20.0',
    requiredFields: ['object', 'entry'],
    allowedFields: ['object', 'entry', 'id', 'time', 'changes', 'messaging'],
    deprecatedFields: [],
  },
  TIKTOK: {
    version: 'TikTok Open API v1.3',
    requiredFields: ['event_type', 'timestamp', 'data'],
    allowedFields: ['event_type', 'timestamp', 'data', 'open_id', 'share_id', 'signature', 'app_id'],
    deprecatedFields: ['old_client_ticket'],
  },
  WHATSAPP_BUSINESS: {
    version: 'WhatsApp Cloud API v19.0',
    requiredFields: ['object', 'entry'],
    allowedFields: ['object', 'entry', 'id', 'changes', 'value', 'messaging_product', 'metadata', 'contacts', 'messages', 'statuses'],
    deprecatedFields: [],
  },
  TRADINGVIEW: {
    version: 'TradingView Webhook v2',
    requiredFields: ['ticker', 'action'],
    allowedFields: ['ticker', 'action', 'contracts', 'price', 'time', 'strategy', 'bar', 'sentiment', 'stop_loss', 'take_profit'],
    deprecatedFields: [],
  },
};

/**
 * Validates a raw JSON payload against baseline schema rules and computes a Diff
 */
export function validatePayloadSchema(
  platform: ExtendedIntegrationPlatform,
  rawPayload: Record<string, any>
): {
  status: WebhookSchemaStatus;
  details: string[];
  detectedSchemaVersion: string;
  diff: WebhookSchemaDiff;
} {
  const schema = INTEGRATION_SCHEMAS[platform];
  const detectedVersion = schema ? schema.version : 'Generic JSON v1.0';

  if (!schema) {
    return {
      status: 'VALID',
      details: ['Custom or unconstrained schema. Valid JSON structure verified.'],
      detectedSchemaVersion: detectedVersion,
      diff: { addedFields: [], removedFields: [], typeMismatches: [] },
    };
  }

  const payloadKeys = Object.keys(rawPayload || {});
  const missingRequired = schema.requiredFields.filter((req) => !(req in (rawPayload || {})));
  const unknownFields = payloadKeys.filter(
    (k) => !schema.allowedFields.includes(k) && !(schema.deprecatedFields || []).includes(k)
  );
  const foundDeprecated = payloadKeys.filter((k) => (schema.deprecatedFields || []).includes(k));

  const typeMismatches: string[] = [];
  // Type checks
  if (platform === 'DISCORD_WEBHOOK' && rawPayload.embeds && !Array.isArray(rawPayload.embeds)) {
    typeMismatches.push('embeds: expected array, got ' + typeof rawPayload.embeds);
  }
  if (platform === 'TELEGRAM_BOT' && rawPayload.update_id && typeof rawPayload.update_id !== 'number') {
    typeMismatches.push('update_id: expected integer, got ' + typeof rawPayload.update_id);
  }
  if (platform === 'META_INSTAGRAM' && rawPayload.entry && !Array.isArray(rawPayload.entry)) {
    typeMismatches.push('entry: expected array of changes/events, got ' + typeof rawPayload.entry);
  }

  let status: WebhookSchemaStatus = 'VALID';
  const details: string[] = [];

  if (missingRequired.length > 0) {
    status = 'MISSING_REQUIRED';
    details.push(`Missing mandatory field(s): ${missingRequired.join(', ')}`);
  } else if (typeMismatches.length > 0) {
    status = 'SCHEMA_ERROR';
    details.push(`Type validation mismatch: ${typeMismatches.join('; ')}`);
  } else if (foundDeprecated.length > 0) {
    status = 'DEPRECATED_FIELDS';
    details.push(`Contains deprecated API fields: ${foundDeprecated.join(', ')}`);
  } else if (unknownFields.length > 0) {
    status = 'UNKNOWN_FIELDS';
    details.push(`Detected ${unknownFields.length} new/unrecognized field(s) in payload.`);
  } else {
    details.push('Payload strictly conforms to expected API contract.');
  }

  return {
    status,
    details,
    detectedSchemaVersion: detectedVersion,
    diff: {
      addedFields: unknownFields,
      removedFields: missingRequired,
      typeMismatches,
      notes: foundDeprecated.map((f) => `Deprecated field: ${f}`),
    },
  };
}

// Initial Seed Webhook Ingress & Egress Records
const INITIAL_PAYLOAD_BUFFER: WebhookPayloadRecord[] = [
  {
    id: 'WH-IN-89104',
    timestamp: new Date(Date.now() - 1000 * 35).toISOString(),
    direction: 'INCOMING',
    platform: 'TELEGRAM_BOT',
    endpointUrl: '/api/v1/automation/webhooks/incoming/telegram',
    httpMethod: 'POST',
    httpStatus: 200,
    latencyMs: 14,
    eventType: 'channel_post.new',
    ipAddress: '149.154.167.220',
    signatureVerified: true,
    headers: {
      'content-type': 'application/json',
      'x-telegram-bot-api-secret-token': 'sec_tg_78192847a98b',
      'user-agent': 'TelegramBot (like TwitterBot)',
      'x-forwarded-for': '149.154.167.220',
    },
    rawPayload: {
      update_id: 849201948,
      channel_post: {
        message_id: 3948,
        chat: {
          id: -100192847192,
          title: 'AppexQuant Global Signals VIP',
          type: 'channel',
          username: 'appexquant_vip',
        },
        date: 1726231200,
        text: '⚡ [AI Execution Alert] Volatility 100 Index SELL limit triggered at 1,284.50. Risk/Reward: 1:3.2',
        entities: [
          { offset: 0, length: 22, type: 'bold' },
          { offset: 23, length: 14, type: 'code' },
        ],
      },
    },
    responseBody: { ok: true, processed_at: new Date().toISOString() },
    schemaValidation: {
      status: 'VALID',
      details: ['Payload strictly conforms to expected API contract.'],
      detectedSchemaVersion: 'Bot API v7.8',
      diff: { addedFields: [], removedFields: [], typeMismatches: [] },
    },
  },
  {
    id: 'WH-OUT-89103',
    timestamp: new Date(Date.now() - 1000 * 120).toISOString(),
    direction: 'OUTGOING',
    platform: 'DISCORD_WEBHOOK',
    endpointUrl: 'https://discord.com/api/v10/webhooks/1209384/xyz-token',
    httpMethod: 'POST',
    httpStatus: 204,
    latencyMs: 82,
    eventType: 'post.dispatched',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'AppexQuant-Automation-Dispatcher/2.4',
      'X-RateLimit-Precision': 'millisecond',
    },
    rawPayload: {
      content: '🚀 **Institutional Algo Signal Triggered**',
      username: 'AppexQuant Radar Bot',
      avatar_url: 'https://appexquant.markets/logo.png',
      embeds: [
        {
          title: 'EURUSD 15m Momentum Continuation',
          description: 'Institutional liquidity sweep detected at 1.08450. Order block confirmed.',
          color: 3066993,
          fields: [
            { name: 'Entry Price', value: '1.08460', inline: true },
            { name: 'Stop Loss', value: '1.08380', inline: true },
            { name: 'Take Profit', value: '1.08720', inline: true },
          ],
          footer: { text: 'SHA-256 Verified Audit #CERT-TRD-998241' },
          timestamp: new Date().toISOString(),
        },
      ],
    },
    responseBody: { status: 'NO_CONTENT' },
    schemaValidation: {
      status: 'VALID',
      details: ['Payload strictly conforms to expected API contract.'],
      detectedSchemaVersion: 'Discord API v10',
      diff: { addedFields: [], removedFields: [], typeMismatches: [] },
    },
  },
  {
    id: 'WH-IN-89102',
    timestamp: new Date(Date.now() - 1000 * 300).toISOString(),
    direction: 'INCOMING',
    platform: 'META_INSTAGRAM',
    endpointUrl: '/api/v1/automation/webhooks/incoming/meta',
    httpMethod: 'POST',
    httpStatus: 200,
    latencyMs: 45,
    eventType: 'instagram.mentions.change',
    ipAddress: '31.13.115.12',
    signatureVerified: true,
    headers: {
      'content-type': 'application/json',
      'x-hub-signature-256': 'sha256=a89b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
      'user-agent': 'facebookplatform/1.0 (+http://developers.facebook.com)',
    },
    rawPayload: {
      object: 'instagram',
      entry: [
        {
          id: '17841400123456789',
          time: 1726230900,
          changes: [
            {
              field: 'mentions',
              value: {
                comment_id: '1799201948271',
                media_id: '1802938472910',
                text: '@appexquant.markets is this trade setup audited on-chain?',
              },
            },
          ],
          // New v20.0 property recently added by Meta
          experiment_cohort_id: 'meta_graph_v20_exp_beta',
        },
      ],
    },
    responseBody: { success: true },
    schemaValidation: {
      status: 'UNKNOWN_FIELDS',
      details: ['Detected 1 new/unrecognized field(s) in payload: experiment_cohort_id'],
      detectedSchemaVersion: 'Meta Graph API v20.0',
      diff: {
        addedFields: ['experiment_cohort_id'],
        removedFields: [],
        typeMismatches: [],
        notes: ['Meta Graph API v20.0 newly introduced experiment_cohort_id in root entry.'],
      },
    },
  },
  {
    id: 'WH-OUT-89101',
    timestamp: new Date(Date.now() - 1000 * 480).toISOString(),
    direction: 'OUTGOING',
    platform: 'TIKTOK',
    endpointUrl: 'https://open.tiktokapis.com/v2/post/publish/video/init/',
    httpMethod: 'POST',
    httpStatus: 400,
    latencyMs: 190,
    eventType: 'video.publish.init',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer act.tiktok_mock_access_token',
    },
    rawPayload: {
      post_info: {
        title: 'How our AI Bot made +4.2% on NASDAQ 100 Today 📈 #trading #algotrading',
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_stitch: false,
        disable_comment: false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: 'https://cdn.appexquant.markets/media/nasdaq_recap_hd.mp4',
      },
      legacy_token_field: 'deprecated_token_v1', // Intentional schema regression
    },
    responseBody: {
      error: {
        code: 'invalid_param',
        message: 'Parameter legacy_token_field is deprecated and forbidden in v2 API.',
        log_id: '20260913123456789012',
      },
    },
    schemaValidation: {
      status: 'DEPRECATED_FIELDS',
      details: ['Contains deprecated API fields: legacy_token_field'],
      detectedSchemaVersion: 'TikTok Open API v1.3',
      diff: {
        addedFields: ['post_info', 'source_info'],
        removedFields: ['event_type', 'timestamp', 'data'],
        typeMismatches: [],
        notes: ['Deprecated field: legacy_token_field rejected by remote endpoint.'],
      },
    },
  },
  {
    id: 'WH-IN-89100',
    timestamp: new Date(Date.now() - 1000 * 720).toISOString(),
    direction: 'INCOMING',
    platform: 'TRADINGVIEW',
    endpointUrl: '/api/v1/automation/webhooks/incoming/tradingview',
    httpMethod: 'POST',
    httpStatus: 200,
    latencyMs: 9,
    eventType: 'strategy.alert',
    ipAddress: '52.89.214.238',
    signatureVerified: true,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'user-agent': 'TradingView Webhook Subsystem',
    },
    rawPayload: {
      ticker: 'XAUUSD',
      action: 'BUY',
      contracts: 0.5,
      price: 2514.8,
      time: '2026-09-13T12:00:00Z',
      strategy: 'London Breakout EA v4',
      bar: { open: 2512.1, high: 2515.0, low: 2511.8, close: 2514.8, volume: 1420 },
      stop_loss: 2505.0,
      take_profit: 2535.0,
    },
    responseBody: { status: 'ORDER_QUEUED', ticket: 'ORD-99142-LIVE' },
    schemaValidation: {
      status: 'VALID',
      details: ['Payload strictly conforms to expected API contract.'],
      detectedSchemaVersion: 'TradingView Webhook v2',
      diff: { addedFields: [], removedFields: [], typeMismatches: [] },
    },
  },
];

class WebhookInspectorService {
  private static instance: WebhookInspectorService;
  private payloads: WebhookPayloadRecord[] = [...INITIAL_PAYLOAD_BUFFER];
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  public static getInstance(): WebhookInspectorService {
    if (!WebhookInspectorService.instance) {
      WebhookInspectorService.instance = new WebhookInspectorService();
    }
    return WebhookInspectorService.instance;
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }

  /**
   * Retrieves payloads with server fetch or local store fallback
   */
  public async getPayloads(filters?: WebhookFilterOptions): Promise<WebhookPayloadRecord[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.platform && filters.platform !== 'ALL') queryParams.append('platform', filters.platform);
      if (filters?.direction && filters.direction !== 'ALL') queryParams.append('direction', filters.direction);
      if (filters?.status && filters.status !== 'ALL') queryParams.append('status', filters.status);
      if (filters?.schemaStatus && filters.schemaStatus !== 'ALL') queryParams.append('schemaStatus', filters.schemaStatus);
      if (filters?.searchQuery) queryParams.append('q', filters.searchQuery);

      const url = `/api/v1/automation/webhooks/inspector/payloads?${queryParams.toString()}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          this.payloads = json.data;
        }
      }
    } catch {
      // Offline / dev fallback
    }

    return this.applyLocalFilters(this.payloads, filters);
  }

  private applyLocalFilters(list: WebhookPayloadRecord[], filters?: WebhookFilterOptions): WebhookPayloadRecord[] {
    if (!filters) return [...list];

    return list.filter((item) => {
      if (filters.platform && filters.platform !== 'ALL' && item.platform !== filters.platform) {
        return false;
      }
      if (filters.direction && filters.direction !== 'ALL' && item.direction !== filters.direction) {
        return false;
      }
      if (filters.schemaStatus && filters.schemaStatus !== 'ALL' && item.schemaValidation.status !== filters.schemaStatus) {
        return false;
      }
      if (filters.status && filters.status !== 'ALL') {
        if (filters.status === 'SUCCESS' && (item.httpStatus < 200 || item.httpStatus >= 300)) return false;
        if (filters.status === 'ERROR' && item.httpStatus < 400) return false;
        if (filters.status === 'SCHEMA_WARNING' && item.schemaValidation.status === 'VALID') return false;
      }
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const strVal = (
          item.id +
          item.platform +
          item.endpointUrl +
          item.eventType +
          JSON.stringify(item.rawPayload) +
          JSON.stringify(item.responseBody || {})
        ).toLowerCase();
        if (!strVal.includes(q)) return false;
      }
      return true;
    });
  }

  /**
   * Ingest a new webhook payload in real-time (called by incoming webhook routes or dispatcher)
   */
  public recordPayload(
    direction: 'INCOMING' | 'OUTGOING',
    platform: ExtendedIntegrationPlatform,
    endpointUrl: string,
    httpMethod: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE',
    httpStatus: number,
    headers: Record<string, string>,
    rawPayload: Record<string, any>,
    responseBody?: Record<string, any>,
    latencyMs: number = 20,
    eventType: string = 'custom.event',
    ipAddress?: string
  ): WebhookPayloadRecord {
    const schemaVal = validatePayloadSchema(platform, rawPayload);
    const prefix = direction === 'INCOMING' ? 'WH-IN' : 'WH-OUT';
    const newRecord: WebhookPayloadRecord = {
      id: `${prefix}-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toISOString(),
      direction,
      platform,
      endpointUrl,
      httpMethod,
      httpStatus,
      latencyMs,
      eventType,
      ipAddress: ipAddress || (direction === 'INCOMING' ? '127.0.0.1' : undefined),
      signatureVerified: !!(headers['x-hub-signature-256'] || headers['x-telegram-bot-api-secret-token']),
      headers,
      rawPayload,
      responseBody,
      schemaValidation: schemaVal,
    };

    this.payloads.unshift(newRecord);
    if (this.payloads.length > 200) this.payloads.pop();
    this.notify();
    return newRecord;
  }

  /**
   * Replays or simulates a webhook payload to test parsing & validation
   */
  public async simulateReplay(request: WebhookReplayRequest): Promise<WebhookReplayResponse> {
    const startTime = Date.now();
    try {
      const res = await fetch('/api/v1/automation/webhooks/inspector/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (res.ok) {
        const json = await res.json();
        const record = json.data as WebhookPayloadRecord;
        this.payloads.unshift(record);
        this.notify();
        return {
          success: true,
          executedRecord: record,
          message: 'Simulation executed & payload recorded successfully.',
        };
      }
    } catch {
      // Fallback local execution
    }

    // Local execution fallback
    const latency = Date.now() - startTime + Math.floor(15 + Math.random() * 30);
    const simulatedRecord = this.recordPayload(
      request.direction,
      request.platform,
      request.endpointUrl,
      request.httpMethod,
      200,
      {
        'content-type': 'application/json',
        'x-appex-inspector-simulated': 'true',
        ...request.headers,
      },
      request.payload,
      {
        simulated: true,
        received_timestamp: new Date().toISOString(),
        acknowledged: true,
      },
      latency,
      'inspector.replay_test',
      '127.0.0.1'
    );

    return {
      success: true,
      executedRecord: simulatedRecord,
      message: 'Local simulation completed with schema validation checks.',
    };
  }

  public clearBuffer(): void {
    this.payloads = [];
    this.notify();
    fetch('/api/v1/automation/webhooks/inspector/clear', { method: 'POST' }).catch(() => {});
  }

  public getRawBuffer(): WebhookPayloadRecord[] {
    return [...this.payloads];
  }
}

export const webhookInspectorService = WebhookInspectorService.getInstance();
