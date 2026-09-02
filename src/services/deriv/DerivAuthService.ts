/**
 * AppexQuant Markets Global - DerivAuthService
 * Frontend Session Manager (Browser owns session only).
 *
 * Strict Architectural Separation:
 * - Server owns OAuth, authorize, balance subscription, account discovery, and reconnect.
 * - Browser owns session only (via session cookies, /api/auth/status, and /api/auth/session).
 * - Browser-side token authority has been completely eliminated.
 */

export type DerivAuthStatus =
  | 'NOT_CONNECTED'
  | 'AUTHORIZING'
  | 'CONNECTED'
  | 'SYNCING'
  | 'RECONNECT_REQUIRED'
  | 'ERROR';

export type BalanceCallback = (balanceData: {
  balance: number;
  currency: string;
  loginid: string;
}) => void;

export type SessionCallback = (profile: DerivAccountProfile | null) => void;

export interface DerivAccountItem {
  loginid: string;
  account_type?: string;
  currency?: string;
  is_virtual?: number;
  landing_company_name?: string;
}

export interface DerivAccountProfile {
  email?: string;
  fullname?: string;
  loginid: string;
  currency: string;
  balance: number;
  country?: string;
  is_virtual: number;
  landing_company_name?: string;
  scopes?: string[];
  userId?: number | string;
  account_list?: DerivAccountItem[];
  accountType?: 'demo' | 'real';
  connectionStatus?: DerivAuthStatus;
  lastSyncedAt?: string;
}

export class DerivAuthService {
  private status: DerivAuthStatus = 'NOT_CONNECTED';
  private profile: DerivAccountProfile | null = null;
  private balanceListeners = new Set<BalanceCallback>();
  private sessionListeners = new Set<SessionCallback>();
  private isCheckingSession = false;

