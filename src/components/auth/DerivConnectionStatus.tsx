import React from 'react';
import { useMarketData } from '../../state/MarketDataContext';
import { StatusPill } from '../ui/StatusPill';

export const DerivConnectionStatus: React.FC = () => {
  const { connectionState, isSimulated } = useMarketData();

  let label = 'Markets Offline';
  let badgeType: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral';
  let subtext = 'Market stream unavailable';
  let pulse = false;

  if (connectionState === 'CONNECTED') {
    pulse = true;
    if (isSimulated) {
      label = 'Simulated Feed';
      badgeType = 'success';
      subtext = 'High-fidelity preview feed active';
    } else {
      label = 'Markets Connected';
      badgeType = 'success';
      subtext = 'Live market streaming active';
    }
  } else if (connectionState === 'CONNECTING' || connectionState === 'RECONNECTING') {
    label = 'Connecting...';
    badgeType = 'warning';
    subtext = 'Establishing stream connection';
    pulse = true;
  }

  return (
    <StatusPill
      label={label}
      type={badgeType}
      subtext={subtext}
      size="sm"
      pulse={pulse}
      className="cursor-pointer hover:opacity-90 transition-opacity"
    />
  );
};
