import React, { useState } from 'react';
import { useQuantis } from '../../state/QuantisContext';
import { 
  Play, 
  Square, 
  Search, 
  Gauge, 
  Sliders, 
  Terminal, 
  ChevronUp, 
  ChevronDown, 
  ShieldCheck, 
  Zap,
  Bot,
  Radar
} from 'lucide-react';

export const QuantisFooterBar: React.FC = () => {
  const { 
    executionStatus, 
    startExecution, 
    stopExecution, 
    executionSpeed, 
    setExecutionSpeed,
    openModal,
    activeBot,
    executionLogs,
    isConnected
  } = useQuantis();

  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  const isRunning = executionStatus === 'RUNNING' || executionStatus === 'SCANNING';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl shadow-2xl">
      {/* Expandable Console Drawer */}
      {isConsoleOpen && (
        <div className="border-b border-slate-800 bg-slate-900/95 p-4 max-h-64 overflow-y-auto font-mono text-xs text-slate-300">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-white uppercase text-[10px] tracking-wider">
              <Terminal className="h-3.5 w-3.5 text-cyan-400" />
              Trading Execution Log
            </span>
            <button
              onClick={() => setIsConsoleOpen(false)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              Close [✕]
            </button>
          </div>

          <div className="mt-2 space-y-1">
            {executionLogs.length === 0 ? (
              <div className="py-4 text-center text-slate-400">
                Awaiting trading signals. Click [Start Strategy] or open Auto Pilot.
              </div>
            ) : (
              executionLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3">
                  <span className="text-slate-500">[{log.time}]</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    log.type === 'PROFIT' ? 'bg-emerald-950 text-emerald-400' :
                    log.type === 'LOSS' ? 'bg-rose-950 text-rose-400' :
                    log.type === 'EXECUTION' || log.type === 'SIGNAL' ? 'bg-cyan-950 text-cyan-400' :
                    log.type === 'ALERT' ? 'bg-amber-950 text-amber-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {log.type}
                  </span>
                  <span className="text-slate-200">{log.message}</span>
                  {log.profit !== undefined && (
                    <span className={`ml-auto font-bold ${log.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {log.profit >= 0 ? '+' : ''}${log.profit.toFixed(2)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Bottom Control Bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        {/* Left: Quick Scanners Launchers */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => openModal('smartScan')}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-cyan-500/40 hover:text-cyan-400 transition-colors"
          >
            <Radar className="h-3.5 w-3.5 text-cyan-400" />
            <span>Smart Scan</span>
          </button>

          <button
            onClick={() => openModal('autoPilot')}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-blue-500/40 hover:text-blue-400 transition-colors"
          >
            <Bot className="h-3.5 w-3.5 text-blue-400" />
            <span>Auto Pilot</span>
          </button>

          <button
            onClick={() => openModal('copilotScanner')}
            className="hidden md:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-blue-500/40 hover:text-cyan-400 transition-colors"
          >
            <Sliders className="h-3.5 w-3.5 text-cyan-400" />
            <span>Copilot Scanner</span>
          </button>

          {/* Console Drawer Toggle */}
          <button
            onClick={() => setIsConsoleOpen(!isConsoleOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-slate-400 hover:border-slate-700 hover:text-white transition-colors"
          >
            <Terminal className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Logs</span>
            {isConsoleOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
        </div>

        {/* Center: Execution Speed Toggle (FAST / NORMAL) */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-1">
          <button
            onClick={() => setExecutionSpeed('NORMAL')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              executionSpeed === 'NORMAL'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gauge className="h-3 w-3" />
            <span>NORMAL</span>
          </button>

          <button
            onClick={() => setExecutionSpeed('FAST')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              executionSpeed === 'FAST'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="h-3 w-3 text-cyan-300" />
            <span>FAST</span>
          </button>
        </div>

        {/* Right: Primary Scan & Start Trigger */}
        <div className="flex items-center gap-3">
          {isRunning ? (
            <button
              onClick={() => stopExecution()}
              className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-rose-950/40 hover:bg-rose-500 active:scale-95 transition-all"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Stop Engine</span>
            </button>
          ) : (
            <button
              onClick={() => startExecution()}
              className="group flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 hover:text-white active:scale-95 transition-all"
            >
              <Play className="h-3.5 w-3.5 fill-current group-hover:scale-110 transition-transform" />
              <span>Scan &amp; Start</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
