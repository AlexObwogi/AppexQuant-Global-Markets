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
    wallets: [
      { id: 'wallet-usd', currency: 'USD', symbol: '$', name: 'USD Options Wallet', loginid: 'Demo Account', balance: 0, usdValue: 0, accountType: 'demo', icon: '💲', isVirtual: true, lastUpdated: new Date().toISOString() },
      { id: 'wallet-usdt', currency: 'USDT', symbol: '₮', name: 'Tether (USDT) Crypto', loginid: 'Demo Account', balance: 0, usdValue: 0, accountType: 'crypto', icon: '₮', isVirtual: false, lastUpdated: new Date().toISOString() },
      { id: 'wallet-btc', currency: 'BTC', symbol: '₿', name: 'Bitcoin (BTC) Crypto', loginid: 'Demo Account', balance: 0, usdValue: 0, accountType: 'crypto', icon: '₿', isVirtual: false, lastUpdated: new Date().toISOString() },
      { id: 'wallet-eth', currency: 'ETH', symbol: 'Ξ', name: 'Ethereum (ETH) Crypto', loginid: 'Demo Account', balance: 0, usdValue: 0, accountType: 'crypto', icon: 'Ξ', isVirtual: false, lastUpdated: new Date().toISOString() },
      { id: 'wallet-sol', currency: 'SOL', symbol: '◎', name: 'Solana (SOL) Crypto', loginid: 'Demo Account', balance: 0, usdValue: 0, accountType: 'crypto', icon: '◎', isVirtual: false, lastUpdated: new Date().toISOString() },
    ],
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
