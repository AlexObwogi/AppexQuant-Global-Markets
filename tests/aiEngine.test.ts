/**
 * AppexQuant Markets Global - Phase 3 AI Intelligence Engine Tests
 */

import { describe, it, expect } from 'vitest';
import { validateRiskReward } from '../src/services/ai/riskGuardrail';
import { parseNaturalLanguageStrategy } from '../src/services/ai/strategyEngine';
import { generateAiSignal } from '../src/services/ai/aiSignalGenerator';
import { MarketInstrument } from '../src/types/market';
import { NormalizedCandle } from '../src/services/deriv/derivTypes';

describe('Phase 3 AI Intelligence Engine Tests', () => {
  const sampleInstrument: MarketInstrument = {
    id: '1',
    symbol: 'frxEURUSD',
    name: 'EUR/USD',
    category: 'FOREX',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    pipSize: 0.0001,
    minLotSize: 0.01,
    maxLotSize: 100,
    lotStep: 0.01,
    bid: 1.0850,
    ask: 1.0852,
    spread: 0.0002,
    change24hPercentage: 0.45,
    isMarketOpen: true,
  };

  const mockCandles: NormalizedCandle[] = Array.from({ length: 30 }, (_, i) => ({
    timestamp: Date.now() - (30 - i) * 60000,
    open: 1.0800 + i * 0.0002,
    high: 1.0805 + i * 0.0002,
    low: 1.0795 + i * 0.0002,
    close: 1.0802 + i * 0.0002,
    volume: 120,
  }));

  describe('Risk Guardrail Engine (1:2 min to 1:3 max R:R)', () => {
    it('approves setups within 2.0 <= RR <= 3.0', () => {
      // Entry 1.0850, SL 1.0830 (20 pips risk), TP 1.0902 (52 pips reward) -> R:R 1:2.6
      const result = validateRiskReward('LONG', 1.0850, 1.0830, 1.0902);
      expect(result.isValid).toBe(true);
      expect(result.riskRewardRatio).toBe(2.6);
    });

    it('rejects setups where R:R is below 1:2.0', () => {
      // Entry 1.0850, SL 1.0830 (20 pips risk), TP 1.0880 (30 pips reward) -> R:R 1:1.5
      const result = validateRiskReward('LONG', 1.0850, 1.0830, 1.0880);
      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toContain('below the required 1:2.0 minimum threshold');
    });

    it('rejects setups where R:R exceeds 1:3.0', () => {
      // Entry 1.0850, SL 1.0830 (20 pips risk), TP 1.0950 (100 pips reward) -> R:R 1:5.0
      const result = validateRiskReward('LONG', 1.0850, 1.0830, 1.0950);
      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toContain('exceeds the 1:3.0 maximum safety threshold');
    });

    it('rejects invalid directional Stop Loss or Take Profit placements', () => {
      // LONG with SL above Entry
      const result = validateRiskReward('LONG', 1.0850, 1.0870, 1.0900);
      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toContain('Stop Loss must be strictly below Entry Price');
    });
  });

  describe('Natural Language Strategy Parser', () => {
    it('converts natural language text into structured rules', () => {
      const prompt = 'I trade breakouts on Gold and EURUSD after London liquidity sweeps. Avoid high-impact news.';
      const res = parseNaturalLanguageStrategy(prompt);

      expect(res.isValid).toBe(true);
      expect(res.interpretedRules?.markets).toContain('FOREX');
      expect(res.interpretedRules?.markets).toContain('COMMODITIES');
      expect(res.interpretedRules?.preferredSessions).toContain('LONDON');
    });
  });

  describe('Master Signal Generator & Stale Data Detection', () => {
    it('evaluates signal object and applies risk guardrails on fresh data', () => {
      const signal = generateAiSignal({
        instrument: sampleInstrument,
        candles: mockCandles,
      });

      expect(signal.symbol).toBe('frxEURUSD');
      expect(signal.dataFreshness.isStale).toBe(false);
      expect(signal.modelVersion).toBe('signal-engine-v1.0');
      // Verify guardrail enforced rejection if R:R is below 1:2.0
      if (signal.riskRewardRatio < 2.0 || signal.riskRewardRatio > 3.0) {
        expect(signal.status).toBe('REJECTED');
        expect(signal.rejectionReason).toBeDefined();
      } else {
        expect(signal.status).toBe('ACTIVE');
      }
    });

    it('flags signal as STALE when market data is empty or older than 120 seconds', () => {
      const signal = generateAiSignal({
        instrument: sampleInstrument,
        candles: [],
      });

      expect(signal.status).toBe('STALE');
      expect(signal.dataFreshness.isStale).toBe(true);
      expect(signal.rejectionReason).toContain('stale or missing');
    });
  });
});
