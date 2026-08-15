/**
 * AppexQuant Markets Global - Official TradingView Datafeed Adapter
 * Translates Deriv WebSocket market data into TradingView JS API Datafeed format.
 */

import { derivWs } from '../deriv/DerivWebSocketManager.ts';
import { NormalizedCandle, NormalizedTick } from '../deriv/derivTypes.ts';
import { MarketInstrument } from '../../types/market.ts';

export interface DatafeedConfiguration {
  supports_search: boolean;
  supports_group_request: boolean;
  supported_resolutions: string[];
  supports_marks: boolean;
  supports_timescale_marks: boolean;
  supports_time: boolean;
}

export class DerivTradingViewDatafeed {
  private instruments: MarketInstrument[] = [];
  private activeSubscriptions = new Map<string, (bar: { time: number; open: number; high: number; low: number; close: number; volume?: number }) => void>();

  constructor(instruments: MarketInstrument[]) {
    this.instruments = instruments;
  }

  public updateInstruments(instruments: MarketInstrument[]): void {
    this.instruments = instruments;
  }

  public onReady(callback: (config: DatafeedConfiguration) => void): void {
    setTimeout(() => {
      callback({
        supports_search: true,
        supports_group_request: false,
        supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W'],
        supports_marks: false,
        supports_timescale_marks: false,
        supports_time: true,
      });
    }, 0);
  }

  public searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResult: (result: Array<{ symbol: string; full_name: string; description: string; exchange: string; type: string }>) => void
  ): void {
    const q = (userInput || '').toLowerCase();
    const matches = this.instruments
      .filter((i) => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q))
      .slice(0, 20)
      .map((i) => ({
        symbol: i.symbol,
        full_name: i.symbol,
        description: i.name,
        exchange: 'DERIV',
        type: i.category.toLowerCase(),
      }));
    onResult(matches);
  }

  public resolveSymbol(
    symbolName: string,
    onResolve: (symbolInfo: {
      name: string;
      description: string;
      type: string;
      session: string;
      timezone: string;
      ticker: string;
      minmov: number;
      pricescale: number;
      has_intraday: boolean;
      supported_resolutions: string[];
      volume_precision: number;
      data_status: string;
    }) => void,
    onError: (reason: string) => void
  ): void {
    const inst = this.instruments.find((i) => i.symbol === symbolName) || {
      symbol: symbolName,
      name: symbolName,
      category: 'FOREX',
      pipSize: 0.0001,
    };

    const pricescale = Math.round(1 / (inst.pipSize || 0.0001));

    setTimeout(() => {
      onResolve({
        name: inst.symbol,
        description: inst.name,
        type: inst.category.toLowerCase(),
        session: '24x7',
        timezone: 'Etc/UTC',
        ticker: inst.symbol,
        minmov: 1,
        pricescale: pricescale > 0 ? pricescale : 10000,
        has_intraday: true,
        supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W'],
        volume_precision: 2,
        data_status: 'streaming',
      });
    }, 0);
  }

  public async getBars(
    symbolInfo: { name: string },
    resolution: string,
    periodParams: { from: number; to: number; firstDataRequest: boolean },
    onResult: (bars: Array<{ time: number; open: number; high: number; low: number; close: number }>, meta?: { noData: boolean }) => void,
    onError: (reason: string) => void
  ): Promise<void> {
    const resolutionToSeconds: Record<string, number> = {
      '1': 60,
      '5': 300,
      '15': 900,
      '30': 1800,
      '60': 3600,
      '240': 14400,
      '1D': 86400,
      '1W': 604800,
    };

    const granSec = resolutionToSeconds[resolution] || 3600;

    try {
      const rawCandles = await derivWs.fetchCandles(symbolInfo.name, granSec, 300);
      if (!rawCandles || rawCandles.length === 0) {
        onResult([], { noData: true });
        return;
      }

      const bars = rawCandles.map((c) => ({
        time: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

      onResult(bars, { noData: false });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to fetch historical bars');
    }
  }

  public subscribeBars(
    symbolInfo: { name: string },
    resolution: string,
    onRealtimeCallback: (bar: { time: number; open: number; high: number; low: number; close: number }) => void,
    subscriberUID: string
  ): void {
    const handleTick = (tick: NormalizedTick) => {
      onRealtimeCallback({
        time: tick.lastUpdated.getTime(),
        open: tick.prevQuote,
        high: Math.max(tick.quote, tick.prevQuote),
        low: Math.min(tick.quote, tick.prevQuote),
        close: tick.quote,
      });
    };

    derivWs.subscribeTick(symbolInfo.name, handleTick);
    this.activeSubscriptions.set(subscriberUID, handleTick as any);
  }

  public unsubscribeBars(subscriberUID: string): void {
    this.activeSubscriptions.delete(subscriberUID);
  }
}
