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
  const initiateRedirect = useCallback(async (action: 'connect' | 'signup' = 'connect', destination: string = '/dashboard') => {
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
        if (json.success && json.data) {
          token = json.data.token || json.data.accessToken || json.data.sessionToken || '';
          accountId = json.data.accountId || json.data.derivAccountId || json.data.user?.derivAccountId || json.data.user?.userId || '';
          currency = json.data.currency || json.data.user?.currency || 'USD';
          email = json.data.user?.email || json.data.email || '';
          displayName = json.data.user?.displayName || json.data.displayName || '';
          fullName = json.data.user?.fullName || json.data.fullName || '';
          balance = json.data.user?.balance ?? json.data.balance ?? 0;
          accountType = json.data.user?.accountType || json.data.accountType || (accountId.startsWith('VR') ? 'demo' : 'real');
          role = json.data.user?.role || json.data.role || 'USER';
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        backendErrorMessage = errJson.error?.message || errJson.message || `Deriv Token Exchange HTTP Error ${response.status}`;
      }

      // If backend redirected or returned session status
      if (!token && !backendErrorMessage) {
        const statusRes = await fetch('/api/auth/deriv/status');
        const statusJson = await statusRes.json();
        if (statusJson.success && statusJson.data?.connected) {
          accountId = statusJson.data.derivAccountId;
          token = statusJson.data.token || localStorage.getItem('deriv_access_token');
          currency = statusJson.data.currency || 'USD';
          balance = statusJson.data.balance ?? 0;
          accountType = statusJson.data.accountType || (accountId.startsWith('VR') ? 'demo' : 'real');
        }
      }

      if (!accountId) {
        throw new Error(backendErrorMessage || 'Could not retrieve authorized Deriv account credentials.');
      }

      // Persist in encrypted cookie (30 days expiration)
      if (token) {
        await setEncryptedCookie('deriv_oauth_token', token, 86400 * 30);
        await setEncryptedCookie('deriv_account_id', accountId, 86400 * 30);
        setStoredToken(token);
      }

      // Authorize with WebSocket engine
      if (token) {
        try {
          await derivAuthService.authorize(token);
        } catch (wsErr) {
          console.warn('WebSocket authorization warning:', wsErr);
        }
      }

      // Persist user profile attributes in sessionStorage
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
          fullName,
          role,
        }));
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
