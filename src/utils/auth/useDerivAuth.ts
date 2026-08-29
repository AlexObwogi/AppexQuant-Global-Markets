/**
 * AppexQuant Markets Global - Deriv OAuth Hook & PKCE Flow Controller
 * Manages high-entropy PKCE state, gateway redirection, and authorization token exchange.
 */

import { useState, useCallback, useEffect } from 'react';
import { generateCodeVerifier, deriveCodeChallenge, setEncryptedCookie, getEncryptedCookie, removeCookie } from './pkce.ts';
import { derivAuthService } from '../../services/deriv/authService.ts';
import { buildAuthUrl, buildLoginGatewayUrl, DERIV_OAUTH_SCOPE } from '../../services/oauthService.ts';

export interface DerivAuthResult {
  token: string;
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
  const [storedToken, setStoredToken] = useState<string | null>(null);

  // Check existing encrypted cookie on mount
  useEffect(() => {
    getEncryptedCookie('deriv_oauth_token').then((token) => {
      if (token) {
        setStoredToken(token);
      }
    });
  }, []);

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
   * Exchanges an OAuth authorization code + stored code verifier for a secure access token
   */
  const exchangeCodeForToken = useCallback(async (code: string, state?: string): Promise<DerivAuthResult | null> => {
    setIsAuthenticating(true);
    setAuthError(null);
    setAuthStatusMessage('Retrieving code verifier and exchanging authorization code...');

    try {
      // Retrieve locally stored code verifier
      const storedVerifier = 
        sessionStorage.getItem('deriv_pkce_verifier') || 
        localStorage.getItem('deriv_pkce_verifier') || 
        '';

      const response = await fetch(`/api/auth/deriv/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}&verifier=${encodeURIComponent(storedVerifier)}`, {
        headers: { 'Accept': 'application/json' }
      });

      let token = '';
      let accountId = '';
      let loginid = '';
      let currency = 'USD';
      let email = '';
      let displayName = '';
      let fullName = '';
      let balance = 0;
      let accountType = 'real';
      let role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'RISK_MANAGER' = 'USER';

      let backendErrorMessage = '';
      if (response.ok) {
        const json = await response.json();
        if (json.success) {
          const payload = json.data || json;
          token = payload.token || payload.accessToken || payload.sessionToken || '';
          loginid = payload.loginid || payload.accountId || payload.derivAccountId || payload.user?.loginid || payload.user?.derivAccountId || '';
          accountId = loginid;
          currency = payload.currency || payload.user?.currency || 'USD';
          email = payload.user?.email || payload.email || '';
          displayName = payload.user?.displayName || payload.displayName || '';
          fullName = payload.user?.fullName || payload.fullName || '';
          balance = payload.user?.balance ?? payload.balance ?? 0;
          accountType = payload.user?.accountType || payload.accountType || (accountId.startsWith('VR') ? 'demo' : 'real');
          role = payload.user?.role || payload.role || 'USER';
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        backendErrorMessage = errJson.error?.message || errJson.message || `Deriv Token Exchange HTTP Error ${response.status}`;
      }

      // If backend redirected or returned session status
      if (!accountId && !backendErrorMessage) {
        const statusRes = await fetch('/api/auth/deriv/status');
        const statusJson = await statusRes.json();
        if (statusJson.success && statusJson.data?.connected) {
          loginid = statusJson.data.derivAccountId || statusJson.data.loginid || '';
          accountId = loginid;
          token = statusJson.data.token || '';
          currency = statusJson.data.currency || 'USD';
          balance = statusJson.data.balance ?? 0;
          accountType = statusJson.data.accountType || (accountId.startsWith('VR') ? 'demo' : 'real');
        }
      }

      // Strictly validate account ID format
      if (!accountId || accountId.startsWith('usr-') || accountId.startsWith('user-') || accountId.startsWith('sys-') || accountId.startsWith('demo-') || accountId.startsWith('test-')) {
        throw new Error(backendErrorMessage || 'Deriv account identity could not be verified from Deriv account discovery.');
      }

      // Persist in encrypted cookie (30 days expiration)
      if (token) {
        await setEncryptedCookie('deriv_oauth_token', token, 86400 * 30);
        await setEncryptedCookie('deriv_account_id', accountId, 86400 * 30);
        setStoredToken(token);
      }

      // Persist user profile attributes in sessionStorage (Session exists BEFORE WebSocket)
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('deriv_user_loginid', accountId);
        sessionStorage.setItem('deriv_user_email', email);
        sessionStorage.setItem('deriv_user_currency', currency);
        sessionStorage.setItem('deriv_user_balance', String(balance));
        sessionStorage.setItem('deriv_session', JSON.stringify({
          userId: accountId,
          loginid: accountId,
          email,
          currency,
          balance,
          accountType,
          displayName,
          connectedAt: new Date().toISOString(),
        }));
      }

      // Authorize with WebSocket engine for real-time streams ONLY after authenticated session exists
      if (token) {
        try {
          await derivAuthService.authorize(token);
        } catch (wsErr) {
          console.warn('[useDerivAuth] Real-time WebSocket initialization notice:', wsErr);
        }
      }

      // Clean up single-use PKCE verifier
      sessionStorage.removeItem('deriv_pkce_verifier');
      localStorage.removeItem('deriv_pkce_verifier');

      setIsAuthenticating(false);
      setAuthStatusMessage('Deriv OAuth authorization complete.');

      return {
        token,
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
      const msg = err.message || 'Deriv token exchange failed.';
      setAuthError(msg);
      return null;
    }
  }, []);

  /**
   * Log out and clear encrypted cookies
   */
  const disconnect = useCallback(async () => {
    removeCookie('deriv_oauth_token');
    removeCookie('deriv_account_id');
    derivAuthService.logout();
    try {
      localStorage.removeItem('deriv_access_token');
      localStorage.removeItem('deriv_account_id');
      sessionStorage.clear();
      await fetch('/api/auth/deriv/disconnect', { method: 'POST' });
    } catch (e) {
      console.warn('Disconnect error:', e);
    }
    setStoredToken(null);
  }, []);

  return {
    isAuthenticating,
    authError,
    authStatusMessage,
    storedToken,
    initiateRedirect,
    exchangeCodeForToken,
    clearError,
    disconnect
  };
}
