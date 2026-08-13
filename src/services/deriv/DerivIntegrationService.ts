/**
 * AppexQuant Markets Global - DerivIntegrationService (Canonical Frontend Service)
 * Acts as the strict client-side interface to backend Deriv OAuth and gateway services.
 * Prohibits local state fabrication and ensures all connection states and actions are sourced
 * exclusively from the backend server.
 */

export interface DerivOAuthConfig {
  clientId: string;
  redirectUri: string;
  authEndpoint: string;
  tokenEndpoint: string;
  scopesAllowed: string[];
  partnerAttribution: {
    affiliateToken: string;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
  };
}

export interface DerivConnectionDiagnostic {
  userId: string;
  derivAccountId: string;
  accountType: 'demo' | 'real';
  currency: string;
  connectionStatus: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'RECONNECT_REQUIRED' | 'ERROR';
  scopes: string[];
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  tokenExpiry?: string | null;
  createdAt: string;
  lastSyncedAt: string;
}

export interface DerivDiagnosticsResponse {
  oauthConfig: DerivOAuthConfig;
  activeConnectionsCount: number;
  totalRegisteredConnections: number;
  connections: DerivConnectionDiagnostic[];
}

export class DerivIntegrationService {
  /**
   * Fetch canonical Deriv integration diagnostics and connection states from backend server.
   */
  static async getDiagnostics(apiFetch: (url: string, init?: RequestInit) => Promise<Response>): Promise<{ success: boolean; data?: DerivDiagnosticsResponse; error?: string }> {
    try {
      const res = await apiFetch('/api/admin/deriv/diagnostics');
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, data: json.data };
      }
      return { success: false, error: json.error?.message || 'Server authorization denied or diagnostics unavailable.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to communicate with Deriv Integration Service backend.' };
    }
  }

  /**
   * Trigger secure OAuth reauthorization sequence on the backend.
   */
  static async initiateReauthorization(apiFetch: (url: string, init?: RequestInit) => Promise<Response>): Promise<{ success: boolean; authUrl?: string; error?: string }> {
    try {
      const res = await apiFetch('/api/deriv/oauth/init', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.authUrl) {
        return { success: true, authUrl: json.authUrl };
      }
      return { success: false, error: json.error || 'Failed to generate secure OAuth reauthorization URL.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during reauthorization initiation.' };
    }
  }

  /**
   * Revoke active user session on the backend gateway.
   */
  static async disconnectSession(apiFetch: (url: string, init?: RequestInit) => Promise<Response>, targetUserId?: string): Promise<{ success: boolean; disconnected?: boolean; error?: string }> {
    try {
      const res = await apiFetch('/api/admin/deriv/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetUserId || 'usr-default-001' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, disconnected: json.data?.disconnected };
      }
      return { success: false, error: json.error?.message || 'Failed to disconnect session.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during session revocation.' };
    }
  }
}
