/**
 * AppexQuant Markets Global - Phase 3 Strategy Market Scanner Proxy Component
 */

import React from 'react';
import { StrategyScannerModal as PrimaryStrategyScannerModal } from '../strategy/StrategyScannerModal';
import { UserStrategy } from '../../types/ai';

interface MarketScannerProps {
  strategy: UserStrategy;
  onClose: () => void;
  onSelectSymbol?: (symbol: string) => void;
}

export const MarketScanner: React.FC<MarketScannerProps> = ({ strategy, onClose, onSelectSymbol }) => {
  return (
    <PrimaryStrategyScannerModal
      isOpen={true}
      onClose={onClose}
      strategy={strategy}
      onSelectSymbol={onSelectSymbol}
    />
  );
};
