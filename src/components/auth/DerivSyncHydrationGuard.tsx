/**
 * AppexQuant Markets Global - Reactive Deriv Account Sync & Hydration Guard
 * Blocks dashboard access while backend account hydration is in progress (SYNCING)
 * or if synchronization encountered an error (SYNC_FAILED).
 */

import React, { useState } from 'react';
import { useGlobalState } from '../../state/GlobalStateContext.tsx';
import { RefreshCw, AlertTriangle, ShieldCheck, CheckCircle2, LogOut, ArrowRight, ExternalLink } from 'lucide-react';
import { AppexQuantLogo } from '../common/AppexQuantLogo.tsx';

interface DerivSyncHydrationGuardProps {
  onRetrySync: () => Promise<void>;
  onSignOut: () => void;
  syncErrorMessage?: string | null;
}

export const DerivSyncHydrationGuard: React.FC<DerivSyncHydrationGuardProps> = ({
  onRetrySync,
  onSignOut,
  syncErrorMessage,
}) => {
  const { state } = useGlobalState();
  const [isRetrying, setIsRetrying] = useState(false);

  const syncStatus = state.user?.syncStatus || 'SYNCING';
  const accountId = state.user?.derivAccountId || state.user?.loginid || state.user?.id || 'Account';
  const isDemo = state.user?.accountType === 'demo' || accountId.startsWith('VR');
  const isDark = state.theme === 'dark' || (state.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetrySync();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className={`min-h-[100dvh] flex flex-col items-center justify-center p-4 transition-colors duration-500 ${isDark ? 'bg-[#0B0F19] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className={`w-full max-w-lg p-6 sm:p-8 rounded-2xl border shadow-2xl transition-all duration-300 ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
        {/* Header brand */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-700/20 mb-6">
          <div className="flex items-center gap-3">
            <AppexQuantLogo variant="symbol" className="h-8 w-auto" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider">APPEXQUANT MARKETS</h2>
              <p className="text-[11px] text-slate-500 font-mono font-semibold">Account Hydration Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold uppercase">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>OAuth 2.0</span>
          </div>
        </div>

        {/* Dynamic Status Display */}
        {syncStatus === 'SYNC_FAILED' ? (
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-rose-300">Synchronization Incomplete</h3>
                <p className="text-xs text-rose-400/90 mt-1 leading-relaxed">
                  {syncErrorMessage || 'We could not verify your authoritative Deriv account balance and trading profile. Dashboard access is blocked until hydration completes.'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black/20 border border-slate-700/30 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Login ID:</span>
                <span className="font-bold text-white">{accountId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account Type:</span>
                <span className="font-bold text-amber-400">{isDemo ? 'DEMO ACCOUNT' : 'REAL ACCOUNT'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Backend Hydration:</span>
                <span className="font-bold text-rose-400">FAILED / RETRY REQUIRED</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>{isRetrying ? 'Reconciling...' : 'Retry Synchronization'}</span>
              </button>

              <button
                onClick={onSignOut}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <div className="relative flex items-center justify-center py-4">
              <div className="absolute w-24 h-24 rounded-full bg-emerald-500/10 animate-ping pointer-events-none" />
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
            </div>

            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-slate-100">
                Synchronizing Deriv Account Data
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto">
                Reconciling real-time balance snapshots, currency metadata, and trading permissions from broker gateway.
              </p>
            </div>

            {/* Step Pipeline Checklist */}
            <div className="text-left space-y-2.5 p-4 rounded-xl bg-black/25 border border-slate-800 font-mono text-xs">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Deriv OAuth Credentials Verified</span>
              </div>
              <div className="flex items-center gap-2.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Account Identifier: <span className="font-bold text-white">{accountId}</span></span>
              </div>
              <div className="flex items-center gap-2.5 text-amber-400 animate-pulse">
                <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                <span>Querying Authoritative Balance & Snapshots...</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-500">
                <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[9px]">4</div>
                <span>Finalizing Institutional Trading Workspace</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-mono">
              Please wait a moment while the trading gateway finishes account hydration...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
