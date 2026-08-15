/**
 * AppexQuant Markets Global - Monitored Service Health Card
 * Displays status, latency, uptime, heartbeat, error rate, queue depth, jobs, dependencies & circuit breakers.
 */

import React, { useState } from 'react';
import { MonitoredService, HealthStatus } from '../../types/health.ts';
import { ServiceStatusBadge } from './ServiceStatusBadge.tsx';
import {
  Activity,
  Clock,
  Gauge,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';

interface ServiceCardProps {
  service: MonitoredService;
  onStatusChange: (status: HealthStatus) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onStatusChange }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const formatTimeAgo = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 5) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    return `${Math.floor(diffMin / 60)}h ago`;
  };

  const statusOptions: HealthStatus[] = ['HEALTHY', 'DEGRADED', 'WARNING', 'CRITICAL', 'OFFLINE'];

  return (
    <div
      className={`rounded-2xl p-5 border transition-all space-y-4 shadow-lg ${
        service.effectiveStatus === 'CRITICAL' || service.effectiveStatus === 'OFFLINE'
          ? 'bg-[#181119] border-rose-500/40 shadow-rose-950/20'
          : service.effectiveStatus === 'WARNING' || service.effectiveStatus === 'DEGRADED'
          ? 'bg-[#191612] border-amber-500/40 shadow-amber-950/20'
          : 'bg-[#111622] border-border-color/90 hover:border-border-color'
      }`}
    >
      {/* Header: Service Name, Category & Status Badge */}
      <div className="flex items-start justify-between gap-3 border-b border-border-color/80 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white font-mono">{service.name}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-bg-hover text-text-secondary font-mono uppercase font-semibold border border-border-color">
              {service.category.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-text-secondary line-clamp-2">{service.description}</p>
        </div>

        {/* Status Dropdown Trigger */}
        <div className="relative shrink-0">
          <div className="flex items-center gap-2">
            <ServiceStatusBadge status={service.effectiveStatus} />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 rounded bg-bg-hover hover:bg-bg-hover text-text-primary transition-colors cursor-pointer"
              title="Simulate / Change Status"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Status Simulation Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-9 z-30 w-44 rounded-xl bg-[#0B0E14] border border-border-color shadow-2xl p-1 font-mono text-xs space-y-1">
              <div className="text-[10px] text-text-secondary px-2 py-1 font-bold uppercase">Set Service Status</div>
              {statusOptions.map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    onStatusChange(st);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                    service.status === st
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  <span>{st}</span>
                  {service.status === st && <span className="text-cyan-400">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 8 Mandated Display Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        {/* Metric 1: Latency */}
        <div className="p-2.5 rounded-xl bg-[#0B0E14] border border-border-color/80 space-y-0.5">
          <span className="text-[10px] text-text-secondary uppercase flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-400" /> Latency
          </span>
          <span className="text-sm font-bold text-white block">{service.latencyMs} ms</span>
        </div>

        {/* Metric 2: Uptime */}
        <div className="p-2.5 rounded-xl bg-[#0B0E14] border border-border-color/80 space-y-0.5">
          <span className="text-[10px] text-text-secondary uppercase flex items-center gap-1">
            <Gauge className="w-3 h-3 text-emerald-400" /> Uptime
          </span>
          <span className="text-sm font-bold text-emerald-400 block">{service.uptimePercent}%</span>
        </div>

        {/* Metric 3: Error Rate */}
        <div className="p-2.5 rounded-xl bg-[#0B0E14] border border-border-color/80 space-y-0.5">
          <span className="text-[10px] text-text-secondary uppercase flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> Error Rate
          </span>
          <span
            className={`text-sm font-bold block ${
              service.errorRatePercent > 1.0 ? 'text-rose-400' : 'text-slate-200'
            }`}
          >
            {service.errorRatePercent.toFixed(2)}%
          </span>
        </div>

        {/* Metric 4: Queue Depth */}
        <div className="p-2.5 rounded-xl bg-[#0B0E14] border border-border-color/80 space-y-0.5">
          <span className="text-[10px] text-text-secondary uppercase flex items-center gap-1">
            <Layers className="w-3 h-3 text-sky-400" /> Queue Depth
          </span>
          <span className="text-sm font-bold text-sky-300 block">{service.queueDepth} pending</span>
        </div>
      </div>

      {/* Heartbeat & Job Telemetry */}
      <div className="space-y-2 text-xs font-mono bg-[#0B0E14] p-3 rounded-xl border border-border-color/80">
        {/* Heartbeat */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-text-secondary flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" /> Last Heartbeat:
          </span>
          <span className="text-slate-200 font-bold">{formatTimeAgo(service.lastHeartbeat)}</span>
        </div>

        {/* Last Successful Job */}
        <div className="flex items-start gap-1.5 text-[11px] pt-1 border-t border-border-color/60">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-text-secondary block text-[10px]">LAST SUCCESSFUL JOB</span>
            <span className="text-text-primary font-medium">{service.lastSuccessfulJob.description}</span>
          </div>
          <span className="text-text-secondary text-[10px] shrink-0">
            {formatTimeAgo(service.lastSuccessfulJob.timestamp)}
          </span>
        </div>

        {/* Last Failed Job */}
        <div className="flex items-start gap-1.5 text-[11px] pt-1 border-t border-border-color/60">
          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-text-secondary block text-[10px]">LAST FAILED JOB</span>
            {service.lastFailedJob ? (
              <div>
                <span className="text-rose-300 font-bold block">{service.lastFailedJob.description}</span>
                <span className="text-text-secondary text-[10px]">{service.lastFailedJob.errorReason}</span>
              </div>
            ) : (
              <span className="text-text-secondary italic">None (0 execution failures recorded)</span>
            )}
          </div>
          {service.lastFailedJob && (
            <span className="text-text-secondary text-[10px] shrink-0">
              {formatTimeAgo(service.lastFailedJob.timestamp)}
            </span>
          )}
        </div>
      </div>

      {/* Dependencies & Downstream Dependents */}
      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
        <div>
          <span className="text-text-secondary uppercase block mb-1">Upstream Dependencies:</span>
          {service.upstreamDependencies.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {service.upstreamDependencies.map((dep) => (
                <span key={dep} className="px-1.5 py-0.5 rounded bg-bg-hover text-cyan-300 border border-border-color">
                  {dep}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-slate-600">None (Primary Source)</span>
          )}
        </div>

        <div>
          <span className="text-text-secondary uppercase block mb-1">Downstream Dependents:</span>
          {service.downstreamDependents.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {service.downstreamDependents.map((dep) => (
                <span key={dep} className="px-1.5 py-0.5 rounded bg-bg-hover text-sky-300 border border-border-color">
                  {dep}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-slate-600">None (Terminal Service)</span>
          )}
        </div>
      </div>

      {/* Downstream Automation Response / Circuit Breaker Banner */}
      {service.circuitBreaker && service.circuitBreaker.isTriggered && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 space-y-1 font-mono text-xs">
          <div className="flex items-center gap-1.5 text-rose-400 font-bold">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>DOWNSTREAM CIRCUIT BREAKER: {service.circuitBreaker.mode}</span>
          </div>
          <p className="text-text-primary text-[11px] leading-relaxed">{service.circuitBreaker.mitigationAction}</p>
          <div className="text-[10px] text-text-secondary">
            <strong>Reason:</strong> {service.circuitBreaker.triggerReason}
          </div>
        </div>
      )}

      {/* Cascade Note */}
      {service.cascadeImpactNote && !service.circuitBreaker && (
        <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[11px] font-mono text-amber-300 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span>{service.cascadeImpactNote}</span>
        </div>
      )}
    </div>
  );
};
