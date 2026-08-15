import React, { useState } from 'react';
import { UserStrategy } from '../types/ai.ts';
import { ArrowLeft, Play, BarChart2, Search, Target, Shield, Clock, BookOpen, GitCommit, Settings, CheckCircle2, History } from 'lucide-react';
import { useGlobalState } from '../state/GlobalStateContext.tsx';
import { StrategyScannerModal } from '../components/strategy/StrategyScannerModal.tsx';

interface StrategyDetailViewProps {
  strategy: UserStrategy;
  onBack: () => void;
}

export const StrategyDetailView: React.FC<StrategyDetailViewProps> = ({ strategy, onBack }) => {
  const { dispatch } = useGlobalState();
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleNavigate = (route: any) => {
    dispatch({ type: 'SET_ROUTE', payload: route });
  };

  return (
    <div className="space-y-6 pb-12 text-text-primary">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-color pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-1.5 rounded bg-bg-hover hover:bg-border-color transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">{strategy.name}</h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-hover text-text-secondary">
                v{strategy.version}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-color-success/10 text-color-success border border-color-success/20">
                {strategy.status}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">{strategy.owner === 'User' ? 'Custom User Strategy' : 'System Strategy'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleNavigate('education')}
            className="px-3 py-1.5 rounded bg-bg-hover text-text-primary font-bold text-xs flex items-center gap-1.5 transition-colors border border-border-color"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Practice</span>
          </button>
          <button 
            onClick={() => handleNavigate('backtest')}
            className="px-3 py-1.5 rounded bg-bg-hover text-text-primary font-bold text-xs flex items-center gap-1.5 transition-colors border border-border-color"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Backtest</span>
          </button>
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="px-3 py-1.5 rounded bg-accent-primary/10 text-accent-primary font-bold text-xs flex items-center gap-1.5 transition-colors border border-accent-primary/20"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Scan Markets</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Core Rules */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-bg-surface border border-border-color rounded-lg p-5">
            <h2 className="text-sm font-bold flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-text-secondary" />
              Overview & Logic
            </h2>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              {strategy.description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold text-text-primary mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-color-success" />
                  Entry Conditions
                </h3>
                <ul className="space-y-1.5">
                  {strategy.entryConditions.map((c, i) => (
                    <li key={i} className="text-xs text-text-secondary flex items-start gap-1.5">
                      <span className="text-text-muted mt-0.5">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="text-xs font-bold text-text-primary mb-2 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-color-danger" />
                  Exit Conditions
                </h3>
                <ul className="space-y-1.5">
                  {strategy.exitConditions.map((c, i) => (
                    <li key={i} className="text-xs text-text-secondary flex items-start gap-1.5">
                      <span className="text-text-muted mt-0.5">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-bold text-text-primary mb-2 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-color-warning" />
                  Filters & Context
                </h3>
                <ul className="space-y-1.5">
                  {strategy.filters.map((c, i) => (
                    <li key={i} className="text-xs text-text-secondary flex items-start gap-1.5">
                      <span className="text-text-muted mt-0.5">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Historical Match Example - Optional mockup */}
          <div className="bg-bg-surface border border-border-color rounded-lg p-5">
            <h2 className="text-sm font-bold flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-text-secondary" />
              Historical AI Analysis
            </h2>
            <div className="p-4 bg-bg-hover rounded border border-border-color flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-primary/10 flex items-center justify-center shrink-0">
                <BarChart2 className="w-5 h-5 text-accent-primary" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-text-primary">Performance Characteristics</h3>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  Historical backtesting across compatible instruments suggests this strategy performs optimally in high-volatility environments. It typically yields a {strategy.riskProfile.minRiskRewardRatio}R to {strategy.riskProfile.maxRiskRewardRatio}R reward ratio when entry conditions are strictly met.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Parameters & Meta */}
        <div className="space-y-6">
          <div className="bg-bg-surface border border-border-color rounded-lg p-5 space-y-5">
            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase mb-2">Market Compatibility</h3>
              <div className="flex flex-wrap gap-1.5">
                {strategy.symbols.map(s => (
                  <span key={s} className="px-2 py-1 rounded bg-bg-hover text-[11px] font-mono border border-border-color">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase mb-2">Timeframes</h3>
              <div className="flex flex-wrap gap-1.5">
                {strategy.timeframes.map(s => (
                  <span key={s} className="px-2 py-1 rounded bg-bg-hover text-[11px] font-mono border border-border-color">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase mb-2">Session Restrictions</h3>
              <div className="flex flex-wrap gap-1.5">
                {strategy.sessionRestrictions.map(s => (
                  <span key={s} className="px-2 py-1 rounded bg-bg-hover text-[11px] border border-border-color">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-bg-surface border border-border-color rounded-lg p-5">
            <h2 className="text-sm font-bold flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-text-secondary" />
              Risk Model
            </h2>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Max Risk/Trade:</span>
                <span className="text-color-danger font-bold">{strategy.riskProfile.maxRiskPerTradePct}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Min R:R:</span>
                <span className="text-text-primary">1:{strategy.riskProfile.minRiskRewardRatio}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Stop Loss:</span>
                <span className="text-text-primary">{strategy.riskProfile.stopLossPipsOrPct} pips/pct</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Max Positions:</span>
                <span className="text-text-primary">{strategy.maxPositions}</span>
              </div>
            </div>
          </div>

          {strategy.versionHistory.length > 0 && (
            <div className="bg-bg-surface border border-border-color rounded-lg p-5">
              <h2 className="text-sm font-bold flex items-center gap-2 mb-3">
                <GitCommit className="w-4 h-4 text-text-secondary" />
                Version History
              </h2>
              <div className="space-y-3">
                {strategy.versionHistory.map(v => (
                  <div key={v.version} className="flex items-start justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold">v{v.version}</span>
                      <span className="text-text-muted ml-2">{new Date(v.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <span className="text-text-secondary">{v.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {isScannerOpen && (
        <StrategyScannerModal 
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          strategy={strategy}
        />
      )}
    </div>
  );
};
