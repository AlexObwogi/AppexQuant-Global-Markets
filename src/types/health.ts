/**
 * AppexQuant Markets Global - System Health & Reliability Center Types
 */

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'WARNING' | 'CRITICAL' | 'OFFLINE';

export type ServiceId =
  | 'api'
  | 'database'
  | 'market_data'
  | 'broker_connections'
  | 'automation_engine'
  | 'risk_engine'
  | 'execution_engine'
  | 'ai_services'
  | 'alert_service'
  | 'background_workers';

export type ServiceCategory = 'core_infrastructure' | 'quant_engine' | 'support_services';

export interface CircuitBreakerState {
  isTriggered: boolean;
  mode: string;
  triggerReason: string;
  mitigationAction: string;
  triggeredAt: string;
  autoResumeSupported: boolean;
}

export interface MonitoredService {
  id: ServiceId;
  name: string;
  category: ServiceCategory;
  description: string;
  status: HealthStatus;
  latencyMs: number;
  uptimePercent: number;
  lastHeartbeat: string;
  errorRatePercent: number;
  queueDepth: number;
  lastSuccessfulJob: {
    description: string;
    timestamp: string;
  };
  lastFailedJob: {
    description: string;
    timestamp: string;
    errorReason: string;
  } | null;
  upstreamDependencies: ServiceId[];
  downstreamDependents: ServiceId[];
  circuitBreaker: CircuitBreakerState | null;
  effectiveStatus: HealthStatus; // Computed incorporating upstream impact
  cascadeImpactNote?: string;
}

export interface SystemHealthMetrics {
  overallStatus: HealthStatus;
  totalServices: number;
  healthyCount: number;
  degradedCount: number;
  warningCount: number;
  criticalCount: number;
  offlineCount: number;
  avgLatencyMs: number;
  systemUptimePercent: number;
  activeCircuitBreakersCount: number;
  masterEmergencyStopActive: boolean;
}

export interface HealthLogEntry {
  id: string;
  timestamp: string;
  serviceId: ServiceId;
  serviceName: string;
  previousStatus: HealthStatus;
  newStatus: HealthStatus;
  eventMessage: string;
  cascadedImpacts?: string[];
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}
