/**
 * AppexQuant Markets Global - Global Fail-Safe System Control & Audit Modal
 * Provides complete control, live subsystem health monitoring, 10-trigger simulation,
 * incident history telemetry, and safety reset verification.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { failSafeEngineService } from '../../services/failSafeEngineService.js';
import {
  FailSafeState,
  FailSafeTriggerType,
  SubsystemHealth,
} from '../../types/failSafe.js';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Activity,
  Cpu,
  Database,
  Lock,
  Terminal,
  CheckCircle2,
  ZapOff,
  Radio,
  Sliders,
  History,
  FileCheck,
  Zap,
} from 'lucide-react';

interface FailSafeControlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FailSafeControlModal: React.FC<FailSafeControlModalProps> = ({ isOpen, onClose }) => {
  const [failSafeState, setFailSafeState] = useState<FailSafeState>(failSafeEngineService.getState());
  const [activeTab, setActiveTab] = useState<'SUBSYSTEMS' | 'SIMULATOR' | 'INCIDENTS' | 'RESET'>('SUBSYSTEMS');
  const [userSignature, setUserSignature] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = failSafeEngineService.subscribe((newState) => {
      setFailSafeState(newState);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const handleSimulate = (triggerType: FailSafeTriggerType) => {
    failSafeEngineService.simulateTrigger(triggerType);
    setActiveTab('INCIDENTS');
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = failSafeEngineService.resetFailSafe({
      userSignature,
      resolutionNotes,
      bypassChecksAcknowledged: true,
    });

    if (res.success) {
      setResetMessage({ type: 'success', text: res.message });
      setUserSignature('');
      setResolutionNotes('');
      setTimeout(() => setResetMessage(null), 4000);
    } else {
      setResetMessage({ type: 'error', text: res.message });
    }
  };

  const isEmergency = failSafeState.status === 'EMERGENCY_HALTED';
  const isPaused = failSafeState.status === 'PAUSED';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0D121D] border border-border-color/80 shadow-2xl overflow-hidden font-sans my-4"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-[#111622] via-[#161c2c] to-[#111622] border-b border-border-color flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-2xl border ${
                  isEmergency
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : isPaused
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}
              >
                {isEmergency ? (
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                ) : isPaused ? (
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                ) : (
                  <ShieldCheck className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-white">Global Fail-Safe Control System</h3>
                  <span
                    className={`text-[10px] font-mono px-2.5 py-0.5 rounded font-extrabold uppercase border ${
                      isEmergency
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : isPaused
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {failSafeState.status}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  Fail-Closed Capital Protection Engine • 10 Triggers Monitored
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-bg-hover hover:bg-bg-hover text-text-secondary hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center gap-2 bg-[#0B0E14] px-5 py-2.5 border-b border-border-color text-xs shrink-0">
            {[
              { id: 'SUBSYSTEMS', label: '10 Subsystem Monitors', icon: <Activity className="w-3.5 h-3.5 text-cyan-400" /> },
              { id: 'SIMULATOR', label: 'Trigger Simulator Lab', icon: <ZapOff className="w-3.5 h-3.5 text-amber-400" /> },
              { id: 'INCIDENTS', label: `Incident History (${failSafeState.incidentHistory.length})`, icon: <History className="w-3.5 h-3.5 text-purple-400" /> },
              { id: 'RESET', label: 'Safety Reset & Recovery', icon: <RotateCcw className="w-3.5 h-3.5 text-emerald-400" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                    : 'bg-bg-surface/60 text-text-secondary border-border-color hover:text-slate-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB 1: 10 SUBSYSTEM MONITORS */}
            {activeTab === 'SUBSYSTEMS' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#111622] border border-border-color flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white">Fail-Closed Enforcement:</span>
                    <span className="text-emerald-300 font-mono">ACTIVE (Orders default to REJECT if risk/subsystem is degraded)</span>
                  </div>
                  <span className="text-text-secondary text-[11px] font-mono">
                    Last check: {new Date(failSafeState.lastEvaluatedAtIso).toLocaleTimeString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.values(failSafeState.subsystems).map((sub: SubsystemHealth) => (
                    <div
                      key={sub.id}
                      className="p-4 rounded-2xl bg-[#111622] border border-border-color flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              sub.status === 'OPERATIONAL'
                                ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                                : sub.status === 'DEGRADED'
                                ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
                                : 'bg-rose-500 shadow-sm shadow-rose-500/50'
                            }`}
                          />
                          <span className="text-xs font-bold text-white">{sub.name}</span>
                        </div>
                        <p className="text-[11px] text-text-secondary">{sub.details}</p>
                      </div>

                      <div className="text-right font-mono text-[11px] shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded font-extrabold text-[10px] uppercase border ${
                            sub.status === 'OPERATIONAL'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : sub.status === 'DEGRADED'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {sub.status}
                        </span>
                        <div className="text-text-secondary text-[10px] mt-1">{sub.latencyMs} ms</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: TRIGGER SIMULATOR LAB */}
            {activeTab === 'SIMULATOR' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                  <h4 className="font-bold flex items-center gap-2 text-amber-300">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Fail-Safe Trigger Test Laboratory
                  </h4>
                  <p className="mt-1 text-text-primary">
                    Click any of the 10 failure scenarios below to simulate real-time fail-safe protection.
                    Notice how automation immediately pauses or halts and fails CLOSED (blocking new orders).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    {
                      type: 'RISK_ENGINE_FAILURE',
                      label: '1. Risk-Engine Failure',
                      desc: 'Simulate Risk Engine Service Unreachable / Timeout. Fails closed: Order rejected.',
                      severity: 'CRITICAL',
                    },
                    {
                      type: 'CRITICAL_MARKET_DATA_FAILURE',
                      label: '2. Critical Market-Data Failure',
                      desc: 'Simulate WebSocket ticker disconnect / stale feed (>3s delay). Emergency halt.',
                      severity: 'EMERGENCY',
                    },
                    {
                      type: 'BROKER_FAILURE',
                      label: '3. Broker Gateway Failure',
                      desc: 'Simulate FIX Adapter connection drop to Deriv/MT5 server. Emergency halt.',
                      severity: 'EMERGENCY',
                    },
                    {
                      type: 'EXCESSIVE_LOSSES',
                      label: '4. Excessive Losses Trigger',
                      desc: 'Simulate max daily drawdown breach (-$1,250.00 / 3.00% cap). Pause automation.',
                      severity: 'CRITICAL',
                    },
                    {
                      type: 'EXCESSIVE_ORDER_FREQUENCY',
                      label: '5. Excessive Order Frequency',
                      desc: 'Simulate runaway algorithm burst (>10 orders/sec). Pause automation.',
                      severity: 'CRITICAL',
                    },
                    {
                      type: 'DUPLICATE_ORDER_DETECTION',
                      label: '6. Duplicate Order Detection',
                      desc: 'Simulate identical order idempotency hash submitted within 100ms. Pause automation.',
                      severity: 'WARNING',
                    },
                    {
                      type: 'POSITION_RECONCILIATION_FAILURE',
                      label: '7. Position Reconciliation Failure',
                      desc: 'Simulate mismatch between broker open positions and local ledger. Emergency halt.',
                      severity: 'EMERGENCY',
                    },
                    {
                      type: 'DATABASE_INCONSISTENCY',
                      label: '8. Database Inconsistency',
                      desc: 'Simulate transaction log checksum error / corrupt ledger state. Emergency halt.',
                      severity: 'EMERGENCY',
                    },
                    {
                      type: 'EXECUTION_ENGINE_FAILURE',
                      label: '9. Execution-Engine Failure',
                      desc: 'Simulate order queue deadlock or dispatch exception. Emergency halt.',
                      severity: 'EMERGENCY',
                    },
                    {
                      type: 'SYSTEM_INTEGRITY_FAILURE',
                      label: '10. System Integrity Failure',
                      desc: 'Simulate memory exhaustion or heartbeat ping drop. Emergency halt.',
                      severity: 'EMERGENCY',
                    },
                  ].map((item) => (
                    <button
                      key={item.type}
                      onClick={() => handleSimulate(item.type as FailSafeTriggerType)}
                      className="p-4 rounded-2xl bg-[#111622] border border-border-color hover:border-amber-500/50 hover:bg-[#151c2c] transition-all text-left space-y-2 cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                          {item.label}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${
                            item.severity === 'EMERGENCY'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : item.severity === 'CRITICAL'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          }`}
                        >
                          {item.severity}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: INCIDENT HISTORY */}
            {activeTab === 'INCIDENTS' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-400" />
                  Fail-Safe Incident & Telemetry Log
                </h4>

                {failSafeState.incidentHistory.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#111622] border border-border-color text-center text-text-secondary text-xs">
                    No fail-safe incidents recorded. System running normally.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {failSafeState.incidentHistory.map((inc) => (
                      <div
                        key={inc.id}
                        className="p-4 rounded-2xl bg-[#111622] border border-border-color space-y-2 text-xs font-mono"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                inc.severity === 'EMERGENCY'
                                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              }`}
                            >
                              {inc.triggerType}
                            </span>
                            <span className="text-text-secondary text-[11px]">{inc.displayTime}</span>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              inc.resolved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400 animate-pulse'
                            }`}
                          >
                            {inc.resolved ? `RESOLVED BY ${inc.resolvedBy}` : 'ACTIVE TRIGGER'}
                          </span>
                        </div>

                        <div className="text-sm font-bold text-white">{inc.reason}</div>

                        <div className="text-text-secondary text-[11px] flex items-center gap-4 pt-1 border-t border-border-color/80">
                          <span>Action Taken: <strong className="text-amber-400">{inc.actionTaken}</strong></span>
                          <span>New Orders: <strong className="text-rose-400">BLOCKED (Fail-Closed)</strong></span>
                          <span>Positions: <strong className="text-emerald-400">MONITORED</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: SAFETY RESET & RECOVERY */}
            {activeTab === 'RESET' && (
              <div className="space-y-4 max-w-xl mx-auto">
                <div className="p-4 rounded-2xl bg-[#111622] border border-border-color space-y-2 text-xs">
                  <h4 className="font-bold text-white flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-emerald-400" />
                    Fail-Safe Safety Reset Protocol
                  </h4>
                  <p className="text-text-secondary">
                    To reset the fail-safe system back to HEALTHY and resume automated order execution, you must acknowledge the root cause resolution and provide a digital signature.
                  </p>
                </div>

                {resetMessage && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                      resetMessage.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{resetMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-primary">Resolution Notes & Cause Identification</label>
                    <textarea
                      required
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Describe resolution steps taken (e.g. Risk engine restarted, market feed connection re-established)..."
                      className="w-full h-24 p-3 rounded-xl bg-[#0B0E14] border border-border-color text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-primary">Trader Digital Signature</label>
                    <input
                      type="text"
                      required
                      value={userSignature}
                      onChange={(e) => setUserSignature(e.target.value)}
                      placeholder="Type full name or Trader ID (e.g. Appex Trader / CR-7849201)"
                      className="w-full p-3 rounded-xl bg-[#0B0E14] border border-border-color text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-bg-main font-extrabold text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirm Safety Reset & Restore Automation</span>
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-[#111622] border-t border-border-color flex items-center justify-between text-xs shrink-0 font-mono">
            <span className="text-text-secondary">
              System Fail-Closed Safeguard: <strong className="text-emerald-400">ACTIVE</strong>
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-bg-hover hover:bg-bg-hover text-slate-200 font-bold transition-colors cursor-pointer"
            >
              Close Panel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
