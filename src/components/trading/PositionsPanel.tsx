import React from 'react';
import { useGlobalState } from '../../state/GlobalStateContext';
import { Card } from '../ui/Card';

export const PositionsPanel: React.FC = () => {
  const { state } = useGlobalState();
  // Placeholder: Get positions from state
  const positions = []; // state.positions || [];

  return (
    <Card className="p-4 bg-bg-surface border border-border-color">
      <h3 className="font-bold mb-4 text-text-primary">Open Positions</h3>
      {positions.length === 0 ? (
        <div className="text-sm text-text-secondary text-center p-4">No open positions.</div>
      ) : (
        <div className="text-sm">Positions list...</div>
      )}
    </Card>
  );
};
