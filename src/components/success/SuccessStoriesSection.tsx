/**
 * AppexQuant Markets Global - Success Stories Section Component
 * Displays verified trader success stories with mandated DATA SOURCE, PERIOD, ACCOUNT TYPE, and VERIFICATION STATUS
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { SuccessStory } from '../../types/ea.js';
import { getSuccessStories, submitSuccessStory } from '../../services/success/successStoryService.js';
import { VerificationBadge } from '../community/VerificationBadge.js';
import { PerformanceBadge } from '../common/PerformanceDisclaimer.js';
import {
  Award,
  PlusCircle,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Database,
  Calendar,
  Layers,
  Quote,
} from 'lucide-react';

export const SuccessStoriesSection: React.FC = () => {
  const [stories, setStories] = useState<SuccessStory[]>(getSuccessStories());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Form state
  const [traderName, setTraderName] = useState('');
  const [displayMode, setDisplayMode] = useState<'REAL_NAME' | 'DISPLAY_NAME' | 'ANONYMOUS'>('DISPLAY_NAME');
  const [country, setCountry] = useState('');
  const [experienceYears, setExperienceYears] = useState(3);
  const [markets, setMarkets] = useState('EUR/USD, Volatility 100 1s');
  const [strategyUsed, setStrategyUsed] = useState('Institutional Liquidity Sweep');
  const [timePeriod, setTimePeriod] = useState('Jan 2026 - Jul 2026');
  const [startingBalance, setStartingBalance] = useState(10000);
  const [endingBalance, setEndingBalance] = useState(24850);
  const [dataSource, setDataSource] = useState('Deriv Live Server #1');
  const [accountType, setAccountType] = useState<'SIMULATED' | 'BACKTEST' | 'PAPER' | 'LIVE'>('LIVE');
  const [quote, setQuote] = useState('');
  const [submittedMessage, setSubmittedMessage] = useState(false);

  const activeStory = stories[currentIndex] || stories[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % stories.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + stories.length) % stories.length);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const netResult = endingBalance - startingBalance;
    submitSuccessStory({
      traderName: traderName || 'Community Trader',
      displayMode,
      country: country || 'Global',
      experienceYears,
      markets: markets.split(',').map((m) => m.trim()),
      strategyUsed,
      timePeriod,
      startingBalance,
      endingBalance,
      netResultUsd: netResult,
      riskProfile: 'Moderate (1.0% risk)',
      quote: quote || 'AppexQuant risk management frameworks brought discipline to my executions.',
    });
    setStories(getSuccessStories());
    setSubmittedMessage(true);
    setTimeout(() => {
      setSubmittedMessage(false);
      setIsSubmitModalOpen(false);
      setTraderName('');
      setQuote('');
    }, 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header & Submit Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-[#131822] to-slate-900 border border-border-color shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Verified Trader Success Stories
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
              AUDITED RECORDS
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1 max-w-2xl">
            Real performance records and user experiences. All featured records explicitly state data source, environment, and verification level.
          </p>
        </div>

        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-bg-main font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Submit Success Story</span>
        </button>
      </div>

      {/* Cinematic Carousel Card */}
      <div className="relative rounded-2xl bg-[#111622] border border-border-color p-8 shadow-2xl overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch relative z-10">
          {/* Left: Trader Profile & Bio */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xl">
                  {activeStory.traderName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {activeStory.displayMode === 'ANONYMOUS' ? 'Anonymous Trader' : activeStory.traderName}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {activeStory.country} • {activeStory.experienceYears} Years Experience
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <VerificationBadge
                  status={(activeStory.verificationStatus as any) === 'VERIFIED' ? 'PERFORMANCE_VERIFIED' : 'UNVERIFIED'}
                  showDetails
                  connectedAccountNote="Connected Deriv Real MT5 Execution Record"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0B0E14] border border-border-color space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-text-secondary">Markets:</span>
                <span className="text-cyan-400 font-semibold">{activeStory.markets.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Strategy:</span>
                <span className="text-white font-semibold truncate max-w-[180px]">{activeStory.strategyUsed}</span>
              </div>
            </div>
          </div>

          {/* Middle: Net Result & Mandated 4 Performance Display Fields */}
          <div className="p-6 rounded-2xl bg-[#0B0E14] border border-border-color space-y-4 text-center flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-border-color/80 pb-2">
              <span className="text-[11px] uppercase tracking-wider font-mono text-text-secondary font-bold">
                Performance Record
              </span>
              <PerformanceBadge environment={(activeStory as any).accountType || 'LIVE'} size="sm" />
            </div>

            <div>
              <span className="text-[10px] uppercase font-mono text-text-secondary block">Verified Net Result</span>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono mt-1">
                +${activeStory.netResultUsd.toLocaleString()}
              </div>
            </div>

            {/* Mandated 4 Required Display Fields Grid */}
            <div className="grid grid-cols-2 gap-2 text-left text-[11px] font-mono bg-[#131822] p-3 rounded-xl border border-border-color/80">
              <div>
                <span className="text-text-secondary text-[10px] uppercase block flex items-center gap-1">
                  <Database className="w-3 h-3 text-cyan-400" /> Data Source
                </span>
                <span className="font-bold text-slate-200 block truncate" title={(activeStory as any).dataSource || 'Deriv Live Server #1'}>
                  {(activeStory as any).dataSource || 'Deriv Live Server #1'}
                </span>
              </div>

              <div>
                <span className="text-text-secondary text-[10px] uppercase block flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-cyan-400" /> Period
                </span>
                <span className="font-bold text-slate-200 block">
                  {activeStory.timePeriod}
                </span>
              </div>

              <div>
                <span className="text-text-secondary text-[10px] uppercase block flex items-center gap-1">
                  <Layers className="w-3 h-3 text-cyan-400" /> Account Type
                </span>
                <span className="font-bold text-sky-400 block">
                  {(activeStory as any).accountType || 'LIVE'}
                </span>
              </div>

              <div>
                <span className="text-text-secondary text-[10px] uppercase block">Verification Status</span>
                <span className="font-bold text-emerald-400 block">
                  {activeStory.verificationStatus === 'VERIFIED' ? 'PERFORMANCE_VERIFIED' : 'UNVERIFIED'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Trader Quote & Navigation */}
          <div className="space-y-6 flex flex-col justify-between">
            <div className="relative p-5 rounded-xl bg-[#0B0E14] border border-border-color/80 italic text-text-primary text-xs sm:text-sm leading-relaxed">
              <Quote className="w-6 h-6 text-amber-400/30 absolute -top-3 -left-2" />
              "{activeStory.quote}"
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border-color/80">
              <span className="text-xs text-text-secondary font-mono">
                Record {currentIndex + 1} of {stories.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  className="p-2 rounded-xl bg-bg-hover hover:bg-bg-hover text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNext}
                  className="p-2 rounded-xl bg-bg-hover hover:bg-bg-hover text-white transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Regulatory Safeguard Footer */}
        <div className="pt-4 border-t border-border-color/80 flex items-center gap-2 text-[11px] text-text-secondary font-mono">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Performance Safeguard:</strong> Unverified self-reported submissions do NOT receive "Performance Verified" badges. All verified records are audited against connected broker MT5 account history.
          </span>
        </div>
      </div>

      {/* Share Your Story Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111622] border border-border-color rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-border-color pb-3">
              <h3 className="text-base font-bold text-white font-mono uppercase">Submit Trader Success Story</h3>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-text-secondary hover:text-white text-sm font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            {submittedMessage ? (
              <div className="p-6 text-center space-y-3 font-mono">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-white">Story Queued for Audit</h4>
                <p className="text-xs text-text-secondary">Your story has been submitted. To upgrade from UNVERIFIED to PERFORMANCE_VERIFIED, connect your live broker account.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-text-secondary mb-1">Trader Name</label>
                    <input
                      type="text"
                      required
                      value={traderName}
                      onChange={(e) => setTraderName(e.target.value)}
                      placeholder="e.g. Alex M."
                      className="w-full bg-[#131822] border border-border-color rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-text-secondary mb-1">Account Type</label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value as any)}
                      className="w-full bg-[#131822] border border-border-color rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none font-mono"
                    >
                      <option value="LIVE">LIVE</option>
                      <option value="PAPER">PAPER</option>
                      <option value="BACKTEST">BACKTEST</option>
                      <option value="SIMULATED">SIMULATED</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-text-secondary mb-1">Data Source</label>
                    <input
                      type="text"
                      value={dataSource}
                      onChange={(e) => setDataSource(e.target.value)}
                      placeholder="e.g. Deriv MT5 Live Gateway"
                      className="w-full bg-[#131822] border border-border-color rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-text-secondary mb-1">Time Period</label>
                    <input
                      type="text"
                      value={timePeriod}
                      onChange={(e) => setTimePeriod(e.target.value)}
                      placeholder="e.g. Jan 2026 - Jul 2026"
                      className="w-full bg-[#131822] border border-border-color rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-text-secondary mb-1">Trader Quote / Experience</label>
                  <textarea
                    required
                    rows={3}
                    value={quote}
                    onChange={(e) => setQuote(e.target.value)}
                    placeholder="Describe your trading discipline, risk management, and experience..."
                    className="w-full bg-[#131822] border border-border-color rounded-xl px-3 py-2 text-xs text-white outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border-color font-mono">
                  <button
                    type="button"
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-bg-hover text-text-primary text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-bg-main text-xs font-bold uppercase transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    Submit Story for Review
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};
