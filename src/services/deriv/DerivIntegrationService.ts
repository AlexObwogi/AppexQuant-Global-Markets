/**
 * AppexQuant Markets Global - DerivIntegrationService (Canonical Frontend Service)
 * Acts as the strict client-side interface to backend Deriv OAuth and gateway services.
 * 
 * Strict Ownership Guarantees:
 * - Server owns OAuth, authorize, balance subscription, account discovery, and reconnect.
 * - Browser owns session only, communicating with /api/auth/status and /api/auth/session.
 * - Prohibits local token authority and ensures all connection states and actions are sourced
 *   exclusively from the backend server gateway.
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
  connectionStatus: 'CONNECTED' | 'CONNECTING' | 'SYNCING' | 'SYNC_FAILED' | 'DISCONNECTED' | 'RECONNECT_REQUIRED' | 'ERROR';
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

export interface DerivStatusData {
  authenticated: boolean;
  oauthAuthenticated?: boolean;
  accountDiscovered?: boolean;
  connected: boolean;
  derivAccountId?: string;
  loginid?: string;
  accountId?: string;
  currency?: string;
  balance?: number;
  accountType?: 'demo' | 'real';
  connectionStatus: 'CONNECTED' | 'CONNECTING' | 'SYNCING' | 'SYNC_FAILED' | 'DISCONNECTED' | 'RECONNECT_REQUIRED' | 'ERROR';
  scopes?: string[];
  lastSyncedAt?: string;
  accountList?: Array<{
    loginid: string;
    account_type: string;
    currency: string;
    is_virtual: number;
    landing_company_name: string;
  }>;
}

export interface SessionUserData {
  userId: string;
  email?: string;
  role: string;
  derivAccountId?: string;
  displayName?: string;
  fullName?: string;
  balance?: number;
  accountType?: string;
  currency?: string;
  connectionStatus?: string;
}

export interface SessionResponseData {
  authenticated: boolean;
  user?: SessionUserData;
  csrfToken?: string;
  isElevated?: boolean;
  elevatedUntil?: number;
  expiresAt?: number;
}

export class DerivIntegrationService {
  /**
   * Fetch canonical connection and authentication status from backend server (/api/auth/status).
   */
  static async getStatus(
    apiFetch: (url: string, init?: RequestInit) => Promise<Response>
  ): Promise<{ success: boolean; data?: DerivStatusData; error?: string }> {
    try {
      let res = await apiFetch('/api/auth/status');
      if (!res.ok) {
        res = await apiFetch('/api/auth/deriv/status');
      }
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, data: json.data };
      }
      return { success: false, error: json.error?.message || json.message || 'Failed to retrieve auth status.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error fetching auth status.' };
    }
  }

  /**
   * Fetch active authenticated user session (/api/auth/session).
   */
  static async getSession(
    apiFetch: (url: string, init?: RequestInit) => Promise<Response>
  ): Promise<{ success: boolean; data?: SessionResponseData; error?: string }> {
    try {
      const res = await apiFetch('/api/auth/session');
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, data: json.data };
      }
      return { success: false, error: json.error?.message || json.message || 'Failed to retrieve session.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error fetching session.' };
    }
  }

  /**
   * Fetch authoritative balance through backend gateway (/api/auth/deriv/balance).
   */
  static async getBalance(
    apiFetch: (url: string, init?: RequestInit) => Promise<Response>
  ): Promise<{ success: boolean; data?: { balance: number; currency: string; loginid: string }; error?: string }> {
    try {
      const res = await apiFetch('/api/auth/deriv/balance');
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, data: json.data };
      }
      return { success: false, error: json.error?.message || 'Failed to retrieve balance from gateway.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error fetching balance.' };
    }
  }

  /**
   * Trigger backend synchronization and account discovery.
   */
  static async syncSession(
    apiFetch: (url: string, init?: RequestInit) => Promise<Response>
  ): Promise<{ success: boolean; data?: DerivStatusData; error?: string }> {
    try {
      const res = await apiFetch('/api/auth/deriv/sync', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, data: json.data };
      }
      return { success: false, error: json.error?.message || 'Failed to synchronize Deriv session.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error syncing Deriv session.' };
    }
  }

  /**
   * Reconnect backend session with Deriv gateway.
   */
  static async reconnect(
    apiFetch: (url: string, init?: RequestInit) => Promise<Response>
  ): Promise<{ success: boolean; data?: DerivStatusData; error?: string }> {
    try {
      const res = await apiFetch('/api/auth/deriv/reconnect', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, data: json.data };
      }
      return { success: false, error: json.error?.message || 'Failed to reconnect with Deriv gateway.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during gateway reconnect.' };
    }
  }

  /**
   * Switch active Deriv account on backend.
   */
  static async switchAccount(
    apiFetch: (url: string, init?: RequestInit) => Promise<Response>,
    loginid: string
  ): Promise<{ success: boolean; data?: DerivStatusData; error?: string }> {
    try {
      const res = await apiFetch('/api/auth/deriv/switch-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginid }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, data: json.data };
      }
      return { success: false, error: json.error?.message || 'Failed to switch account.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error switching account.' };
    }
  }

  /**
   * Revoke active user session on the backend gateway.
   */
  static async disconnectSession(
    apiFetch: (url: string, init?: RequestInit) => Promise<Response>,
    targetUserId?: string
  ): Promise<{ success: boolean; disconnected?: boolean; error?: string }> {
    try {
      const endpoint = targetUserId ? '/api/admin/deriv/disconnect' : '/api/auth/deriv/disconnect';
      const body = targetUserId ? JSON.stringify({ targetUserId }) : undefined;
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body,
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, disconnected: json.data?.disconnected ?? true };
      }
      return { success: false, error: json.error?.message || 'Failed to disconnect session.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during session revocation.' };
    }
  }

  /**
   * Fetch canonical Deriv integration diagnostics and connection states from backend server.
   */
  static async getDiagnostics(
    apiFetch: (url: string, init?: RequestInit) => Promise<Response>
  ): Promise<{ success: boolean; data?: DerivDiagnosticsResponse; error?: string }> {
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
  static async initiateReauthorization(
    apiFetch: (url: string, init?: RequestInit) => Promise<Response>
  ): Promise<{ success: boolean; authUrl?: string; error?: string }> {
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
}
