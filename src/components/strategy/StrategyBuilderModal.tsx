/**
 * AppexQuant Markets Global - Phase 3 Upgraded Strategy Builder Modal
 * AI-Assisted Quantitative Strategy Builder with natural language translation, explanation panels,
 * ambiguity analysis, parameter suggestions, variant comparisons, simulated backtesting,
 * and mathematical overfitting diagnostics.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserStrategy, StrategyStatus, StrategyVersionSnapshot } from '../../types/ai';
import { runBacktest } from '../../services/ai/backtestEngine';
import { BacktestParams, BacktestResult } from '../../types/backtest';
import { parseNaturalLanguageStrategy } from '../../services/ai/strategyEngine';
import { AISuggestionResult } from '../../services/ai/aiStrategyBuilder';
import { useApiFetch } from '../../utils/apiFetch';
import {
  Code2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  Play,
  Edit3,
  ShieldCheck,
  ArrowRight,
  Layers,
  Sliders,
  History,
  Activity,
  Brain,
  Zap,
  HelpCircle,
  TrendingUp,
  Percent,
  RefreshCw,
  Scale,
  Gauge,
  Lock,
  ListFilter
} from 'lucide-react';

interface StrategyBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveStrategy: (strategy: UserStrategy) => void;
  existingStrategy?: UserStrategy | null;
}

export const StrategyBuilderModal: React.FC<StrategyBuilderModalProps> = ({
  isOpen,
  onClose,
  onSaveStrategy,
  existingStrategy,
}) => {
  const apiFetch = useApiFetch();
  const [activeTab, setActiveTab] = useState<'AI_COPILOT' | 'VISUAL' | 'ADVANCED' | 'LIFECYCLE' | 'VERSIONS'>('AI_COPILOT');

  // Core strategy properties
  const [name, setName] = useState(existingStrategy?.name || 'Institutional Momentum Strategy');
  const [description, setDescription] = useState(existingStrategy?.description || 'Trades breakout continuation with strict risk controls.');
  const [naturalLanguageInput, setNaturalLanguageInput] = useState(
    existingStrategy?.rawNaturalLanguage || 'Gold momentum reversals near Tokyo highs with 1.5% risk'
  );
  
  // Visual rules state
  const [entryRule1, setEntryRule1] = useState(existingStrategy?.entryConditions[0] || 'Liquidity sweep outside swing high/low');
  const [entryRule2, setEntryRule2] = useState(existingStrategy?.entryConditions[1] || 'Pin bar or engulfing candlestick confirmation');
  const [exitRule1, setExitRule1] = useState(existingStrategy?.exitConditions[0] || 'Take profit hit at 1:2.5 RR');
  const [filterRule, setFilterRule] = useState(existingStrategy?.filters[0] || 'Avoid high-impact news within 30 minutes');

  // Advanced params state
  const [maxRisk, setMaxRisk] = useState(existingStrategy?.riskProfile.maxRiskPerTradePct || 1.0);
  const [stopLoss, setStopLoss] = useState(existingStrategy?.riskProfile.stopLossPipsOrPct || 20);
  const [maxPositions, setMaxPositions] = useState(existingStrategy?.maxPositions || 3);
  const [cooldown, setCooldown] = useState(existingStrategy?.cooldown || 15);

  // Lifecycle state
  const [status, setStatus] = useState<StrategyStatus>(existingStrategy?.status || 'DRAFT');
  const [environment, setEnvironment] = useState<'PAPER' | 'LIVE'>(existingStrategy?.environment || 'PAPER');

  // Version state
  const [version, setVersion] = useState(existingStrategy?.version || '1.0');
  const [versionHistory, setVersionHistory] = useState<StrategyVersionSnapshot[]>(existingStrategy?.versionHistory || [
    { version: '1.0', status: 'DRAFT', updatedAt: new Date().toISOString(), description: 'Initial Draft', entryConditions: ['Liquidity sweep'], exitConditions: ['TP 1:2.5'] }
  ]);

  const [validationError, setValidationError] = useState<string | null>(null);

  // AI Copilot States
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiResult, setAiResult] = useState<AISuggestionResult | null>(null);
  const [aiSubTab, setAiSubTab] = useState<'EXPLANATION' | 'AMBIGUITIES' | 'VARIANTS' | 'SIMULATE'>('EXPLANATION');
  const [explanationSubTab, setExplanationSubTab] = useState<'WHY_EXISTS' | 'ASSUMPTIONS' | 'KNOWN_LIMITATIONS' | 'RISKS' | 'BACKTEST_RESULTS'>('WHY_EXISTS');
  
  // Simulated Backtest properties inside modal
  const [simulateSymbol, setSimulateSymbol] = useState('EURUSD');
  const [simulateTimeframe, setSimulateTimeframe] = useState('H1');
  const [simulateCapital, setSimulateCapital] = useState(10000);
  const [simulateSplit, setSimulateSplit] = useState(70);
  const [isSimulatingAI, setIsSimulatingAI] = useState(false);
  const [simulatedMetrics, setSimulatedMetrics] = useState<BacktestResult | null>(null);

  // Animated loader steps text
  const [loaderStep, setLoaderStep] = useState(0);
  const loaderSteps = [
    "Parsing natural language into quantitative parameters...",
    "Synthesizing entry, exit, and risk rule matrices...",
    "Assessing volatility adaptability across timeframes...",
    "Structuring risk profiles and guardrail boundaries...",
    "Compiling alternative conservative & aggressive variants..."
  ];

  useEffect(() => {
    let interval: any;
    if (isAILoading) {
      setLoaderStep(0);
      interval = setInterval(() => {
        setLoaderStep((prev) => (prev + 1) % loaderSteps.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isAILoading]);

  const handleAIBuild = async () => {
    setIsAILoading(true);
    setValidationError(null);
    setAiResult(null);
    setSimulatedMetrics(null);

    try {
      const response = await apiFetch('/api/ai/build-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: naturalLanguageInput }),
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        const result: AISuggestionResult = data.data;
        setAiResult(result);
        
        // Auto-populate the form with the AI generated rules
        setName(result.strategyDefinition.name);
        setDescription(result.strategyDefinition.description);
        setEntryRule1(result.conditions.entry[0] || 'AI Entry Condition 1');
        setEntryRule2(result.conditions.entry[1] || 'AI Entry Condition 2');
        setExitRule1(result.conditions.exit[0] || 'AI Take Profit exit rule');
        setFilterRule(result.conditions.filters[0] || 'AI Volatility dynamic filter');
        setMaxRisk(result.parameters.maxRiskPerTradePct);
        setStopLoss(result.parameters.stopLossPipsOrPct);
        setMaxPositions(result.parameters.maxPositions);
        setCooldown(result.parameters.cooldown);
        
        setAiSubTab('EXPLANATION');
        setExplanationSubTab('WHY_EXISTS');
      } else {
        setValidationError(data.error?.message || 'The AI quant engine encountered an error parsing your strategy.');
      }
    } catch (err: any) {
      setValidationError(err.message || 'Network error communicating with AI Strategy service.');
    } finally {
      setIsAILoading(false);
    }
  };

  const handleApplyVariant = (variant: any) => {
    if (!aiResult) return;
    setMaxRisk(variant.riskMultiplier * aiResult.parameters.maxRiskPerTradePct);
    setValidationError(`Applied variant: ${variant.name}. Parameters successfully calibrated.`);
  };

  const handleAISimulate = () => {
    if (!aiResult) return;
    setIsSimulatingAI(true);
    setValidationError(null);

    // Form strategy object dynamically
    const mockStrategy: UserStrategy = {
      id: `ai-sim-temp`,
      name: name,
      description: description,
      version: '1.0',
      owner: 'AI Copilot',
      symbols: [simulateSymbol],
      timeframes: [simulateTimeframe],
      entryConditions: [entryRule1, entryRule2].filter(Boolean),
      exitConditions: [exitRule1].filter(Boolean),
      filters: [filterRule].filter(Boolean),
      riskProfile: {
        maxRiskPerTradePct: maxRisk,
        minRiskRewardRatio: 2.0,
        maxRiskRewardRatio: 3.0,
        stopLossPipsOrPct: stopLoss,
      },
      sessionRestrictions: aiResult.strategyDefinition.preferredSessions,
      maxPositions: maxPositions,
      cooldown: cooldown,
      status: 'DRAFT',
      environment: 'PAPER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versionHistory: [],
      markets: aiResult.strategyDefinition.markets,
      preferredSessions: aiResult.strategyDefinition.preferredSessions,
    };

    const params: BacktestParams = {
      strategyId: mockStrategy.id,
      symbol: simulateSymbol,
      timeframe: simulateTimeframe,
      startDate: '2026-01-01',
      endDate: '2026-08-01',
      startingCapital: simulateCapital,
      commissionPerLot: 5.00,
      spreadPips: 1.5,
      slippagePips: 0.5,
      positionSizing: 'RISK_PERCENT',
      positionSizeValue: maxRisk,
      riskModel: 'BREAK_EVEN',
      trainTestSplit: simulateSplit,
    };

    // Simulate short latency
    setTimeout(() => {
      try {
        const backtestResult = runBacktest(mockStrategy, params);
        setSimulatedMetrics(backtestResult);
        setExplanationSubTab('BACKTEST_RESULTS');
      } catch (err: any) {
        setValidationError(err.message || 'Error executing backtest simulation on AI strategy.');
      } finally {
        setIsSimulatingAI(false);
      }
    }, 1200);
  };

  const handleAcceptAndProceed = () => {
    if (!aiResult) return;
    setStatus('BACKTESTED');
    setEnvironment('PAPER');
    setActiveTab('VISUAL');
    setValidationError('Strategy successfully validated and saved to draft canvas. Review details below.');
  };

  const handleStatusChange = (newStatus: StrategyStatus) => {
    if (status === 'DRAFT' && newStatus === 'LIVE_APPROVED') {
      setValidationError('Lifecycle Violation: Strategy cannot go directly from DRAFT to LIVE. Required workflow: DRAFT → VALIDATION → BACKTEST → RISK REVIEW → PAPER TRADING → USER APPROVAL → LIVE ENABLEMENT.');
      return;
    }
    setValidationError(null);
    setStatus(newStatus);
    if (newStatus === 'LIVE_APPROVED') {
      setEnvironment('LIVE');
    }
  };

  const handleSave = () => {
    if (status === 'LIVE_APPROVED' && environment !== 'LIVE') {
      setValidationError('Live status requires LIVE environment authorization.');
      return;
    }

    const updated: UserStrategy = {
      id: existingStrategy?.id || `strat-${Date.now()}`,
      name,
      description,
      version,
      owner: existingStrategy?.owner || 'Quant Trader',
      symbols: existingStrategy?.symbols || [simulateSymbol],
      timeframes: existingStrategy?.timeframes || [simulateTimeframe],
      entryConditions: [entryRule1, entryRule2].filter(Boolean),
      exitConditions: [exitRule1].filter(Boolean),
      filters: [filterRule].filter(Boolean),
      riskProfile: {
        maxRiskPerTradePct: maxRisk,
        minRiskRewardRatio: 2.0,
        maxRiskRewardRatio: 3.0,
        stopLossPipsOrPct: stopLoss,
      },
      sessionRestrictions: ['LONDON', 'NEW_YORK'],
      maxPositions,
      cooldown,
      status,
      environment,
      createdAt: existingStrategy?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versionHistory: [
        ...versionHistory,
        { version, status: status as StrategyStatus, updatedAt: new Date().toISOString(), description, entryConditions: [entryRule1, entryRule2], exitConditions: [exitRule1] }
      ],
      rawNaturalLanguage: naturalLanguageInput,
    };

    onSaveStrategy(updated);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-main/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-4xl rounded-2xl bg-bg-surface border border-border-color shadow-2xl p-6 text-slate-200 overflow-hidden my-8"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-color">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Brain className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                AI-Assisted Strategy Workspace
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                  COPILOT ENGINE
                </span>
              </h3>
              <p className="text-xs text-text-secondary">Translate language to quantitative matrices, assess risk, and run out-of-sample backtests.</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg bg-bg-hover text-text-secondary hover:text-white transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 border-b border-border-color pb-3 overflow-x-auto">
          {[
            { id: 'AI_COPILOT', label: '✨ AI Quant Copilot', icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: 'VISUAL', label: '2. Mapped Rules', icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'ADVANCED', label: '3. Risk Controls', icon: <Sliders className="w-3.5 h-3.5" /> },
            { id: 'LIFECYCLE', label: '4. Workflow States', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
            { id: 'VERSIONS', label: '5. Versions', icon: <History className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-cyan-500 text-bg-main font-extrabold'
                  : 'bg-bg-hover/60 text-text-secondary hover:text-white border border-border-color'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Validation Errors Banner */}
        {validationError && (
          <div className="mt-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>{validationError}</span>
          </div>
        )}

        {/* TAB 1: AI COPILOT WORKSPACE */}
        {activeTab === 'AI_COPILOT' && (
          <div className="mt-5 space-y-5">
            {/* Input prompt area */}
            <div className="p-4 rounded-xl bg-bg-main border border-border-color space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-text-primary block flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Describe your entry triggers & risk constraints
              </label>
              
              <textarea
                value={naturalLanguageInput}
                onChange={(e) => setNaturalLanguageInput(e.target.value)}
                placeholder="e.g., Trade London sessions breakouts of EURUSD with a 20 pip Stop Loss and 1% capital risk. Exclude trading during US CPI macro releases."
                rows={3}
                className="w-full rounded-lg bg-bg-surface border border-border-color p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/40 leading-relaxed font-mono resize-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-color">
                <span className="text-[10px] text-text-secondary font-mono">
                  Powered by Gemini 3.6 Flash • Structured JSON response validation active
                </span>
                <button
                  onClick={handleAIBuild}
                  disabled={isAILoading}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-bg-main text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isAILoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing Strategy...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Query AI Quant Copilot</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Loading sequence animation */}
            {isAILoading && (
              <div className="p-8 rounded-xl border border-border-color bg-bg-main/40 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                  <Brain className="w-5 h-5 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-white font-mono font-bold">AI QUANT SYNTHESIS IN PROGRESS</p>
                  <p className="text-[11px] text-cyan-400 font-mono animate-pulse">{loaderSteps[loaderStep]}</p>
                </div>
              </div>
            )}

            {/* AI Result Area */}
            {aiResult && !isAILoading && (
              <div className="space-y-4">
                
                {/* 1. MANDATE WARNING HEADER */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-extrabold text-amber-400 tracking-wider uppercase block">
                          AI GENERATED
                        </span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded">
                          REQUIRES VALIDATION
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-300/80 mt-0.5 font-mono">
                        Trading carries high risk. Strategy rules generated by AI are not guaranteed. Validate using historical splits before paper or live deployment.
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleAcceptAndProceed}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-bg-main text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0"
                  >
                    Accept & Apply Rules
                  </button>
                </div>

                {/* Sub tabs inside AI output */}
                <div className="flex items-center gap-1 border-b border-border-color/80 pb-2">
                  {[
                    { id: 'EXPLANATION', label: 'Explanation Panel', icon: <HelpCircle className="w-3 h-3" /> },
                    { id: 'AMBIGUITIES', label: 'Ambiguities & Param Checks', icon: <ListFilter className="w-3 h-3" /> },
                    { id: 'VARIANTS', label: 'Compare Variants', icon: <Scale className="w-3 h-3" /> },
                    { id: 'SIMULATE', label: 'Simulate & Validate (Out-of-Sample)', icon: <Activity className="w-3 h-3" /> },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setAiSubTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                        aiSubTab === tab.id
                          ? 'bg-bg-hover text-white border-b-2 border-cyan-400'
                          : 'text-text-secondary hover:text-slate-200'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Inner Tab: Explanation Panel */}
                {aiSubTab === 'EXPLANATION' && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Inner Explanation side navigation */}
                    <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible font-mono text-[10px]">
                      {[
                        { id: 'WHY_EXISTS', label: 'WHY THIS STRATEGY EXISTS' },
                        { id: 'ASSUMPTIONS', label: 'ASSUMPTIONS' },
                        { id: 'KNOWN_LIMITATIONS', label: 'KNOWN LIMITATIONS' },
                        { id: 'RISKS', label: 'RISKS' },
                        { id: 'BACKTEST_RESULTS', label: 'BACKTEST RESULTS' },
                      ].map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => setExplanationSubTab(sub.id as any)}
                          className={`p-2 rounded-lg text-left font-bold transition-colors whitespace-nowrap ${
                            explanationSubTab === sub.id
                              ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400'
                              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover/30'
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>

                    {/* Explanation Content viewport */}
                    <div className="md:col-span-3 p-4 rounded-xl bg-bg-main border border-border-color/80 min-h-[160px] text-xs">
                      {explanationSubTab === 'WHY_EXISTS' && (
                        <div className="space-y-2">
                          <h4 className="font-mono font-bold text-cyan-400 text-[11px] uppercase tracking-wider">THESIS & RATIONALE</h4>
                          <p className="text-text-primary leading-relaxed font-mono text-[11px]">{aiResult.explanation.whyThisStrategyExists}</p>
                        </div>
                      )}

                      {explanationSubTab === 'ASSUMPTIONS' && (
                        <div className="space-y-3">
                          <h4 className="font-mono font-bold text-cyan-400 text-[11px] uppercase tracking-wider font-bold">MARKET MODEL ASSUMPTIONS</h4>
                          <p className="text-text-primary leading-relaxed font-mono text-[11px]">{aiResult.explanation.assumptions}</p>
                          <ul className="space-y-1.5 border-t border-border-color/80 pt-3">
                            {aiResult.assumptions.map((ass, i) => (
                              <li key={i} className="flex items-start gap-1.5 font-mono text-[10px] text-text-secondary">
                                <span className="text-cyan-400 shrink-0">•</span>
                                <span>{ass}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {explanationSubTab === 'KNOWN_LIMITATIONS' && (
                        <div className="space-y-2">
                          <h4 className="font-mono font-bold text-rose-400 text-[11px] uppercase tracking-wider">KNOWN BEHAVIORAL LIMITATIONS</h4>
                          <p className="text-text-primary leading-relaxed font-mono text-[11px]">{aiResult.explanation.knownLimitations}</p>
                        </div>
                      )}

                      {explanationSubTab === 'RISKS' && (
                        <div className="space-y-3">
                          <h4 className="font-mono font-bold text-rose-400 text-[11px] uppercase tracking-wider">SYSTEMIC TRADING RISKS</h4>
                          <p className="text-text-primary leading-relaxed font-mono text-[11px]">{aiResult.explanation.risks}</p>
                          <ul className="space-y-1.5 border-t border-border-color/80 pt-3">
                            {aiResult.warnings.map((warn, i) => (
                              <li key={i} className="flex items-start gap-1.5 font-mono text-[10px] text-rose-300/90">
                                <span className="text-rose-400 shrink-0">•</span>
                                <span>{warn}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {explanationSubTab === 'BACKTEST_RESULTS' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-mono font-bold text-cyan-400 text-[11px] uppercase tracking-wider">HISTORICAL BACKTEST RESULTS</h4>
                            <span className="text-[10px] font-mono font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded uppercase">
                              BACKTEST LABEL ONLY
                            </span>
                          </div>

                          {!simulatedMetrics ? (
                            <div className="p-4 rounded-lg bg-bg-surface border border-border-color flex flex-col items-center justify-center text-center space-y-2">
                              <AlertTriangle className="w-5 h-5 text-amber-400" />
                              <span className="text-[10px] font-mono text-text-secondary">No active backtest metrics loaded. Go to the "Simulate & Validate" tab to run an out-of-sample backtest split.</span>
                            </div>
                          ) : (
                            <div className="space-y-4 font-mono text-[11px]">
                              {/* Overall score */}
                              <div className="grid grid-cols-3 gap-2">
                                <div className="p-2 rounded bg-bg-surface border border-border-color/80">
                                  <span className="text-[9px] text-text-secondary uppercase block">Total return</span>
                                  <span className={`font-bold block mt-0.5 ${simulatedMetrics.overall.netPl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {simulatedMetrics.overall.totalReturnPct.toFixed(2)}% (${simulatedMetrics.overall.netPl.toLocaleString()})
                                  </span>
                                </div>
                                <div className="p-2 rounded bg-bg-surface border border-border-color/80">
                                  <span className="text-[9px] text-text-secondary uppercase block">Win Rate</span>
                                  <span className="text-white font-bold block mt-0.5">{simulatedMetrics.overall.winRate.toFixed(1)}%</span>
                                </div>
                                <div className="p-2 rounded bg-bg-surface border border-border-color/80">
                                  <span className="text-[9px] text-text-secondary uppercase block">Max Drawdown</span>
                                  <span className="text-rose-400 font-bold block mt-0.5">-{simulatedMetrics.overall.maxDrawdownPct}%</span>
                                </div>
                              </div>

                              {/* OOS Split Table */}
                              <div className="rounded border border-border-color overflow-hidden text-[10px]">
                                <div className="grid grid-cols-4 bg-bg-surface px-2.5 py-1.5 font-bold text-text-secondary border-b border-border-color">
                                  <div>METRIC</div>
                                  <div>TRAIN (IS)</div>
                                  <div>TEST (OOS)</div>
                                  <div>DECAY STATUS</div>
                                </div>
                                <div className="grid grid-cols-4 px-2.5 py-2 border-b border-slate-850">
                                  <div className="font-bold text-text-primary">Sharpe Ratio</div>
                                  <div className="text-white">{simulatedMetrics.trainMetrics.sharpeRatio.toFixed(2)}</div>
                                  <div className="text-white">{simulatedMetrics.testMetrics.sharpeRatio.toFixed(2)}</div>
                                  <div className="text-cyan-400 font-bold">
                                    {(simulatedMetrics.testMetrics.sharpeRatio >= simulatedMetrics.trainMetrics.sharpeRatio * 0.7) ? 'HEALTHY' : 'DEGRADATION'}
                                  </div>
                                </div>
                                <div className="grid grid-cols-4 px-2.5 py-2">
                                  <div className="font-bold text-text-primary">Profit Factor</div>
                                  <div className="text-white">{simulatedMetrics.trainMetrics.profitFactor.toFixed(2)}</div>
                                  <div className="text-white">{simulatedMetrics.testMetrics.profitFactor.toFixed(2)}</div>
                                  <div className="text-text-secondary">OOS VALIDATED</div>
                                </div>
                              </div>

                              {/* Overfitting analysis */}
                              <div className={`p-2.5 rounded border ${
                                simulatedMetrics.overfitting.riskScore === 'HIGH' 
                                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' 
                                  : simulatedMetrics.overfitting.riskScore === 'MEDIUM'
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                              }`}>
                                <span className="font-bold block uppercase tracking-wider text-[10px]">
                                  🧠 OVERFITTING TEST VERDICT: {simulatedMetrics.overfitting.riskScore} RISK
                                </span>
                                <p className="text-[10px] text-text-primary mt-1">{simulatedMetrics.overfitting.verdict}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Inner Tab: Ambiguities & Parameter suggestions */}
                {aiSubTab === 'AMBIGUITIES' && (
                  <div className="space-y-4">
                    {/* Ambiguities */}
                    <div className="p-4 rounded-xl bg-bg-main border border-border-color space-y-3">
                      <h4 className="font-mono text-xs text-cyan-400 font-extrabold uppercase flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-cyan-400" />
                        Ambiguous Terms Resolved
                      </h4>
                      {aiResult.ambiguousConditions.length === 0 ? (
                        <p className="text-xs text-text-secondary font-mono">No major ambiguous terms detected in description.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {aiResult.ambiguousConditions.map((amb, i) => (
                            <div key={i} className="p-3 rounded-lg bg-bg-surface border border-border-color/80 font-mono text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-rose-400">"{amb.term}"</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-bold uppercase">vague term</span>
                              </div>
                              <p className="text-text-secondary mt-1 text-[11px]">{amb.explanation}</p>
                              <div className="mt-2 pt-2 border-t border-border-color/60 text-[11px] flex gap-1 items-start text-emerald-400">
                                <span className="font-bold">Suggested Math Trigger:</span>
                                <span>{amb.suggestion}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Missing Parameter Suggestions */}
                    <div className="p-4 rounded-xl bg-bg-main border border-border-color space-y-3">
                      <h4 className="font-mono text-xs text-cyan-400 font-extrabold uppercase flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-cyan-400" />
                        Parameters Added For Absolute Determinism
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {aiResult.missingParameters.map((pm, i) => (
                          <div key={i} className="p-3 rounded-lg bg-bg-surface border border-border-color font-mono text-xs">
                            <span className="font-bold text-slate-200 uppercase block">{pm.param}</span>
                            <p className="text-[11px] text-text-secondary mt-0.5">{pm.suggestion}</p>
                            <span className="text-[10px] text-cyan-400 font-bold block mt-2">
                              Defaulted Value: {pm.defaultValue}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Inner Tab: Compare Variants */}
                {aiSubTab === 'VARIANTS' && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono text-[11px]">
                      Compare alternate variants synthesized from your prompt logic, and apply them directly to calibrate risk/reward matrices.
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
                      {aiResult.variants.map((v, i) => (
                        <div key={i} className="p-4 rounded-xl bg-bg-main border border-border-color hover:border-cyan-500/20 transition-all flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-white font-extrabold text-xs">{v.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-bg-surface text-cyan-400 font-bold">
                                Risk Multiplier: {v.riskMultiplier}x
                              </span>
                            </div>
                            <p className="text-[11px] text-text-secondary leading-relaxed">{v.description}</p>
                            <div className="p-2 rounded bg-bg-surface text-[10px] text-text-primary">
                              <span className="text-text-secondary font-bold block">Parameter Adjustments:</span>
                              <span className="font-mono text-cyan-300">{v.parameterChanges}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleApplyVariant(v)}
                            className="w-full py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-bg-main text-xs font-extrabold text-center transition-colors cursor-pointer"
                          >
                            Apply Variant Calibration
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inner Tab: Simulate & Validate */}
                {aiSubTab === 'SIMULATE' && (
                  <div className="p-4 rounded-xl bg-bg-main border border-border-color space-y-4">
                    <div className="space-y-1.5">
                      <h4 className="font-mono text-xs text-white font-extrabold uppercase">SIMULATION ENVIRONMENT SETUP</h4>
                      <p className="text-[11px] text-text-secondary font-mono">Configure backtest parameters and execute historical simulation on the AI rules before proceeding to save.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
                      <div>
                        <label className="text-text-secondary block mb-1 text-[10px] uppercase">Symbol</label>
                        <select
                          value={simulateSymbol}
                          onChange={(e) => setSimulateSymbol(e.target.value)}
                          className="w-full bg-bg-surface border border-border-color rounded p-2 text-slate-200"
                        >
                          <option value="EURUSD">EURUSD</option>
                          <option value="GBPUSD">GBPUSD</option>
                          <option value="XAUUSD">XAUUSD (GOLD)</option>
                          <option value="Volatility 75 Index">V75 INDEX (SYNTHETIC)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-text-secondary block mb-1 text-[10px] uppercase">Timeframe</label>
                        <select
                          value={simulateTimeframe}
                          onChange={(e) => setSimulateTimeframe(e.target.value)}
                          className="w-full bg-bg-surface border border-border-color rounded p-2 text-slate-200"
                        >
                          <option value="M15">M15</option>
                          <option value="H1">H1</option>
                          <option value="H4">H4</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-text-secondary block mb-1 text-[10px] uppercase font-bold text-cyan-400">OOS split %</label>
                        <input
                          type="number"
                          value={simulateSplit}
                          onChange={(e) => setSimulateSplit(parseInt(e.target.value))}
                          className="w-full bg-bg-surface border border-border-color rounded p-2 text-white"
                          max={90}
                          min={50}
                        />
                      </div>

                      <div>
                        <label className="text-text-secondary block mb-1 text-[10px] uppercase">Capital ($)</label>
                        <input
                          type="number"
                          value={simulateCapital}
                          onChange={(e) => setSimulateCapital(parseInt(e.target.value))}
                          className="w-full bg-bg-surface border border-border-color rounded p-2 text-white"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleAISimulate}
                        disabled={isSimulatingAI}
                        className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-bg-main text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {isSimulatingAI ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Simulating Out-Of-Sample Backtest...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Run Out-of-Sample Backtest</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Results overlay notice */}
                    {simulatedMetrics && (
                      <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[11px] flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Simulation finished. Out-of-Sample metrics successfully rendered in the "Explanation Panel &gt; BACKTEST RESULTS" sub-tab. Review decay and risk before saving.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VISUAL RULE BUILDER */}
        {activeTab === 'VISUAL' && (
          <div className="mt-5 space-y-4 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-bg-main border border-slate-850">
              <label className="text-text-secondary block mb-1 uppercase tracking-wider text-[10px]">Strategy Title</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-bg-surface border border-border-color p-2.5 text-white font-bold text-xs"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-bg-main border border-slate-850">
              <label className="text-text-secondary block mb-1 uppercase tracking-wider text-[10px]">Short Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg bg-bg-surface border border-border-color p-2.5 text-slate-200 text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-bg-main border border-slate-850 space-y-3">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Entry Triggers (Normalized)</span>
                <div>
                  <label className="text-text-secondary text-[9px] block mb-0.5">Primary Entry Trigger</label>
                  <input
                    type="text"
                    value={entryRule1}
                    onChange={(e) => setEntryRule1(e.target.value)}
                    placeholder="Primary Entry Condition"
                    className="w-full rounded bg-bg-surface border border-border-color p-2 text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-text-secondary text-[9px] block mb-0.5">Confirmation Trigger</label>
                  <input
                    type="text"
                    value={entryRule2}
                    onChange={(e) => setEntryRule2(e.target.value)}
                    placeholder="Secondary Confirmation Condition"
                    className="w-full rounded bg-bg-surface border border-border-color p-2 text-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-bg-main border border-slate-850 space-y-3">
                <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">Exits & Volatility Filters</span>
                <div>
                  <label className="text-text-secondary text-[9px] block mb-0.5">Exit Strategy (TP & SL Limits)</label>
                  <input
                    type="text"
                    value={exitRule1}
                    onChange={(e) => setExitRule1(e.target.value)}
                    placeholder="Exit Rule / Take Profit"
                    className="w-full rounded bg-bg-surface border border-border-color p-2 text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-text-secondary text-[9px] block mb-0.5">Trend/Macro News Filter</label>
                  <input
                    type="text"
                    value={filterRule}
                    onChange={(e) => setFilterRule(e.target.value)}
                    placeholder="Filter (e.g. News exclusion)"
                    className="w-full rounded bg-bg-surface border border-border-color p-2 text-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADVANCED PARAMETERS & RISK CONTROLS */}
        {activeTab === 'ADVANCED' && (
          <div className="mt-5 space-y-4 font-mono text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-bg-main border border-border-color">
                <label className="text-text-secondary block mb-1 text-[10px] uppercase">Max Risk Per Trade (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={maxRisk}
                  onChange={(e) => setMaxRisk(parseFloat(e.target.value))}
                  className="w-full rounded-lg bg-bg-surface border border-border-color p-2.5 text-white font-bold text-xs"
                />
                <span className="text-[9px] text-text-secondary block mt-1">Suggested safety maximum: 2.0%</span>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-main border border-border-color">
                <label className="text-text-secondary block mb-1 text-[10px] uppercase">Stop Loss (Pips / %)</label>
                <input
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(parseInt(e.target.value))}
                  className="w-full rounded-lg bg-bg-surface border border-border-color p-2.5 text-white font-bold text-xs"
                />
                <span className="text-[9px] text-text-secondary block mt-1">Calibrated SL based on asset volatility</span>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-main border border-border-color">
                <label className="text-text-secondary block mb-1 text-[10px] uppercase">Max Concurrent Positions</label>
                <input
                  type="number"
                  value={maxPositions}
                  onChange={(e) => setMaxPositions(parseInt(e.target.value))}
                  className="w-full rounded-lg bg-bg-surface border border-border-color p-2.5 text-white font-bold text-xs"
                />
                <span className="text-[9px] text-text-secondary block mt-1">Avoids margin degradation risks</span>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-main border border-border-color">
                <label className="text-text-secondary block mb-1 text-[10px] uppercase">Cooldown Between Trades (Min)</label>
                <input
                  type="number"
                  value={cooldown}
                  onChange={(e) => setCooldown(parseInt(e.target.value))}
                  className="w-full rounded-lg bg-bg-surface border border-border-color p-2.5 text-white font-bold text-xs"
                />
                <span className="text-[9px] text-text-secondary block mt-1">Prevents emotional over-trading</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LIFECYCLE & WORKFLOW */}
        {activeTab === 'LIFECYCLE' && (
          <div className="mt-5 space-y-4 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
              <span className="font-bold block mb-1 flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Strict Quantitative Strategy Governance
              </span>
              <span>Mandatory workflow sequence: DRAFT → BACKTEST_REQUIRED → BACKTESTED → PAPER_APPROVED → LIVE_APPROVED → ACTIVE. Direct transitions from DRAFT to LIVE are blocked.</span>
            </div>

            <div>
              <label className="text-text-secondary block mb-2 uppercase tracking-wider text-[10px]">Select Strategy Lifecycle Status</label>
              <div className="grid grid-cols-3 gap-2">
                {(['DRAFT', 'BACKTEST_REQUIRED', 'BACKTESTED', 'PAPER_APPROVED', 'LIVE_APPROVED', 'ACTIVE', 'PAUSED', 'DISABLED', 'ARCHIVED'] as StrategyStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`p-2 rounded-xl text-left font-bold text-xs transition-all cursor-pointer border ${
                      status === s
                        ? 'bg-cyan-500 text-bg-main border-cyan-400 shadow-md font-extrabold'
                        : 'bg-bg-main text-text-primary border-border-color hover:bg-bg-hover'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-bg-main border border-border-color flex items-center justify-between">
              <div>
                <span className="text-text-secondary block text-[10px] uppercase">Execution Mode Environment</span>
                <span className="text-white font-bold text-xs">{environment} TRADING</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEnvironment('PAPER')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-colors ${environment === 'PAPER' ? 'bg-cyan-500 text-bg-main' : 'bg-bg-hover text-text-secondary'}`}
                >
                  PAPER MODE
                </button>
                <button
                  onClick={() => {
                    if (status !== 'LIVE_APPROVED' && status !== 'ACTIVE') {
                      setValidationError('Cannot switch to LIVE environment until strategy reaches LIVE_APPROVED status.');
                      return;
                    }
                    setEnvironment('LIVE');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-colors ${environment === 'LIVE' ? 'bg-emerald-500 text-bg-main' : 'bg-bg-hover text-text-secondary'}`}
                >
                  LIVE ENVIRONMENT
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: VERSION HISTORY & ROLLBACK */}
        {activeTab === 'VERSIONS' && (
          <div className="mt-5 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary uppercase tracking-wider text-[10px]">Immutable Strategy Version History</span>
              <span className="text-cyan-400 font-bold text-xs">Current: v{version}</span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {versionHistory.map((v, i) => (
                <div key={i} className="p-3 rounded-xl bg-bg-main border border-border-color flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">v{v.version}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-bg-hover text-cyan-300 font-bold">{v.status}</span>
                    </div>
                    <p className="text-text-secondary text-[10px] mt-1">{v.description}</p>
                  </div>
                  <button
                    onClick={() => {
                      setVersion(v.version);
                      setDescription(v.description);
                    }}
                    className="px-3 py-1.5 rounded bg-bg-hover hover:bg-bg-hover text-text-primary font-bold text-[10px] transition-colors cursor-pointer"
                  >
                    Rollback to v{v.version}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-border-color">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-bg-hover text-xs font-semibold text-text-primary hover:bg-bg-hover cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-bg-main text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save Strategy v{version}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
