/**
 * AppexQuant Markets Global - Server-Side AI Quantitative Strategy Builder
 * Translates natural language into strategy rules and provides rich explanation/validation metadata.
 */

import { GoogleGenAI, Type } from '@google/genai';

export interface AISuggestionResult {
  strategyDefinition: {
    name: string;
    description: string;
    symbols: string[];
    timeframes: string[];
    markets: string[];
    preferredSessions: string[];
  };
  conditions: {
    entry: string[];
    exit: string[];
    filters: string[];
  };
  parameters: {
    maxRiskPerTradePct: number;
    stopLossPipsOrPct: number;
    maxPositions: number;
    cooldown: number; // minutes
  };
  riskConstraints: {
    maxDrawdownLimitPct: number;
    maxConsecutiveLossesLimit: number;
  };
  assumptions: string[];
  warnings: string[];
  confidence: number;
  validationStatus: string;
  explanation: {
    whyThisStrategyExists: string;
    assumptions: string;
    knownLimitations: string;
    risks: string;
  };
  ambiguousConditions: {
    term: string;
    explanation: string;
    suggestion: string;
  }[];
  missingParameters: {
    param: string;
    suggestion: string;
    defaultValue: string;
  }[];
  variants: {
    name: string;
    description: string;
    riskMultiplier: number;
    parameterChanges: string;
  }[];
  contradictionsDetected?: {
    issue: string;
    resolution: string;
  }[];
}

export interface ContradictionIssue {
  issue: string;
  resolution: string;
}

export function analyzeContradictionsAndAmbiguities(prompt: string) {
  const clean = prompt.toLowerCase();
  const contradictions: ContradictionIssue[] = [];
  const ambiguities: { term: string; explanation: string; suggestion: string }[] = [];

  // Contradiction Checks
  if (clean.includes("zero risk") || clean.includes("no risk") || clean.includes("risk free")) {
    contradictions.push({
      issue: "Claiming 'zero risk' while targeting high returns.",
      resolution: "All financial markets contain structural risk. Normalize the strategy with a strict 1.0% max risk threshold."
    });
  }

  if (clean.includes("scalp") && (clean.includes("h4") || clean.includes("daily") || clean.includes("d1"))) {
    contradictions.push({
      issue: "Combining high-timeframe (H4/D1) swing indicators with low-timeframe 'scalp' execution.",
      resolution: "Re-align execution: either scalp on M1-M15 charts or redefine trade horizon as 'Swing Trading'."
    });
  }

  if (clean.includes("swing") && clean.includes("m1") && !clean.includes("m15")) {
    contradictions.push({
      issue: "Combining ultra-low timeframe (M1) feed with a multi-day 'swing' strategy.",
      resolution: "Use M15 for execution entry triggers while retaining H4 for structural swing bias."
    });
  }

  if (clean.includes("overbought") && clean.includes("oversold") && (clean.includes("same time") || clean.includes("simultaneous"))) {
    contradictions.push({
      issue: "Simultaneous overbought and oversold condition requirement.",
      resolution: "Separate logic into directional bias: buy on oversold pool rejections and sell on overbought pool sweeps."
    });
  }

  if (clean.includes("martingale") || (clean.includes("risk") && (clean.includes("10%") || clean.includes("20%")))) {
    contradictions.push({
      issue: "Extremely high risk per trade (>2.0%) or martingale multiplication.",
      resolution: "Cap maximum risk per trade at a strict institutional limit of 2.0% with deterministic stop-losses."
    });
  }

  // Ambiguity Checks
  if (clean.includes("when price drops") || clean.includes("price is low") || clean.includes("drop fast")) {
    ambiguities.push({
      term: "price drops / low price",
      explanation: "Vague description of entry threshold without mathematical validation.",
      suggestion: "Identify entry trigger as: Close price falls below lower Bollinger Band (20, 2) or previous swing low."
    });
  }

  if (clean.includes("recent") || clean.includes("local peak") || clean.includes("high point")) {
    ambiguities.push({
      term: "recent / local peak",
      explanation: "Lacks defined bar lookback window.",
      suggestion: "Define peak as: Highest high of the past 20 candles (20-period Donchian Channel limit)."
    });
  }

  if (clean.includes("a long time") || clean.includes("slow trend")) {
    ambiguities.push({
      term: "a long time / slow trend",
      explanation: "Subjective trend classification.",
      suggestion: "Quantify bias using a 200-period Exponential Moving Average (EMA) to filter trend direction."
    });
  }

  return { contradictions, ambiguities };
}

/**
 * High-fidelity fallback engine when Gemini is unavailable or quota-exhausted
 */
