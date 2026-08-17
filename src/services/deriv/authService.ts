
import { derivWs } from './DerivWebSocketManager.ts';

export type DerivAuthStatus = 'NOT_CONNECTED' | 'AUTHORIZING' | 'CONNECTED' | 'ERROR';
export type BalanceCallback = (balanceData: { balance: number; currency: string; loginid: string }) => void;

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
}

class DerivAuthService {
  private status: DerivAuthStatus = 'NOT_CONNECTED';
  private token: string | null = null;
  private profile: DerivAccountProfile | null = null;
  private balanceListeners = new Set<BalanceCallback>();

  constructor() {
    derivWs.onBalance((balanceObj) => {
      const newBal = typeof balanceObj.balance === 'number' ? balanceObj.balance : parseFloat(balanceObj.balance || '0');
      if (this.profile) {
        this.profile.balance = newBal;
        if (balanceObj.currency) this.profile.currency = balanceObj.currency;
      }
      const eventData = {
        balance: newBal,
        currency: balanceObj.currency || this.profile?.currency || 'USD',
        loginid: balanceObj.loginid || this.profile?.loginid || '',
      };
      this.balanceListeners.forEach((cb) => cb(eventData));
    });
  }

  public onBalanceChange(callback: BalanceCallback): () => void {
    this.balanceListeners.add(callback);
    if (this.profile && typeof this.profile.balance === 'number') {
      callback({
        balance: this.profile.balance,
        currency: this.profile.currency || 'USD',
        loginid: this.profile.loginid,
      });
    }
    return () => this.balanceListeners.delete(callback);
  }

  public async authorize(token: string): Promise<DerivAccountProfile | null> {
    if (!token || !token.trim()) {
      this.status = 'ERROR';
      return null;
    }
    this.status = 'AUTHORIZING';
    try {
      if (derivWs.getConnectionState() !== 'CONNECTED') {
        await derivWs.connect();
      }
      const response = await derivWs.sendRequest({ authorize: token.trim() });
      if (response.authorize) {
        this.status = 'CONNECTED';
        this.token = token.trim();
        this.profile = response.authorize as unknown as DerivAccountProfile;

        // Subscribe to real-time balance stream
        derivWs.sendRequest({ balance: 1, subscribe: 1 }).catch((err) => {
          console.warn('[DerivAuth] Balance subscription warning:', err);
        });

        return this.profile;
      }
      this.status = 'ERROR';
      return null;
    } catch (e) {
      console.warn('[DerivAuth] Authorization failed:', e instanceof Error ? e.message : e);
      this.status = 'ERROR';
      return null;
    }
  }

  public getProfile(): DerivAccountProfile | null {
    return this.profile;
  }

  public getToken(): string | null {
    return this.token;
  }

  public logout(): void {
    this.status = 'NOT_CONNECTED';
    this.token = null;
    this.profile = null;
    if (derivWs.getConnectionState() === 'CONNECTED') {
      derivWs.sendRequest({ forget_all: 'authentication' }).catch(() => {
        // Safe cleanup ignore
      });
    }
  }

  public getStatus(): DerivAuthStatus {
    return this.status;
  }
}

export const derivAuthService = new DerivAuthService();

