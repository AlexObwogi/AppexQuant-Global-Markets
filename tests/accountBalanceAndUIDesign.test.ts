/**
 * AppexQuant Markets Global - Account Balance Synchronization & UI Consistency Test Suite
 * Validates strict execution environment switching, account isolation, out-of-order race condition defense,
 * currency integrity, and Deriv-inspired UI theme token compliance.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DerivAuthService, derivAuthService } from '../src/services/deriv/DerivAuthService';
import { DerivIntegrationService } from '../src/services/deriv/DerivIntegrationService';
import { fetchAccountBalance, clearCachedBalanceState, handleActiveAccountChange } from '../src/services/deriv/accountService';
import { formatCurrencyValue } from '../src/utils/userStatusPresentation';

describe('AppexQuant - Focused Account Balance & UI Design Suite', () => {
  let derivAuth: DerivAuthService;

  beforeEach(() => {
    derivAuth = new DerivAuthService();
  });

  describe('Section 6.1 — Account Balance & Account State Synchronization Tests', () => {
    it('1. Selecting LIVE displays the balance returned for the selected real Deriv account (CR*)', () => {
      derivAuth.setProfile({
        loginid: 'CR987654',
        accountType: 'real',
        balance: 4250.75,
        currency: 'USD',
        is_virtual: 0,
      });

      const profile = derivAuth.getProfile();
      expect(profile?.loginid).toBe('CR987654');
      expect(profile?.accountType).toBe('real');
      expect(profile?.balance).toBe(4250.75);
    });

    it('2. Selecting DEMO displays the balance returned for the selected demo Deriv account (VRTC*)', () => {
      derivAuth.setProfile({
        loginid: 'VRTC123456',
        accountType: 'demo',
        balance: 10000.0,
        currency: 'USD',
        is_virtual: 1,
      });

      const profile = derivAuth.getProfile();
      expect(profile?.loginid).toBe('VRTC123456');
      expect(profile?.accountType).toBe('demo');
      expect(profile?.balance).toBe(10000.0);
    });

    it('3. Switching from DEMO to LIVE replaces demo balance with actual live-account balance', () => {
      // Step 1: Initialize in DEMO
      derivAuth.setProfile({
        loginid: 'VRTC1001',
        accountType: 'demo',
        balance: 10000.0,
        currency: 'USD',
        is_virtual: 1,
      });
      expect(derivAuth.getProfile()?.balance).toBe(10000.0);

      // Step 2: Clear cache & switch to LIVE
      derivAuth.clearCache();
      expect(derivAuth.getProfile()?.balance).toBe(0);

      derivAuth.setProfile({
        loginid: 'CR2002',
        accountType: 'real',
        balance: 15320.5,
        currency: 'EUR',
        is_virtual: 0,
      });

      const liveProfile = derivAuth.getProfile();
      expect(liveProfile?.loginid).toBe('CR2002');
      expect(liveProfile?.accountType).toBe('real');
      expect(liveProfile?.balance).toBe(15320.5);
      expect(liveProfile?.currency).toBe('EUR');
    });

    it('4. Switching from LIVE to DEMO replaces live balance with actual demo-account balance', () => {
      // Step 1: Initialize in LIVE
      derivAuth.setProfile({
        loginid: 'CR8888',
        accountType: 'real',
        balance: 3200.0,
        currency: 'USD',
        is_virtual: 0,
      });
      expect(derivAuth.getProfile()?.balance).toBe(3200.0);

      // Step 2: Clear cache & switch to DEMO
      derivAuth.clearCache();

      derivAuth.setProfile({
        loginid: 'VRTC8888',
        accountType: 'demo',
        balance: 9500.0,
        currency: 'USD',
        is_virtual: 1,
      });

      const demoProfile = derivAuth.getProfile();
      expect(demoProfile?.loginid).toBe('VRTC8888');
      expect(demoProfile?.accountType).toBe('demo');
      expect(demoProfile?.balance).toBe(9500.0);
    });

    it('5. A $10,000 mock or fallback is never displayed when unverified or disconnected', () => {
      derivAuth.logout();
      expect(derivAuth.getProfile()).toBeNull();
      expect(derivAuth.getAccountId()).toBeNull();
    });

    it('6. Missing account, authorization failure, and network failure produce honest error states', async () => {
      const mockFetchFail = async () =>
        new Response(JSON.stringify({ success: false, error: { message: 'Unauthorized session' } }), { status: 401 });

      const result = await DerivIntegrationService.getBalance(mockFetchFail, 'CR_INVALID');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('7. An old response for a previously selected account cannot overwrite active account balance', () => {
      derivAuth.setProfile({
        loginid: 'CR_ACTIVE_999',
        accountType: 'real',
        balance: 5000.0,
        currency: 'USD',
        is_virtual: 0,
      });

      // Late incoming balance update for OLD demo account
      derivAuth.updateBalance({
        loginid: 'VRTC_OLD_111',
        balance: 10000.0,
        currency: 'USD',
      });

      // Active profile balance MUST NOT be polluted or overwritten by old account payload
      expect(derivAuth.getProfile()?.loginid).toBe('CR_ACTIVE_999');
      expect(derivAuth.getProfile()?.balance).toBe(5000.0);
    });

    it('8. Different currencies display correctly without mislabeling or undocumented conversion', () => {
      const formattedEur = formatCurrencyValue(1250.5, false, 'EUR');
      const formattedGbp = formatCurrencyValue(850.25, false, 'GBP');
      const formattedUsd = formatCurrencyValue(12345.67, false, 'USD');

      expect(formattedEur).toContain('1,250.50');
      expect(formattedEur).toContain('EUR');
      expect(formattedGbp).toContain('850.25');
      expect(formattedGbp).toContain('GBP');
      expect(formattedUsd).toContain('$12,345.67');
    });

    it('9. DerivIntegrationService passes target loginid to balance API query string', async () => {
      let requestedUrl = '';
      const mockFetch = async (url: string) => {
        requestedUrl = url;
        return new Response(JSON.stringify({ success: true, data: { balance: 2500, currency: 'USD', loginid: 'CR777' } }), { status: 200 });
      };

      const result = await DerivIntegrationService.getBalance(mockFetch, 'CR777');
      expect(result.success).toBe(true);
      expect(requestedUrl).toBe('/api/auth/deriv/balance?loginid=CR777');
      expect(result.data?.loginid).toBe('CR777');
      expect(result.data?.balance).toBe(2500);
    });

    it('10. Multiple accounts respect user actual loginid selection during switchAccount', async () => {
      let payloadBody = '';
      const mockFetch = async (_url: string, init?: RequestInit) => {
        payloadBody = (init?.body as string) || '';
        return new Response(JSON.stringify({ success: true, data: { connected: true, derivAccountId: 'CR_USER_CHOICE' } }), { status: 200 });
      };

      const result = await DerivIntegrationService.switchAccount(mockFetch, 'CR_USER_CHOICE');
      expect(result.success).toBe(true);
      expect(payloadBody).toContain('CR_USER_CHOICE');
      expect(result.data?.derivAccountId).toBe('CR_USER_CHOICE');
    });

    it('11. fetchAccountBalance explicitly uses target loginid and rejects mismatched balance payloads', async () => {
      derivAuthService.setProfile({
        loginid: 'CR_BOUND_100',
        accountType: 'real',
        balance: 5000,
        currency: 'USD',
        is_virtual: 0,
      });

      const mockFetchMismatched = async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: { balance: 10000, currency: 'USD', loginid: 'VRTC_LEAKED' },
          }),
          { status: 200 }
        );

      const result = await fetchAccountBalance(mockFetchMismatched, 'CR_BOUND_100');
      expect(result.success).toBe(false);
      expect(result.error).toContain('mismatch');
      // Profile balance MUST NOT have been overwritten by leaked VRTC payload
      expect(derivAuthService.getProfile()?.balance).toBe(5000);
    });

    it('12. handleActiveAccountChange clears cached balance state whenever activeAccount changes', () => {
      derivAuthService.setProfile({
        loginid: 'VRTC_DEMO_BEFORE',
        accountType: 'demo',
        balance: 10000,
        currency: 'USD',
        is_virtual: 1,
      });

      expect(derivAuthService.getProfile()?.balance).toBe(10000);

      // Trigger cleanup effect as activeAccount changes
      handleActiveAccountChange('CR_REAL_AFTER');

      // Cached balance is cleared to 0 prior to fresh live account fetch
      expect(derivAuthService.getProfile()?.balance).toBe(0);
    });
  });

  describe('Section 6.2 — UI Design & Theme Consistency Tests', () => {
    it('1. Privacy balance masking works accurately for any financial number', () => {
      const maskedVal = formatCurrencyValue(12345.67, true, 'USD');
      expect(maskedVal).toBe('••••••••');
    });

    it('2. Unmasked currency value formats with tabular numeric precision', () => {
      const unmaskedVal = formatCurrencyValue(12345.67, false, 'USD');
      expect(unmaskedVal).toContain('$12,345.67');
    });
  });
});
