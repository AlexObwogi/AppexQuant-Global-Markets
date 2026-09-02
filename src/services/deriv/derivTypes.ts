/**
 * AppeX Quant Global Markets
 *
 * Deriv Options API Types
 *
 * Current architecture:
 * - OAuth 2.0 + PKCE for user authentication
 * - Options REST API for account discovery and OTP
 * - Options WebSocket for public market data
 * - Authenticated Options WebSocket for account operations
 *
 * No legacy authentication protocol is represented here.
 */

export interface DerivActiveSymbol {
  symbol: string;
  display_name: string;
  market: string;
  market_display_name: string;
  submarket: string;
  submarket_display_name: string;
  pip: number;
  is_trading_suspended: number;
  min_stake?: number;
  max_stake?: number;
  quote_type?: string;
  spot?: number;
  spot_time?: number;
}

export interface DerivTick {
  symbol: string;
  quote: number;
  bid: number;
  ask: number;
  epoch: number;
  id: string;
  pip_size?: number;
}

export interface DerivCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  epoch: number;
}

export interface DerivContractCategory {
  contract_category: string;
  contract_category_display: string;
  contract_type: string;
  display_name: string;
  min_contract_duration?: string;
  max_contract_duration?: string;
}

export interface DerivError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface DerivSubscription {
  id: string;
}

/**
 * Generic Options WebSocket request.
 *
 * Individual operations extend this shape where required.
 */
export interface DerivOptionsRequest {
  req_id?: number;
  subscribe?: 1;
  [key: string]: unknown;
}

export interface DerivTickRequest
  extends DerivOptionsRequest {
  ticks: string;
}

export interface DerivActiveSymbolsRequest
  extends DerivOptionsRequest {
  active_symbols: 'full' | 'brief';
  product_type?: 'basic';
}

export interface DerivHistoryRequest
  extends DerivOptionsRequest {
  ticks_history: string;
  style?: 'ticks' | 'candles';
  granularity?: number;
  count?: number;
  end?: 'latest' | number;
}

export interface DerivContractsRequest
  extends DerivOptionsRequest {
  contracts_for: string;
}

export interface DerivBalanceRequest
  extends DerivOptionsRequest {
  balance: 1;
}

export interface DerivForgetRequest
  extends DerivOptionsRequest {
  forget: string;
}

export interface DerivForgetAllRequest
  extends DerivOptionsRequest {
  forget_all: string;
}

/**
 * Generic response envelope from the Options WebSocket.
 */
export interface DerivOptionsResponse {
  req_id?: number;
  msg_type?: string;

  active_symbols?: DerivActiveSymbol[];

  tick?: DerivTick;

  history?: {
    prices: number[];
    times: number[];
  };

  candles?: DerivCandle[];

  contracts_for?: {
    available: DerivContractCategory[];
    spot?: number;
  };

  balance?: DerivBalance;

  subscription?: DerivSubscription;

  error?: DerivError;

  [key: string]: unknown;
}

export interface DerivBalance {
  balance: number;
  currency: string;
  loginid?: string;
}

/**
 * REST Options account returned by the current account API.
 */
export interface DerivOptionsAccount {
  account_id: string;
  account_type?: string;
  balance?: number;
  currency?: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * REST account-list response.
 */
export interface DerivOptionsAccountsResponse {
  data?: DerivOptionsAccount[] | DerivOptionsAccount;
  errors?: DerivError[];
}

/**
 * REST OTP response.
 *
 * The returned URL is a short-lived, one-time authenticated
 * WebSocket endpoint.
 */
export interface DerivOptionsOtpResponse {
  data?: {
    url?: string;
  };
  errors?: DerivError[];
}

/**
 * OAuth session information kept server-side.
 */
export interface DerivOAuthSession {
  accessToken: string;
  accountId: string;
}

/**
 * Normalized market tick consumed by AppeX.
 */
export interface NormalizedTick {
  symbol: string;
  quote: number;
  bid: number;
  ask: number;
  epoch: number;
  change: number;
  changePct: number;
  prevQuote: number;
  lastUpdated: Date;
}

/**
 * Normalized OHLC candle consumed by AppeX.
 */
export interface NormalizedCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Gateway connection state.
 */
export type DerivConnectionState =
  | 'CONNECTED'
  | 'CONNECTING'
  | 'RECONNECTING'
  | 'OFFLINE'
  | 'ERROR'
  | 'DISCONNECTED';

/**
 * Public tick subscription state.
 */
export interface DerivTickSubscription {
  symbol: string;
  subscriptionId?: string;
}

/**
 * Gateway status exposed internally by AppeX.
 */
export interface DerivGatewayStatus {
  state: DerivConnectionState;
  isAuthorized: boolean;
  activeSymbolsCount: number;
  subscribedSymbolsCount: number;
  connectedClientsCount: number;
  latencyMs: number | null;
  uptimeSeconds: number;
}