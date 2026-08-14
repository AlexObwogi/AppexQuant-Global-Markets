/**
 * AppexQuant Markets Global - User-Facing Safety Banner
 * Displays clean user-facing safety messages during automated execution pause/halt events.
 * Returns null during normal operational health.
 */

import React, { useState, useEffect } from 'react';
import { failSafeEngineService } from '../../services/failSafeEngineService.js';
import { FailSafeState } from '../../types/failSafe.js';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

export const SystemFailSafeBanner: React.FC = () => {
  const [failSafeState, setFailSafeState] = useState<FailSafeState>(failSafeEngineService.getState());

  useEffect(() => {
    const unsubscribe = failSafeEngineService.subscribe((newState) => {
      setFailSafeState(newState);
    });
    return unsubscribe;
  }, []);

  const isHealthy = failSafeState.status === 'HEALTHY';

  // Do not render any banner when system is operating normally
  if (isHealthy) {
    return null;
  }

  const isHalt = failSafeState.status === 'EMERGENCY_HALTED';

  return (
    <div className={`px-4 py-2 border-b text-xs flex items-center justify-between gap-2 shadow-sm font-sans ${
      isHalt ? 'bg-rose-950/80 border-rose-500/50 text-rose-200' : 'bg-amber-950/80 border-amber-500/50 text-amber-200'
    }`}>
      <div className="flex items-center gap-2.5">
        {isHalt ? (
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        )}
        <div>
          <span className="font-bold mr-2">
            {isHalt ? 'Trading Protected (Halted)' : 'Automated Execution Paused'}
          </span>
          <span className="text-[11px] opacity-90">
            {isHalt
              ? 'Automated execution is paused for safety. Existing positions remain monitored.'
              : 'Automated order placement is temporarily paused. Manual trading remains enabled.'}
          </span>
        </div>
      </div>
    </div>
  );
};
