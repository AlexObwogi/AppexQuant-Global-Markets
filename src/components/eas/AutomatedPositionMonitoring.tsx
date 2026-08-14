import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Coins,
  Lock,
  Sliders,
  Play,
  XCircle,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  RotateCcw,
  Server,
  User,
  ExternalLink,
  DollarSign,
  AlertOctagon,
  Eye,
  Layers,
  ArrowRight
} from 'lucide-react';
import { OpenPosition, SafeguardActionRecord, SafeguardsConfig } from '../../services/ea/positionEngine.js';
import { useApiFetch } from '../../utils/apiFetch.js';

export const AutomatedPositionMonitoring: React.FC = () => {
  const apiFetch = useApiFetch();
  const [positions, setPositions] = useState<OpenPosition[]>([]);
  const [realizedPlHistory, setRealizedPlHistory] = useState<{ timestamp: string; symbol: string; amount: number; reason: string }[]>([]);
  const [config, setConfig] = useState<SafeguardsConfig | null>(null);
  const [proposals, setProposals] = useState<SafeguardActionRecord[]>([]);
  const [actionsHistory, setActionsHistory] = useState<SafeguardActionRecord[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<OpenPosition | null>(null);
  const [selectedAction, setSelectedAction] = useState<SafeguardActionRecord | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
  const [executingProposalId, setExecutingProposalId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);

  // Fetch all position and safeguard states
  const fetchPositionsData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await apiFetch('/api/positions');
      const data = await res.json();
      if (data.success) {
        setPositions(data.data.positions);
        setRealizedPlHistory(data.data.realizedPl);
        setConfig(data.data.safeguardsConfig);
        setProposals(data.data.safeguardProposals);
        setActionsHistory(data.data.safeguardActions);
        setConnectionError(false);
      } else {
        setConnectionError(true);
      }
    } catch (err) {
      // Gracefully handle transient connection errors during server reload/restart
      setConnectionError(true);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Poll positions data for live P/L fluctuation and automatic safeguard evaluation
  useEffect(() => {
    fetchPositionsData();
    const interval = setInterval(() => {
      fetchPositionsData(true);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update safeguards configuration
  const handleUpdateConfig = async (updatedFields: Partial<SafeguardsConfig>) => {
    setIsUpdatingConfig(true);
    try {
      const res = await apiFetch('/api/positions/safeguards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
        await fetchPositionsData(true);
      }
    } catch (err) {
      console.error('Failed to update config:', err);
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  // Execute and approve safeguard exit
  const handleExecuteSafeguard = async (proposal: SafeguardActionRecord) => {
    setExecutingProposalId(proposal.id);
    try {
      const res = await apiFetch('/api/positions/safeguards/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal })
      });
      const data = await res.json();
      if (data.success) {
        // Automatically select the newly created historical action log so the user can inspect the generated parameters
        setSelectedAction(data.data);
        await fetchPositionsData(true);
      }
    } catch (err) {
      console.error('Failed to execute safeguard:', err);
    } finally {
      setExecutingProposalId(null);
    }
  };

  // Reset positions list and history back to seed states
  const handleResetPositions = async () => {
    if (!window.confirm('Are you sure you want to reset all open positions and clear the safeguard logs?')) return;
    try {
      const res = await apiFetch('/api/positions/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPositions(data.data.positions);
        setSelectedPosition(null);
        setSelectedAction(null);
        await fetchPositionsData();
      }
    } catch (err) {
      console.error('Failed to reset positions:', err);
    }
  };

  // General statistics calculations
  const calculateTotals = () => {
    const totalUnrealized = positions.reduce((sum, p) => sum + p.unrealizedPl, 0);
    const totalRealized = realizedPlHistory.reduce((sum, p) => sum + p.amount, 0);
    const totalExposure = positions.reduce((sum, p) => sum + p.exposureUsd, 0);
    const totalMargin = positions.reduce((sum, p) => sum + p.requiredMarginUsd, 0);

    const accountEquity = 100000 + totalUnrealized; // Mock $100K starting equity
    const marginLevelPct = totalMargin > 0 ? (accountEquity / totalMargin) * 100 : 0;

    return {
      unrealized: Number(totalUnrealized.toFixed(2)),
      realized: Number(totalRealized.toFixed(2)),
      exposure: totalExposure,
      margin: Number(totalMargin.toFixed(2)),
      marginLevel: Number(marginLevelPct.toFixed(1)),
      equity: Number(accountEquity.toFixed(2))
    };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6 text-slate-200 font-sans">
      
      {/* Connection Failure Warning Banner */}
      {connectionError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between gap-3 animate-pulse">
          <span className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
            <span>Connection temporarily interrupted. Reconnecting to live market simulation stream...</span>
          </span>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">
            Retrying
          </span>
        </div>
      )}

      {/* 1. Header Information Alert - Prominent Display of Non-Silent Closes Rule */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-3">
        <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/10">
          <AlertOctagon className="w-5 h-5" />
        </span>
        <div className="space-y-1">
          <h4 className="font-bold text-sm uppercase tracking-wide flex items-center gap-1.5 text-amber-300">
            <span>Rigid Safety Standard: Automated Active Safeguard Monitoring</span>
          </h4>
          <p className="leading-relaxed">
            AppexQuant Markets adheres strictly to high-trust enterprise requirements. <strong>Position monitoring will never silently or secretly close a position.</strong> If any risk threshold or simulated failure is tripped, a transparent Action Proposal is queued below. Manual or programmatic approval triggers a structured exit pipeline including <strong>decision logging, formal pre-action risk checks, raw execution requests, real-time broker results, and verifiable audit events.</strong>
          </p>
        </div>
      </div>

      {/* 2. Key Summary Aggregators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-bg-surface border border-border-color flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-text-secondary block uppercase">Unrealized P/L</span>
            <span className={`text-lg font-black font-mono flex items-center gap-1 ${
              totals.unrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {totals.unrealized >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              ${totals.unrealized.toLocaleString()}
            </span>
          </div>
          <span className="p-2 rounded-lg bg-bg-main text-text-secondary border border-border-color">
            <DollarSign className="w-4 h-4" />
          </span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border-color flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-text-secondary block uppercase">Realized P/L</span>
            <span className={`text-lg font-black font-mono flex items-center gap-1 ${
              totals.realized >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
              {totals.realized >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              ${totals.realized.toLocaleString()}
            </span>
          </div>
          <span className="p-2 rounded-lg bg-bg-main text-text-secondary border border-border-color">
            <Coins className="w-4 h-4" />
          </span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border-color flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-text-secondary block uppercase">Active Exposure</span>
            <span className="text-lg font-black text-slate-100 font-mono">
              ${totals.exposure.toLocaleString()}
            </span>
          </div>
          <span className="p-2 rounded-lg bg-bg-main text-text-secondary border border-border-color">
            <Activity className="w-4 h-4" />
          </span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border-color flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-text-secondary block uppercase">Margin Level %</span>
            <span className={`text-lg font-black font-mono ${
              totals.marginLevel > 200 || totals.marginLevel === 0 ? 'text-emerald-400' : totals.marginLevel > 110 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {totals.marginLevel === 0 ? 'No Load' : `${totals.marginLevel}%`}
            </span>
          </div>
          <span className="p-2 rounded-lg bg-bg-main text-text-secondary border border-border-color">
            <Lock className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* 3. Main Dashboard Partitioning */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Config Panel & Active Proposals Alert List */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Safeguard Threshold Configurations */}
          <div className="p-5 rounded-xl bg-bg-surface border border-border-color space-y-4">
            <h3 className="text-xs font-black text-slate-200 font-mono uppercase tracking-wider flex items-center gap-1.5 border-b border-border-color pb-2.5">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>Safeguard Configurations</span>
            </h3>

            {config && (
              <div className="space-y-4 text-xs font-mono">
                
                {/* Max Holding Duration */}
                <div className="space-y-2 border-b border-border-color/60 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-text-primary font-bold">Max Holding Duration</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.maxHoldingDurationEnabled}
                        onChange={(e) => handleUpdateConfig({ maxHoldingDurationEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-bg-main peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-500 peer-checked:after:bg-bg-main" />
                    </label>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] text-text-secondary leading-normal">Generate alert if held past limit.</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="240"
                        value={config.maxHoldingDurationMin}
                        onChange={(e) => handleUpdateConfig({ maxHoldingDurationMin: parseInt(e.target.value) || 15 })}
                        className="w-14 bg-bg-main border border-border-color rounded p-1 text-center font-bold text-slate-200 text-xs"
                      />
                      <span className="text-[10px] text-text-secondary font-bold">MIN</span>
                    </div>
                  </div>
                </div>

                {/* Strategy Invalidation Safeguard */}
                <div className="space-y-1 border-b border-border-color/60 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-text-primary font-bold">Strategy Invalidation</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.strategyInvalidationEnabled}
                        onChange={(e) => handleUpdateConfig({ strategyInvalidationEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-bg-main peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-500 peer-checked:after:bg-bg-main" />
                    </label>
                  </div>
                  <p className="text-[10px] text-text-secondary leading-normal">
                    Trigger safeguards when Bollinger confidence score degrades.
                  </p>
                </div>

                {/* Drawdown Risk Threshold */}
                <div className="space-y-2 border-b border-border-color/60 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-text-primary font-bold">Risk Loss Threshold</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.drawdownRiskThresholdEnabled}
                        onChange={(e) => handleUpdateConfig({ drawdownRiskThresholdEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-bg-main peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-500 peer-checked:after:bg-bg-main" />
                    </label>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] text-text-secondary leading-normal">Limit loss on any single open position.</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-text-secondary">$</span>
                      <input
                        type="number"
                        step="50"
                        min="50"
                        value={config.drawdownRiskThresholdUsd}
                        onChange={(e) => handleUpdateConfig({ drawdownRiskThresholdUsd: parseInt(e.target.value) || 400 })}
                        className="w-18 bg-bg-main border border-border-color rounded p-1 text-center font-bold text-slate-200 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Simulated Fault Injection Controls */}
                <div className="space-y-2 pt-1">
                  <span className="text-[9px] font-extrabold text-sky-400 uppercase tracking-widest block">Simulate Fault Injections</span>
                  
                  {/* Data Feed Failure */}
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-[10px] text-text-secondary">Data Feed Failure</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.dataFailureSimulationEnabled}
                        onChange={(e) => handleUpdateConfig({ dataFailureSimulationEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-bg-main peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-rose-500 peer-checked:after:bg-bg-main" />
                    </label>
                  </div>

                  {/* Broker Disconnect */}
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-[10px] text-text-secondary">Broker Disconnect</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.brokerDisconnectSimulationEnabled}
                        onChange={(e) => handleUpdateConfig({ brokerDisconnectSimulationEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-bg-main peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-rose-500 peer-checked:after:bg-bg-main" />
                    </label>
                  </div>

                  {/* Market Session Closure */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-secondary">Market Closure</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.marketClosureSimulationEnabled}
                        onChange={(e) => handleUpdateConfig({ marketClosureSimulationEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-bg-main peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-rose-500 peer-checked:after:bg-bg-main" />
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetPositions}
                  className="w-full bg-bg-main border border-slate-850 text-[10px] font-bold text-text-secondary hover:text-white py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Positions & Logs</span>
                </button>

              </div>
            )}
          </div>

          {/* Active Proposals - Interactive Warnings */}
          <div className="p-4 rounded-xl bg-bg-surface border border-border-color space-y-3">
            <h4 className="text-xs font-bold text-text-primary font-mono uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-border-color">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Pending Action Proposals ({proposals.length})</span>
            </h4>

            {proposals.length === 0 ? (
              <div className="p-6 text-center bg-bg-main/40 rounded-lg border border-slate-850 font-mono space-y-1.5">
                <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className="text-[10px] text-text-secondary font-black uppercase">All Safeguards Passed</p>
                <p className="text-[9px] text-text-secondary leading-normal">
                  All metrics reside within specified risk parameters. Toggle fault simulations above to trip alerts.
                </p>
              </div>
            ) : (
              <div className="space-y-3 font-mono">
                {proposals.map((prop) => (
                  <div
                    key={prop.id}
                    className="p-3 bg-rose-500/5 border border-rose-500/25 rounded-xl space-y-3 text-[11px] hover:border-rose-500/40 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/10 uppercase mr-1.5">
                          {prop.safeguardType}
                        </span>
                        <strong className="text-slate-200">{prop.symbol}</strong>
                      </div>
                      <span className="text-[9px] text-text-secondary">{prop.id}</span>
                    </div>

                    <p className="text-[10px] text-text-primary leading-relaxed font-mono">
                      {prop.reason}
                    </p>

                    <div className="bg-bg-main p-2 rounded text-[9px] text-text-secondary border border-slate-850 space-y-1">
                      <span className="text-[8px] font-extrabold text-emerald-400 uppercase tracking-widest block">Risk Assessment Checked</span>
                      <p>{prop.riskCheckResult.message}</p>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleExecuteSafeguard(prop)}
                        disabled={executingProposalId !== null}
                        className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black py-1.5 rounded text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all"
                      >
                        {executingProposalId === prop.id ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Clearing Position...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>Approve & Clear Risk</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Tabbed Workspace: Active Positions Desk, History, and Detailed Pipeline Logs */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Main Position Dashboard */}
          <div className="p-5 rounded-2xl bg-bg-surface border border-border-color space-y-4">
            <h3 className="text-xs font-black text-slate-200 font-mono uppercase tracking-wider flex items-center justify-between border-b border-border-color pb-2.5">
              <span className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Live Open Position Registry ({positions.length})</span>
              </span>
              <span className="text-[9px] text-text-secondary uppercase tracking-widest font-normal">Real-Time Fluctuation Active</span>
            </h3>

            {positions.length === 0 ? (
              <div className="p-16 text-center bg-bg-main/30 rounded-xl border border-slate-850/60 font-mono space-y-2">
                <Layers className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
                <p className="text-xs text-text-secondary font-extrabold uppercase tracking-widest">No Active Positions in Book</p>
                <p className="text-[10px] text-text-secondary leading-relaxed max-w-sm mx-auto">
                  All positions have been exited or reconciled. Click "Reset Positions" on the configuration sidebar to seed simulated active positions.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto font-mono">
                <table className="w-full text-left text-xs text-text-primary">
                  <thead>
                    <tr className="border-b border-border-color text-[10px] text-text-secondary uppercase font-black">
                      <th className="py-2.5 px-3">Ticket / Inst</th>
                      <th className="py-2.5 px-2">Side / Size</th>
                      <th className="py-2.5 px-2">Avg Entry</th>
                      <th className="py-2.5 px-2">Current Price</th>
                      <th className="py-2.5 px-2 text-right">Exposure</th>
                      <th className="py-2.5 px-2 text-right">Margin Required</th>
                      <th className="py-2.5 px-3 text-right">Unrealized P/L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60 text-[11px]">
                    {positions.map((pos) => {
                      const isSelected = selectedPosition?.id === pos.id;
                      return (
                        <tr
                          key={pos.id}
                          onClick={() => setSelectedPosition(pos)}
                          className={`hover:bg-bg-hover/40 cursor-pointer transition-all ${
                            isSelected ? 'bg-bg-hover/70 border-l-2 border-sky-400' : ''
                          }`}
                        >
                          {/* Ticket / Inst */}
                          <td className="py-3 px-3">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-slate-100">{pos.symbol}</span>
                              <span className="text-[9px] text-text-secondary font-mono">{pos.id}</span>
                            </div>
                          </td>

                          {/* Side / Size */}
                          <td className="py-3 px-2">
                            <div className="flex flex-col">
                              <span className={`text-[9px] font-black w-10 text-center rounded px-1 ${
                                pos.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {pos.side}
                              </span>
                              <span className="text-[10px] text-text-primary font-bold mt-0.5">{pos.quantity} Lots</span>
                            </div>
                          </td>

                          {/* Avg Entry */}
                          <td className="py-3 px-2 text-slate-200 font-bold font-mono">
                            ${pos.avgEntryPrice.toLocaleString()}
                          </td>

                          {/* Current Price */}
                          <td className="py-3 px-2 text-slate-200 font-bold font-mono">
                            ${pos.currentPrice.toLocaleString()}
                          </td>

                          {/* Exposure */}
                          <td className="py-3 px-2 text-right text-text-primary font-bold font-mono">
                            ${pos.exposureUsd.toLocaleString()}
                          </td>

                          {/* Required Margin */}
                          <td className="py-3 px-2 text-right text-text-secondary font-bold font-mono">
                            ${pos.requiredMarginUsd.toLocaleString()}
                          </td>

                          {/* Unrealized P/L */}
                          <td className={`py-3 px-3 text-right font-black font-mono text-sm ${
                            pos.unrealizedPl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {pos.unrealizedPl >= 0 ? '+' : ''}${pos.unrealizedPl.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detailed Position Ownership Metrics - Appears when a Position Row is clicked */}
          <AnimatePresence>
            {selectedPosition && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="p-4 bg-bg-surface border border-border-color rounded-xl space-y-3 font-mono text-xs"
              >
                <div className="flex justify-between items-center border-b border-border-color pb-2">
                  <h4 className="font-bold text-slate-200">Ownership & Allocation Analysis: {selectedPosition.id}</h4>
                  <button
                    onClick={() => setSelectedPosition(null)}
                    className="text-[9px] bg-bg-main text-text-secondary hover:text-white px-2 py-0.5 rounded border border-slate-850"
                  >
                    Close Detal
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px]">
                  <div className="p-2.5 bg-bg-main rounded border border-slate-850 space-y-1">
                    <span className="text-text-secondary uppercase font-black block text-[8px]">Account Ownership</span>
                    <span className="text-slate-200 font-bold flex items-center gap-1">
                      <User className="w-3 h-3 text-sky-400" />
                      {selectedPosition.accountId}
                    </span>
                  </div>

                  <div className="p-2.5 bg-bg-main rounded border border-slate-850 space-y-1">
                    <span className="text-text-secondary uppercase font-black block text-[8px]">Strategy Origin</span>
                    <span className="text-sky-400 font-extrabold uppercase">
                      {selectedPosition.strategyId}
                    </span>
                  </div>

                  <div className="p-2.5 bg-bg-main rounded border border-slate-850 space-y-1">
                    <span className="text-text-secondary uppercase font-black block text-[8px]">Held Duration</span>
                    <span className="text-slate-200 font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {Math.round((new Date().getTime() - new Date(selectedPosition.openedAt).getTime()) / 60000)} MIN
                    </span>
                  </div>

                  <div className="p-2.5 bg-bg-main rounded border border-slate-850 space-y-1">
                    <span className="text-text-secondary uppercase font-black block text-[8px]">Target Leverage</span>
                    <span className="text-emerald-400 font-bold">1:100 (Primary)</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Safeguard Execution Flow and Audit Inspector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Visual Action Logger */}
            <div className="p-4 rounded-xl bg-bg-surface border border-border-color space-y-3 font-mono">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border-color pb-2">
                <Server className="w-4 h-4 text-sky-400" />
                <span>Audited Actions History ({actionsHistory.length})</span>
              </h4>

              {actionsHistory.length === 0 ? (
                <p className="text-[10px] text-text-secondary py-6 text-center">
                  No automated safeguards have executed on this session yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {actionsHistory.map((act) => {
                    const isSel = selectedAction?.id === act.id;
                    return (
                      <div
                        key={act.id}
                        onClick={() => setSelectedAction(act)}
                        className={`p-2.5 rounded-lg border text-[10px] cursor-pointer transition-all ${
                          isSel ? 'bg-bg-hover border-sky-500/80' : 'bg-bg-main border-slate-850 hover:bg-bg-surface'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-emerald-400 font-bold">{act.safeguardType} EXIT</span>
                          <span className="text-[8px] text-text-secondary">{new Date(act.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[9.5px] text-text-secondary truncate leading-relaxed">
                          {act.reason}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Audit Log Details Inspector */}
            <div className="p-4 rounded-xl bg-bg-surface border border-border-color space-y-3 font-mono">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border-color pb-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Audit Trail Inspector</span>
              </h4>

              {selectedAction ? (
                <div className="space-y-2.5 text-[10px] leading-relaxed">
                  <div className="flex justify-between border-b border-slate-850 pb-1.5">
                    <span className="text-text-secondary">ACTION LOG ID</span>
                    <strong className="text-sky-400">{selectedAction.id}</strong>
                  </div>

                  <div>
                    <span className="text-text-secondary uppercase font-black block text-[8px] mb-0.5">1. Decision & Reason</span>
                    <p className="p-2 bg-bg-main rounded text-text-primary border border-slate-850">
                      <strong>{selectedAction.decision}</strong>: {selectedAction.reason}
                    </p>
                  </div>

                  <div>
                    <span className="text-text-secondary uppercase font-black block text-[8px] mb-0.5">2. Pre-Action Risk Check</span>
                    <p className={`p-2 rounded border ${
                      selectedAction.riskCheckResult.status === 'PASS' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
                    }`}>
                      {selectedAction.riskCheckResult.message}
                    </p>
                  </div>

                  {selectedAction.executionRequest && (
                    <div>
                      <span className="text-text-secondary uppercase font-black block text-[8px] mb-0.5">3. Unified Execution Request</span>
                      <div className="p-2 bg-bg-main rounded border border-slate-850 text-text-secondary space-y-1">
                        <div>ID: <strong className="text-slate-200">{selectedAction.executionRequest.requestId}</strong></div>
                        <div>Order: <strong className="text-slate-200">{selectedAction.executionRequest.side} {selectedAction.executionRequest.quantity} Lots {selectedAction.symbol} @ {selectedAction.executionRequest.type}</strong></div>
                      </div>
                    </div>
                  )}

                  {selectedAction.executionResult && (
                    <div>
                      <span className="text-text-secondary uppercase font-black block text-[8px] mb-0.5">4. Execution Result & Verification</span>
                      <div className="p-2 bg-bg-main rounded border border-slate-850 text-text-secondary space-y-1">
                        <div>Status: <strong className={selectedAction.executionResult.success ? 'text-emerald-400' : 'text-rose-400'}>{selectedAction.executionResult.success ? 'FILLED / CONFIRMED' : 'FAILED'}</strong></div>
                        {selectedAction.executionResult.fillPrice && (
                          <div>Fill Price: <strong className="text-slate-200">${selectedAction.executionResult.fillPrice}</strong></div>
                        )}
                        <div>Details: <span className="text-text-primary">{selectedAction.executionResult.message}</span></div>
                      </div>
                    </div>
                  )}

                  <div className="text-text-secondary text-[9px] text-right">
                    Verifiable event dispatched to observability engine.
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center bg-bg-main/30 rounded-lg border border-slate-850 text-text-secondary text-[10px]">
                  Select an executed safeguard action log on the left to inspect the structured decision, pre-trade risk check, execution requests, and raw broker results.
                </div>
              )}
            </div>

          </div>

          {/* Realized Profit & Loss Record */}
          <div className="p-4 rounded-xl bg-bg-surface border border-border-color space-y-3 font-mono text-xs">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border-color pb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Realized Session Closed Profit/Loss History ({realizedPlHistory.length})</span>
            </h4>

            {realizedPlHistory.length === 0 ? (
              <p className="text-[10px] text-text-secondary py-3 text-center">
                No realized P/L records recorded.
              </p>
            ) : (
              <div className="divide-y divide-slate-850/60 max-h-[160px] overflow-y-auto">
                {realizedPlHistory.map((item, idx) => (
                  <div key={idx} className="py-2 flex justify-between items-center text-[11px]">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-slate-200">{item.symbol}</strong>
                        <span className="text-[9px] text-text-secondary">{new Date(item.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <span className="text-[9px] text-text-secondary font-mono italic">Reason: {item.reason}</span>
                    </div>
                    <span className={`font-black ${item.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.amount >= 0 ? '+' : ''}${item.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
