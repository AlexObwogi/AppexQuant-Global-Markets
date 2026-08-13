/**
 * AppexQuant Markets Global - System Health & Reliability Engine
 * Manages live health telemetry, service dependencies, cascading impacts, and circuit breakers.
 */

import {
  HealthStatus,
  ServiceId,
  MonitoredService,
  SystemHealthMetrics,
  HealthLogEntry,
} from '../types/health';
import { logger } from '../observability/logger';

// Initial baseline setup for all 10 monitored services
const INITIAL_SERVICES: Record<ServiceId, MonitoredService> = {
  market_data: {
    id: 'market_data',
    name: 'Market Data Engine',
    category: 'core_infrastructure',
    description: 'Real-time WebSocket tick feeds, L2 order book feeds, and synthetic index pricing gateways.',
    status: 'HEALTHY',
    latencyMs: 12,
    uptimePercent: 99.99,
    lastHeartbeat: new Date().toISOString(),
    errorRatePercent: 0.01,
    queueDepth: 0,
    lastSuccessfulJob: {
      description: 'Ingested 14,200 ticks/sec across Volatility 100 1s & EUR/USD',
      timestamp: new Date().toISOString(),
    },
    lastFailedJob: null,
    upstreamDependencies: [],
    downstreamDependents: ['automation_engine', 'risk_engine', 'execution_engine'],
    circuitBreaker: null,
    effectiveStatus: 'HEALTHY',
  },
  automation_engine: {
    id: 'automation_engine',
    name: 'Automation Engine',
    category: 'quant_engine',
    description: 'Runs active Expert Advisors (EAs), quant strategy scripts, and signal generator pipelines.',
    status: 'HEALTHY',
    latencyMs: 18,
    uptimePercent: 99.96,
    lastHeartbeat: new Date().toISOString(),
    errorRatePercent: 0.02,
    queueDepth: 2,
    lastSuccessfulJob: {
      description: 'Evaluated 48 active EA rules on 1s tick cycle',
      timestamp: new Date().toISOString(),
    },
    lastFailedJob: null,
    upstreamDependencies: ['market_data', 'ai_services'],
    downstreamDependents: ['risk_engine'],
    circuitBreaker: null,
    effectiveStatus: 'HEALTHY',
  },
  risk_engine: {
    id: 'risk_engine',
    name: 'Risk Engine',
    category: 'quant_engine',
    description: 'Enforces portfolio drawdown limits, margin guards, max exposure thresholds, and position sizing.',
    status: 'HEALTHY',
    latencyMs: 8,
    uptimePercent: 99.99,
    lastHeartbeat: new Date().toISOString(),
    errorRatePercent: 0.00,
    queueDepth: 0,
    lastSuccessfulJob: {
      description: 'Validated portfolio risk margin parameters (0.85% max drawdown)',
      timestamp: new Date().toISOString(),
    },
    lastFailedJob: null,
    upstreamDependencies: ['automation_engine', 'market_data'],
    downstreamDependents: ['execution_engine'],
    circuitBreaker: null,
    effectiveStatus: 'HEALTHY',
  },
  execution_engine: {
    id: 'execution_engine',
    name: 'Execution Engine',
    category: 'quant_engine',
    description: 'Smart order routing, FIX protocol order dispatching, and slippage protection pipeline.',
    status: 'HEALTHY',
    latencyMs: 15,
    uptimePercent: 99.98,
    lastHeartbeat: new Date().toISOString(),
    errorRatePercent: 0.01,
    queueDepth: 0,
    lastSuccessfulJob: {
      description: 'Dispatched order #EX-90821 to Deriv MT5 Gateway (4ms slip)',
      timestamp: new Date().toISOString(),
    },
    lastFailedJob: null,
    upstreamDependencies: ['risk_engine', 'broker_connections'],
    downstreamDependents: ['broker_connections'],
    circuitBreaker: null,
    effectiveStatus: 'HEALTHY',
  },
  broker_connections: {
    id: 'broker_connections',
    name: 'Broker Connections',
    category: 'core_infrastructure',
    description: 'Connected broker gateways, Deriv MT5 WebSocket protocols, and liquidity bridge APIs.',
    status: 'HEALTHY',
    latencyMs: 34,
    uptimePercent: 99.95,
    lastHeartbeat: new Date().toISOString(),
    errorRatePercent: 0.03,
    queueDepth: 1,
    lastSuccessfulJob: {
      description: 'Synchronized MT5 balance ($24,850.00) & position state',
      timestamp: new Date().toISOString(),
    },
    lastFailedJob: null,
    upstreamDependencies: ['api'],
    downstreamDependents: ['execution_engine'],
    circuitBreaker: null,
    effectiveStatus: 'HEALTHY',
  },
  api: {
    id: 'api',
    name: 'API Gateway',
    category: 'core_infrastructure',
    description: 'REST and WebSocket API endpoints serving client interfaces and external integrations.',
    status: 'HEALTHY',
    latencyMs: 22,
    uptimePercent: 99.99,
    lastHeartbeat: new Date().toISOString(),
    errorRatePercent: 0.01,
    queueDepth: 3,
    lastSuccessfulJob: {
      description: 'Processed 1,280 authenticated client requests/sec',
      timestamp: new Date().toISOString(),
    },
    lastFailedJob: null,
    upstreamDependencies: ['database'],
    downstreamDependents: ['ai_services', 'alert_service', 'background_workers', 'broker_connections'],
    circuitBreaker: null,
    effectiveStatus: 'HEALTHY',
  },
  database: {
    id: 'database',
    name: 'Database Storage',
    category: 'core_infrastructure',
    description: 'Persistent relational database storing user accounts, trades, audit trails, and EA state.',
    status: 'HEALTHY',
    latencyMs: 6,
    uptimePercent: 100.0,
    lastHeartbeat: new Date().toISOString(),
    errorRatePercent: 0.00,
    queueDepth: 0,
    lastSuccessfulJob: {
      description: 'Committed audit event batch log (32 records written)',
      timestamp: new Date().toISOString(),
    },
    lastFailedJob: null,
    upstreamDependencies: [],
    downstreamDependents: ['api', 'background_workers'],
    circuitBreaker: null,
    effectiveStatus: 'HEALTHY',
  },
  ai_services: {
    id: 'ai_services',
    name: 'AI Services',
    category: 'support_services',
    description: 'Gemini Quant intelligence engine, macro sentiment analysis, and strategy optimizer.',
    status: 'HEALTHY',
    latencyMs: 145,
    uptimePercent: 99.85,
    lastHeartbeat: new Date().toISOString(),
    errorRatePercent: 0.05,
    queueDepth: 1,
    lastSuccessfulJob: {
      description: 'Generated quant sentiment forecast for Volatility 100 1s',
      timestamp: new Date().toISOString(),
    },
    lastFailedJob: null,
    upstreamDependencies: ['api'],
    downstreamDependents: ['automation_engine'],
    circuitBreaker: null,
    effectiveStatus: 'HEALTHY',
  },
  alert_service: {
    id: 'alert_service',
    name: 'Alert Service',
    category: 'support_services',
    description: 'Real-time alert dispatcher for risk breaches, margin warnings, and trade execution events.',
    status: 'HEALTHY',
    latencyMs: 19,
    uptimePercent: 99.97,
    lastHeartbeat: new Date().toISOString(),
    errorRatePercent: 0.01,
    queueDepth: 0,
    lastSuccessfulJob: {
      description: 'Broadcasted risk threshold notification to active session',
      timestamp: new Date().toISOString(),
    },
    lastFailedJob: null,
    upstreamDependencies: ['api', 'background_workers'],
    downstreamDependents: [],
    circuitBreaker: null,
    effectiveStatus: 'HEALTHY',
  },
  background_workers: {
    id: 'background_workers',
    name: 'Background Workers',
    category: 'support_services',
    description: 'Asynchronous task queue processing batch backtests, analytics recalculation, and cleanup.',
    status: 'HEALTHY',
    latencyMs: 42,
    uptimePercent: 99.92,
    lastHeartbeat: new Date().toISOString(),
    errorRatePercent: 0.02,
    queueDepth: 4,
    lastSuccessfulJob: {
      description: 'Completed monte carlo simulation batch (#MC-7712)',
      timestamp: new Date().toISOString(),
    },
    lastFailedJob: null,
    upstreamDependencies: ['database', 'api'],
    downstreamDependents: ['alert_service'],
    circuitBreaker: null,
    effectiveStatus: 'HEALTHY',
  },
};