function getDeterministicFallback(prompt: string): AISuggestionResult {
  const clean = prompt.toLowerCase();
  const { contradictions, ambiguities } = analyzeContradictionsAndAmbiguities(prompt);
  
  let name = "AI Breakout Continuation Strategy";
  let description = "Automatically generated strategy targeting market breakouts and momentum persistence.";
  let entry = ["Candle close outside 20-period Donchian Channel", "RSI momentum indicator above 55"];
  let exit = ["Trailing stop triggered at 2.5x ATR distance", "Opposing market structure breakout close"];
  let filters = ["ATR volatility expansion exceeds 1.2x average", "London/New York active trading session"];
  let stopLoss = 25;
  let maxRisk = 1.0;
  
  if (clean.includes("gold") || clean.includes("xau")) {
    name = "AI Gold Volatility Swing Strategist";
    description = "Custom precious metals swing strategy targeting swing high/low sweeps in Gold.";
    entry = ["Price sweeps previous 12-hour swing high/low limit", "Pin bar or Engulfing candlestick confirmation on M15"];
    exit = ["Take profit hit at 1:3.0 Risk/Reward boundary", "Counter-trend trendline breach"];
    filters = ["Daily volume exceeds 30-day moving average", "Avoid major macroeconomic news release within 30m"];
    stopLoss = 35;
    maxRisk = 1.5;
  } else if (clean.includes("reversal") || clean.includes("sweep") || clean.includes("rsi")) {
    name = "AI Mean Reversion Sweeper";
    description = "Trades sweeps of extreme liquid zones with high momentum mean reversion.";
    entry = ["Liquidity swept outside yesterday's swing high or low", "RSI extreme overbought (>75) or oversold (<25) condition"];
    exit = ["Target hit at 1:2.0 Risk/Reward", "Momentum reversal or candle close opposite outer band"];
    filters = ["Avoid trading inside major ranging bands", "Exclude high-impact economic news within 45m"];
    stopLoss = 15;
    maxRisk = 1.0;
  }

  return {
    strategyDefinition: {
      name,
      description,
      symbols: clean.includes("gold") ? ["XAUUSD"] : ["EURUSD", "GBPUSD"],
      timeframes: ["M15", "H1"],
      markets: clean.includes("gold") ? ["COMMODITIES", "FOREX"] : ["FOREX"],
      preferredSessions: ["LONDON", "NEW_YORK"]
    },
    conditions: {
      entry,
      exit,
      filters
    },
    parameters: {
      maxRiskPerTradePct: maxRisk,
      stopLossPipsOrPct: stopLoss,
      maxPositions: 3,
      cooldown: 20
    },
    riskConstraints: {
      maxDrawdownLimitPct: 12.0,
      maxConsecutiveLossesLimit: 6
    },
    assumptions: [
      "Market volatility expands in London and New York session overlaps.",
      "Macro trends remain stable across selected timeframes."
    ],
    warnings: [
      "⚠️ Slippage during extreme high-impact news can distort results.",
      "⚠️ Over-leveraging beyond 2% risk violates general risk controls.",
      ...contradictions.map(c => `⚠️ CONTRADICTION DETECTED: ${c.issue} | Resolution: ${c.resolution}`)
    ],
    confidence: 85,
    validationStatus: "DRAFT_PENDING_BACKTEST",
    explanation: {
      whyThisStrategyExists: "Designed to capture high-probability directional momentum when indicators align, minimizing exposure to sideways noise.",
      assumptions: "Assumes high-liquidity environments with clear trend boundaries. Spreads remain tight during execution.",
      knownLimitations: "May experience consecutive small losses in tight range-bound consolidations.",
      risks: "Volatility contractions may trigger false breakouts and trigger stop losses prematurely."
    },
    ambiguousConditions: ambiguities.length > 0 ? ambiguities : [
      {
        term: "breakout",
        explanation: "User mentioned 'breakout' without specifying boundary duration.",
        suggestion: "Use the 20-period Donchian Channel upper and lower limits as the standard breakout benchmark."
      }
    ],
    missingParameters: [
      {
        param: "Stop Loss level",
        suggestion: "Default to 20-35 pips based on asset volatility and timeframes.",
        defaultValue: "25 pips"
      }
    ],
    variants: [
      {
        name: "Conservative Version",
        description: "Reduces risk to 0.5% per trade with tighter stop-loss distance.",
        riskMultiplier: 0.5,
        parameterChanges: "maxRiskPerTradePct = 0.5, stopLossPipsOrPct = 15"
      },
      {
        name: "Aggressive Version",
        description: "Increases risk to 1.5% with wider trailing stop to capture larger waves.",
        riskMultiplier: 1.5,
        parameterChanges: "maxRiskPerTradePct = 1.5, stopLossPipsOrPct = 40"
      }
    ],
    contradictionsDetected: contradictions
  };
}

