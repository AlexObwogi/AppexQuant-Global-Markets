/**
 * AppexQuant Markets Global - Deriv Cashier Handoff Service
 * Manages secure cashier handoffs, localStorage state persistence (30-min TTL),
 * and return detection / balance snapshot comparisons.
 */

import { getCashierUrl } from '../../config/derivLinks.ts';
import { apiFetch } from '../../utils/apiFetch.ts';

export interface BalanceSnapshot {
  [currencyOrAccountId: string]: number;
}

export interface CashierHandoffState {
  id: string;
  kind: 'deposit' | 'withdraw' | 'transfer' | 'p2p';
  url: string;
  startedAt: number;
  snapshot: BalanceSnapshot;
  status: 'PENDING' | 'UPDATED' | 'COMPLETED' | 'EXPIRED';
  updatedMessage?: string;
}

const HANDOFF_STORAGE_KEY = 'deriv_cashier_handoff';
const HANDOFF_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function getActiveHandoff(): CashierHandoffState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(HANDOFF_STORAGE_KEY);
    if (!raw) return null;
    const parsed: CashierHandoffState = JSON.parse(raw);
    const elapsed = Date.now() - parsed.startedAt;
    if (elapsed > HANDOFF_TTL_MS || parsed.status === 'COMPLETED' || parsed.status === 'EXPIRED') {
      clearActiveHandoff();
      return null;
    }
    return parsed;
  } catch {
    clearActiveHandoff();
    return null;
  }
}

export function clearActiveHandoff(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(HANDOFF_STORAGE_KEY);
  } catch {}
}

export function saveActiveHandoff(handoff: CashierHandoffState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HANDOFF_STORAGE_KEY, JSON.stringify(handoff));
  } catch {}
}

export async function openCashier(
  kind: 'deposit' | 'withdraw' | 'transfer' | 'p2p',
  ctx?: {
    isAuthenticated?: boolean;
    isRealAccount?: boolean;
    currentBalances?: BalanceSnapshot;
    onNotify?: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  }
): Promise<void> {
  // Check authentication
  const isAuthenticated = ctx?.isAuthenticated !== false;
  if (!isAuthenticated) {
    if (ctx?.onNotify) {
      ctx.onNotify('Authentication Required', 'Please log in to your account before accessing the Deriv Cashier.', 'warning');
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/deriv/login';
    }
    return;
  }

  // Check Real account restriction
  const isReal = ctx?.isRealAccount !== false;
  if (!isReal) {
    if (ctx?.onNotify) {
      ctx.onNotify('Real Account Required', 'Deriv Cashier deposit and withdrawal portals are available exclusively for Real accounts.', 'warning');
    } else {
      alert('Deriv Cashier deposit and withdrawal portals are available exclusively for Real accounts.');
    }
    return;
  }

  // Fetch or take snapshot of current balances
  let snapshot: BalanceSnapshot = ctx?.currentBalances || {};
  if (Object.keys(snapshot).length === 0) {
    try {
      const summaryRes = await apiFetch('/api/wallet/summary').catch(() => null);
      if (summaryRes && summaryRes.ok) {
        const json = await summaryRes.json().catch(() => null);
        if (json?.data?.wallets) {
          json.data.wallets.forEach((w: any) => {
            snapshot[w.currency || w.id] = w.balance || 0;
          });
        }
      }
    } catch {}
  }

  const url = getCashierUrl(kind);
  const handoff: CashierHandoffState = {
    id: `handoff-${Date.now()}`,
    kind,
    url,
    startedAt: Date.now(),
    snapshot,
    status: 'PENDING',
  };

  saveActiveHandoff(handoff);

  // Attempt window.open
  let popupWin: Window | null = null;
  try {
    popupWin = window.open(url, '_blank', 'noopener,noreferrer');
  } catch {}

  // Fallback if popup blocked
  if (!popupWin || popupWin.closed || typeof popupWin.closed === 'undefined') {
    window.location.assign(url);
  }
}
