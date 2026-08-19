import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, loading, error } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      console.log('[AuthGuard] Unauthenticated user detected. Initiating login redirect...');
      // Safely direct browser to standard login gateway
      window.location.href = '/api/auth/deriv/login';
    }
  }, [user, loading]);

  if (loading) {
    return (
      fallback || (
        <div style={spinnerContainerStyle}>
          <div style={spinnerStyle}></div>
          <p style={loadingTextStyle}>Authenticating with AppexQuant...</p>
        </div>
      )
    );
  }

  // Render children only when authenticated user profile exists
  return user ? <>{children}</> : null;
}

// Minimal inline fallback styles
const spinnerContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  width: '100vw',
  backgroundColor: '#fafafa',
  fontFamily: 'system-ui, sans-serif',
};

const spinnerStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  border: '4px solid #f3f3f3',
  borderTop: '4px solid #000000',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
};

const loadingTextStyle: React.CSSProperties = {
  marginTop: '16px',
  fontSize: '14px',
  color: '#666666',
};
