
import { derivWs } from './DerivWebSocketManager';

export type DerivAuthStatus = 'NOT_CONNECTED' | 'AUTHORIZING' | 'CONNECTED' | 'ERROR';

class DerivAuthService {
  private status: DerivAuthStatus = 'NOT_CONNECTED';
  private token: string | null = null;

  public async authorize(token: string): Promise<boolean> {
    if (!token || !token.trim()) {
      this.status = 'ERROR';
      return false;
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
        return true;
      }
      this.status = 'ERROR';
      return false;
    } catch (e) {
      console.warn('[DerivAuth] Authorization failed:', e instanceof Error ? e.message : e);
      this.status = 'ERROR';
      return false;
    }
  }

  public logout(): void {
    this.status = 'NOT_CONNECTED';
    this.token = null;
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
