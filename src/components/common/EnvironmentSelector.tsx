/**
 * AppexQuant Markets Global - Consolidated Single Environment Selector
 * Compact dropdown control: [ DEMO ▾ ]
 */

import React, { useState, useRef, useEffect } from 'react';
import { useGlobalState, ExecutionEnvironment } from '../../state/GlobalStateContext.js';
import { LiveAuthorizationModal } from './LiveAuthorizationModal.js';
import { ChevronDown, Database, Info, Flame, Check } from 'lucide-react';

export const EnvironmentSelector: React.FC = () => {
  const { state, dispatch } = useGlobalState();
  const [isOpen, setIsOpen] = useState(false);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeEnv = state.executionEnvironment;

  const envConfigs: Record<ExecutionEnvironment, { label: string; shortLabel: string; icon: React.ReactNode; badgeClass: string }> = {
    DEMO: {
      label: 'Demo Account',
      shortLabel: 'DEMO',
      icon: <Database className="w-3.5 h-3.5 text-purple-400" />,
      badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    },
    PAPER: {
      label: 'Paper Trading',
      shortLabel: 'PAPER',
      icon: <Info className="w-3.5 h-3.5 text-sky-400" />,
      badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    },
    LIVE: {
      label: 'Live Real Account',
      shortLabel: 'LIVE',
      icon: <Flame className="w-3.5 h-3.5 text-emerald-400" />,
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
  };

  const currentCfg = envConfigs[activeEnv];

  const handleSelectEnv = (env: ExecutionEnvironment) => {
    setIsOpen(false);
    if (env === 'LIVE') {
      setIsLiveModalOpen(true);
      return;
    }

    dispatch({ type: 'SET_EXECUTION_ENVIRONMENT', payload: env });
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        title: `Switched to ${env} Mode`,
        message:
          env === 'DEMO'
            ? 'Operating in simulated practice environment with virtual funds.'
            : 'Operating in real-time market data environment with virtual order execution.',
        type: 'info',
      },
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer bg-bg-surface dark:bg-[#181A20] hover:bg-bg-hover dark:hover:bg-[#2B313A] ${currentCfg.badgeClass}`}
        title="Select Execution Environment"
      >
        {currentCfg.icon}
        <span className="hidden sm:inline font-mono">{currentCfg.shortLabel}</span>
        <span className="sm:hidden font-mono">{currentCfg.shortLabel}</span>
        <ChevronDown className="w-3 h-3 text-text-secondary" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-bg-elevated dark:bg-[#1E2329] border border-border-color dark:border-[#2B313A] shadow-2xl z-50 p-1 space-y-1">
          <div className="text-[9px] uppercase font-mono font-bold text-text-secondary px-2.5 py-1 border-b border-border-color/60">
            Select Environment
          </div>
          {(['DEMO', 'PAPER', 'LIVE'] as ExecutionEnvironment[]).map((env) => {
            const cfg = envConfigs[env];
            const isSelected = activeEnv === env;
            return (
              <button
                key={env}
                onClick={() => handleSelectEnv(env)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'text-text-primary hover:bg-bg-hover'
                }`}
              >
                <div className="flex items-center gap-2">
                  {cfg.icon}
                  <span>{cfg.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-accent-primary" />}
              </button>
            );
          })}
        </div>
      )}

      <LiveAuthorizationModal
        isOpen={isLiveModalOpen}
        onClose={() => setIsLiveModalOpen(false)}
      />
    </div>
  );
};

export const EnvironmentGlobalBanner: React.FC = () => {
  return null; // Replaced by compact single environment dropdown
};
