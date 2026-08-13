import React, { useEffect, useState } from 'react';
import { useGlobalState } from '../../state/GlobalStateContext';
import { useApiFetch } from '../../utils/apiFetch';
import { derivAuthService } from '../../services/deriv/authService';
import { formatUserConnectionStatus } from '../../utils/userStatusPresentation';
import { StatusPill } from '../ui/StatusPill';

export const DerivConnectionStatus: React.FC = () => {
  const { state, dispatch } = useGlobalState();
  const apiFetch = useApiFetch();
  const [isServerConnected, setIsServerConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    apiFetch('/api/auth/deriv/status')
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && json.data) {
          const connected = Boolean(json.data.connected);
          setIsServerConnected(connected);
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: connected ? 'ONLINE' : 'OFFLINE' });
        }
      })
      .catch(() => {
        if (isMounted) setIsServerConnected(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const isConnected = isServerConnected === true;

  const userStatus = formatUserConnectionStatus(isConnected ? 'ONLINE' : 'OFFLINE');

  return (
    <StatusPill
      label={userStatus.label}
      type={userStatus.badgeType}
      subtext={userStatus.subtext}
      size="sm"
      pulse={isConnected}
      className="cursor-pointer hover:opacity-90 transition-opacity"
    />
  );
};
