/**
 * AppexQuant Markets Global - Downstream Automation Response & Circuit Breaker Panel
 */

import React from 'react';
import { MonitoredService } from '../../types/health.js';
import {
  ShieldAlert,
  ShieldCheck,
  Power,
  RefreshCw,
  Zap,
  Bot,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface CircuitBreakerPanelProps {
  services: MonitoredService[];
  masterEmergencyStop: boolean;
  onToggleMasterEmergencyStop: (active: boolean) => void;
  onResetAllServices: () => void;
}

export const CircuitBreakerPanel: React.FC<CircuitBreakerPanelProps> = ({
  services,
  masterEmergencyStop,
  onToggleMasterEmergencyStop,
  onResetAllServices,
}) => {
  const activeBreakers = services.filter((s) => s.circuitBreaker && s.circuitBreaker.isTriggered);

  return (
    <div className="p-6 rounded-2xl bg-[#111622] border border-border-color shadow-2xl space-y-6">
      {/* Header & Global Master Kill Switch */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-color pb-4">
        <div>
          <h3 className="text-base font-extrabold text-white font-mono flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Downstream Automation Response & Circuit Breakers
          </h3>
          <p className="text-xs text-text-secondary mt-1 max-w-2xl">
            When upstream dependencies fail, downstream engines automatically enter protective isolation modes to protect account capital and prevent invalid executions.
          </p>
        </div>

        {/* Master Kill Switch Toggle */}
        <div className="flex items-center gap-3 font-mono">
          <button
            onClick={() => onToggleMasterEmergencyStop(!masterEmergencyStop)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
              masterEmergencyStop
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40 ring-2 ring-rose-400'
                : 'bg-bg-hover hover:bg-bg-hover text-slate-200 border border-border-color'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{masterEmergencyStop ? 'MASTER EMERGENCY STOP: ACTIVE' : 'ENGAGE MASTER KILL SWITCH'}</span>
          </button>

          {activeBreakers.length > 0 && (
            <button
              onClick={onResetAllServices}
              className="px-3.5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Disarm All Breakers</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Circuit Breakers List */}
      {masterEmergencyStop ? (
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/60 text-center space-y-3 font-mono">
          <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto animate-bounce" />
          <h4 className="text-base font-extrabold text-rose-300 uppercase tracking-wide">
            GLOBAL MASTER KILL SWITCH ENGAGED
          </h4>
          <p className="text-xs text-text-primary max-w-xl mx-auto leading-relaxed">
            All trading execution pipelines, automated EA signal evaluations, and broker order dispatches have been forced into HARD-STOP mode by the system administrator.
          </p>
        </div>
      ) : activeBreakers.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[#0B0E14] border border-dashed border-border-color space-y-2 font-mono">
          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-200">No Downstream Circuit Breakers Triggered</h4>
          <p className="text-xs text-text-secondary">
            All 10 services operating normally. Downstream automation safeguards are standing by in passive monitoring mode.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeBreakers.map((service) => {
            const cb = service.circuitBreaker!;
            return (
              <div
                key={service.id}
                className="p-5 rounded-2xl bg-[#181119] border border-rose-500/50 space-y-3 font-mono text-xs shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-rose-900/50 pb-2">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-rose-400" />
                    {service.name}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold uppercase text-[10px]">
                    {cb.mode}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div>
                    <strong className="text-text-secondary uppercase block text-[10px]">Trigger Reason:</strong>
                    <span className="text-slate-200">{cb.triggerReason}</span>
                  </div>

                  <div>
                    <strong className="text-text-secondary uppercase block text-[10px]">Mitigation Action Enforced:</strong>
                    <p className="text-rose-300 font-sans leading-relaxed">{cb.mitigationAction}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-rose-900/50 text-[10px] text-text-secondary">
                  <span>Triggered: {new Date(cb.triggeredAt).toLocaleTimeString()}</span>
                  <span className="text-cyan-400">Auto-Resume: {cb.autoResumeSupported ? 'ENABLED' : 'MANUAL'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
