import React from 'react';
import { BarChart2 } from 'lucide-react';

export const ScenarioEngine: React.FC<{ instrument: any }> = ({ instrument }) => (
  <div className="space-y-2">
    <h4 className="text-xs font-bold text-text-primary uppercase flex items-center gap-1.5"><BarChart2 className="w-3.5 h-3.5 text-accent-primary" /> Scenario Analysis</h4>
    <div className="text-[11px] text-text-secondary font-mono">Market scenarios will be mapped here...</div>
  </div>
);