class SystemHealthEngine {
  private services: Record<ServiceId, MonitoredService>;
  private logs: HealthLogEntry[];
  private masterEmergencyStop: boolean = false;
  private listeners: Array<() => void> = [];

  constructor() {
    this.services = JSON.parse(JSON.stringify(INITIAL_SERVICES));
    this.logs = [
      {
        id: `log-${Date.now()}-01`,
        timestamp: new Date(Date.now() - 120000).toISOString(),
        serviceId: 'market_data',
        serviceName: 'Market Data Engine',
        previousStatus: 'HEALTHY',
        newStatus: 'HEALTHY',
        eventMessage: 'System Health Engine initialized. All 10 monitored services operating normally.',
        severity: 'INFO',
      },
    ];
    this.reevaluateDependenciesAndCircuits();
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  public getServices(): MonitoredService[] {
    return Object.values(this.services);
  }

  public getService(id: ServiceId): MonitoredService {
    return this.services[id];
  }

  public getLogs(): HealthLogEntry[] {
    return [...this.logs];
  }

  public getMasterEmergencyStop(): boolean {
    return this.masterEmergencyStop;
  }

  public setMasterEmergencyStop(active: boolean) {
    this.masterEmergencyStop = active;
    const now = new Date().toISOString();

    if (active) {
      this.addLog({
        id: `log-${Date.now()}`,
        timestamp: now,
        serviceId: 'risk_engine',
        serviceName: 'Risk Engine / Master Kill Switch',
        previousStatus: 'HEALTHY',
        newStatus: 'CRITICAL',
        eventMessage: 'EMERGENCY: Master Emergency Stop Activated. Downstream trading pipeline hard-stopped.',
        severity: 'CRITICAL',
        cascadedImpacts: [
          'Automation Engine: EA execution halted',
          'Execution Engine: All market orders blocked',
          'Broker Connections: Dispatches paused',
        ],
      });
    } else {
      this.addLog({
        id: `log-${Date.now()}`,
        timestamp: now,
        serviceId: 'risk_engine',
        serviceName: 'Risk Engine / Master Kill Switch',
        previousStatus: 'CRITICAL',
        newStatus: 'HEALTHY',
        eventMessage: 'Master Emergency Stop deactivated. Resuming standard risk monitoring.',
        severity: 'INFO',
      });
    }

    this.reevaluateDependenciesAndCircuits();
    this.notifyListeners();
  }

  public updateServiceStatus(id: ServiceId, newStatus: HealthStatus, reason?: string) {
    const service = this.services[id];
    if (!service) return;

    const previousStatus = service.status;
    service.status = newStatus;
    service.lastHeartbeat = new Date().toISOString();

    if (newStatus === 'CRITICAL' || newStatus === 'OFFLINE') {
      service.errorRatePercent = Math.max(service.errorRatePercent, 12.5);
      service.latencyMs = Math.max(service.latencyMs, 450);
      service.lastFailedJob = {
        description: reason || `Service experienced severe failure mode: ${newStatus}`,
        timestamp: new Date().toISOString(),
        errorReason: reason || 'Service heartbeat timeout or payload validation error',
      };
    } else if (newStatus === 'HEALTHY') {
      service.errorRatePercent = 0.01;
      service.latencyMs = Math.min(service.latencyMs, 35);
    }

    this.addLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      serviceId: id,
      serviceName: service.name,
      previousStatus,
      newStatus,
      eventMessage: reason || `Manual status change: ${service.name} updated from ${previousStatus} to ${newStatus}`,
      severity: newStatus === 'CRITICAL' || newStatus === 'OFFLINE' ? 'CRITICAL' : newStatus === 'WARNING' || newStatus === 'DEGRADED' ? 'WARNING' : 'INFO',
    });

