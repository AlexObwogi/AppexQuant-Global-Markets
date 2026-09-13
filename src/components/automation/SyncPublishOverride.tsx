/**
 * AppexQuant Markets Global - Instant 'Sync & Publish Now' Override Control
 * High-visibility manual override banner with progress states and execution toast.
 */

import React, { useState } from 'react';
import {
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Clock,
  Send,
} from 'lucide-react';
import { SyncPublishOverrideResultDTO } from '../../types/socialAutomation.ts';

interface SyncPublishOverrideProps {
  onTriggerSyncAndPublish: () => Promise<SyncPublishOverrideResultDTO>;
  pendingCount?: number;
}

export const SyncPublishOverride: React.FC<SyncPublishOverrideProps> = ({
  onTriggerSyncAndPublish,
  pendingCount = 0,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncPublishOverrideResultDTO | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTrigger = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      setResult(null);
      const res = await onTriggerSyncAndPublish();
      setResult(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Override dispatch task encountered an error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-bg-surface to-bg-surface border border-cyan-500/30 shadow-md space-y-3">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Zap className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-text-primary">
              Manual Execution Override: Sync & Publish Now
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Idempotency Locked
            </span>
          </div>
          <p className="text-xs text-text-secondary max-w-2xl leading-relaxed">
            Forces an immediate Redis lock acquisition, triggers Celery queue drain, refreshes expiring OAuth tokens, and dispatches due signals without waiting for the next 60-second polling window.
          </p>
        </div>

        <button
          onClick={handleTrigger}
          disabled={loading}
          className={`w-full md:w-auto px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shrink-0 min-h-[44px] ${
            loading
              ? 'bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 cursor-not-allowed'
              : 'bg-cyan-500 hover:bg-cyan-400 text-black border border-cyan-400'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Dispatched to Workers...' : 'Force Sync & Publish Now'}</span>
        </button>
      </div>

      {/* RESULT NOTIFICATION BANNER */}
      {result && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              <strong>Override Task Executed:</strong> {result.message} ({result.postsProcessed} posts dispatched, {result.tokensRefreshed} tokens renewed).
            </span>
          </div>
          <button
            onClick={() => setResult(null)}
            className="text-emerald-300 hover:text-white text-[11px] font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-300 hover:text-white text-[11px] font-mono"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
