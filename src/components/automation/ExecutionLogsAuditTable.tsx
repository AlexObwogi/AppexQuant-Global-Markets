/**
 * AppexQuant Markets Global - Execution Logs Audit Table & Manual Retry Pipeline
 * High-density audit trail with status filters, stack-trace inspection tooltip,
 * and inline single-click Celery worker retry action.
 */

import React, { useState } from 'react';
import {
  FileText,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  Info,
  Filter,
} from 'lucide-react';
import { PostExecutionLogDTO } from '../../types/socialAutomation.ts';

interface ExecutionLogsAuditTableProps {
  logs: PostExecutionLogDTO[];
  onRetryLog: (logId: number) => Promise<void>;
  onFilterStatusChange: (status: string) => void;
  selectedStatus: string;
  loading?: boolean;
}

export const ExecutionLogsAuditTable: React.FC<ExecutionLogsAuditTableProps> = ({
  logs,
  onRetryLog,
  onFilterStatusChange,
  selectedStatus,
  loading = false,
}) => {
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, string>>({});

  const handleRetry = async (logId: number) => {
    try {
      setRetryingId(logId);
      await onRetryLog(logId);
      setFeedback((prev) => ({ ...prev, [logId]: 'Queued for immediate retry!' }));
    } catch (err: any) {
      setFeedback((prev) => ({ ...prev, [logId]: err?.message || 'Retry failed.' }));
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-4 p-5 rounded-2xl bg-bg-surface border border-border-color shadow-sm">
      {/* HEADER & FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-border-color">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <FileText className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-text-primary">Execution Delivery Audit Trail</h3>
          </div>
          <p className="text-xs text-text-secondary">
            Per-channel delivery traces, response payloads, rate-limit logs, and inline retry pipeline.
          </p>
        </div>

        {/* STATUS FILTER BUTTONS */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-bg-main border border-border-color text-xs self-stretch sm:self-auto">
          {['ALL', 'SUCCESS', 'FAILED', 'PENDING'].map((status) => (
            <button
              key={status}
              onClick={() => onFilterStatusChange(status)}
              className={`px-3 py-1.5 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                selectedStatus === status
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-text-secondary border-collapse">
          <thead>
            <tr className="border-b border-border-color/60 text-[11px] font-semibold text-text-secondary uppercase">
              <th className="py-2.5 px-3">Log ID</th>
              <th className="py-2.5 px-3">Timestamp (UTC)</th>
              <th className="py-2.5 px-3">Platform & Channel</th>
              <th className="py-2.5 px-3">Post ID</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Attempts</th>
              <th className="py-2.5 px-3">Details / Diagnostics</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-color/40">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-text-secondary text-xs">
                  No execution logs found matching filter criteria.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isRetrying = retryingId === log.id;
                const isExpanded = expandedLogId === log.id;
                const msg = feedback[log.id];

                return (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-bg-main/50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-text-primary">
                        #{log.id}
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px]">
                        {new Date(log.executedAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-main border border-border-color text-text-secondary block w-fit">
                            {log.platform.split('_')[0]}
                          </span>
                          <span className="font-semibold text-text-primary text-xs truncate max-w-[140px] block">
                            {log.channelName || `Channel #${log.channelId}`}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-cyan-400">
                        Post #{log.postId}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : log.status === 'FAILED'
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {log.status === 'SUCCESS' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {log.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px]">
                        {log.attemptCount} / 3
                      </td>

                      <td className="py-3 px-3 max-w-[200px]">
                        {log.errorMessage ? (
                          <span
                            className="text-rose-400 text-[11px] truncate block font-mono cursor-pointer hover:underline"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            title={log.errorMessage}
                          >
                            {log.errorMessage}
                          </span>
                        ) : log.platformPostId ? (
                          <span className="text-emerald-400 text-[11px] font-mono truncate block">
                            Platform ID: {log.platformPostId}
                          </span>
                        ) : (
                          <span className="text-text-secondary text-[11px]">Clean delivery</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        {log.status === 'FAILED' ? (
                          <button
                            onClick={() => handleRetry(log.id)}
                            disabled={isRetrying}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                          >
                            <RotateCcw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                            <span>{isRetrying ? 'Retrying...' : 'Retry Task'}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="text-[11px] text-text-secondary hover:text-text-primary px-2 py-1 rounded bg-bg-main border border-border-color cursor-pointer ml-auto"
                          >
                            {isExpanded ? 'Hide Payload' : 'Inspect'}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* EXPANDED DIAGNOSTICS & STACK TRACE DRAWER */}
                    {isExpanded && (
                      <tr className="bg-bg-main/90">
                        <td colSpan={8} className="p-4 space-y-2 border-b border-border-color">
                          <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400">
                            <span>RAW RESPONSE PAYLOAD & TRACE RECORD (LOG #{log.id})</span>
                            <button
                              onClick={() => setExpandedLogId(null)}
                              className="text-text-secondary hover:text-text-primary"
                            >
                              ✕ Close
                            </button>
                          </div>

                          {log.errorMessage && (
                            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 font-mono text-[11px] whitespace-pre-wrap">
                              {log.errorMessage}
                            </div>
                          )}

                          <pre className="p-3 rounded-lg bg-black/60 border border-border-color text-text-secondary font-mono text-[10px] overflow-x-auto max-h-48">
                            {JSON.stringify(log.responsePayload || {}, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
