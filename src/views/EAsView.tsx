/**
 * AppexQuant Markets Global - Phase 4 EA Hub & Strategy Ecosystem View
 * Premium EA marketplace, Free Forever EAs, rights verification, installation wizard, and performance tracking.
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ExpertAdvisor, EACategory } from '../types/ea';
import { INITIAL_EXPERT_ADVISORS } from '../services/ea/eaEngine';
import { EADetailModal } from '../components/eas/EADetailModal';
import { EAInstallWizard } from '../components/eas/EAInstallWizard';
import { EASubmitModal } from '../components/eas/EASubmitModal';
import { EAPerformanceDashboard } from '../components/eas/EAPerformanceDashboard';
import { AutomationOrchestrator } from '../components/eas/AutomationOrchestrator';
import { AutomatedPositionMonitoring } from '../components/eas/AutomatedPositionMonitoring';
import { AutomationControlCenterView } from './AutomationControlCenterView';
import { Bot, Search, Filter, Plus, ShieldCheck, Download, Star, CheckCircle, BarChart2, Server, Sliders, ExternalLink, ShieldAlert, Cpu } from 'lucide-react';

export const EAsView: React.FC = () => {
  const [eas, setEAs] = useState<ExpertAdvisor[]>(INITIAL_EXPERT_ADVISORS);
  const [activeTab, setActiveTab] = useState<'positions' | 'control_center' | 'orchestrator' | 'discover' | 'free' | 'installed' | 'performance'>('control_center');
  const [selectedCategory, setSelectedCategory] = useState<EACategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [selectedEaForDetail, setSelectedEaForDetail] = useState<ExpertAdvisor | null>(null);
  const [selectedEaForInstall, setSelectedEaForInstall] = useState<ExpertAdvisor | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  const handleToggleFavorite = (id: string) => {
    setEAs((prev) =>
      prev.map((ea) => (ea.id === id ? { ...ea, isFavorite: !ea.isFavorite } : ea))
    );
  };

  const handleCompleteInstallation = (configured: ExpertAdvisor) => {
    setEAs((prev) =>
      prev.map((ea) => (ea.id === configured.id ? configured : ea))
    );
  };

  const handleAddSubmission = (newEa: ExpertAdvisor) => {
    setEAs((prev) => [newEa, ...prev]);
  };

  // Filtered EAs
  const filteredEAs = eas.filter((ea) => {
    const matchesTab =
      activeTab === 'discover' ||
      (activeTab === 'free' && ea.isFreeForever) ||
      (activeTab === 'installed' && ea.isInstalled);
    const matchesCategory = selectedCategory === 'ALL' || ea.category === selectedCategory;
    const matchesSearch =
      ea.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ea.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ea.supportedSymbols.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesCategory && matchesSearch;
  });

  const installedEAs = eas.filter((ea) => ea.isInstalled);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-[#131822] to-slate-900 border border-border-color">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
              <Bot className="w-7 h-7 text-cyan-400" />
              AppexQuant EA & Strategy Hub
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              ACTIVE ECOSYSTEM
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            100% Free Forever MetaTrader 5 Expert Advisors, Deriv MT5 compatibility, risk-managed installation, and performance tracking.
          </p>
        </div>

        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-text-secondary font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Submit EA</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border-color pb-4">
        {[
          { id: 'control_center', label: 'Automation Control Center', count: null },
          { id: 'positions', label: 'Automated Position Monitoring', count: null },
          { id: 'orchestrator', label: 'Execution Orchestrator', count: null },
          { id: 'discover', label: 'Discover EAs', count: eas.length },
          { id: 'free', label: 'Free Forever', count: eas.filter((e) => e.isFreeForever).length },
          { id: 'installed', label: 'My Installed EAs', count: installedEAs.length },
          { id: 'performance', label: 'EA Performance & Calendar', count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg'
                : 'bg-bg-hover text-text-secondary hover:text-text-primary border border-border-color'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span className="px-1.5 py-0.2 rounded-full bg-bg-hover text-text-secondary text-[10px]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search & Category Filter Bar */}
      {activeTab !== 'performance' && activeTab !== 'orchestrator' && activeTab !== 'positions' && activeTab !== 'control_center' && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by EA name, symbol (EURUSD), or strategy..."
              className="w-full bg-bg-hover border border-border-color rounded-xl pl-10 pr-4 py-2.5 text-xs text-text-primary focus:border-cyan-500 outline-none font-mono"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            {['ALL', 'SCALPING', 'TREND_FOLLOWING', 'BREAKOUT', 'SMC'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat as any)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-cyan-500 text-text-secondary font-bold'
                    : 'bg-bg-hover text-text-secondary border border-border-color hover:text-text-primary'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'control_center' ? (
        <AutomationControlCenterView />
      ) : activeTab === 'positions' ? (
        <AutomatedPositionMonitoring />
      ) : activeTab === 'orchestrator' ? (
        <AutomationOrchestrator />
      ) : activeTab === 'performance' ? (
        <EAPerformanceDashboard installedEAs={installedEAs} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredEAs.map((ea) => (
            <motion.div
              key={ea.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-bg-hover/90 border border-border-color hover:border-cyan-500/30 transition-all shadow-xl space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {ea.category}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        FREE FOREVER
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary">{ea.name}</h3>
                    <p className="text-xs text-text-secondary line-clamp-2">{ea.tagline}</p>
                  </div>

                  <button
                    onClick={() => handleToggleFavorite(ea.id)}
                    className={`p-2 rounded-xl border transition-all ${
                      ea.isFavorite
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-bg-hover border-border-color text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                </div>

                {/* Meta stats */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-bg-hover border border-border-color text-center">
                    <span className="text-[10px] text-text-secondary block">Win Rate</span>
                    <span className="text-text-primary font-bold">{ea.performance.winRatePct}%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-bg-hover border border-border-color text-center">
                    <span className="text-[10px] text-text-secondary block">Profit Factor</span>
                    <span className="text-cyan-400 font-bold">{ea.performance.profitFactor}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-bg-hover border border-border-color text-center">
                    <span className="text-[10px] text-text-secondary block">Max DD</span>
                    <span className="text-rose-400 font-bold">{ea.performance.maxDrawdownPct}%</span>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="pt-4 border-t border-border-color/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-secondary">
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Deriv MT5 ({ea.supportedSymbols.slice(0, 3).join(', ')})</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedEaForDetail(ea)}
                    className="px-3 py-2 rounded-xl bg-bg-hover hover:bg-bg-hover text-text-secondary text-xs font-bold transition-all"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setSelectedEaForInstall(ea)}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-text-secondary text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{ea.isInstalled ? 'Configure' : 'Install'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedEaForDetail && (
        <EADetailModal
          ea={selectedEaForDetail}
          onClose={() => setSelectedEaForDetail(null)}
          onInstall={(ea) => setSelectedEaForInstall(ea)}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {selectedEaForInstall && (
        <EAInstallWizard
          ea={selectedEaForInstall}
          onClose={() => setSelectedEaForInstall(null)}
          onCompleteInstallation={handleCompleteInstallation}
        />
      )}

      {isSubmitModalOpen && (
        <EASubmitModal
          onClose={() => setIsSubmitModalOpen(false)}
          onSubmitSuccess={handleAddSubmission}
        />
      )}
    </div>
  );
};
