import React, { useMemo } from 'react';
import { Target, AlertTriangle } from 'lucide-react';
import { evaluateConfluenceMatrix, ConfluenceMatrixResult } from '../../services/ai/confluenceEngine';
import { MarketInstrument } from '../../types/market';
import { NormalizedCandle } from '../../services/deriv/derivTypes';

interface ConfluenceSummaryProps {
  instrument: MarketInstrument | null;
  candles: NormalizedCandle[];
}

export const ConfluenceSummary: React.FC<ConfluenceSummaryProps> = ({ instrument, candles }) => {
  const confluence = useMemo(() => {
    if (!instrument || candles.length === 0) return null;
    // Using default/minimal strategy for evaluation
    return evaluateConfluenceMatrix(instrument, candles, candles, {
      description: 'Liquidity Sweep Strategy',
      sessionRestrictions: [],
      entryConditions: ['Displacement'],
      exitConditions: ['FVG Reached'],
      riskProfile: { maxRiskPerTradePct: 1.0, minRiskRewardRatio: 2.0 }
    } as any);
  }, [instrument, candles]);

  if (!confluence) return <div className="text-[11px] text-text-secondary">Waiting for data...</div>;

  return (
    <div className="space-y-3 font-mono">
      <h4 className="text-xs font-bold text-text-primary uppercase flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-accent-primary" /> Confluence: <span className="text-emerald-400">{confluence.grade}</span></h4>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        {Object.entries(confluence.evaluations).map(([key, val]) => (
            <div key={key} className="bg-bg-main p-1 rounded border border-border-color">
                <span className="block text-text-secondary uppercase">{key}</span>
                <span className="block text-text-primary">{val as string}</span>
            </div>
        ))}
      </div>
      <p className="text-[10px] text-text-secondary border-t border-border-color pt-2">{confluence.explanation}</p>
    </div>
  );
};
