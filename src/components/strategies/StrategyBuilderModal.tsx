/**
 * AppexQuant Markets Global - Phase 3 Natural Language Strategy Builder Proxy Component
 */

import React from 'react';
import { StrategyBuilderModal as PrimaryStrategyBuilderModal } from '../strategy/StrategyBuilderModal.js';
import { UserStrategy } from '../../types/ai.js';

interface StrategyBuilderModalProps {
  onSave: (strategy: UserStrategy) => void;
  onClose: () => void;
  initialStrategy?: UserStrategy;
}

export const StrategyBuilderModal: React.FC<StrategyBuilderModalProps> = ({
  onSave,
  onClose,
  initialStrategy,
}) => {
  return (
    <PrimaryStrategyBuilderModal
      isOpen={true}
      onClose={onClose}
      onSaveStrategy={onSave}
      existingStrategy={initialStrategy}
    />
  );
};
