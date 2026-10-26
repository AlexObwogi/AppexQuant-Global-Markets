/**
 * AppexQuant Markets Global - Deriv Account Service
 * Provides explicit balance retrieval bound strictly to active loginid,
 * and automatic cache cleanup when switching active accounts.
 */

import { derivAuthService } from './DerivAuthService.ts';
import { DerivIntegrationService } from './DerivIntegrationService.ts';

export interface AccountBalanceResult {
  success: boolean;
  data?: {
    balance: number;
    currency: string;
    loginid: string;
  };
  error?: string;
}

/**
 * Fetch balance specifically bound to the provided or active loginid.
 * Explicitly guards against using stale or mismatched session balances.
 */
export async function fetchAccountBalance(
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>,
  loginid?: string
): Promise<AccountBalanceResult> {
  const activeLoginid = loginid || derivAuthService.getAccountId() || undefined;

  const result = await DerivIntegrationService.getBalance(apiFetch, activeLoginid);

  if (result.success && result.data) {
    // Verify response loginid matches target loginid to prevent leakage
    if (activeLoginid && result.data.loginid && result.data.loginid !== activeLoginid) {
      console.warn(
        `[AccountService] Balance response loginid (${result.data.loginid}) mismatched target (${activeLoginid}). Ignoring.`
      );
      return {
        success: false,
        error: 'Balance payload loginid mismatch.',
      };
    }

    // Synchronize balance with local auth service
    derivAuthService.updateBalance({
      balance: result.data.balance,
      currency: result.data.currency,
      loginid: result.data.loginid,
    });

    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to fetch account balance.',
  };
}

/**
 * Clear cached balance state to prevent demo/real balance leakage.
 */
export function clearCachedBalanceState(): void {
  derivAuthService.clearCache();
}

/**
 * Cleanup helper to invoke whenever activeAccount state changes.
 */
export function handleActiveAccountChange(newActiveAccountId: string | null): void {
  console.info(`[AccountService] Active account changed to '${newActiveAccountId}'. Clearing cached balance state.`);
  clearCachedBalanceState();
}