/**
 * Connects to Gemini API to translate a natural language strategy into a structured quantitative framework.
 */
export async function buildStrategyWithAI(prompt: string): Promise<AISuggestionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[AIStrategyBuilder] No GEMINI_API_KEY found, falling back to deterministic builder');
    return getDeterministicFallback(prompt);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const systemInstruction = `You are an elite quantitative trading systems architect and AI risk specialist for AppexQuant Markets Global.
Translate natural language prompts into a structured algorithmic trading strategy represented as structured JSON.

MANDATORY SAFETY BOUNDARIES:
- Never guarantee profits, win rates, or claim trading carries zero risk.
- Ensure the strategy adheres to professional risk metrics: risk per trade <= 2%, stop losses always defined, and risk-reward ratios >= 2.0.
- Highlight overfitting conditions, curve-fitting warnings, news volatility, and spread assumptions.
- Identify terms in the prompt that are ambiguous (e.g. "when price drops", "a long time", "fast trend") and provide clear mathematical clarifications.
- Suggest missing parameters necessary for deterministic execution.
- Provide a conservative and an aggressive variant of the strategy for side-by-side comparison.

Return ONLY a single valid JSON object following this exact schema:
{
  "strategyDefinition": {
    "name": "string (professional quant name, e.g. 'Institutional Swing Sweeper')",
    "description": "string (clear overview of the mechanics)",
    "symbols": ["string array of representative symbols, e.g. 'EURUSD', 'GBPUSD', 'XAUUSD'"],
    "timeframes": ["string array of timeframes, e.g. 'M15', 'H1'"],
    "markets": ["string array: 'FOREX', 'COMMODITIES', or 'SYNTHETICS'"],
    "preferredSessions": ["string array: 'LONDON', 'NEW_YORK', 'TOKYO'"]
  },
  "conditions": {
    "entry": ["string array of specific entry conditions"],
    "exit": ["string array of specific exit conditions"],
    "filters": ["string array of trend/volatility filters"]
  },
  "parameters": {
    "maxRiskPerTradePct": number (between 0.1 and 2.0),
    "stopLossPipsOrPct": number (suggested stop loss, typically 10 to 50),
    "maxPositions": number (suggested 1 to 5),
    "cooldown": number (suggested cooldown in minutes, 10 to 60)
  },
  "riskConstraints": {
    "maxDrawdownLimitPct": number (drawdown invalidation limit, e.g. 10 to 15),
    "maxConsecutiveLossesLimit": number (e.g. 4 to 8)
  },
  "assumptions": ["string array of structural market assumptions"],
  "warnings": ["string array of concrete risks, including high-impact news, slippage, and curve-fitting risks"],
  "confidence": number (confidence level in the strategy logic, e.g. 50 to 95),
  "validationStatus": "DRAFT_PENDING_BACKTEST",
  "explanation": {
    "whyThisStrategyExists": "string (the quantitative thesis or anomaly targeted)",
    "assumptions": "string (the market behavior required, e.g. low spreads, trend following)",
    "knownLimitations": "string (where it performs poorly, e.g. low-volume range)",
    "risks": "string (primary causes of capital degradation, e.g. news whipsaws)"
  },
  "ambiguousConditions": [
    {
      "term": "string (the vague term used, e.g. 'quick drop')",
      "explanation": "string (why it is ambiguous for a machine code engine)",
      "suggestion": "string (how to normalize it, e.g. 'RSI drops below 20 in 3 bars')"
    }
  ],
  "missingParameters": [
    {
      "param": "string (e.g. 'cooldown')",
      "suggestion": "string (why it is needed)",
      "defaultValue": "string (e.g. '15 minutes')"
    }
  ],
  "variants": [
    {
      "name": "string (e.g. 'Conservative v1.1')",
      "description": "string",
      "riskMultiplier": number,
      "parameterChanges": "string (e.g. 'maxRiskPerTradePct = 0.5%')"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Translate and analyze this natural language strategy prompt: "${prompt}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const text = response.text?.trim() || '';
    if (!text) {
      throw new Error('Gemini returned an empty response');
    }

    const parsed: AISuggestionResult = JSON.parse(text);
    return parsed;
  } catch (error: any) {
    console.error('[AIStrategyBuilder] Gemini strategy building failed, falling back:', error?.message || error);
    return getDeterministicFallback(prompt);
  }
}
