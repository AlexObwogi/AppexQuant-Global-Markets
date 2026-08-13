/**
 * Tests for Modular Market Data Engine & Data Quality Controls
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MarketDataEngine } from '../src/services/marketDataEngine';

describe('MarketDataEngine & Data Quality Controls', () => {
  let engine: MarketDataEngine;

  beforeEach(() => {
    engine = new MarketDataEngine();
  });

  it('should initialize with correct provider name', () => {
    expect(engine.providerName).toBe('AppexQuant-MultiSource-Engine');
  });

  it('should validate and normalize a correct quote', () => {
    const quote = engine.validateAndNormalizeQuote('XAUUSD', 2335.50, 2335.80);
    expect(quote).not.toBeNull();
    expect(quote?.symbol).toBe('XAUUSD');
    expect(quote?.bid).toBe(2335.50);
    expect(quote?.ask).toBe(2335.80);
    expect(quote?.spread).toBe(0.30);
    expect(quote?.metadata.qualityState).toBe('FRESH');
  });

  it('should reject invalid prices (zero or negative) as anomalies', () => {
    const quote1 = engine.validateAndNormalizeQuote('EURUSD', 0, 1.0845);
    expect(quote1).toBeNull();
    expect(engine.getDataQualityState('EURUSD')).toBe('ANOMALY');

    const quote2 = engine.validateAndNormalizeQuote('EURUSD', 1.0845, -1.0);
    expect(quote2).toBeNull();
  });

  it('should reject inverted bid/ask as anomaly', () => {
    const quote = engine.validateAndNormalizeQuote('GBPUSD', 1.2800, 1.2750);
    expect(quote).toBeNull();
    expect(engine.getDataQualityState('GBPUSD')).toBe('ANOMALY');
  });

  it('should fetch historical bars correctly', async () => {
    const bars = await engine.getHistoricalBars('XAUUSD', '15M', 10);
    expect(bars.length).toBe(11);
    expect(bars[0].symbol).toBe('XAUUSD');
    expect(bars[0].open).toBeGreaterThan(0);
    expect(bars[0].metadata.qualityState).toBe('FRESH');
  });

  it('should fetch market status', async () => {
    const status = await engine.getMarketStatus('EURUSD');
    expect(status.symbol).toBe('EURUSD');
    expect(status.isOpen).toBe(true);
    expect(status.session).toBe('OPEN');
  });
});
