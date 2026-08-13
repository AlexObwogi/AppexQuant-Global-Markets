/**
 * AppexQuant Markets Global - Market & Connection Types
 */

export type ConnectionStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'RECONNECTING';

export type InstrumentCategory = 'FOREX' | 'SYNTHETICS' | 'CRYPTO' | 'INDICES' | 'COMMODITIES';

export interface MarketInstrument {
  id: string;
  symbol: string;
  name: string;
  category: InstrumentCategory;
  baseCurrency: string;
  quoteCurrency: string;
  pipSize: number;
  minLotSize: number;
  maxLotSize: number;
  lotStep: number;
  bid: number;
  ask: number;
  spread: number;
  change24hPercentage: number;
  isMarketOpen: boolean;
}

export interface SelectedMarketState {
  category: InstrumentCategory;
  instrument: MarketInstrument | null;
  timeframe: string; // e.g. "M1", "M5", "H1", "D1"
}
