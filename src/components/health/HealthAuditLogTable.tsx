/**
 * AppexQuant Markets Global - Real-Time Health Audit & Event Log
 */

import React, { useState } from 'react';
import { HealthLogEntry } from '../../types/health.ts';
import { ServiceStatusBadge } from './ServiceStatusBadge.tsx';
import { Terminal, Filter, Search, CheckCircle2, AlertTriangle, AlertCircle, Trash2 } from 'lucide-react';

interface HealthAuditLogTableProps {
  logs: HealthLogEntry[];
}

export const HealthAuditLogTable: React.FC<HealthAuditLogTableProps> = ({ logs }) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLogs = logs.filter((log) => {
    const matchesSeverity = selectedSeverity === 'ALL' || log.severity === selectedSeverity;
    const matchesSearch =
      searchQuery === '' ||
      log.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.eventMessage.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  return (
    <div className="p-6 rounded-2xl bg-[#111622] border border-border-color shadow-2xl space-y-4 font-mono">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-color pb-4">
        <div>
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            System Health Event & Cascade Audit Trail
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Real-time telemetry log tracking service status changes, diagnostic probes, and circuit breaker triggers.
          </p>
        </div>

        {/* Severity Filters & Search */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-secondary absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search health logs..."
              className="bg-[#0B0E14] border border-border-color rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500 w-44"
            />
          </div>

          {['ALL', 'INFO', 'WARNING', 'CRITICAL'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border ${
                selectedSeverity === sev
                  ? 'bg-bg-hover text-cyan-300 border-cyan-500/40'
                  : 'bg-[#0B0E14] text-text-secondary border-border-color hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Log Feed Table */}
      {filteredLogs.length === 0 ? (
        <div className="py-12 text-center text-text-secondary text-xs border border-dashed border-border-color rounded-xl">
          No health events match the selected criteria.
        </div>
      ) : (
        <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-border-color/80 bg-[#0B0E14]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#131822] text-text-secondary text-[10px] uppercase sticky top-0 z-10 border-b border-border-color">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Service</th>
                <th className="p-3">Transition</th>
                <th className="p-3">Event Message & Downstream Impact</th>
                <th className="p-3 text-right">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-bg-surface/50 transition-colors">
                  <td className="p-3 text-text-secondary whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="p-3 font-bold text-slate-200 whitespace-nowrap">{log.serviceName}</td>
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span className="text-text-secondary text-[10px]">{log.previousStatus}</span>
                      <span className="text-slate-600">→</span>
                      <ServiceStatusBadge status={log.newStatus} size="sm" showIcon={false} pulse={false} />
                    </div>
                  </td>
                  <td className="p-3 space-y-1">
                    <p className="text-slate-200 leading-snug">{log.eventMessage}</p>
                    {log.cascadedImpacts && log.cascadedImpacts.length > 0 && (
                      <div className="p-2 rounded bg-rose-950/30 border border-rose-900/40 text-[10px] text-rose-300 space-y-0.5">
                        <strong className="block text-[9px] uppercase">Cascaded Impact:</strong>
                        {log.cascadedImpacts.map((imp, idx) => (
                          <div key={idx}>• {imp}</div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        log.severity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : log.severity === 'WARNING'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                      }`}
                    >
                      {log.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
