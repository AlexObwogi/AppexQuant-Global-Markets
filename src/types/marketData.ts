/**
 * AppexQuant Markets Global - Modular Market Data Types & Provider Interface
 */

export type DataQualityState = 'FRESH' | 'STALE' | 'ANOMALY' | 'DISCONNECTED';

export interface MarketMessageMetadata {
  timestamp: string;
  provider: string;
  symbol: string;
  source: string;
  sequence: number;
  receivedAt: string;
  qualityState: DataQualityState;
}

export interface MarketQuote {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  last: number;
  volume?: number;
  metadata: MarketMessageMetadata;
}

export interface MarketBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol: string;
  timeframe: string;
  metadata: MarketMessageMetadata;
}

export interface MarketStatusInfo {
  symbol: string;
  isOpen: boolean;
  session: 'OPEN' | 'CLOSED' | '24H' | 'PRE_OPEN';
  nextOpen?: string;
  nextClose?: string;
  statusMessage: string;
}

export interface MarketDataProvider {
  readonly providerName: string;
  subscribe(symbol: string, callback: (quote: MarketQuote) => void): () => void;
  unsubscribe(symbol: string): void;
  getQuote(symbol: string): Promise<MarketQuote>;
  getHistoricalBars(symbol: string, timeframe: string, count?: number): Promise<MarketBar[]>;
  getLatestBar(symbol: string, timeframe: string): Promise<MarketBar>;
  getMarketStatus(symbol: string): Promise<MarketStatusInfo>;
  getDataQualityState(symbol: string): DataQualityState;
}
