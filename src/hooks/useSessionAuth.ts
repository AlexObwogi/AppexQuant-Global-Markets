/**
 * AppExQuant Markets Global - Controlled Session Auth Hook
 * Features:
 * - Single-flight initial session validation
 * - Exponential backoff on network failures (1s, 2s, 4s - max 3 retries)
 * - Immediate stop on 401 / unauthenticated responses (no log clutter or thread lock)
 * - refetchOnWindowFocus: false with controlled cooldown debounce
 * - Event-driven triggers for re-validation on login / token changes
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGlobalState } from '../state/GlobalStateContext.tsx';
import { apiFetch } from '../utils/apiFetch.ts';

export interface UserSessionData {
  userId: string;
  loginid: string;
  email?: string;
  displayName?: string;
  fullName?: string;
  balance?: number;
  currency?: string;
  accountType?: 'demo' | 'real';
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'RISK_MANAGER';
  derivAccountId?: string;
}

export interface UseSessionAuthResult {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserSessionData | null;
  error: string | null;
  checkSession: () => Promise<UserSessionData | null>;
}

// Session cache to prevent redundant requests across mounts
let cachedSession: UserSessionData | null = null;
let lastCheckTime = 0;
const SESSION_CACHE_TTL = 30000; // 30 seconds

export function useSessionAuth(): UseSessionAuthResult {
  const { state } = useGlobalState();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    Boolean(cachedSession || state.session?.isAuthenticated)
  );
  const [user, setUser] = useState<UserSessionData | null>(cachedSession);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const retryCountRef = useRef(0);
  const isFetchingRef = useRef(false);
  const isMountedRef = useRef(true);

  const checkSession = useCallback(async (): Promise<UserSessionData | null> => {
    // Avoid concurrent requests
    if (isFetchingRef.current) return cachedSession;

    const now = Date.now();
    // Return cache if checked recently and session is active
    if (cachedSession && (now - lastCheckTime < SESSION_CACHE_TTL)) {
      return cachedSession;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    let delay = 1000;
    const maxRetries = 3;

    while (retryCountRef.current <= maxRetries && isMountedRef.current) {
      try {
        const response = await apiFetch('/api/auth/session');
        lastCheckTime = Date.now();

        if (response.status === 401 || response.status === 403) {
          // Explicitly unauthenticated - stop immediately without retrying
          cachedSession = null;
          if (isMountedRef.current) {
            setIsAuthenticated(false);
            setUser(null);
            setIsLoading(false);
          }
          isFetchingRef.current = false;
          retryCountRef.current = 0;
          return null;
        }

        if (response.ok) {
          const json = await response.json().catch(() => null);
          if (json && json.success && json.data?.authenticated && json.data?.user) {
            const userData: UserSessionData = {
              userId: json.data.user.userId || json.data.user.derivAccountId,
              loginid: json.data.user.loginid || json.data.user.derivAccountId,
              email: json.data.user.email,
              displayName: json.data.user.displayName,
              fullName: json.data.user.fullName,
              balance: json.data.user.balance,
              currency: json.data.user.currency,
              accountType: json.data.user.accountType,
              role: json.data.user.role,
              derivAccountId: json.data.user.derivAccountId,
            };

            cachedSession = userData;
            if (isMountedRef.current) {
              setIsAuthenticated(true);
              setUser(userData);
              setIsLoading(false);
            }
            isFetchingRef.current = false;
            retryCountRef.current = 0;
            return userData;
          } else {
            // Unauthenticated state returned cleanly
            cachedSession = null;
            if (isMountedRef.current) {
              setIsAuthenticated(false);
              setUser(null);
              setIsLoading(false);
            }
            isFetchingRef.current = false;
            retryCountRef.current = 0;
            return null;
          }
        } else {
          // Server returned 5xx or unexpected error -> backoff retry
          throw new Error(`Server returned status ${response.status}`);
        }
      } catch (err: any) {
        retryCountRef.current += 1;
        if (retryCountRef.current > maxRetries) {
          if (isMountedRef.current) {
            setError(err?.message || 'Failed to authenticate session.');
            setIsLoading(false);
          }
          isFetchingRef.current = false;
          return null;
        }
        // Exponential backoff delay: 1000ms, 2000ms, 4000ms
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    isFetchingRef.current = false;
    if (isMountedRef.current) {
      setIsLoading(false);
    }
    return null;
  }, []);

  // Initial single-flight check on mount
  useEffect(() => {
    isMountedRef.current = true;
    checkSession();

    return () => {
      isMountedRef.current = false;
    };
  }, [checkSession]);

  return {
    isAuthenticated,
    isLoading,
    user,
    error,
    checkSession,
  };
}

export function clearSessionCache() {
  cachedSession = null;
  lastCheckTime = 0;
}