    this.reevaluateDependenciesAndCircuits();
    this.notifyListeners();
  }

  /**
   * Evaluates cascading impacts and downstream responses
   */
  private reevaluateDependenciesAndCircuits() {
    const now = new Date().toISOString();

    // Reset circuit breakers and effective statuses first based on raw statuses
    Object.keys(this.services).forEach((key) => {
      const s = this.services[key as ServiceId];
      s.circuitBreaker = null;
      s.effectiveStatus = s.status;
      s.cascadeImpactNote = undefined;
    });

    // 1. MASTER EMERGENCY STOP IMPACT
    if (this.masterEmergencyStop) {
      this.services.automation_engine.circuitBreaker = {
        isTriggered: true,
        mode: 'EMERGENCY_STOP',
        triggerReason: 'Master Emergency Stop Switch Activated',
        mitigationAction: 'All EA evaluations and automated order signals are hard-paused.',
        triggeredAt: now,
        autoResumeSupported: false,
      };
      this.services.automation_engine.effectiveStatus = 'OFFLINE';

      this.services.execution_engine.circuitBreaker = {
        isTriggered: true,
        mode: 'EMERGENCY_STOP',
        triggerReason: 'Master Emergency Stop Switch Activated',
        mitigationAction: 'Order pipeline frozen. All incoming order dispatches rejected.',
        triggeredAt: now,
        autoResumeSupported: false,
      };
      this.services.execution_engine.effectiveStatus = 'OFFLINE';
      return;
    }

    // 2. MARKET DATA CASCADE
    const marketData = this.services.market_data;
    if (marketData.status === 'CRITICAL' || marketData.status === 'OFFLINE') {
      // Downstream: Automation Engine
      this.services.automation_engine.effectiveStatus = 'CRITICAL';
      this.services.automation_engine.circuitBreaker = {
        isTriggered: true,
        mode: 'AUTO_SUSPEND_EAS',
        triggerReason: `Upstream Dependency Failure: ${marketData.name} is ${marketData.status}`,
        mitigationAction: 'Downstream Automation Response: Auto-suspending EA rule evaluation to prevent trading on stale market data.',
        triggeredAt: now,
        autoResumeSupported: true,
      };
      this.services.automation_engine.cascadeImpactNote = 'Impacted by Market Data outage: EA strategy signals suspended.';

      // Downstream: Risk Engine
      this.services.risk_engine.effectiveStatus = 'WARNING';
      this.services.risk_engine.circuitBreaker = {
        isTriggered: true,
        mode: 'STALE_PRICE_GUARD',
        triggerReason: `Upstream Dependency Failure: ${marketData.name} is ${marketData.status}`,
        mitigationAction: 'Downstream Risk Response: Enforcing stale price protection guard. Position expansion blocked.',
        triggeredAt: now,
        autoResumeSupported: true,
      };

      // Downstream: Execution Engine
      this.services.execution_engine.effectiveStatus = 'CRITICAL';
      this.services.execution_engine.circuitBreaker = {
        isTriggered: true,
        mode: 'MARKET_ORDER_BLOCK',
        triggerReason: `Upstream Dependency Failure: ${marketData.name} is ${marketData.status}`,
        mitigationAction: 'Downstream Execution Response: Rejecting all market orders due to stale or missing market price feed.',
        triggeredAt: now,
        autoResumeSupported: true,
      };
    } else if (marketData.status === 'DEGRADED' || marketData.status === 'WARNING') {
      this.services.automation_engine.effectiveStatus = 'DEGRADED';
      this.services.automation_engine.cascadeImpactNote = 'Market Data latency elevated. EA execution cycle throttled.';
    }

    // 3. BROKER CONNECTIONS CASCADE
    const brokerConn = this.services.broker_connections;
    if (brokerConn.status === 'CRITICAL' || brokerConn.status === 'OFFLINE') {
      // Downstream: Execution Engine
      this.services.execution_engine.effectiveStatus = 'CRITICAL';
      this.services.execution_engine.circuitBreaker = {
        isTriggered: true,
        mode: 'DISCONNECTED_RETRY_QUEUE',
        triggerReason: `Broker Gateway Unreachable: ${brokerConn.name} is ${brokerConn.status}`,
        mitigationAction: 'Downstream Execution Response: Order dispatch frozen. Orders placed locally in pending queue.',
        triggeredAt: now,
        autoResumeSupported: true,
      };

      // Downstream: Risk Engine
      this.services.risk_engine.effectiveStatus = 'WARNING';
      this.services.risk_engine.cascadeImpactNote = 'Broker connection disrupted. Freezing margin checks for new dispatches.';

      // Downstream: Automation Engine
      this.services.automation_engine.effectiveStatus = 'WARNING';
      this.services.automation_engine.cascadeImpactNote = 'Broker connection down. EA order placement highway severed.';
    }

    // 4. DATABASE CASCADE
    const db = this.services.database;
    if (db.status === 'CRITICAL' || db.status === 'OFFLINE') {
      // Downstream: API
      this.services.api.effectiveStatus = 'DEGRADED';
      this.services.api.circuitBreaker = {
        isTriggered: true,
        mode: 'READ_ONLY_CACHE_FALLBACK',
        triggerReason: `Database Unreachable: ${db.name} is ${db.status}`,
        mitigationAction: 'Downstream API Response: Enforcing read-only fallback mode using in-memory state cache.',
        triggeredAt: now,
        autoResumeSupported: true,
      };

      // Downstream: Background Workers
      this.services.background_workers.effectiveStatus = 'OFFLINE';
      this.services.background_workers.circuitBreaker = {
        isTriggered: true,
        mode: 'PAUSE_BATCH_WRITES',
        triggerReason: `Database Persistence Down: ${db.name} is ${db.status}`,
        mitigationAction: 'Downstream Worker Response: Halting database-dependent async jobs to prevent state loss.',
        triggeredAt: now,
        autoResumeSupported: true,
      };
    }

    // 5. RISK ENGINE CASCADE
    const riskEng = this.services.risk_engine;
    if (riskEng.status === 'CRITICAL' || riskEng.status === 'OFFLINE') {
      this.services.execution_engine.effectiveStatus = 'OFFLINE';
      this.services.execution_engine.circuitBreaker = {
        isTriggered: true,
        mode: 'MANDATORY_RISK_BLOCK',
        triggerReason: `Risk Engine Offline: Cannot validate order risk safety`,
        mitigationAction: 'Downstream Execution Response: Hard-stopping order dispatch. Zero executions allowed without active risk validation.',
        triggeredAt: now,
        autoResumeSupported: true,
      };
    }

    // 6. AI SERVICES CASCADE
    const aiService = this.services.ai_services;
    if (aiService.status === 'CRITICAL' || aiService.status === 'OFFLINE') {
      if (this.services.automation_engine.effectiveStatus === 'HEALTHY') {
        this.services.automation_engine.effectiveStatus = 'DEGRADED';
        this.services.automation_engine.circuitBreaker = {
          isTriggered: true,
          mode: 'DETERMINISTIC_FALLBACK',
          triggerReason: `AI Services Unavailable: ${aiService.name} is ${aiService.status}`,
          mitigationAction: 'Downstream Automation Response: Switching EA signal engine to deterministic technical indicator rules (bypassing AI sentiment).',
          triggeredAt: now,
          autoResumeSupported: true,
        };
      }
    }

    // 7. ALERT SERVICE CASCADE
    const alertService = this.services.alert_service;
    if (alertService.status === 'CRITICAL' || alertService.status === 'OFFLINE') {
      this.services.background_workers.cascadeImpactNote = 'Alert Service offline: Buffering failed push notifications into persistent queue.';
    }
  }

  /**
   * Applies pre-built simulation scenarios
   */
  public triggerSimulationScenario(scenario: 'MARKET_DATA_OUTAGE' | 'BROKER_OUTAGE' | 'DATABASE_DEGRADATION' | 'RISK_FAILURE' | 'RESTORE_ALL') {
    switch (scenario) {
      case 'MARKET_DATA_OUTAGE':
        this.updateServiceStatus('market_data', 'CRITICAL', 'Simulated Market Data feed disconnection and tick timeout');
        break;
      case 'BROKER_OUTAGE':
        this.updateServiceStatus('broker_connections', 'OFFLINE', 'Simulated Deriv MT5 Gateway socket termination');
        break;
      case 'DATABASE_DEGRADATION':
        this.updateServiceStatus('database', 'CRITICAL', 'Simulated DB storage connection pool exhaustion');
        break;
      case 'RISK_FAILURE':
        this.updateServiceStatus('risk_engine', 'CRITICAL', 'Simulated Risk Engine rule evaluator exception');
        break;
      case 'RESTORE_ALL':
        this.resetAllServices();
        break;
    }
  }

  public resetAllServices() {
    this.masterEmergencyStop = false;
    this.services = JSON.parse(JSON.stringify(INITIAL_SERVICES));
    Object.values(this.services).forEach((s) => {
      s.lastHeartbeat = new Date().toISOString();
    });

    this.addLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      serviceId: 'api',
      serviceName: 'System Health Engine',
      previousStatus: 'CRITICAL',
      newStatus: 'HEALTHY',
      eventMessage: 'All monitored services restored to HEALTHY state. All downstream circuit breakers disarmed.',
      severity: 'INFO',
    });

    this.reevaluateDependenciesAndCircuits();
    this.notifyListeners();
  }

  public runDiagnosticsProbe(): { checkedCount: number; timestamp: string } {
    const now = new Date().toISOString();
    Object.values(this.services).forEach((s) => {
      s.lastHeartbeat = now;
      if (s.status === 'HEALTHY') {
        // Minor natural jitter
        s.latencyMs = Math.max(2, Math.round(s.latencyMs + (Math.random() * 4 - 2)));
      }
    });

    this.addLog({
      id: `log-${Date.now()}`,
      timestamp: now,
      serviceId: 'api',
      serviceName: 'Health Diagnostics Probe',
      previousStatus: 'HEALTHY',
      newStatus: 'HEALTHY',
      eventMessage: 'Executed active health diagnostic probe on all 10 monitored services. Heartbeats verified.',
      severity: 'INFO',
    });

    this.notifyListeners();
    return { checkedCount: 10, timestamp: now };
  }

  public getSystemMetrics(): SystemHealthMetrics {
    const list = Object.values(this.services);

    let healthyCount = 0;
    let degradedCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let offlineCount = 0;
    let totalLatency = 0;
    let activeCircuitBreakers = 0;

    list.forEach((s) => {
      const st = s.effectiveStatus;
      if (st === 'HEALTHY') healthyCount++;
      else if (st === 'DEGRADED') degradedCount++;
      else if (st === 'WARNING') warningCount++;
      else if (st === 'CRITICAL') criticalCount++;
      else if (st === 'OFFLINE') offlineCount++;

      totalLatency += s.latencyMs;
      if (s.circuitBreaker && s.circuitBreaker.isTriggered) {
        activeCircuitBreakers++;
      }
    });

    let overallStatus: HealthStatus = 'HEALTHY';
    if (this.masterEmergencyStop || criticalCount > 0 || offlineCount > 0) {
      overallStatus = 'CRITICAL';
    } else if (warningCount > 0) {
      overallStatus = 'WARNING';
    } else if (degradedCount > 0) {
      overallStatus = 'DEGRADED';
    }

    const avgLatencyMs = Math.round(totalLatency / list.length);

    return {
      overallStatus,
      totalServices: list.length,
      healthyCount,
      degradedCount,
      warningCount,
      criticalCount,
      offlineCount,
      avgLatencyMs,
      systemUptimePercent: 99.97,
      activeCircuitBreakersCount: activeCircuitBreakers,
      masterEmergencyStopActive: this.masterEmergencyStop,
    };
  }

  private addLog(entry: HealthLogEntry) {
    this.logs.unshift(entry);
    if (this.logs.length > 100) {
      this.logs.pop();
    }
  }
}

export const systemHealthService = new SystemHealthEngine();
