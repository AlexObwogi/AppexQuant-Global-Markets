/**
 * AppexQuant Markets Global - Deriv OAuth Hook & Session Controller
 * Manages high-entropy PKCE state, gateway redirection, and server-owned session synchronization.
 * 
 * Strict Ownership Guarantees:
 * - Server owns OAuth token exchange, authorization, balance, and account discovery.
 * - Browser owns session only via /api/auth/status and /api/auth/session.
 */

import { useState, useCallback } from 'react';
import { generateCodeVerifier, deriveCodeChallenge } from './pkce.ts';
import { derivAuthService, DerivAccountProfile } from '../../services/deriv/DerivAuthService.ts';

export interface DerivAuthResult {
  token?: string;
  accountId: string;
  loginid?: string;
  currency?: string;
  email?: string;
  displayName?: string;
  fullName?: string;
  balance?: number;
  accountType?: string;
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'RISK_MANAGER';
}

export function useDerivAuth() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authStatusMessage, setAuthStatusMessage] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  /**
   * Generates a high-entropy PKCE verifier/challenge pair and redirects to Deriv OAuth gateway
   */
  const initiateRedirect = useCallback(async (action: 'connect' | 'signup' = 'connect', destination: string = '/') => {
    setIsAuthenticating(true);
    setAuthError(null);
    setAuthStatusMessage(
      action === 'signup'
        ? 'Redirecting to official Deriv account registration...'
        : 'Generating high-entropy PKCE challenge and connecting to Deriv...'
    );

    try {
      const verifier = await generateCodeVerifier(64);
      const challenge = await deriveCodeChallenge(verifier);

      // Persist verifier in session and local storage for retrieval during callback
      try {
        sessionStorage.setItem('deriv_pkce_verifier', verifier);
        localStorage.setItem('deriv_pkce_verifier', verifier);
      } catch (err) {
        console.warn('Storage warning for PKCE verifier:', err);
      }

      const redirectUrl = `/api/auth/deriv/login?action=${action}&code_challenge=${encodeURIComponent(
        challenge
      )}&code_verifier=${encodeURIComponent(verifier)}&destination=${encodeURIComponent(destination)}`;

      // Allow UI status indicator to display briefly before browser navigation
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 350);
    } catch (err: any) {
      setIsAuthenticating(false);
      setAuthError(err.message || 'Failed to initiate PKCE authorization with Deriv.');
    }
  }, []);

  /**
   * Exchanges an OAuth authorization code via backend and updates the browser session
   */
  const exchangeCodeForToken = useCallback(async (code: string, state?: string): Promise<DerivAuthResult | null> => {
    setIsAuthenticating(true);
    setAuthError(null);
    setAuthStatusMessage('Authorizing session through backend gateway...');

    try {
      // Retrieve locally stored code verifier
      const storedVerifier = 
        sessionStorage.getItem('deriv_pkce_verifier') || 
        localStorage.getItem('deriv_pkce_verifier') || 
        '';

      const response = await fetch(`/api/auth/deriv/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}&verifier=${encodeURIComponent(storedVerifier)}`, {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      let backendErrorMessage = '';
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        backendErrorMessage = errJson.error?.message || errJson.message || `Deriv Token Exchange HTTP Error ${response.status}`;
      }

      // Synchronize session state via canonical /api/auth/status
      const statusRes = await fetch('/api/auth/status', {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      }).catch(() => null);

      let loginid = '';
      let accountId = '';
      let currency = 'USD';
      let email = '';
      let displayName = '';
      let fullName = '';
      let balance = 0;
      let accountType = 'real';
      let role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'RISK_MANAGER' = 'USER';

      if (statusRes && statusRes.ok) {
        const statusJson = await statusRes.json().catch(() => null);
        if (statusJson?.success && statusJson.data?.connected) {
          loginid = statusJson.data.derivAccountId || statusJson.data.loginid || '';
          accountId = loginid;
          currency = statusJson.data.currency || 'USD';
          balance = statusJson.data.balance ?? 0;
          accountType = statusJson.data.accountType || (accountId.startsWith('VR') ? 'demo' : 'real');
          email = statusJson.data.email || '';
          fullName = statusJson.data.fullName || '';
          displayName = fullName || loginid;
        }
      }

      // If status didn't return account, try /api/auth/session
      if (!accountId) {
        const sessionRes = await fetch('/api/auth/session', {
          headers: { Accept: 'application/json' },
          credentials: 'include',
        }).catch(() => null);

        if (sessionRes && sessionRes.ok) {
          const sessionJson = await sessionRes.json().catch(() => null);
          if (sessionJson?.success && sessionJson.data?.authenticated && sessionJson.data.user) {
            const user = sessionJson.data.user;
            loginid = user.derivAccountId || user.userId || '';
            accountId = loginid;
            currency = user.currency || 'USD';
            balance = user.balance ?? 0;
            accountType = user.accountType || (accountId.startsWith('VR') ? 'demo' : 'real');
            email = user.email || '';
            displayName = user.displayName || user.fullName || loginid;
            fullName = user.fullName || '';
            role = user.role || 'USER';
          }
        }
      }

      // Strictly validate account ID format
      if (!accountId || accountId.startsWith('usr-') || accountId.startsWith('user-') || accountId.startsWith('sys-') || accountId.startsWith('demo-') || accountId.startsWith('test-')) {
        throw new Error(backendErrorMessage || 'Deriv account identity could not be verified from Deriv account discovery.');
      }

      // Update DerivAuthService session profile
      const profile: DerivAccountProfile = {
        loginid,
        email,
        fullname: fullName || displayName,
        currency,
        balance,
        is_virtual: accountType === 'demo' ? 1 : 0,
        scopes: ['trade', 'account_manage'],
        accountType: accountType === 'demo' ? 'demo' : 'real',
        connectionStatus: 'CONNECTED',
        lastSyncedAt: new Date().toISOString(),
      };
      derivAuthService.setProfile(profile);

      // Clean up single-use PKCE verifier
      sessionStorage.removeItem('deriv_pkce_verifier');
      localStorage.removeItem('deriv_pkce_verifier');

      setIsAuthenticating(false);
      setAuthStatusMessage('Deriv OAuth authorization complete.');

      return {
        accountId,
        loginid: accountId,
        currency,
        email,
        displayName,
        fullName,
        balance,
        accountType,
        role,
      };
    } catch (err: any) {
      setIsAuthenticating(false);
      const msg = err.message || 'Deriv session authorization failed.';
      setAuthError(msg);
      return null;
    }
  }, []);

  /**
   * Log out and clear session
   */
  const disconnect = useCallback(async () => {
    derivAuthService.logout();
    try {
      localStorage.removeItem('deriv_access_token');
      localStorage.removeItem('deriv_oauth_token');
      localStorage.removeItem('deriv_account_id');
      sessionStorage.clear();
      await fetch('/api/auth/deriv/disconnect', { method: 'POST', credentials: 'include' });
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.warn('Disconnect error:', e);
    }
  }, []);

  return {
    isAuthenticating,
    authError,
    authStatusMessage,
    storedToken: null,
    initiateRedirect,
    exchangeCodeForToken,
    clearError,
    disconnect
  };
}
