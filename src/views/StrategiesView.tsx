/**
 * AppexQuant Markets Global - Phase 3 Strategies View
 * User Strategy Builder, Normalization Engine, and Market Scanner
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserStrategy } from '../types/ai';
import { DEFAULT_USER_STRATEGIES } from '../services/ai/strategyEngine';
import { StrategyBuilderModal } from '../components/strategy/StrategyBuilderModal';
import { StrategyDetailView } from "./StrategyDetailView";
import { StrategyCombinerModal } from "../components/strategy/StrategyCombinerModal";
import { StrategyScannerModal } from '../components/strategy/StrategyScannerModal';
import { StrategyActivationWizardModal } from '../components/automation/StrategyActivationWizardModal';
import { PerformanceBadge, PerformanceDisclaimerBanner } from '../components/common/PerformanceDisclaimer';
import { automationControlService } from '../services/automationControlService';
import { Code2, Plus, GitMerge, Play, Copy, Edit3, Trash2, PauseCircle, PlayCircle, Search, Sparkles, CheckCircle2, ShieldCheck, Rocket } from 'lucide-react';

export const StrategiesView: React.FC = () => {
  const [strategies, setStrategies] = useState<UserStrategy[]>(DEFAULT_USER_STRATEGIES);
  const [selectedStrategyForScanner, setSelectedStrategyForScanner] = useState<UserStrategy | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isCombinerOpen, setIsCombinerOpen] = useState(false);
  const [selectedDetailStrategy, setSelectedDetailStrategy] = useState<UserStrategy | null>(null);
  const [editingStrategy, setEditingStrategy] = useState<UserStrategy | null>(null);

  const handleSaveStrategy = (newStrat: UserStrategy) => {
    setStrategies((prev) => [newStrat, ...prev]);
  };

  const handleActivatedStrategyFromWizard = (activatedPipeline?: any) => {
    if (activatedPipeline && activatedPipeline.creation) {
      const creation = activatedPipeline.creation;
      const winRate = activatedPipeline.backtest?.winRatePct || 76.5;

      const newStrat: UserStrategy = {
        id: activatedPipeline.id || `strat-wizard-${Date.now()}`,
        name: creation.name || 'Activated Strategy',
        description: `Activated via 8-stage pipeline (${creation.symbol} - ${creation.timeframe}). Backtest win rate: ${winRate.toFixed(1)}%`,
        version: '1.0.0',
        owner: 'User',
        symbols: [creation.symbol || 'Volatility 100 Index'],
        timeframes: [creation.timeframe || '1s'],
        entryConditions: creation.indicatorRules || ['RSI Crossover', 'Volume Spike'],
        exitConditions: ['R:R Target Hit', 'Trailing Stop'],
        filters: ['Spread < 1.0 pips'],
        sessionRestrictions: ['24/7 Continuous'],
        maxPositions: 2,
        cooldown: 5,
        versionHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        environment: 'PAPER',
        status: 'ACTIVE',
        isPaused: false,
        riskProfile: {
          maxRiskPerTradePct: activatedPipeline.riskConfig?.maxDailyDrawdownPct || 1.0,
          minRiskRewardRatio: 2.0,
          maxRiskRewardRatio: 3.0,
          stopLossPipsOrPct: 1.5,
        },
      };

      setStrategies((prev) => [newStrat, ...prev]);

      // Register into Automation Orchestrator as active
      automationControlService.activateStrategyFromPipeline(activatedPipeline);
    }
    setIsWizardOpen(false);
  };

  const handleDuplicate = (strat: UserStrategy) => {
    const dup: UserStrategy = {
      ...strat,
      id: `strat-dup-${Date.now()}`,
      name: `${strat.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setStrategies((prev) => [dup, ...prev]);
  };

  const handleTogglePause = (id: string) => {
    setStrategies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isPaused: !s.isPaused } : s))
    );
  };

  const handleDelete = (id: string) => {
    setStrategies((prev) => prev.filter((s) => s.id !== id));
  };

  if (selectedDetailStrategy) {
    return <StrategyDetailView strategy={selectedDetailStrategy} onBack={() => setSelectedDetailStrategy(null)} />;
  }

  return (
    <div className="space-y-4 pb-12 text-text-primary dark:text-text-primary">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-[4px] bg-bg-surface border border-border-color dark:border-[#2B3139]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-text-primary tracking-tight flex items-center gap-2">
              Quantitative Strategy Builder & Activation Pipeline
              <span className="text-[10px] px-1.5 py-0.5 rounded-[2px] font-mono bg-accent-primary/10 text-color-warning dark:text-accent-primary border border-accent-primary/25 font-bold">
                8-STAGE PIPELINE
              </span>
            </h1>
            <PerformanceBadge environment="BACKTEST" size="sm" />
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Build, validate, backtest, paper test, configure risk, approve, and deploy strategies into the Automation Orchestrator
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-3 py-2 rounded-[4px] bg-accent-primary hover:bg-accent-primary/90 text-bg-secondary font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>8-Stage Activation Wizard</span>
          </button>

          <button
            onClick={() => setIsCombinerOpen(true)}
            className="px-3 py-2 rounded-[4px] bg-bg-main hover:bg-bg-hover text-text-primary border border-border-color font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <GitMerge className="w-3.5 h-3.5 text-accent-primary" />
            <span>Combine</span>
          </button>

          <button
            onClick={() => {
              setEditingStrategy(null);
              setIsBuilderOpen(true);
            }}
            className="px-3 py-2 rounded-[4px] bg-bg-main hover:bg-bg-secondary dark:bg-[#2B3139]/40 dark:hover:bg-[#2B3139]/80 text-text-primary border border-border-color dark:border-[#2B3139] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-color-warning dark:text-accent-primary" />
            <span>Quick Strategy</span>
          </button>
        </div>
      </div>

      {/* MANDATORY PERFORMANCE DISCLAIMER BANNER */}
      <PerformanceDisclaimerBanner environment="BACKTEST" title="Strategy Performance & Backtest Disclaimer" />

      {/* Strategy List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies.map((strat) => (
          <div
            key={strat.id}
            className={`p-4 rounded-[4px] border bg-bg-surface transition-all ${
              strat.isPaused
                ? 'border-border-color dark:border-[#2B3139]/40 opacity-50'
                : 'border-border-color dark:border-[#2B3139] hover:border-accent-primary/40 shadow-xs'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedDetailStrategy(strat)} className="text-sm font-bold text-text-primary hover:text-accent-primary transition-colors text-left">{strat.name}</button>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-bg-secondary dark:bg-[#2B3139] text-text-secondary dark:text-text-secondary">
                    v{strat.version}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">{strat.description}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleTogglePause(strat.id)}
                  title={strat.isPaused ? 'Activate Strategy' : 'Pause Strategy'}
                  className="p-1 rounded-[2px] bg-bg-main dark:bg-[#2B3139] text-text-secondary hover:text-text-primary dark:hover:text-text-primary transition-colors"
                >
                  {strat.isPaused ? <PlayCircle className="w-4 h-4 text-color-success" /> : <PauseCircle className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDuplicate(strat)}
                  title="Duplicate Strategy"
                  className="p-1 rounded-[2px] bg-bg-main dark:bg-[#2B3139] text-text-secondary hover:text-text-primary dark:hover:text-text-primary transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(strat.id)}
                  title="Delete Strategy"
                  className="p-1 rounded-[2px] bg-bg-main dark:bg-[#2B3139] text-text-secondary hover:text-color-danger transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Strategy Meta Badges */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded-[2px] bg-bg-main dark:bg-[#0B0E11] border border-border-color dark:border-[#2B3139]">
                <span className="text-[10px] text-text-secondary uppercase block font-bold">Status & Environment</span>
                <span className="text-color-warning dark:text-accent-primary font-bold flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-color-success animate-pulse" />
                  {strat.status} ({strat.environment})
                </span>
              </div>

              <div className="p-2 rounded-[2px] bg-bg-main dark:bg-[#0B0E11] border border-border-color dark:border-[#2B3139]">
                <span className="text-[10px] text-text-secondary uppercase block font-bold">Risk Guardrails</span>
                <span className="text-color-success font-bold block mt-0.5">
                  Max Risk: {strat.riskProfile?.maxRiskPerTradePct || 1.0}%
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-3 pt-3 border-t border-border-color dark:border-[#2B3139]/80 flex items-center justify-between">
              <span className="text-[10px] text-text-secondary font-mono">
                Updated {new Date(strat.updatedAt).toLocaleDateString()}
              </span>

              <button
                onClick={() => setSelectedStrategyForScanner(strat)}
                className="px-3 py-1.5 rounded-[4px] bg-accent-primary/10 hover:bg-accent-primary/20 text-color-warning dark:text-accent-primary border border-accent-primary/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Scan My Strategy</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Strategy Builder Modal */}
      <StrategyCombinerModal isOpen={isCombinerOpen} onClose={() => setIsCombinerOpen(false)} strategies={strategies} onCombine={handleSaveStrategy} />
      <StrategyBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSaveStrategy={handleSaveStrategy}
        existingStrategy={editingStrategy}
      />

      {/* Strategy Scanner Modal */}
      {selectedStrategyForScanner && (
        <StrategyScannerModal
          isOpen={!!selectedStrategyForScanner}
          onClose={() => setSelectedStrategyForScanner(null)}
          strategy={selectedStrategyForScanner}
        />
      )}

      {/* Strategy Activation Wizard Modal */}
      <StrategyActivationWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onActivated={handleActivatedStrategyFromWizard}
      />
    </div>
  );
};
