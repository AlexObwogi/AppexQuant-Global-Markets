/**
 * AppexQuant Markets Global - Central Alert Engine Service (Backend/Server Side)
 */

import { Alert, AlertType, AlertSeverity, AlertChannel, UserAlertPreferences, UserAlertPreference } from '../types/alerts.ts';
import { logAuditEvent } from '../observability/audit.ts';

// In-memory store for Alerts
let alertsStore: Alert[] = [
  {
    id: 'alt-001',
    type: AlertType.BROKER_DISCONNECTED,
    severity: AlertSeverity.CRITICAL,
    source: 'Broker Connection Manager',
    message: 'Primary execution bridge disconnected from Deriv-Demo server. Network timeout after 15000ms.',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45m ago
    status: 'ACTIVE',
  },
  {
    id: 'alt-002',
    type: AlertType.RISK_THRESHOLD_REACHED,
    severity: AlertSeverity.HIGH,
    source: 'Pre-Trade Risk Engine',
    message: 'Leverage threshold warning: requested position size exceeds default policy limits (Requested: 1:500, Allowed: 1:100).',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    status: 'ACKNOWLEDGED',
    acknowledgedBy: 'trader@appexquant.global',
    acknowledgedAt: new Date(Date.now() - 1.8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'alt-003',
    type: AlertType.MARKET_DATA_STALE,
    severity: AlertSeverity.WARNING,
    source: 'Market Data Streamer',
    message: 'Stale feed detected for EUR/USD. Latency surpassed 2500ms baseline thresholds.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5m ago
    status: 'ACTIVE',
  },
  {
    id: 'alt-004',
    type: AlertType.AUTHENTICATION_EVENT,
    severity: AlertSeverity.INFO,
    source: 'Auth-System Monitor',
    message: 'OAuth authorization request received successfully from IP 185.190.140.23.',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10m ago
    status: 'ACTIVE',
  },
  {
    id: 'alt-005',
    type: AlertType.DAILY_LOSS_THRESHOLD,
    severity: AlertSeverity.CRITICAL,
    source: 'Post-Trade Guardrails',
    message: 'Daily loss of $5,000 exceeded (Current session Pl: -$5,124.80). Safeguard active.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1d ago
    status: 'ACKNOWLEDGED',
    acknowledgedBy: 'system-risk-operator',
    acknowledgedAt: new Date(Date.now() - 23.9 * 60 * 60 * 1000).toISOString(),
  },
];

// Helper to get default preferences for all types
const getDefaultPreferencesList = (): UserAlertPreference[] => {
  return Object.values(AlertType).map((type) => ({
    type,
    channels: {
      [AlertChannel.IN_APP]: true,
      [AlertChannel.PUSH]: type === AlertType.EMERGENCY_HALT || type === AlertType.SECURITY_EVENT || type === AlertType.BROKER_DISCONNECTED,
      [AlertChannel.EMAIL]: type === AlertType.EMERGENCY_HALT || type === AlertType.SECURITY_EVENT || type === AlertType.RISK_THRESHOLD_REACHED,
    },
  }));
};

// In-memory store for User Preferences
let userPreferencesStore: Record<string, UserAlertPreferences> = {
  'usr-default-001': {
    userId: 'usr-default-001',
    preferences: getDefaultPreferencesList(),
    emailConfigured: true,
    emailAddress: 'trader@appexquant.global',
    pushSupported: true,
    pushToken: 'push-tok-apx-9941-xj',
  },
};

/**
 * Get all alerts in the system
 */
export function getAlerts(): Alert[] {
  return [...alertsStore].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Trigger a new alert in the central system
 */
export function triggerAlert(
  type: AlertType,
  severity: AlertSeverity,
  source: string,
  message: string
): Alert {
  const newAlert: Alert = {
    id: `alt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type,
    severity,
    source,
    message,
    timestamp: new Date().toISOString(),
    status: 'ACTIVE',
  };

  alertsStore.unshift(newAlert);

  // Keep max 150 alerts in memory
  if (alertsStore.length > 150) {
    alertsStore = alertsStore.slice(0, 150);
  }

  // Audit Log Entry
  logAuditEvent('ADMIN_ACTION', 'system', {
    event: 'ALERT_TRIGGERED',
    alertId: newAlert.id,
    type,
    severity,
    source,
    message,
  });

  // Channels simulation
  simulateNotifications(newAlert);

  return newAlert;
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(id: string, userEmail: string): Alert | null {
  const alertIndex = alertsStore.findIndex((a) => a.id === id);
  if (alertIndex === -1) return null;

  const updatedAlert: Alert = {
    ...alertsStore[alertIndex],
    status: 'ACKNOWLEDGED',
    acknowledgedBy: userEmail,
    acknowledgedAt: new Date().toISOString(),
  };

  alertsStore[alertIndex] = updatedAlert;

  logAuditEvent('ADMIN_ACTION', 'trader', {
    event: 'ALERT_ACKNOWLEDGED',
    alertId: id,
    acknowledgedBy: userEmail,
  });

  return updatedAlert;
}

/**
 * Acknowledge all active alerts at once
 */
export function acknowledgeAllAlerts(userEmail: string): Alert[] {
  alertsStore = alertsStore.map((alert) => {
    if (alert.status === 'ACTIVE') {
      return {
        ...alert,
        status: 'ACKNOWLEDGED',
        acknowledgedBy: userEmail,
        acknowledgedAt: new Date().toISOString(),
      };
    }
    return alert;
  });

  logAuditEvent('ADMIN_ACTION', 'trader', {
    event: 'ALL_ALERTS_ACKNOWLEDGED',
    acknowledgedBy: userEmail,
  });

  return getAlerts();
}

/**
 * Get alert preferences for a specific user
 */
export function getUserPreferences(userId: string): UserAlertPreferences {
  if (!userPreferencesStore[userId]) {
    userPreferencesStore[userId] = {
      userId,
      preferences: getDefaultPreferencesList(),
      emailConfigured: false,
      emailAddress: '',
      pushSupported: false,
    };
  }
  return userPreferencesStore[userId];
}

/**
 * Update alert preferences for a specific user
 */
export function updateUserPreferences(userId: string, updatedPreferences: UserAlertPreferences): UserAlertPreferences {
  userPreferencesStore[userId] = {
    ...getUserPreferences(userId),
    ...updatedPreferences,
  };

  logAuditEvent('ADMIN_ACTION', userId, {
    event: 'ALERT_PREFERENCES_UPDATED',
  });

  return userPreferencesStore[userId];
}

/**
 * Simulates dispatching to channels (In-app, Push, Email) based on preferences.
 * Logs output to server logs and sets simulation flags.
 */
function simulateNotifications(alert: Alert) {
  // Get preferences of default user
  const prefs = getUserPreferences('usr-default-001');
  const typePref = prefs.preferences.find((p) => p.type === alert.type);

  const shouldSendInApp = typePref ? typePref.channels[AlertChannel.IN_APP] : true;
  const shouldSendPush = typePref ? typePref.channels[AlertChannel.PUSH] : false;
  const shouldSendEmail = typePref ? typePref.channels[AlertChannel.EMAIL] : false;

  console.log(`[ALERT ENGINE] 🔔 Processing Alert [${alert.id}] - ${alert.type} (${alert.severity})`);

  if (shouldSendInApp) {
    console.log(`[ALERT ENGINE] -> Channel [In-app]: Rendered dynamically inside App Notification Tray`);
  }

  if (shouldSendPush) {
    if (prefs.pushSupported && prefs.pushToken) {
      console.log(`[ALERT ENGINE] -> Channel [Push Notification]: DISPATCHED TO DEVICE TOKEN: ${prefs.pushToken}`);
    } else {
      console.log(`[ALERT ENGINE] -> Channel [Push Notification]: BLOCKED. User has not authorized push tokens or device is unsupported.`);
    }
  }

  if (shouldSendEmail) {
    if (prefs.emailConfigured && prefs.emailAddress) {
      console.log(`[ALERT ENGINE] -> Channel [Email Dispatch]: DISPATCHED TO: ${prefs.emailAddress}`);
    } else {
      console.log(`[ALERT ENGINE] -> Channel [Email Dispatch]: BLOCKED. Email delivery is unconfigured.`);
    }
  }
}
