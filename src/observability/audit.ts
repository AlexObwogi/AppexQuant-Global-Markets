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
  const event: AuditEvent = {
    id: createCorrelationId(),
    eventType,
    userId,
    accountId,
    details,
    timestamp: new Date().toISOString(),
  };

  inMemoryAuditLogs.unshift(event);
  if (inMemoryAuditLogs.length > 200) {
    inMemoryAuditLogs.pop();
  }

  logger.info(`Audit Event [${eventType}]`, { eventId: event.id, userId, accountId });
  return event;
}

export function getAuditLogs(): AuditEvent[] {
  return [...inMemoryAuditLogs];
}
