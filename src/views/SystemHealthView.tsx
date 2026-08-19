/**
 * AppexQuant Markets Global - System Health Center View
 * Comprehensive monitoring, dependency topology, downstream automation circuit breakers, and audit logging.
 */

import React, { useState, useEffect } from 'react';
import { systemHealthService } from '../services/systemHealthService.ts';
import { MonitoredService, SystemHealthMetrics, HealthLogEntry, HealthStatus, ServiceId } from '../types/health.ts';
import { ServiceStatusBadge } from '../components/health/ServiceStatusBadge.tsx';
import { ServiceCard } from '../components/health/ServiceCard.tsx';
import { DependencyTopologyGraph } from '../components/health/DependencyTopologyGraph.tsx';
import { CircuitBreakerPanel } from '../components/health/CircuitBreakerPanel.tsx';
import { HealthAuditLogTable } from '../components/health/HealthAuditLogTable.tsx';
import { useGlobalState } from '../state/GlobalStateContext.tsx';
import { useSmartQuery } from '../hooks/useSmartQuery.ts';
import {
  Activity,
  ShieldAlert,
  Layers,
  Terminal,
  RefreshCw,
  Power,
  Zap,
  Gauge,
  Clock,
  AlertTriangle,
  Sparkles,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

export const SystemHealthView: React.FC = () => {
  const { dispatch } = useGlobalState();

  const [services, setServices] = useState<MonitoredService[]>(systemHealthService.getServices());
  const [metrics, setMetrics] = useState<SystemHealthMetrics>(systemHealthService.getSystemMetrics());
  const [logs, setLogs] = useState<HealthLogEntry[]>(systemHealthService.getLogs());
  const [masterEmergencyStop, setMasterEmergencyStop] = useState<boolean>(systemHealthService.getMasterEmergencyStop());

  const [activeTab, setActiveTab] = useState<'TOPOLOGY' | 'SERVICES_GRID' | 'CIRCUIT_BREAKERS' | 'AUDIT_LOGS'>('TOPOLOGY');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Smart Query for server-side edge-cached health check (Deduplicated, SWR pattern)
  const { isValidating, mutate: revalidateHealth } = useSmartQuery(
    '/api/health',
    async () => {
      const res = await fetch('/api/health');
      return res.json();
    },
    {
      dedupingInterval: 30000,
      revalidateOnFocus: false,
    }
  );

  // Subscribe to real-time service updates without high-frequency polling
  useEffect(() => {
    const unsubscribe = systemHealthService.subscribe(() => {
      setServices(systemHealthService.getServices());
      setMetrics(systemHealthService.getSystemMetrics());
      setLogs(systemHealthService.getLogs());
      setMasterEmergencyStop(systemHealthService.getMasterEmergencyStop());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleUpdateStatus = (serviceId: ServiceId, newStatus: HealthStatus) => {
    systemHealthService.updateServiceStatus(serviceId, newStatus);
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        title: 'System Health Engine',
        message: `Updated status for ${serviceId} to ${newStatus}. Downstream dependencies evaluated.`,
        type: newStatus === 'CRITICAL' || newStatus === 'OFFLINE' ? 'error' : 'info',
      },
    });
  };

  const handleRunDiagnostics = () => {
    const result = systemHealthService.runDiagnosticsProbe();
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        title: 'Diagnostic Probe',
        message: `Verified telemetry heartbeats across all ${result.checkedCount} monitored services.`,
        type: 'success',
      },
    });
  };

  const handleTriggerScenario = (scenario: 'MARKET_DATA_OUTAGE' | 'BROKER_OUTAGE' | 'DATABASE_DEGRADATION' | 'RISK_FAILURE' | 'RESTORE_ALL') => {
    systemHealthService.triggerSimulationScenario(scenario);
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        title: 'Simulation Scenario Applied',
        message: `Applied preset: ${scenario}. Observed downstream circuit breaker response.`,
        type: scenario === 'RESTORE_ALL' ? 'success' : 'warning',
      },
    });
  };

  const handleToggleMasterEmergencyStop = (active: boolean) => {
    systemHealthService.setMasterEmergencyStop(active);
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        title: 'Master Kill Switch',
        message: active ? 'EMERGENCY STOP ENGAGED: All order pipelines hard-stopped.' : 'Master Emergency Stop disarmed.',
        type: active ? 'error' : 'info',
      },
    });
  };

  const handleResetAll = () => {
    systemHealthService.resetAllServices();
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        title: 'System Restored',
        message: 'All 10 services reset to HEALTHY. Downstream circuit breakers disarmed.',
        type: 'success',
      },
    });
  };

  const filteredServices = services.filter((s) => {
    if (selectedCategoryFilter === 'ALL') return true;
    return s.category === selectedCategoryFilter;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner & Primary KPI Dashboard */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-[#131822] to-slate-900 border border-border-color shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
              <Activity className="w-7 h-7 text-cyan-400" />
              AppexQuant System Health Center
            </h1>
            <ServiceStatusBadge status={metrics.overallStatus} size="lg" />
          </div>
          <p className="text-xs text-text-secondary max-w-2xl">
            Real-time telemetry monitor across core infrastructure, quant execution engines, and broker highways. Downstream dependencies automatically enforce protective circuit breakers upon component disruption.
          </p>
        </div>

        {/* Global Control Action Bar */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleRunDiagnostics}
            className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Run Diagnostics Probe</span>
          </button>

          <button
            onClick={() => handleToggleMasterEmergencyStop(!masterEmergencyStop)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
              masterEmergencyStop
                ? 'bg-rose-600 hover:bg-rose-500 text-text-primary shadow-rose-900/40 ring-2 ring-rose-400'
                : 'bg-bg-hover hover:bg-bg-hover text-text-secondary border border-border-color'
            }`}
          >
            <Power className="w-4 h-4 text-rose-400" />
            <span>{masterEmergencyStop ? 'EMERGENCY STOP ACTIVE' : 'MASTER KILL SWITCH'}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="p-4 rounded-xl bg-[#111622] border border-border-color space-y-1">
          <span className="text-text-secondary text-[10px] uppercase block">Monitored Services</span>
          <div className="text-lg font-bold text-text-primary flex items-center gap-1.5">
            <span>{metrics.totalServices} / {metrics.totalServices}</span>
            <span className="text-xs text-emerald-400 font-normal">({metrics.healthyCount} OK)</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111622] border border-border-color space-y-1">
          <span className="text-text-secondary text-[10px] uppercase block">Average Latency</span>
          <div className="text-lg font-bold text-cyan-400">{metrics.avgLatencyMs} ms</div>
        </div>

        <div className="p-4 rounded-xl bg-[#111622] border border-border-color space-y-1">
          <span className="text-text-secondary text-[10px] uppercase block">System Uptime</span>
          <div className="text-lg font-bold text-emerald-400">{metrics.systemUptimePercent}%</div>
        </div>

        <div className="p-4 rounded-xl bg-[#111622] border border-border-color space-y-1">
          <span className="text-text-secondary text-[10px] uppercase block">Active Circuit Breakers</span>
          <div className={`text-lg font-bold ${metrics.activeCircuitBreakersCount > 0 ? 'text-amber-400' : 'text-text-secondary'}`}>
            {metrics.activeCircuitBreakersCount} Triggered
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111622] border border-border-color space-y-1">
          <span className="text-text-secondary text-[10px] uppercase block">Degraded / Critical</span>
          <div className={`text-lg font-bold ${metrics.criticalCount > 0 ? 'text-rose-400' : 'text-text-secondary'}`}>
            {metrics.criticalCount + metrics.offlineCount + metrics.degradedCount} Services
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111622] border border-border-color space-y-1">
          <span className="text-text-secondary text-[10px] uppercase block">Diagnostics Refresh</span>
          <div className="text-xs font-bold text-text-secondary flex items-center gap-1 mt-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>10s Auto Pulse</span>
          </div>
        </div>
      </div>

      {/* Preset Simulation Control Bar */}
      <div className="p-4 rounded-2xl bg-[#0B0E14] border border-border-color space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Simulate Failure Modes & Test Downstream Automation Responses
          </span>
          <span className="text-[10px] text-text-secondary">Test how downstream services isolate failures</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleTriggerScenario('MARKET_DATA_OUTAGE')}
            className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Simulate Market Data Disruption</span>
          </button>

          <button
            onClick={() => handleTriggerScenario('BROKER_OUTAGE')}
            className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Simulate Broker Disconnect</span>
          </button>

          <button
            onClick={() => handleTriggerScenario('DATABASE_DEGRADATION')}
            className="px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Simulate DB Storage Outage</span>
          </button>

          <button
            onClick={() => handleTriggerScenario('RISK_FAILURE')}
            className="px-3 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30 font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Simulate Risk Engine Exception</span>
          </button>

          <button
            onClick={handleResetAll}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Restore All Systems (100% Healthy)</span>
          </button>
        </div>
      </div>

      {/* Main View Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-color pb-3">
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          {[
            { id: 'TOPOLOGY', label: 'Dependency Topology', icon: <Activity className="w-4 h-4" /> },
            { id: 'SERVICES_GRID', label: `All Monitored Services (${services.length})`, icon: <Layers className="w-4 h-4" /> },
            {
              id: 'CIRCUIT_BREAKERS',
              label: `Circuit Breakers (${metrics.activeCircuitBreakersCount})`,
              icon: <ShieldAlert className="w-4 h-4 text-amber-400" />,
            },
            { id: 'AUDIT_LOGS', label: 'Health Event Audit Log', icon: <Terminal className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'bg-[#111622] text-text-secondary border border-border-color/80 hover:text-text-secondary'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: DEPENDENCY TOPOLOGY */}
      {activeTab === 'TOPOLOGY' && (
        <DependencyTopologyGraph
          services={services}
          onSelectService={(id) => {
            setActiveTab('SERVICES_GRID');
          }}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* TAB 2: MONITORED SERVICES GRID */}
      {activeTab === 'SERVICES_GRID' && (
        <div className="space-y-6">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-text-secondary text-[11px] font-bold uppercase mr-1">Filter Category:</span>
            {[
              { id: 'ALL', label: 'All Services (10)' },
              { id: 'core_infrastructure', label: 'Core Infrastructure' },
              { id: 'quant_engine', label: 'Quant Execution Engine' },
              { id: 'support_services', label: 'Support Services' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                  selectedCategoryFilter === cat.id
                    ? 'bg-bg-hover text-cyan-300 border-cyan-500/40'
                    : 'bg-[#111622] text-text-secondary border-border-color hover:text-text-secondary'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid of Service Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onStatusChange={(status) => handleUpdateStatus(service.id, status)}
              />
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CIRCUIT BREAKERS & DOWNSTREAM RESPONSES */}
      {activeTab === 'CIRCUIT_BREAKERS' && (
        <CircuitBreakerPanel
          services={services}
          masterEmergencyStop={masterEmergencyStop}
          onToggleMasterEmergencyStop={handleToggleMasterEmergencyStop}
          onResetAllServices={handleResetAll}
        />
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'AUDIT_LOGS' && <HealthAuditLogTable logs={logs} />}
    </div>
  );
};
