/**
 * AppexQuant Markets Global - Anti-Tilt Circuit Breaker & Panic Lock Component
 * Real-time capital protection, cooling-off countdown timer & drawdown controls.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  AlertTriangle,
  Clock,
  Settings,
  Flame,
  RotateCcw,
  Zap,
} from 'lucide-react';
import {
  CircuitBreakerState,
  AntiTiltConfig,
} from '../../types/riskGuardrails.ts';
import {
  getOrCreateCircuitBreakerState,
  updateCircuitBreakerConfig,
  triggerCircuitBreaker,
  overrideCircuitBreaker,
  evaluateTradeAndEquity,
} from '../../services/riskGuardrailsService.ts';
import { Button } from '../ui/Button.tsx';

interface AntiTiltCircuitBreakerProps {
  accountId: string;
  currentEquity?: number;
  onLockStateChange?: (isLocked: boolean) => void;
}

export const AntiTiltCircuitBreaker: React.FC<AntiTiltCircuitBreakerProps> = ({
  accountId,
  currentEquity = 10000,
  onLockStateChange,
}) => {
  const [state, setState] = useState<CircuitBreakerState>(() =>
    getOrCreateCircuitBreakerState(accountId, currentEquity),
  );
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Local config form state
  const [tempConfig, setTempConfig] = useState<AntiTiltConfig>(state.config);

  // Sync state & timer
  useEffect(() => {
    const timer = setInterval(() => {
      const updated = getOrCreateCircuitBreakerState(accountId, currentEquity);
      setState({ ...updated });
      if (onLockStateChange) {
        onLockStateChange(updated.isOrderEntryLocked);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [accountId, currentEquity, onLockStateChange]);

  const handleTriggerPanic = () => {
    const updated = triggerCircuitBreaker(accountId, 'MANUAL_PANIC_LOCK', 2);
    setState({ ...updated });
    if (onLockStateChange) onLockStateChange(true);
  };

  const handleSimulateLoss = (lossPct: number) => {
    const simulatedEquity = state.dayStartEquity * (1 - lossPct / 100);
    const updated = evaluateTradeAndEquity(accountId, simulatedEquity, -100, 2);
    setState({ ...updated });
    if (onLockStateChange) onLockStateChange(updated.isOrderEntryLocked);
  };

  const handleSaveConfig = () => {
    const updated = updateCircuitBreakerConfig(accountId, tempConfig);
    setState({ ...updated });
    setIsConfigOpen(false);
  };

  const handleUnlock = () => {
    const res = overrideCircuitBreaker(accountId, passcode, 'User Manual Emergency Reset');
    if (res.success) {
      setState({ ...res.state });
      setIsUnlockModalOpen(false);
      setPasscode('');
      setUnlockError(null);
      if (onLockStateChange) onLockStateChange(false);
    } else {
      setUnlockError(res.message);
    }
  };

  const formatCountdown = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLocked = state.isOrderEntryLocked;

  return (
    <div className={`p-5 rounded-2xl border transition-all ${isLocked ? 'bg-rose-950/20 border-rose-500/30' : 'bg-surface-primary border-border-subtle'}`}>
      {/* Top Status Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl border ${isLocked ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
            {isLocked ? <Lock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text-primary">Anti-Tilt Smart Circuit Breaker</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${isLocked ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                {isLocked ? 'LOCKED OUT' : 'ARMED & MONITORING'}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              {isLocked
                ? `Order entry locked to protect capital. Cooldown active.`
                : `Maximum daily drawdown guard: ${state.config.maxDailyLossPct}% ($${state.config.maxDailyLossUsd})`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="p-2 rounded-xl bg-surface-secondary text-text-secondary hover:text-text-primary hover:bg-surface-secondary/80 border border-border-subtle transition-colors"
            title="Configure Guardrails"
          >
            <Settings className="w-4 h-4" />
          </button>

          {isLocked ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUnlockModalOpen(true)}
              className="text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
            >
              <Unlock className="w-3.5 h-3.5 mr-1" />
              Emergency Reset
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerPanic}
              className="text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
            >
              <Flame className="w-3.5 h-3.5 mr-1" />
              Panic Lock
            </Button>
          )}
        </div>
      </div>

      {/* Lockout Active Countdown Banner */}
      {isLocked && (
        <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-rose-400 animate-spin" />
            <div>
              <div className="text-xs font-bold text-rose-400">Cooling-Off Cooldown Active</div>
              <div className="text-[11px] text-text-secondary">
                Manual trade entry is locked until the timer expires. Existing positions and stop-losses remain fully active.
              </div>
            </div>
          </div>

          <div className="font-mono text-lg font-bold text-rose-400 bg-black/40 px-3 py-1 rounded-lg border border-rose-500/20">
            {formatCountdown(state.remainingCooldownSeconds)}
          </div>
        </div>
      )}

      {/* Real-time Metrics Grid */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-surface-secondary/40 rounded-xl border border-border-subtle">
          <div className="text-[10px] text-text-secondary font-semibold uppercase">Daily Loss Limit</div>
          <div className="text-xs font-mono font-bold text-text-primary mt-1">
            {state.config.maxDailyLossPct}% (${state.config.maxDailyLossUsd})
          </div>
        </div>

        <div className="p-3 bg-surface-secondary/40 rounded-xl border border-border-subtle">
          <div className="text-[10px] text-text-secondary font-semibold uppercase">Current Drawdown</div>
          <div className={`text-xs font-mono font-bold mt-1 ${state.currentDrawdownPct > state.config.maxDailyLossPct * 0.75 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {state.currentDrawdownPct}% (${Math.max(0, state.dayStartEquity - state.currentEquity).toFixed(2)})
          </div>
        </div>

        <div className="p-3 bg-surface-secondary/40 rounded-xl border border-border-subtle">
          <div className="text-[10px] text-text-secondary font-semibold uppercase">Loss Streak</div>
          <div className={`text-xs font-mono font-bold mt-1 ${state.consecutiveLossesCount >= state.config.maxConsecutiveLosses - 1 ? 'text-amber-400' : 'text-text-primary'}`}>
            {state.consecutiveLossesCount} / {state.config.maxConsecutiveLosses} Trades
          </div>
        </div>

        <div className="p-3 bg-surface-secondary/40 rounded-xl border border-border-subtle">
          <div className="text-[10px] text-text-secondary font-semibold uppercase">Cooldown Duration</div>
          <div className="text-xs font-mono font-bold text-text-primary mt-1">
            {state.config.lockoutDurationMinutes} Minutes
          </div>
        </div>
      </div>

      {/* Simulator Quick Controls (for instant validation) */}
      <div className="mt-4 pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-text-secondary font-mono text-[11px] flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" /> Test Guardrails:
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSimulateLoss(2.0)}
            className="px-2.5 py-1 rounded bg-surface-secondary border border-border-subtle hover:bg-surface-secondary/80 text-[11px] text-text-secondary"
          >
            Simulate 2% DD
          </button>
          <button
            onClick={() => handleSimulateLoss(4.5)}
            className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-[11px] text-rose-400 font-semibold"
          >
            Simulate 4.5% Breach (Lock)
          </button>
        </div>
      </div>

      {/* Configuration Drawer/Panel */}
      {isConfigOpen && (
        <div className="mt-4 p-4 bg-surface-secondary/40 rounded-xl border border-border-subtle space-y-3 animate-fadeIn">
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Guardrail Settings</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-text-secondary font-semibold">Max Daily Loss (%)</label>
              <input
                type="number"
                step="0.5"
                value={tempConfig.maxDailyLossPct}
                onChange={(e) => setTempConfig({ ...tempConfig, maxDailyLossPct: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 p-2 bg-surface-primary border border-border-subtle rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-secondary font-semibold">Max Consecutive Losses</label>
              <input
                type="number"
                value={tempConfig.maxConsecutiveLosses}
                onChange={(e) => setTempConfig({ ...tempConfig, maxConsecutiveLosses: parseInt(e.target.value) || 1 })}
                className="w-full mt-1 p-2 bg-surface-primary border border-border-subtle rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-secondary font-semibold">Lockout Duration (Mins)</label>
              <input
                type="number"
                value={tempConfig.lockoutDurationMinutes}
                onChange={(e) => setTempConfig({ ...tempConfig, lockoutDurationMinutes: parseInt(e.target.value) || 10 })}
                className="w-full mt-1 p-2 bg-surface-primary border border-border-subtle rounded-lg text-xs font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsConfigOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSaveConfig}>Save Guardrails</Button>
          </div>
        </div>
      )}

      {/* Emergency Unlock Modal */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-surface-primary border border-rose-500/30 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Emergency Circuit Breaker Override</h3>
                <p className="text-xs text-text-secondary">Enter the authorization passcode (Default: 8899)</p>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="password"
                placeholder="Enter 4-digit Passcode (8899)"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full p-3 bg-surface-secondary border border-border-subtle rounded-xl text-center font-mono text-lg tracking-widest text-text-primary focus:outline-none focus:border-rose-500"
              />
              {unlockError && (
                <p className="text-xs text-rose-400 text-center font-medium">{unlockError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsUnlockModalOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleUnlock} className="bg-rose-500 hover:bg-rose-600">
                Authorize Override
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
