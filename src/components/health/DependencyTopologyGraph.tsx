/**
 * AppexQuant Markets Global - Service Dependency Topology Visualizer
 * Renders interactive graph of Quant Pipelines & Core Infrastructure with cascading impact highlights.
 */

import React, { useState } from 'react';
import { MonitoredService, ServiceId, HealthStatus } from '../../types/health.ts';
import { ServiceStatusBadge } from './ServiceStatusBadge.tsx';
import {
  ArrowDown,
  ArrowRight,
  Database,
  Activity,
  Zap,
  ShieldCheck,
  Cpu,
  Globe,
  Bot,
  Bell,
  HardDrive,
  PowerOff,
  AlertTriangle,
} from 'lucide-react';

interface DependencyTopologyGraphProps {
  services: MonitoredService[];
  onSelectService: (serviceId: ServiceId) => void;
  onUpdateStatus: (serviceId: ServiceId, status: HealthStatus) => void;
}

export const DependencyTopologyGraph: React.FC<DependencyTopologyGraphProps> = ({
  services,
  onSelectService,
  onUpdateStatus,
}) => {
  const [selectedNode, setSelectedNode] = useState<ServiceId | null>(null);

  const getServiceMap = () => {
    const map: Record<string, MonitoredService> = {};
    services.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  };

  const serviceMap = getServiceMap();

  const getNodeIcon = (id: ServiceId) => {
    switch (id) {
      case 'market_data':
        return <Activity className="w-5 h-5 text-cyan-400" />;
      case 'automation_engine':
        return <Bot className="w-5 h-5 text-purple-400" />;
      case 'risk_engine':
        return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      case 'execution_engine':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'broker_connections':
        return <Globe className="w-5 h-5 text-sky-400" />;
      case 'api':
        return <Cpu className="w-5 h-5 text-indigo-400" />;
      case 'database':
        return <Database className="w-5 h-5 text-blue-400" />;
      case 'ai_services':
        return <Cpu className="w-5 h-5 text-pink-400" />;
      case 'alert_service':
        return <Bell className="w-5 h-5 text-amber-300" />;
      case 'background_workers':
        return <HardDrive className="w-5 h-5 text-teal-400" />;
      default:
        return <Activity className="w-5 h-5 text-text-secondary" />;
    }
  };

  const quantPipelineSequence: ServiceId[] = [
    'market_data',
    'automation_engine',
    'risk_engine',
    'execution_engine',
    'broker_connections',
  ];

  const renderNodeCard = (id: ServiceId, label: string) => {
    const s = serviceMap[id];
    if (!s) return null;

    const isSelected = selectedNode === id;
    const hasActiveCircuit = s.circuitBreaker && s.circuitBreaker.isTriggered;
    const isFailed = s.effectiveStatus === 'CRITICAL' || s.effectiveStatus === 'OFFLINE';
    const isDegraded = s.effectiveStatus === 'WARNING' || s.effectiveStatus === 'DEGRADED';

    return (
      <div
        onClick={() => {
          setSelectedNode(id);
          onSelectService(id);
        }}
        className={`relative cursor-pointer transition-all p-4 rounded-2xl border flex flex-col justify-between shadow-xl min-w-[200px] sm:min-w-[220px] ${
          isFailed
            ? 'bg-[#1D1119] border-rose-500/80 shadow-rose-950/40'
            : isDegraded
            ? 'bg-[#1E1812] border-amber-500/80 shadow-amber-950/40'
            : isSelected
            ? 'bg-[#131E2E] border-cyan-400 shadow-cyan-950/40 ring-1 ring-cyan-400'
            : 'bg-[#111622] border-border-color hover:border-border-color'
        }`}
      >
        {/* Active Circuit Breaker Pulse Ring */}
        {hasActiveCircuit && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 z-20">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-[#111622]" />
          </span>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-[#0B0E14] border border-border-color">{getNodeIcon(id)}</div>
            <ServiceStatusBadge status={s.effectiveStatus} size="sm" />
          </div>

          <div>
            <h4 className="font-bold text-sm text-white font-mono">{s.name}</h4>
            <p className="text-[10px] text-text-secondary font-mono">Latency: {s.latencyMs}ms</p>
          </div>
        </div>

        {/* Bottom Details */}
        <div className="mt-3 pt-2 border-t border-border-color/80 flex items-center justify-between text-[10px] font-mono text-text-secondary">
          <span>Queue: {s.queueDepth}</span>
          <span>Err: {s.errorRatePercent.toFixed(1)}%</span>
        </div>

        {/* Downstream Response Trigger Warning Banner */}
        {hasActiveCircuit && (
          <div className="mt-2 text-[9px] font-mono font-bold text-rose-400 bg-rose-950/60 p-1.5 rounded border border-rose-800 text-center uppercase tracking-tight">
            CIRCUIT BREAKER: {s.circuitBreaker?.mode}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 rounded-2xl bg-[#111622] border border-border-color shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-color pb-4">
        <div>
          <h3 className="text-base font-extrabold text-white font-mono flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Service Dependency Topology Flow
          </h3>
          <p className="text-xs text-text-secondary mt-1">
            Visual cascade map. When an upstream service degrades or fails, downstream automation and circuit breakers automatically trigger safety modes.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-text-primary">Healthy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-text-primary">Degraded/Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-text-primary">Critical/Circuit Breaker</span>
          </div>
        </div>
      </div>

      {/* PIPELINE 1: QUANT AUTOMATION SEQUENCE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
            Pipeline 1: Quant Trading Execution Highway
          </span>
          <span className="text-[11px] text-text-secondary font-mono">Sequential Upstream → Downstream Data Flow</span>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 overflow-x-auto p-4 rounded-2xl bg-[#0B0E14] border border-border-color/80">
          {quantPipelineSequence.map((id, index) => {
            const isLast = index === quantPipelineSequence.length - 1;
            const currentService = serviceMap[id];
            const isDownstreamImpacted = currentService && currentService.effectiveStatus !== 'HEALTHY';

            return (
              <React.Fragment key={id}>
                {renderNodeCard(id, currentService?.name || id)}
                {!isLast && (
                  <div className="flex flex-col lg:flex-row items-center justify-center text-slate-600 shrink-0 py-2 lg:py-0">
                    <ArrowDown className="w-5 h-5 lg:hidden text-cyan-500/60" />
                    <ArrowRight className={`hidden lg:block w-6 h-6 ${isDownstreamImpacted ? 'text-amber-400 animate-pulse' : 'text-cyan-500/60'}`} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* PIPELINE 2: INFRASTRUCTURE & SUPPORT SERVICES STACK */}
      <div className="space-y-3 pt-4 border-t border-border-color/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono">
            Pipeline 2: Core Infrastructure & Support Stack
          </span>
          <span className="text-[11px] text-text-secondary font-mono">Persistence, API Gateway & Support Workers</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4 rounded-2xl bg-[#0B0E14] border border-border-color/80">
          {renderNodeCard('database', 'Database Storage')}
          {renderNodeCard('api', 'API Gateway')}
          {renderNodeCard('ai_services', 'AI Services')}
          {renderNodeCard('alert_service', 'Alert Service')}
          {renderNodeCard('background_workers', 'Background Workers')}
        </div>
      </div>
    </div>
  );
};
