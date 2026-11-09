/**
 * Quantis FX - Navigation Manager Modal
 * Allows users to show, hide, and reorder primary platform navigation tabs:
 * - Dashboard, Bot Builder, Quantis Academy, Marketplace, Risk Calculator, etc.
 * Preferences persist across browser sessions in localStorage.
 */

import React from 'react';
import { useQuantis, QuantisNavTab } from '../../../state/QuantisContext.tsx';
import {
  X,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle,
  LayoutDashboard,
  Bot,
  GraduationCap,
  ShoppingBag,
  Calculator,
  BarChart2,
  ArrowRightLeft,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const QuantisNavManagerModal: React.FC = () => {
  const {
    navTabs,
    isNavManagerOpen,
    setNavManagerOpen,
    toggleTabVisibility,
    moveTabOrder,
    resetNavTabs,
  } = useQuantis();

  if (!isNavManagerOpen) return null;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'LayoutDashboard':
        return <LayoutDashboard className="w-4 h-4 text-cyan-400" />;
      case 'Bot':
        return <Bot className="w-4 h-4 text-cyan-400" />;
      case 'GraduationCap':
        return <GraduationCap className="w-4 h-4 text-blue-400" />;
      case 'ShoppingBag':
        return <ShoppingBag className="w-4 h-4 text-amber-400" />;
      case 'Calculator':
        return <Calculator className="w-4 h-4 text-emerald-400" />;
      case 'BarChart2':
        return <BarChart2 className="w-4 h-4 text-purple-400" />;
      case 'ArrowRightLeft':
        return <ArrowRightLeft className="w-4 h-4 text-pink-400" />;
      case 'Zap':
        return <Zap className="w-4 h-4 text-cyan-400" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-slate-400" />;
    }
  };

  const sortedTabs = [...navTabs].sort((a, b) => a.order - b.order);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Navigation Manager</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Custom Layout
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Organize tabs to suit your trading and bot automation workflow.
              </p>
            </div>
          </div>
          <button
            onClick={() => setNavManagerOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Ordering List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2 flex-1">
          {sortedTabs.map((tab, idx) => (
            <div
              key={tab.id}
              className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                tab.visible
                  ? 'bg-slate-800/60 border-slate-700/80 text-slate-100'
                  : 'bg-slate-900/40 border-slate-800/60 text-slate-500 opacity-60'
              }`}
            >
              {/* Left: Icon & Label */}
              <div className="flex items-center space-x-3 min-w-0">
                <span className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/50">
                  {getIcon(tab.iconName)}
                </span>
                <div className="truncate">
                  <div className="text-xs sm:text-sm font-semibold truncate flex items-center gap-2">
                    <span>{tab.label}</span>
                    <span className="text-[10px] font-mono text-slate-500">/{tab.route}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Position #{idx + 1} &bull; {tab.visible ? 'Active in Top Bar' : 'Hidden'}
                  </span>
                </div>
              </div>

              {/* Right: Controls (Visibility toggle + Up/Down arrows) */}
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleTabVisibility(tab.id)}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                    tab.visible
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20'
                      : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                  }`}
                  title={tab.visible ? 'Hide from navigation' : 'Show in navigation'}
                >
                  {tab.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

                <div className="flex flex-col space-y-0.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveTabOrder(tab.id, 'up')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors cursor-pointer"
                    title="Move tab up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === sortedTabs.length - 1}
                    onClick={() => moveTabOrder(tab.id, 'down')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors cursor-pointer"
                    title="Move tab down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={resetNavTabs}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => setNavManagerOpen(false)}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Apply Layout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
