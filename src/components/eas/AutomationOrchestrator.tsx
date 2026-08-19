import React, { useState, useEffect } from 'react';
import { useApiFetch } from '../../utils/apiFetch.ts';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Square,
  Pause,
  AlertOctagon,
  RefreshCw,
  ShieldCheck,
  CheckCircle,
  Database,
  Activity,
  Flame,
  Clock,
  Settings,
  Server,
  AlertTriangle,
  ArrowRight,
  User,
  Sliders,
  RefreshCcw,
  ShieldAlert,
  Terminal,
  Layers,
  HelpCircle
} from 'lucide-react';

interface PipelineStageInfo {
  stage: string;
  name: string;
  status: 'IDLE' | 'ACTIVE' | 'PASSED' | 'FAILED' | 'BYPASSED';
  lastExecuted: string;
  durationMs: number;
  message: string;
}

interface ExecutionRequest {
  id: string;
  timestamp: string;
  strategyId: string;
  symbol: string;
  direction: 'BUY' | 'SHORT';
  volume: number;
  price: number;
  state: string;
  outcomeMessage: string;
  retries: number;
  maxRetries: number;
  idempotencyKey: string;
}

interface ReconciledRecord {
  symbol: string;
  brokerVolume: number;
  internalVolume: number;
  brokerAvgPrice: number;
  internalAvgPrice: number;
  status: 'MATCHED' | 'DISCREPANCY_VOLUME' | 'DISCREPANCY_PRICE' | 'BROKER_ONLY' | 'INTERNAL_ONLY';
  resolutionAction: string;
}

interface ReconciledOrderRecord {
  orderId: string;
  symbol: string;
  brokerStatus: string;
  internalStatus: string;
  status: 'MATCHED' | 'DISCREPANCY_STATUS' | 'BROKER_ONLY' | 'INTERNAL_ONLY';
  resolutionAction: string;
}

interface ReconciliationSummary {
  reconciled: boolean;
  timestamp: string;
  totalPositionsReconciled: number;
  discrepanciesFound: number;
  discrepanciesResolved: number;
  positionLogs: ReconciledRecord[];
  orderLogs: ReconciledOrderRecord[];
  auditLogs: string[];
}