  constructor() {
    // Attempt auto session check in browser environment
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.checkSession().catch(() => {});
      }, 50);
    }
  }

  /**
   * Register a callback for balance updates sourced via backend gateway.
   */
  public onBalanceChange(callback: BalanceCallback): () => void {
    this.balanceListeners.add(callback);
    if (this.profile && typeof this.profile.balance === 'number') {
      callback({
        balance: this.profile.balance,
        currency: this.profile.currency || 'USD',
        loginid: this.profile.loginid || '',
      });
    }
    return () => this.balanceListeners.delete(callback);
  }

  /**
   * Register a callback for session & profile changes.
   */
  public onSessionChange(callback: SessionCallback): () => void {
    this.sessionListeners.add(callback);
    if (this.profile) {
      callback(this.profile);
    }
    return () => this.sessionListeners.delete(callback);
  }

  /**
   * Query the canonical backend auth status (/api/auth/status or /api/auth/session).
   */
  public async checkSession(
    customFetch?: (url: string, init?: RequestInit) => Promise<Response>
  ): Promise<DerivAccountProfile | null> {
    if (this.isCheckingSession) return this.profile;
    this.isCheckingSession = true;

    const fetcher = customFetch || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetcher) {
      this.isCheckingSession = false;
      return null;
    }

    try {
      // 1. Try canonical /api/auth/status
      let res = await fetcher('/api/auth/status', {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      }).catch(() => null);

      if (!res || !res.ok) {
        // Fallback to /api/auth/deriv/status or /api/auth/session
        res = await fetcher('/api/auth/session', {
          headers: { Accept: 'application/json' },
          credentials: 'include',
        }).catch(() => null);
      }

      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        const data = json?.data || json;

        if (json?.success && (data?.authenticated || data?.connected)) {
          const user = data.user || data;
          const loginid =
            user.derivAccountId ||
            user.loginid ||
            user.accountId ||
            data.derivAccountId ||
            data.loginid ||
            data.accountId ||
            '';

          if (loginid) {
            const rawBalance = user.balance ?? data.balance ?? 0;
            const balance = typeof rawBalance === 'number' ? rawBalance : parseFloat(String(rawBalance)) || 0;
            const currency = user.currency || data.currency || 'USD';
            const isVirtual = user.accountType === 'demo' || loginid.startsWith('VR') || data.is_virtual === 1 ? 1 : 0;

            const profile: DerivAccountProfile = {
              loginid,
              email: user.email || data.email,
              fullname: user.fullName || user.displayName || data.fullName,
              currency,
              balance,
              is_virtual: isVirtual,
              landing_company_name: data.landing_company_name,
              scopes: user.scopes || data.scopes || ['trade', 'account_manage'],
              userId: user.userId || data.userId,
              account_list: data.accountList || data.account_list,
              accountType: isVirtual ? 'demo' : 'real',
              connectionStatus: 'CONNECTED',
              lastSyncedAt: data.lastSyncedAt || new Date().toISOString(),
            };

            this.status = 'CONNECTED';
            this.setProfile(profile);
            return profile;
          }
        }
      }

      // No active authenticated session
      if (this.status === 'CONNECTED') {
        this.status = 'NOT_CONNECTED';
        this.setProfile(null);
      }
      return null;
    } catch (err) {
      console.warn('[DerivAuthService] Session check warning:', err);
      return null;
    } finally {
      this.isCheckingSession = false;
    }
  }

  /**
   * Update internal profile and notify all listeners.
   */
  public setProfile(profile: DerivAccountProfile | null): void {
    this.profile = profile;
    if (profile) {
      this.status = (profile.connectionStatus as DerivAuthStatus) || 'CONNECTED';
      const balancePayload = {
        balance: profile.balance,
        currency: profile.currency || 'USD',
        loginid: profile.loginid,
      };
      this.balanceListeners.forEach((cb) => cb(balancePayload));
    } else {
      this.status = 'NOT_CONNECTED';
    }
    this.sessionListeners.forEach((cb) => cb(profile));
  }

  /**
   * Update balance sourced via backend gateway.
   */
  public updateBalance(balanceData: { balance: number; currency?: string; loginid?: string }): void {
    if (this.profile) {
      this.profile.balance = balanceData.balance;
      if (balanceData.currency) this.profile.currency = balanceData.currency;
      if (balanceData.loginid) this.profile.loginid = balanceData.loginid;
    }
    const eventData = {
      balance: balanceData.balance,
      currency: balanceData.currency || this.profile?.currency || 'USD',
      loginid: balanceData.loginid || this.profile?.loginid || '',
    };
    this.balanceListeners.forEach((cb) => cb(eventData));
  }

  /**
   * Synchronize session from backend.
   */
  public async syncSession(
    customFetch?: (url: string, init?: RequestInit) => Promise<Response>
  ): Promise<DerivAccountProfile | null> {
    const fetcher = customFetch || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetcher) return this.profile;

    try {
      this.status = 'SYNCING';
      const res = await fetcher('/api/auth/deriv/sync', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        return await this.checkSession(fetcher);
      }
    } catch (err) {
      console.warn('[DerivAuthService] Sync error:', err);
    }
    return this.checkSession(fetcher);
  }

  /**
   * Request backend to reconnect and re-verify session with Deriv gateway.
   */
  public async reconnect(
    customFetch?: (url: string, init?: RequestInit) => Promise<Response>
  ): Promise<DerivAccountProfile | null> {
    const fetcher = customFetch || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetcher) return this.profile;

    try {
      this.status = 'AUTHORIZING';
      const res = await fetcher('/api/auth/deriv/reconnect', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        return await this.checkSession(fetcher);
      }
    } catch (err) {
      console.warn('[DerivAuthService] Reconnect error:', err);
    }
    return this.checkSession(fetcher);
  }

  /**
   * Compatibility method: Token authorization is owned strictly by the backend.
   * Redirects/delegates to backend session verification.
   */
  public async authorize(_token?: string): Promise<DerivAccountProfile | null> {
    console.info('[DerivAuthService] Authorize ownership belongs to the server. Synchronizing session via backend API...');
    return await this.checkSession();
  }

  /**
   * Get active user account profile (session-owned).
   */
  public getProfile(): DerivAccountProfile | null {
    if (this.status !== 'CONNECTED' || !this.profile || !this.profile.loginid) {
      return null;
    }
    return this.profile;
  }

  /**
   * Get active connection/session status.
   */
  public getStatus(): DerivAuthStatus {
    return this.status;
  }

  /**
   * Helper check for active authenticated session.
   */
  public isAuthenticated(): boolean {
    return this.status === 'CONNECTED' && Boolean(this.profile?.loginid);
  }

  /**
   * Get active account ID (loginid).
   */
  public getAccountId(): string | null {
    return this.profile?.loginid || null;
  }

  /**
   * Token authority has been removed from the browser. Returns null.
   */
  public getToken(): string | null {
    return null;
  }

  /**
   * Log out active session.
   */
  public logout(): void {
    this.status = 'NOT_CONNECTED';
    this.profile = null;
    this.balanceListeners.clear();
    this.sessionListeners.clear();
  }
}

export const derivAuthService = new DerivAuthService();
export default derivAuthService;
