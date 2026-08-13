/**
 * AppexQuant Markets Global - Global Fail-Safe System Types
 * Enterprise-grade definitions for fail-safe triggers, system states, fail-closed interlocks,
 * subsystem health, and audit incident logs.
 */

export type FailSafeStatus = 'HEALTHY' | 'PAUSED' | 'EMERGENCY_HALTED';

export type FailSafeSeverity = 'WARNING' | 'CRITICAL' | 'EMERGENCY';

export type FailSafeAction = 'PAUSE_AUTOMATION' | 'EMERGENCY_HALT';

/**
 * The 10 Mandatory System Fail-Safe Triggers
 */
export type FailSafeTriggerType =
  | 'CRITICAL_MARKET_DATA_FAILURE'     // 1. Market feed disconnect, stale tick, abnormal price gap
  | 'BROKER_FAILURE'                   // 2. FIX socket disconnect, gateway timeout, 5xx error
  | 'DATABASE_INCONSISTENCY'           // 3. Transaction log checksum mismatch, corrupt state
  | 'RISK_ENGINE_FAILURE'              // 4. Risk service timeout, unhandled risk exception, unreachable
  | 'EXECUTION_ENGINE_FAILURE'         // 5. Order queue deadlock, memory overflow, dispatch failure
  | 'EXCESSIVE_LOSSES'                 // 6. Max daily drawdown breach, rapid equity drawdown cliff
  | 'EXCESSIVE_ORDER_FREQUENCY'        // 7. Runaway algorithm loop (>10 orders/sec burst)
  | 'DUPLICATE_ORDER_DETECTION'        // 8. Identical idempotency key or candidate order within 100ms
  | 'POSITION_RECONCILIATION_FAILURE'  // 9. Broker position count vs internal DB mismatch
  | 'SYSTEM_INTEGRITY_FAILURE';        // 10. Heartbeat ping drop, memory leak, system fault

export interface SubsystemHealth {
  id: string;
  name: string;
  subsystemKey:
    | 'market_data'
    | 'broker_gateway'
    | 'database'
    | 'risk_engine'
    | 'execution_engine'
    | 'loss_monitor'
    | 'frequency_limiter'
    | 'idempotency_shield'
    | 'position_reconciler'
    | 'system_integrity';
  status: 'OPERATIONAL' | 'DEGRADED' | 'FAILED';
  latencyMs: number;
  lastHeartbeatIso: string;
  details: string;
}

export interface FailSafeIncident {
  id: string;
  triggerType: FailSafeTriggerType;
  severity: FailSafeSeverity;
  actionTaken: FailSafeAction;
  reason: string;
  details: Record<string, any>;
  timestampIso: string;
  displayTime: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAtIso?: string;
}

export interface FailSafeState {
  status: FailSafeStatus;
  failClosedActive: boolean; // Always true: Fail-closed interlock active
  ordersBlocked: boolean;
  existingPositionsMode: 'MONITORED_AND_PROTECTED' | 'EMERGENCY_ISOLATED';
  activeIncident: FailSafeIncident | null;
  incidentHistory: FailSafeIncident[];
  subsystems: Record<string, SubsystemHealth>;
  triggerCounts: Record<FailSafeTriggerType, number>;
  lastEvaluatedAtIso: string;
}

export interface FailSafeResetRequest {
  userSignature: string;
  resolutionNotes: string;
  bypassChecksAcknowledged: boolean;
}