export const AutomationOrchestrator: React.FC = () => {
  const apiFetch = useApiFetch();
  const [orchestratorState, setOrchestratorState] = useState<string>('STOPPED');
  const [stages, setStages] = useState<PipelineStageInfo[]>([]);
  const [requests, setRequests] = useState<ExecutionRequest[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationSummary | null>(null);
  const [isReconciled, setIsReconciled] = useState<boolean>(false);
  const [totalRuns, setTotalRuns] = useState<number>(0);
  const [lastRun, setLastRun] = useState<string>('');
  
  // Settings & Toggles
  const [idempotencyWindow, setIdempotencyWindow] = useState<number>(5000);
  const [maxBrokerAttempts, setMaxBrokerAttempts] = useState<number>(3);
  const [simBrokerFailure, setSimBrokerFailure] = useState<boolean>(false);
  const [simStaleData, setSimStaleData] = useState<boolean>(false);
  const [simRiskBreach, setSimRiskBreach] = useState<boolean>(false);
  
  // Local state
  const [loading, setLoading] = useState<boolean>(true);
  const [isRunningPipeline, setIsRunningPipeline] = useState<boolean>(false);
  const [pipelineMessage, setPipelineMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pipeline' | 'reconciliation' | 'settings' | 'history'>('pipeline');

  const fetchDashboardData = async () => {
    try {
      const res = await apiFetch('/api/orchestrator/dashboard');
      const json = await res.json();
      if (json.success) {
        const d = json.data;
        setOrchestratorState(d.state);
        setStages(d.stages);
        setRequests(d.requests);
        setReconciliation(d.reconciliation);
        setIsReconciled(d.isReconciled);
        setTotalRuns(d.totalRuns);
        setLastRun(d.lastRun);
        
        // sync local configs
        setIdempotencyWindow(d.settings.idempotencyWindowMs);
        setMaxBrokerAttempts(d.settings.maxBrokerRetryAttempts);
        setSimBrokerFailure(d.settings.simulatedBrokerFailure);
        setSimStaleData(d.settings.simulatedStaleData);
        setSimRiskBreach(d.settings.simulatedRiskBreach);
      }
    } catch (e) {
      console.error("Failed to load orchestrator data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchDashboardData();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStateChange = async (newState: string) => {
    try {
      const res = await apiFetch('/api/orchestrator/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState })
      });
      const json = await res.json();
      if (json.success) {
        setOrchestratorState(json.data.state);
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateSettings = async (updates: any) => {
    try {
      const res = await apiFetch('/api/orchestrator/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const json = await res.json();
      if (json.success) {
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerDrift = async () => {
    try {
      const res = await apiFetch('/api/orchestrator/drift', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        fetchDashboardData();
        setActiveTab('reconciliation');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReconcile = async () => {
    try {
      const res = await apiFetch('/api/orchestrator/reconcile', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunPipeline = async () => {
    setIsRunningPipeline(true);
    setPipelineMessage('Triggering 15-Stage Pipeline Cycle...');
    try {
      const res = await apiFetch('/api/orchestrator/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: {
            id: `ord-auto-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
            strategyId: 'strat-ai-01',
            strategyName: 'Alpha-Pulse Gemini RL',
            symbol: 'EURUSD',
            direction: 'BUY',
            volume: 1.0,
            price: 1.08450,
          }
        })
      });
      const json = await res.json();
      if (json.success) {
        setPipelineMessage(json.data.message);
      } else {
        setPipelineMessage(`Pipeline halted: ${json.data.message || 'Error occurred.'}`);
      }
      fetchDashboardData();
    } catch (e) {
      setPipelineMessage('Critical system gateway failure.');
    } finally {
      setTimeout(() => {
        setIsRunningPipeline(false);
      }, 3500);
    }
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'RUNNING':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'STARTING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse';
      case 'PAUSED':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 'RISK_HALT':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30 font-extrabold animate-pulse';
      case 'DATA_HALT':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'BROKER_HALT':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'EMERGENCY_STOP':
        return 'bg-red-600 text-white border-red-500 animate-bounce';
      case 'ERROR':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-bg-surface text-text-secondary border-border-color';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-bg-surface/40 rounded-2xl border border-border-color/80 min-h-[400px]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-xs text-text-secondary font-mono">Initializing Automation Orchestrator...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* State & Control Dashboard Ribbon */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-[#131822] to-slate-950 border border-border-color flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <Layers className="w-5 h-5 text-cyan-400" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white font-mono uppercase tracking-tight">
                  Automation Orchestrator
                </h2>
                <span className={`px-3 py-0.5 rounded-full text-[10px] font-mono border font-bold ${getStatusColor(orchestratorState)}`}>
                  {orchestratorState}
                </span>
              </div>
              <p className="text-text-secondary text-[11px] font-mono">
                System Reconciliation status: {isReconciled ? (
                  <span className="text-emerald-400 font-bold">RECONCILED & TRUSTED</span>
                ) : (
                  <span className="text-rose-400 font-bold">⚠️ LOCKED (DRIFT DETECTED)</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Primary Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleStateChange('RUNNING')}
            disabled={orchestratorState === 'RUNNING'}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-bg-main font-bold font-mono text-[11px] flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>START</span>
          </button>

          <button
            onClick={() => handleStateChange('PAUSED')}
            disabled={orchestratorState === 'PAUSED' || orchestratorState === 'STOPPED'}
            className="px-3.5 py-2 rounded-xl bg-bg-hover hover:bg-bg-hover text-slate-200 font-bold font-mono text-[11px] flex items-center gap-1.5 transition-all disabled:opacity-40"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>PAUSE</span>
          </button>

          <button
            onClick={() => handleStateChange('STOPPED')}
            disabled={orchestratorState === 'STOPPED'}
            className="px-3.5 py-2 rounded-xl bg-bg-surface border border-border-color hover:bg-slate-850 text-text-secondary hover:text-white font-bold font-mono text-[11px] flex items-center gap-1.5 transition-all disabled:opacity-40"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>STOP</span>
          </button>

          <div className="h-6 w-px bg-bg-hover mx-1" />

          <button
            onClick={() => handleStateChange('EMERGENCY_STOP')}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black font-mono text-[11px] flex items-center gap-1.5 transition-all shadow-lg shadow-rose-600/20 uppercase"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Emergency Kill</span>
          </button>
        </div>
      </div>

      {/* Main Tab Links */}
      <div className="flex border-b border-border-color">
        {[
          { id: 'pipeline', label: '15-Stage Live Pipeline', icon: <Activity className="w-4 h-4" /> },
          { id: 'reconciliation', label: 'Multi-System Reconciliation', icon: <Database className="w-4 h-4" />, badge: !isReconciled ? 'Out of Sync' : null },
          { id: 'settings', label: 'Simulation & Safety Config', icon: <Sliders className="w-4 h-4" /> },
          { id: 'history', label: 'Idempotent Audits Log', icon: <Terminal className="w-4 h-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 text-xs font-bold font-mono border-b-2 -mb-px transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-text-secondary hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-400 font-extrabold animate-pulse">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {activeTab === 'pipeline' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-6"
          >
            {/* Top Pipeline Control Widget */}
            <div className="p-5 rounded-2xl bg-bg-surface/60 border border-border-color flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xs font-extrabold font-mono text-white flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-cyan-400" />
                  Live Pipeline Executer
                </h3>
                <p className="text-[11px] text-text-secondary max-w-xl">
                  Test and trace a single live automation ticket. The orchestrator routes the trade through the full 15 pre-trade and post-trade safety boundaries.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {isRunningPipeline && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-[10px] font-mono text-cyan-400">{pipelineMessage}</span>
                  </div>
                )}
                <button
                  onClick={handleRunPipeline}
                  disabled={isRunningPipeline || orchestratorState === 'STOPPED' || orchestratorState === 'PAUSED'}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-bg-main font-bold font-mono text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isRunningPipeline ? 'animate-spin' : ''}`} />
                  <span>Run Pipeline Step</span>
                </button>
              </div>
            </div>

            {/* Pipeline Stage Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {stages.map((stg, idx) => {
                const isPassed = stg.status === 'PASSED';
                const isActive = stg.status === 'ACTIVE';
                const isFailed = stg.status === 'FAILED';
                
                return (
                  <div
                    key={stg.stage}
                    className={`p-4 rounded-xl border flex flex-col justify-between h-[120px] transition-all relative ${
                      isPassed
                        ? 'bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5'
                        : isActive
                        ? 'bg-cyan-500/5 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                        : isFailed
                        ? 'bg-rose-500/5 border-rose-500/30'
                        : 'bg-bg-surface/40 border-border-color'
                    }`}
                  >
                    <div className="absolute top-2 right-2 text-[10px] font-mono text-text-secondary font-bold">
                      {idx + 1}
                    </div>

                    <div>
                      <span className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded ${
                        isPassed
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : isActive
                          ? 'bg-cyan-500/10 text-cyan-400'
                          : isFailed
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-bg-hover text-text-secondary'
                      }`}>
                        {stg.status}
                      </span>
                      <h4 className="text-xs font-bold text-white mt-2 font-mono">{stg.name}</h4>
                    </div>

                    <div className="text-[10px] font-mono mt-2 pt-2 border-t border-slate-850 flex items-center justify-between">
                      <span className="text-text-secondary max-w-[80%] truncate">{stg.message || 'Ready'}</span>
                      <span className="text-text-secondary">{stg.durationMs}ms</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pipeline Legend */}
            <div className="p-4 rounded-xl bg-bg-surface/30 border border-slate-850/60 text-[11px] text-text-secondary font-mono flex flex-wrap gap-6 items-center justify-center">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-bg-hover" /> Idle / Inactive
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> Evaluating
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Cleared / Safe
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Safety Halt Tripped
              </span>
            </div>
          </motion.div>
        )}

        {activeTab === 'reconciliation' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-6"
          >
            {/* Out-Of-Sync Warning Card */}
            {!isReconciled && (
              <div className="p-5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold font-mono text-white">
                      CRITICAL ALIGNMENT ALERT: MULTI-SYSTEM DRIFT DETECTED
                    </h4>
                    <p className="text-[11px] text-text-secondary mt-1">
                      Internal database state and live broker positions are currently inconsistent. Pre-trade routing mechanisms have been locked to prevent duplicate risk execution or sizing failures.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReconcile}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-bg-main font-bold font-mono text-[11px] flex items-center gap-1.5 transition-all"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    <span>Run Reconciliation</span>
                  </button>
                </div>
              </div>
            )}

            {isReconciled && (
              <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold font-mono text-white">
                      SYSTEM INTEGRITY SECURE
                    </h4>
                    <p className="text-[11px] text-text-secondary mt-1">
                      The core databases have been fully aligned against the ground-truth broker adapter APIs. Pre-trade execution mechanisms are fully authorized.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleTriggerDrift}
                  className="px-4 py-2 rounded-lg bg-bg-surface border border-border-color hover:bg-slate-850 text-rose-400 hover:text-rose-300 font-bold font-mono text-[11px] flex items-center gap-1.5 transition-all"
                >
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span>Force Out of Sync</span>
                </button>
              </div>
            )}

            {/* Positions Comparison Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl bg-bg-surface/60 border border-border-color space-y-4">
                <h3 className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-cyan-400" />
                  Net Positions Reconciliation Check
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] font-mono">
                    <thead>
                      <tr className="border-b border-border-color text-text-secondary text-left">
                        <th className="pb-2">Asset</th>
                        <th className="pb-2">Broker Vol (Ground-Truth)</th>
                        <th className="pb-2">Internal Vol (Database)</th>
                        <th className="pb-2">State Alignment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {reconciliation?.positionLogs.map((p) => {
                        const isOk = p.status === 'MATCHED';
                        return (
                          <tr key={p.symbol} className="text-white hover:bg-bg-hover/10">
                            <td className="py-2.5 font-extrabold">{p.symbol}</td>
                            <td className="py-2.5 text-cyan-400">{p.brokerVolume.toFixed(2)} Lots</td>
                            <td className="py-2.5 text-text-secondary">{p.internalVolume.toFixed(2)} Lots</td>
                            <td className="py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isOk ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Orders Comparison Table */}
              <div className="p-5 rounded-xl bg-bg-surface/60 border border-border-color space-y-4">
                <h3 className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  Limit Orders Reconciliation Check
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] font-mono">
                    <thead>
                      <tr className="border-b border-border-color text-text-secondary text-left">
                        <th className="pb-2">Order UID</th>
                        <th className="pb-2">Broker Status (Truth)</th>
                        <th className="pb-2">Internal Status (Local)</th>
                        <th className="pb-2">State Alignment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {reconciliation?.orderLogs.map((o) => {
                        const isOk = o.status === 'MATCHED';
                        return (
                          <tr key={o.orderId} className="text-white hover:bg-bg-hover/10">
                            <td className="py-2.5 font-bold text-text-primary">{o.orderId}</td>
                            <td className="py-2.5 text-cyan-400">{o.brokerStatus}</td>
                            <td className="py-2.5 text-text-secondary">{o.internalStatus}</td>
                            <td className="py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isOk ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Step-by-step Audit Logs of last reconciliation */}
            <div className="p-5 rounded-xl bg-bg-main border border-slate-850 space-y-3 font-mono">
              <h4 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Live Reconciliation Terminal Actions
              </h4>
              <div className="max-h-[160px] overflow-y-auto text-[10px] text-text-secondary space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                {reconciliation?.auditLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-2 leading-relaxed">
                    <span className="text-slate-600 font-extrabold">&gt;</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Simulation controllers */}
            <div className="p-5 rounded-xl bg-bg-surface/60 border border-border-color space-y-5">
              <h3 className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
                Chaos Engineering Sandbox
              </h3>
              <p className="text-[11px] text-text-secondary leading-relaxed font-mono">
                Toggle outages or safety breaches to test the automated failover guardrails.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3.5 bg-bg-main rounded-xl border border-slate-850">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-white block">Stale Market Data Outage</span>
                    <span className="text-[10px] text-text-secondary block">Forces immediate transition to DATA_HALT when running pipeline.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={simStaleData}
                    onChange={(e) => {
                      setSimStaleData(e.target.checked);
                      handleUpdateSettings({ simulatedStaleData: e.target.checked });
                    }}
                    className="w-4 h-4 rounded text-cyan-500 border-border-color bg-bg-surface cursor-pointer focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-bg-main rounded-xl border border-slate-850">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-white block">Broker API Gateway Disconnect</span>
                    <span className="text-[10px] text-text-secondary block">Triggers safe exponential backoff retries, then halts on BROKER_HALT.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={simBrokerFailure}
                    onChange={(e) => {
                      setSimBrokerFailure(e.target.checked);
                      handleUpdateSettings({ simulatedBrokerFailure: e.target.checked });
                    }}
                    className="w-4 h-4 rounded text-cyan-500 border-border-color bg-bg-surface cursor-pointer focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-bg-main rounded-xl border border-slate-850">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-white block">Daily Loss Pre-Trade Risk Breach</span>
                    <span className="text-[10px] text-text-secondary block">Rejects order through risk gateway and trips RISK_HALT.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={simRiskBreach}
                    onChange={(e) => {
                      setSimRiskBreach(e.target.checked);
                      handleUpdateSettings({ simulatedRiskBreach: e.target.checked });
                    }}
                    className="w-4 h-4 rounded text-cyan-500 border-border-color bg-bg-surface cursor-pointer focus:ring-0"
                  />
                </div>
              </div>
            </div>

            {/* Safety limits configuration */}
            <div className="p-5 rounded-xl bg-bg-surface/60 border border-border-color space-y-5">
              <h3 className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-cyan-400" />
                Orchestrator Safeguard Configurations
              </h3>
              <p className="text-[11px] text-text-secondary leading-relaxed font-mono">
                Adjust key metrics governing transaction idempotency protection and backoff rates.
              </p>

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-text-secondary mb-1.5">
                    <span>Idempotency Protection Window (ms)</span>
                    <span className="text-cyan-400 font-bold">{idempotencyWindow}ms</span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="15000"
                    step="1000"
                    value={idempotencyWindow}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      setIdempotencyWindow(v);
                      handleUpdateSettings({ idempotencyWindowMs: v });
                    }}
                    className="w-full h-1 bg-bg-hover rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono text-text-secondary mb-1.5">
                    <span>Max Broker Connection Retry Attempts</span>
                    <span className="text-cyan-400 font-bold">{maxBrokerAttempts} Retries</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={maxBrokerAttempts}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      setMaxBrokerAttempts(v);
                      handleUpdateSettings({ maxBrokerRetryAttempts: v });
                    }}
                    className="w-full h-1 bg-bg-hover rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div className="p-4 rounded-xl bg-bg-main border border-slate-850 flex items-start gap-3">
                  <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-white block font-mono">Exponential Backoff Profile</span>
                    <span className="text-[10px] text-text-secondary leading-normal font-mono block mt-1">
                      Gateway communication retries are calculated using formula:<br />
                      <code className="text-cyan-400 font-extrabold text-[11px]">Delay = backoffFactor * 2^(attempt - 1)</code>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="p-5 rounded-xl bg-bg-surface/60 border border-border-color space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-cyan-400" />
                Execution Request Audits Log (Anti-Duplicate / Idempotency database)
              </h3>
              <span className="text-[10px] font-mono text-text-secondary font-bold">
                Total Runs: {totalRuns} | Last: {lastRun ? new Date(lastRun).toLocaleTimeString() : 'N/A'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-border-color text-text-secondary text-left">
                    <th className="pb-2">Execution UID</th>
                    <th className="pb-2">Timestamp</th>
                    <th className="pb-2">Asset</th>
                    <th className="pb-2">Direction</th>
                    <th className="pb-2">Sizing (Lots)</th>
                    <th className="pb-2">Gateway Status</th>
                    <th className="pb-2">Audit Outcome Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-text-secondary italic">
                        No automated execution events triggered yet. Run pipeline step to generate traffic.
                      </td>
                    </tr>
                  ) : (
                    requests.map((r) => {
                      const isRejected = r.state === 'REJECTED' || r.state === 'FAILED_RETRY';
                      const isSubmitted = r.state === 'RECONCILED_SUCCESS';
                      return (
                        <tr key={r.id} className="text-white hover:bg-bg-hover/10">
                          <td className="py-3 font-bold text-text-primary">{r.id}</td>
                          <td className="py-3 text-text-secondary">{new Date(r.timestamp).toLocaleTimeString()}</td>
                          <td className="py-3 font-extrabold text-cyan-400">{r.symbol}</td>
                          <td className="py-3 font-bold">
                            <span className={r.direction === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                              {r.direction}
                            </span>
                          </td>
                          <td className="py-3">{r.volume} Lots</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isSubmitted
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : isRejected
                                ? 'bg-rose-500/10 text-rose-400'
                                : 'bg-bg-hover text-text-secondary'
                            }`}>
                              {r.state}
                            </span>
                          </td>
                          <td className="py-3 text-text-secondary max-w-[240px] truncate">{r.outcomeMessage}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
