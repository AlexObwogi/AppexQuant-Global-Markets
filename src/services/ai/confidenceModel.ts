/**
 * AppexQuant Markets Global - Phase 3 Deterministic Confidence Engine
 * Calculates explainable, itemized confidence score (0 - 100%) from multi-dimensional evidence inputs.
 */

import { ConfidenceBreakdown, MarketStructureType, NewsSentimentType } from '../../types/ai';

export interface ConfidenceInput {
  marketStructure: MarketStructureType;
  direction: 'LONG' | 'SHORT';
  patternConfidence: number; // 0 - 100
  sentiment: NewsSentimentType;
  dxyAligned: boolean;
  volatilitySuitability: boolean;
  dataQualityScore: number; // 0 - 100
  isDataStale: boolean;
}

export function calculateDeterministicConfidence(input: ConfidenceInput): {
  totalConfidence: number;
  breakdown: ConfidenceBreakdown;
  hasConflicts: boolean;
} {
  let structurePoints = 0;
  let patternPoints = 0;
  let sentimentPoints = 0;
  let dxyPoints = 0;
  let volatilityPoints = 0;
  let dataQualityPoints = 0;
  let conflictPenalty = 0;

  // 1. Market Structure Score (+22 max)
  if (
    (input.direction === 'LONG' && input.marketStructure === 'BULLISH') ||
    (input.direction === 'SHORT' && input.marketStructure === 'BEARISH')
  ) {
    structurePoints = 22;
  } else if (input.marketStructure === 'BREAKOUT_PENDING') {
    structurePoints = 16;
  } else if (input.marketStructure === 'RANGING') {
    structurePoints = 10;
  } else {
    conflictPenalty += 15; // Structural conflict
  }

  // 2. Pattern Quality Score (+20 max)
  patternPoints = Math.round((input.patternConfidence / 100) * 20);

  // 3. Sentiment Alignment Score (+15 max)
  if (
    (input.direction === 'LONG' && input.sentiment === 'BULLISH') ||
    (input.direction === 'SHORT' && input.sentiment === 'BEARISH')
  ) {
    sentimentPoints = 15;
  } else if (input.sentiment === 'NEUTRAL' || input.sentiment === 'UNKNOWN') {
    sentimentPoints = 8;
  } else if (input.sentiment === 'MIXED') {
    sentimentPoints = 5;
    conflictPenalty += 5;
  } else {
    // Direct sentiment opposition
    conflictPenalty += 12;
  }

  // 4. DXY Macro Alignment (+15 max)
  if (input.dxyAligned) {
    dxyPoints = 15;
  } else {
    conflictPenalty += 8;
  }

  // 5. Volatility Suitability (+14 max)
  if (input.volatilitySuitability) {
    volatilityPoints = 14;
  } else {
    volatilityPoints = 5;
  }

  // 6. Data Quality & Freshness (+14 max)
  if (!input.isDataStale) {
    dataQualityPoints = Math.round((input.dataQualityScore / 100) * 14);
  } else {
    dataQualityPoints = 2;
    conflictPenalty += 20; // Stale data penalty
  }

  const rawSum =
    structurePoints +
    patternPoints +
    sentimentPoints +
    dxyPoints +
    volatilityPoints +
    dataQualityPoints -
    conflictPenalty;

  const totalConfidence = Math.max(0, Math.min(99, Math.round(rawSum)));
  const hasConflicts = conflictPenalty > 10;

  return {
    totalConfidence,
    breakdown: {
      marketStructure: structurePoints,
      patternSimilarity: patternPoints,
      sentimentAlignment: sentimentPoints,
      dxyAlignment: dxyPoints,
      volatilitySuitability: volatilityPoints,
      dataQuality: dataQualityPoints,
      conflictPenalty,
      totalScore: totalConfidence,
    },
    hasConflicts,
  };
}
