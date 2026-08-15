/**
 * AppexQuant Markets Global - Automation Control Center View
 * Complete, transparent automation management view with live status, controls (START, PAUSE, RESUME, EMERGENCY HALT),
 * Active Strategies table, and clickable Automation Event Stream with decision chain inspector.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { automationControlService } from '../services/automationControlService.ts';
import {
  SystemAutomationStatus,
  ActiveStrategy,
  AutomationStreamEvent,
  TradeDecisionChain,
} from '../types/automationControl.ts';
import { ActiveStrategiesTable } from '../components/automation/ActiveStrategiesTable.tsx';
import { AutomationEventStream } from '../components/automation/AutomationEventStream.tsx';
import { DecisionChainModal } from '../components/automation/DecisionChainModal.tsx';
import { CollapsibleText } from '../components/common/CollapsibleText.tsx';
import { StatusPill } from '../components/ui/StatusPill.tsx';
import {
  Bot,
  Play,
  Pause,
  RotateCcw,
  AlertOctagon,
  ShieldCheck,
  Zap,
  Activity,
  Cpu,
  Sliders,
  Sparkles,
  Server,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ListFilter,
} from 'lucide-react';

export const AutomationControlCenterView: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemAutomationStatus>(
    automationControlService.getStatus()
  );
  const [strategies, setStrategies] = useState<ActiveStrategy[]>(
    automationControlService.getStrategies()
  );
  const [events, setEvents] = useState<AutomationStreamEvent[]>(
    automationControlService.getEvents()
  );
  const [selectedTradeChain, setSelectedTradeChain] = useState<TradeDecisionChain | null>(null);
  const [mobileTab, setMobileTab] = useState<'ALL' | 'ALGOS' | 'EVENTS'>('ALL');

  // Sync state from engine
  const refreshEngineData = () => {
    setSystemStatus(automationControlService.getStatus());
    setStrategies(automationControlService.getStrategies());
    setEvents(automationControlService.getEvents());
  };

  useEffect(() => {
    refreshEngineData();
    const unsubscribe = automationControlService.subscribe(refreshEngineData);
    return () => unsubscribe();
  }, []);

  // Controls
  const handleStart = () => {
    automationControlService.setStatus('RUNNING');
  };

  const handlePause = () => {
    automationControlService.setStatus('PAUSED');
  };

  const handleResume = () => {
    automationControlService.setStatus('RUNNING');
  };

  const handleEmergencyHalt = () => {
    automationControlService.setStatus('EMERGENCY_HALTED');
  };

  const handleToggleStrategy = (id: string) => {
    automationControlService.toggleStrategyStatus(id);
  };

  const handleTriggerStrategy = (id: string) => {
    automationControlService.triggerSimulatedTrade(id);
  };

  const handleTriggerTestTrade = () => {
    automationControlService.triggerSimulatedTrade();
  };

  const handleClearEvents = () => {
    automationControlService.clearEvents();
  };

  const getStatusIndicator = () => {
    switch (systemStatus) {
      case 'RUNNING':
        return <StatusPill label="Execution Active" type="success" pulse size="sm" />;
      case 'PAUSED':
        return <StatusPill label="Execution Paused" type="warning" size="sm" />;
      case 'STOPPED':
        return <StatusPill label="Execution Stopped" type="neutral" size="sm" />;
      case 'EMERGENCY_HALTED':
      default:
        return <StatusPill label="Emergency Halted" type="danger" pulse size="sm" />;
    }
  };

  const activeAlgosCount = strategies.filter((s) => s.status === 'ACTIVE').length;
  const totalPnl = strategies.reduce((acc, s) => acc + s.pnlUsd, 0);
  const totalOrders = strategies.reduce((acc, s) => acc + s.ordersToday, 0);

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Emergency Halt Banner if Halted */}
      {systemStatus === 'EMERGENCY_HALTED' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 sm:p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-6 h-6 text-rose-500 dark:text-rose-400 shrink-0 animate-pulse" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-rose-800 dark:text-rose-200">Emergency safety lock active</h4>
              <p className="text-[11px] text-rose-600 dark:text-rose-300/80 font-sans">
                All strategy execution loops are paused for account protection. Open positions remain monitored.
              </p>
            </div>
          </div>
          <button
            onClick={handleStart}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shrink-0 cursor-pointer shadow-md min-h-[44px] flex items-center justify-center"
          >
            Clear Lock & Resume
          </button>
        </motion.div>
      )}

      {/* TOP HEADER: SYSTEM AUTOMATION STATUS */}
      <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-bg-surface border border-border-color shadow-sm space-y-4 sm:space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border-color pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-semibold">
                Automation Status
              </span>
              {getStatusIndicator()}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2">
              <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-500 dark:text-cyan-400" />
              Automation Control Center
            </h1>
            <CollapsibleText
              text="Automated strategy execution orchestrator with real-time decision chain auditability and risk compliance boundaries."
              maxChars={80}
              className="text-xs text-text-secondary font-sans"
            />
          </div>

          {/* Quick Metrics Bar Above the Fold */}
          <div className="grid grid-cols-3 gap-2 w-full md:w-auto text-xs bg-bg-main p-2.5 rounded-xl border border-border-color">
            <div className="text-center px-2 border-r border-border-color">
              <span className="text-text-secondary text-[11px] font-medium block">Active Algos</span>
              <span className="text-xs sm:text-sm font-bold font-mono text-cyan-600 dark:text-cyan-400">
                {activeAlgosCount}/{strategies.length}
              </span>
            </div>
            <div className="text-center px-2 border-r border-border-color">
              <span className="text-text-secondary text-[11px] font-medium block">Orders Today</span>
              <span className="text-xs sm:text-sm font-bold font-mono text-text-primary">{totalOrders}</span>
            </div>
            <div className="text-center px-2">
              <span className="text-text-secondary text-[11px] font-medium block">Auto P/L</span>
              <span className={`text-xs sm:text-sm font-bold font-mono ${totalPnl >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* CONTROLS: START, PAUSE, RESUME, EMERGENCY HALT */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-text-secondary block">
            System Execution Controls
          </span>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
            {/* START */}
            <button
              onClick={handleStart}
              disabled={systemStatus === 'RUNNING'}
              className={`py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border min-h-[44px] ${
                systemStatus === 'RUNNING'
                  ? 'bg-bg-hover text-text-secondary border-border-color cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>Start</span>
            </button>

            {/* PAUSE */}
            <button
              onClick={handlePause}
              disabled={systemStatus === 'PAUSED' || systemStatus === 'EMERGENCY_HALTED'}
              className={`py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border min-h-[44px] ${
                systemStatus === 'PAUSED' || systemStatus === 'EMERGENCY_HALTED'
                  ? 'bg-bg-hover text-text-secondary border-border-color cursor-not-allowed'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/30'
              }`}
            >
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </button>

            {/* RESUME */}
            <button
              onClick={handleResume}
              disabled={systemStatus === 'RUNNING'}
              className={`py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border min-h-[44px] ${
                systemStatus === 'RUNNING'
                  ? 'bg-bg-hover text-text-secondary border-border-color cursor-not-allowed'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500 shadow-sm'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Resume</span>
            </button>

            {/* EMERGENCY HALT */}
            <button
              onClick={handleEmergencyHalt}
              disabled={systemStatus === 'EMERGENCY_HALTED'}
              className={`col-span-2 sm:col-span-1 sm:ml-auto py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border min-h-[44px] ${
                systemStatus === 'EMERGENCY_HALTED'
                  ? 'bg-bg-hover text-text-secondary border-border-color cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-sm'
              }`}
            >
              <AlertOctagon className="w-4 h-4" />
              <span>Emergency Halt</span>
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE TAB CONTROLS (Rule 6: Tabs for dense information) */}
      <div className="flex md:hidden items-center justify-between gap-1 p-1 rounded-xl bg-[#080B10] border border-border-color text-xs">
        <button
          onClick={() => setMobileTab('ALL')}
          className={`flex-1 py-2 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${
            mobileTab === 'ALL'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-text-secondary hover:text-text-secondary'
          }`}
        >
          All Panels
        </button>
        <button
          onClick={() => setMobileTab('ALGOS')}
          className={`flex-1 py-2 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${
            mobileTab === 'ALGOS'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-text-secondary hover:text-text-secondary'
          }`}
        >
          Active Algos ({strategies.length})
        </button>
        <button
          onClick={() => setMobileTab('EVENTS')}
          className={`flex-1 py-2 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${
            mobileTab === 'EVENTS'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-text-secondary hover:text-text-secondary'
          }`}
        >
          Event Stream
        </button>
      </div>

      {/* ACTIVE STRATEGIES SECTION */}
      {(mobileTab === 'ALL' || mobileTab === 'ALGOS') && (
        <ActiveStrategiesTable
          strategies={strategies}
          onToggleStrategy={handleToggleStrategy}
          onTriggerStrategy={handleTriggerStrategy}
        />
      )}

      {/* AUTOMATION EVENT STREAM SECTION */}
      {(mobileTab === 'ALL' || mobileTab === 'EVENTS') && (
        <AutomationEventStream
          events={events}
          onSelectTradeChain={(chain) => setSelectedTradeChain(chain)}
          onTriggerTestTrade={handleTriggerTestTrade}
          onClearEvents={handleClearEvents}
          isSystemRunning={systemStatus === 'RUNNING'}
        />
      )}

      {/* DECISION CHAIN INSPECTOR MODAL */}
      <DecisionChainModal
        tradeChain={selectedTradeChain}
        onClose={() => setSelectedTradeChain(null)}
      />
    </div>
  );
};
