import React from 'react';
import { useQuantis } from '../../state/QuantisContext';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Cpu, 
  Gauge, 
  ShieldAlert,
  Flame,
  Zap,
  Clock,
  Terminal
} from 'lucide-react';

export const QuantisPerformanceMonitor: React.FC = () => {
  const { 
    sessionMetrics, 
    executionStatus, 
    activeBot, 
    executionSpeed, 
    resetSessionMetrics,
    executionLogs
  } = useQuantis();

  const isProfit = sessionMetrics.netProfit >= 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-950/40 text-cyan-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Live Execution & Performance Monitor</h3>
              {/* Status Badge */}
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                executionStatus === 'RUNNING'
                  ? 'border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 animate-pulse'
                  : executionStatus === 'SCANNING'
                  ? 'border border-cyan-500/30 bg-cyan-950/60 text-cyan-400'
                  : 'border border-slate-700 bg-slate-800 text-slate-400'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  executionStatus === 'RUNNING' ? 'bg-emerald-400' : executionStatus === 'SCANNING' ? 'bg-cyan-400' : 'bg-slate-400'
                }`} />
                {executionStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Active Strategy: <span className="font-semibold text-slate-200">{activeBot ? activeBot.name : 'No Bot Loaded'}</span>
              <span className="mx-2 text-slate-600">•</span>
              Speed: <span className="font-mono text-cyan-400">{executionSpeed}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetSessionMetrics}
            title="Reset Session Telemetry"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            Reset Session
          </button>
        </div>
      </div>

      {/* Real-time Session Metrics Grid */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {/* Metric 1: Net Profit */}
        <div className="flex flex-col rounded-xl border border-slate-800/90 bg-slate-950/60 p-3.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Net Profit</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-xl font-bold font-mono tracking-tight ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isProfit ? '+' : ''}${sessionMetrics.netProfit.toFixed(2)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
            {isProfit ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-rose-400" />}
            Realized Session Yield
          </div>
        </div>

        {/* Metric 2: Total Runs */}
        <div className="flex flex-col rounded-xl border border-slate-800/90 bg-slate-950/60 p-3.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total Runs</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-white">
              {sessionMetrics.totalRuns}
            </span>
            <span className="text-xs text-slate-500">executions</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
            <Cpu className="h-3 w-3 text-cyan-400" />
            Algorithmic Cycles
          </div>
        </div>

        {/* Metric 3: Wins */}
        <div className="flex flex-col rounded-xl border border-slate-800/90 bg-slate-950/60 p-3.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Wins</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-emerald-400">
              {sessionMetrics.wins}
            </span>
            <span className="text-xs text-emerald-500/70">contracts</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400/80">
            <CheckCircle className="h-3 w-3" />
            Profitable Expiries
          </div>
        </div>

        {/* Metric 4: Losses */}
        <div className="flex flex-col rounded-xl border border-slate-800/90 bg-slate-950/60 p-3.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Losses</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-rose-400">
              {sessionMetrics.losses}
            </span>
            <span className="text-xs text-rose-500/70">contracts</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-400/80">
            <XCircle className="h-3 w-3" />
            Loss Mitigations
          </div>
        </div>

        {/* Metric 5: Win Rate & Streak */}
        <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex flex-col rounded-xl border border-slate-800/90 bg-slate-950/60 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Win Rate</span>
            <span className="font-mono text-xs font-bold text-cyan-400">
              {sessionMetrics.winRate.toFixed(1)}%
            </span>
          </div>

          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, sessionMetrics.winRate))}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
            <span>Streak: <strong className="text-slate-300 font-mono">{sessionMetrics.consecutiveWins}W / {sessionMetrics.consecutiveLosses}L</strong></span>
            <Award className="h-3 w-3 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Mini Execution Feed */}
      <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
        <div className="flex items-center justify-between pb-2 text-[11px] font-medium text-slate-400 border-b border-slate-800/60">
          <span className="flex items-center gap-1.5 font-mono text-slate-300">
            <Terminal className="h-3.5 w-3.5 text-cyan-400" />
            Live Execution Stream
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {executionLogs.length} events logged
          </span>
        </div>

        <div className="mt-2 space-y-1.5 max-h-24 overflow-y-auto font-mono text-xs pr-1">
          {executionLogs.length === 0 ? (
            <div className="py-2 text-center text-slate-500 text-[11px]">
              Ready. Start scanning or trigger an automated bot execution to stream events.
            </div>
          ) : (
            executionLogs.slice(-4).reverse().map((log) => (
              <div key={log.id} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">[{log.time}]</span>
                  <span className={`font-semibold ${
                    log.type === 'PROFIT' ? 'text-emerald-400' :
                    log.type === 'LOSS' ? 'text-rose-400' :
                    log.type === 'EXECUTION' || log.type === 'SIGNAL' ? 'text-cyan-300' :
                    log.type === 'ALERT' ? 'text-amber-400' : 'text-slate-300'
                  }`}>
                    {log.message}
                  </span>
                </div>
                {log.profit !== undefined && (
                  <span className={`font-mono font-bold ${log.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {log.profit >= 0 ? '+' : ''}${log.profit.toFixed(2)}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
