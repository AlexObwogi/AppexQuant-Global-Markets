/**
 * AppexQuant Markets Global - AI Signal Generator Bridge
 * Proxies signal creation to the centralized Phase 3 signalEngine.ts
 */

import { generateAISignal, getSignalAuditTrail } from './signalEngine';
import { MarketInstrument } from '../../types/market';
import { NormalizedCandle } from '../deriv/derivTypes';
import { UserStrategy, Signal } from '../../types/ai';

export interface GenerateSignalOptions {
  instrument: MarketInstrument;
  candles: NormalizedCandle[];
  strategy?: UserStrategy;
}

export function generateAiSignal(options: GenerateSignalOptions): Signal {
  return generateAISignal(options.instrument, options.candles, options.strategy);
}

export function getSignalAuditHistory(): Signal[] {
  return getSignalAuditTrail();
}
