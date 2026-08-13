/**
 * AppexQuant Markets Global - Deriv WebSocket API Types & Schemas
 * Official Deriv v3 API Specification
 */

export interface DerivActiveSymbol {
  symbol: string;
  display_name: string;
  market: string;
  market_display_name: string;
  submarket: string;
  submarket_display_name: string;
  pip: number;
  is_trading_suspended: number; // 0 or 1
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

export interface DerivRequest {
  req_id: number;
  active_symbols?: 'full' | 'brief';
  product_type?: 'basic';
  ticks?: string;
  forget?: string;
  ticks_history?: string;
  style?: 'ticks' | 'candles';
  granularity?: number; // Granularity in seconds (60, 300, 900, 1800, 3600, 14400, 86400)
  count?: number;
  end?: string | number;
  contracts_for?: string;
  ping?: 1;
  [key: string]: unknown;
}

export interface DerivError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface DerivResponse {
  req_id: number;
  msg_type: 'active_symbols' | 'tick' | 'history' | 'candles' | 'contracts_for' | 'ping' | 'forget' | 'error' | 'authorize';
  active_symbols?: DerivActiveSymbol[];
  tick?: DerivTick;
  authorize?: Record<string, unknown>;
  history?: {
    prices: number[];
    times: number[];
  };
  candles?: DerivCandle[];
  contracts_for?: {
    available: DerivContractCategory[];
    spot?: number;
  };
  subscription?: {
    id: string;
  };
  error?: DerivError;
  ping?: string;
}

export interface NormalizedCandle {
  timestamp: number; // unix ms
  open: number;
  high: number;
  low: number;
  close: number;
}

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
