/**
 * AppexQuant Markets Global - Wallet Polling Service
 * Periodically queries multi-asset account balances (USD, USDT, BTC, ETH, SOL) via Deriv API
 * and keeps UI state synchronized.
 */

import { apiFetch } from '../utils/apiFetch.ts';

export interface WalletItem {
  id: string;
  currency: string;
  symbol: string;
  name: string;
  loginid: string;
  balance: number;
  usdValue: number;
  accountType: 'real' | 'demo' | 'crypto';
  icon: string;
  isVirtual: boolean;
  lastUpdated: string;
}

export interface WalletDataResponse {
  wallets: WalletItem[];
  totalUsdValue: number;
  lastSyncedAt: string;
}

export class WalletPollingService {
  private listeners = new Set<(data: WalletDataResponse) => void>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private pollingIntervalMs = 15000; // 15s default
  private isPolling = false;
  private lastData: WalletDataResponse = {
    wallets: [],
    totalUsdValue: 0,
    lastSyncedAt: new Date().toISOString(),
  };

  public subscribe(listener: (data: WalletDataResponse) => void): () => void {
    this.listeners.add(listener);
    listener(this.lastData);
    if (!this.isPolling) {
      this.startPolling();
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stopPolling();
      }
    };
  }

  public setPollingInterval(seconds: number): void {
    if (seconds <= 0) {
      this.stopPolling();
      return;
    }
    this.pollingIntervalMs = seconds * 1000;
    if (this.isPolling) {
      this.stopPolling();
      this.startPolling();
    }
  }

  public startPolling(): void {
    if (this.isPolling) return;
    this.isPolling = true;
    this.fetchWallets();
    this.intervalId = setInterval(() => {
      this.fetchWallets();
    }, this.pollingIntervalMs);
  }

  public stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPolling = false;
  }

  public async fetchWallets(): Promise<WalletDataResponse> {
    try {
      // Primary: Call /api/wallet/summary (Task 3.1)
      const resSummary = await apiFetch('/api/wallet/summary', { method: 'GET' }).catch(() => null);
      if (resSummary && resSummary.ok) {
        const json = await resSummary.json().catch(() => null);
        if (json?.data) {
          const rawWallets: any[] = json.data.wallets || [];
          const tradingAccounts: any[] = json.data.tradingAccounts || [];

          const symbolMap: Record<string, { symbol: string; icon: string }> = {
            USD: { symbol: '$', icon: '💲' },
            USDT: { symbol: '₮', icon: '₮' },
            BTC: { symbol: '₿', icon: '₿' },
            ETH: { symbol: 'Ξ', icon: 'Ξ' },
            SOL: { symbol: '◎', icon: '◎' },
            EUR: { symbol: '€', icon: '€' },
            GBP: { symbol: '£', icon: '£' },
            AUD: { symbol: 'A$', icon: 'A$' },
          };

          const mappedWallets: WalletItem[] = rawWallets.map((w: any) => {
            const curr = String(w.currency || 'USD').toUpperCase();
            const sm = symbolMap[curr] || { symbol: curr, icon: '💼' };
            return {
              id: w.id || `wallet-${curr}`,
              currency: curr,
              symbol: sm.symbol,
              name: `${curr} Wallet`,
              loginid: w.id || curr,
              balance: Number(w.balance || 0),
              usdValue: typeof w.usdValue === 'number' ? w.usdValue : Number(w.balance || 0),
              accountType: w.accountType === 'crypto' || ['BTC','ETH','USDT','SOL'].includes(curr) ? 'crypto' : 'real',
              icon: sm.icon,
              isVirtual: false,
              lastUpdated: new Date().toISOString(),
            };
          });

          // Also map trading accounts if any
          const mappedTrading: WalletItem[] = tradingAccounts.map((t: any) => {
            const curr = String(t.currency || 'USD').toUpperCase();
            const sm = symbolMap[curr] || { symbol: '$', icon: '📈' };
            return {
              id: t.loginid,
              currency: curr,
              symbol: sm.symbol,
              name: t.isVirtual ? 'Options Demo Account' : 'Options Real Account',
              loginid: t.loginid,
              balance: Number(t.balance || 0),
              usdValue: Number(t.balance || 0),
              accountType: t.isVirtual ? 'demo' : 'real',
              icon: sm.icon,
              isVirtual: Boolean(t.isVirtual),
              lastUpdated: new Date().toISOString(),
            };
          });

          const combined = [...mappedWallets, ...mappedTrading];
          const totalUsd = combined.reduce((acc, item) => acc + (item.usdValue || 0), 0);

          this.lastData = {
            wallets: combined,
            totalUsdValue: totalUsd,
            lastSyncedAt: json.data.lastSyncedAt || new Date().toISOString(),
          };
          this.notify();
          return this.lastData;
        }
      }

      // Fallback: /api/auth/deriv/wallets
      const res = await apiFetch('/api/auth/deriv/wallets', { method: 'GET' }).catch(() => null);
      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.data?.wallets) {
          this.lastData = {
            wallets: json.data.wallets,
            totalUsdValue: json.data.totalUsdValue || 0,
            lastSyncedAt: json.data.lastSyncedAt || new Date().toISOString(),
          };
          this.notify();
          return this.lastData;
        }
      }
    } catch (err) {
      console.warn('[WalletPollingService] Wallet fetch failed:', err);
    }
    return this.lastData;
  }

  private notify(): void {
    for (const l of this.listeners) {
      try { l(this.lastData); } catch {}
    }
  }

  public getLastData(): WalletDataResponse {
    return this.lastData;
  }
}

export const walletPollingService = new WalletPollingService();
