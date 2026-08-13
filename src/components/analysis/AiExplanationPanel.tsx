import React, { useState, useEffect } from 'react';
import { Brain, Sparkles } from 'lucide-react';
import { analyzeMarketWithGemini } from '../../services/ai/geminiBridge';
import { MarketInstrument } from '../../types/market';
import { NormalizedCandle } from '../../services/deriv/derivTypes';

interface AiExplanationPanelProps {
  instrument: MarketInstrument | null;
  candles: NormalizedCandle[];
}

export const AiExplanationPanel: React.FC<AiExplanationPanelProps> = ({ instrument, candles }) => {
  const [analysis, setAnalysis] = useState<string>('Generating AI insight...');

  useEffect(() => {
    if (!instrument || candles.length === 0) return;
    const lastPrice = candles[candles.length - 1]?.close || 0;
    
    analyzeMarketWithGemini(
      instrument.symbol,
      `Market context: Price at ${lastPrice}. Structure appears volatile.`,
      'Institutional Liquidity Sweep Strategy'
    ).then(res => setAnalysis(res.text));
  }, [instrument, candles]);

  return (
    <div className="space-y-2 font-mono">
      <h4 className="text-xs font-bold text-text-primary uppercase flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 text-accent-primary" /> AI Explanation</h4>
      <div className="text-[11px] text-text-secondary leading-relaxed p-2 bg-bg-main rounded border border-border-color whitespace-pre-line">{analysis}</div>
    </div>
  );
};
