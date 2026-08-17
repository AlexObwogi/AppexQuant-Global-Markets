
import { derivWs } from './DerivWebSocketManager.ts';

export type DerivAuthStatus = 'NOT_CONNECTED' | 'AUTHORIZING' | 'CONNECTED' | 'ERROR';

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

