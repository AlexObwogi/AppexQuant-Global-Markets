import React from 'react';
import { useQuantis } from '../../state/QuantisContext';
import { useGlobalState } from '../../state/GlobalStateContext';
import { 
  FileCode, 
  Bot, 
  Blocks, 
  Zap, 
  ArrowRight, 
  Sparkles, 
  Upload, 
  Compass, 
  SlidersHorizontal,
  Flame,
  CheckCircle2
} from 'lucide-react';

export const QuantisActionHubGrid: React.FC = () => {
  const { openModal, activeBot } = useQuantis();
  const { setCurrentView } = useGlobalState();

  const actionCards = [
    {
      id: 'upload-bot',
      title: 'Upload Bot',
      subtitle: 'Dynamic XML Script Uploader',
      description: 'Import Deriv Blockly XML or binary strategy scripts with instantaneous AST validation and parameter ingestion.',
      badge: 'XML Parser',
      badgeColor: 'border-cyan-500/30 bg-cyan-950/50 text-cyan-400',
      icon: Upload,
      iconColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      actionText: 'Upload Script',
      action: () => openModal('uploadBot'),
      highlight: false,
    },
    {
      id: 'free-bots',
      title: 'Free Bots',
      subtitle: 'Automated Strategy Library',
      description: 'Explore certified automated models including Volatix Martingale Pro, Digit Differ Hunter, and Reversal Sentinels.',
      badge: '5 Certified Algos',
      badgeColor: 'border-emerald-500/30 bg-emerald-950/50 text-emerald-400',
      icon: Bot,
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      actionText: 'Browse Library',
      action: () => openModal('freeBots'),
      highlight: true,
    },
    {
      id: 'bot-editor',
      title: 'Bot Editor',
      subtitle: 'Visual Drag-and-Drop Canvas',
      description: 'Construct customized algorithmic logic using interlocking logic blocks, martingale matrices, and synthetic tick triggers.',
      badge: 'Visual IDE',
      badgeColor: 'border-purple-500/30 bg-purple-950/50 text-purple-400',
      icon: Blocks,
      iconColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      actionText: 'Launch Visual Editor',
      action: () => setCurrentView('bot-builder'),
      highlight: false,
    },
    {
      id: 'quick-strategy',
      title: 'Quick Strategy',
      subtitle: 'Rapid Automated Trading Setup',
      description: 'Deploy battle-tested setups in 3 clicks with automated stake sizing, profit triggers, and mathematical risk bounds.',
      badge: 'Instant Setup',
      badgeColor: 'border-blue-500/30 bg-blue-950/50 text-blue-400',
      icon: Zap,
      iconColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      actionText: 'Configure Rapid Setup',
      action: () => openModal('quickStrategy'),
      highlight: false,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            Quantis FX Action Hub
          </h2>
          <p className="text-xs text-slate-400">
            Rapid deployment modules, script visualizers, and pre-configured algorithmic pipelines.
          </p>
        </div>

        {activeBot && (
          <div className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 text-xs text-cyan-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
            <span>Active: <strong>{activeBot.name}</strong></span>
          </div>
        )}
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {actionCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={card.action}
              className={`group relative flex flex-col justify-between rounded-xl border p-5 transition-all duration-200 cursor-pointer overflow-hidden ${
                card.highlight 
                  ? 'border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/80 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10'
                  : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              {/* Subtle hover gradient illumination */}
              <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-cyan-500/5 blur-2xl group-hover:bg-cyan-500/10 transition-all duration-300" />

              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${card.iconColor} transition-transform group-hover:scale-105`}>
                    <Icon className="h-6 w-6" />
                  </div>

                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {card.title}
                  </h3>
                  <div className="text-xs font-medium text-cyan-300/80">
                    {card.subtitle}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {card.description}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-3">
                <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                  {card.actionText}
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-300 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all">
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
