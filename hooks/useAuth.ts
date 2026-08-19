import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch('/api/auth/session');
      if (!res.ok) {
        throw new Error(`Failed to fetch session. Status: ${res.status}`);
      }
      
      const payload = await res.json();
      if (payload.success && payload.data?.authenticated) {
        setUser(payload.data.user);
      } else {
        setUser(null);
      }
    } catch (err: any) {
      console.error('[useAuth] Session check failed:', err.message);
      setError(err.message || 'Failed to authenticate');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('[useAuth] Initiating client-side logout request...');
      // Direct call to clean up session cookie and redirect
      window.location.href = '/api/auth/logout';
    } catch (err: any) {
      console.error('[useAuth] Client logout execution error:', err.message);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  return {
    user,
    loading,
    error,
    logout,
    refresh: fetchSession,
  };
}
