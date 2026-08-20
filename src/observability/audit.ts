/**
 * AppexQuant Markets Global - Centralized Audit Logging Service
 */

import { AuditEvent, AuditEventType } from '../types/audit.ts';
import { createCorrelationId } from '../types/api.ts';
import { logger } from './logger.ts';

const inMemoryAuditLogs: AuditEvent[] = [];

export function logAuditEvent(
  eventType: AuditEventType,
  userId: string,
  details: Record<string, unknown>,
  accountId?: string
): AuditEvent {
  const cleanAccountId = (typeof accountId === 'string' && accountId.trim().length > 0) ? accountId.trim() : undefined;

  // Phase 5 Invariant: ACCOUNT_CONNECTED CAN NEVER be emitted with undefined, null, empty, or unverified accountId
  let effectiveEventType = eventType;
  if (eventType === 'ACCOUNT_CONNECTED') {
    if (!cleanAccountId || cleanAccountId.length < 3) {
      logger.error('CRITICAL DATA INTEGRITY VIOLATION: ACCOUNT_CONNECTED attempted with invalid/missing accountId. Converting to ACCOUNT_CONNECTION_FAILED.', {
        userId,
        receivedAccountId: accountId,
      });
      effectiveEventType = 'ACCOUNT_CONNECTION_FAILED';
      details = {
        ...details,
        rejectionReason: 'INVALID_OR_MISSING_ACCOUNT_ID',
        originalEventType: 'ACCOUNT_CONNECTED',
      };
    }
  }

  const event: AuditEvent = {
    id: createCorrelationId(),
    eventType: effectiveEventType,
    userId,
    accountId: cleanAccountId,
    details,
    timestamp: new Date().toISOString(),
  };

  inMemoryAuditLogs.unshift(event);
  if (inMemoryAuditLogs.length > 200) {
    inMemoryAuditLogs.pop();
  }

  logger.info(`Audit Event [${effectiveEventType}]`, { eventId: event.id, userId, accountId: cleanAccountId });
  return event;
}

export function getAuditLogs(): AuditEvent[] {
  return [...inMemoryAuditLogs];
}
