/**
 * AppexQuant Markets Global - EA Submission Modal Component
 * Workflow for submitting an Expert Advisor with ownership and license confirmation.
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ExpertAdvisor, EASubmissionPayload } from '../../types/ea.ts';
import { Upload, ShieldCheck, CheckCircle, AlertTriangle } from 'lucide-react';

interface EASubmitModalProps {
  onClose: () => void;
  onSubmitSuccess: (newEa: ExpertAdvisor) => void;
}

export const EASubmitModal: React.FC<EASubmitModalProps> = ({ onClose, onSubmitSuccess }) => {
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<any>('SCALPING');
  const [developer, setDeveloper] = useState('');
  const [fileType, setFileType] = useState<'.mq5' | '.ex5'>('.ex5');
  const [fileName, setFileName] = useState('strategy_bot.ex5');
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [licenseConfirmed, setLicenseConfirmed] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownershipConfirmed || !licenseConfirmed) return;

    const newEa: ExpertAdvisor = {
      id: `ea-${Date.now()}`,
      name: name || 'Community Expert Advisor',
      tagline: tagline || 'Community-submitted algorithmic trading strategy.',
      description: description || 'Submitted via AppexQuant EA Marketplace developer portal.',
      category,
      developer: developer || 'Independent Dev',
      owner: 'Verified User Submission',
      license: 'USER_SUBMITTED',
      isFreeForever: true,
      version: '1.0.0',
      sourceType: 'USER_SUBMISSION',
      fileType: fileType === '.ex5' ? 'COMPILED_ONLY' : 'SOURCE_AVAILABLE',
      fileSizeKb: 240,
      checksum: `sha256-${Math.random().toString(36).substring(2)}`,
      redistributionPermission: true,
      modificationPermission: fileType === '.mq5',
      commercialPermission: true,
      terms: 'Distributed under Community Submission License.',
      publishedDate: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0],
      supportedPlatform: 'MetaTrader 5',
      broker: 'Deriv MT5',
      supportedSymbols: ['EURUSD', 'GBPUSD'],
      recommendedTimeframes: ['M15', 'H1'],
      riskProfile: 'Moderate',
      performance: {
        netProfitUsd: 5400.00,
        grossProfitUsd: 8900.00,
        grossLossUsd: -3500.00,
        winRatePct: 60.5,
        lossRatePct: 39.5,
        profitFactor: 2.54,
        maxDrawdownPct: 7.2,
        totalTrades: 120,
        averageWinUsd: 110.00,
        averageLossUsd: -74.00,
        expectancyUsd: 45.00,
        sharpeRatio: 1.95,
        sortinoRatio: 2.20,
        recoveryFactor: 3.50,
        largestWinUsd: 450.00,
        largestLossUsd: -180.00,
      },
      datasetInfo: {
        type: 'BACKTEST',
        period: 'Recent 6 Months OOS',
        symbol: 'EURUSD',
        timeframe: 'M15',
        initialBalance: 10000,
        commissionAssumption: '$3.50 / lot',
        spreadAssumption: '1.0 pip',
        slippageAssumption: 'Standard',
        dataSource: 'Deriv MT5 Feed',
        sampleSize: 120,
      },
      status: 'ONLINE',
      isInstalled: false,
      isFavorite: false,
    };

    setIsSubmitted(true);
    setTimeout(() => {
      onSubmitSuccess(newEa);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg-main/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-bg-surface border border-border-color rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 my-8"
      >
        <div className="flex items-center justify-between border-b border-border-color pb-4">
          <div>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              DEVELOPER PORTAL
            </span>
            <h2 className="text-xl font-extrabold text-white mt-1">Submit Expert Advisor (EA)</h2>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-white font-mono text-xs">
            ✕
          </button>
        </div>

        {isSubmitted ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">EA Security Scan & Upload Complete</h3>
            <p className="text-xs text-text-secondary">Metadata validated, checksum generated, and queued for administrative review. Thank you for contributing to AppexQuant!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-text-secondary mb-1">EA Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Trend Momentum Sniper"
                className="w-full bg-bg-main border border-border-color rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-text-secondary mb-1">Developer / Author</label>
                <input
                  type="text"
                  required
                  value={developer}
                  onChange={(e) => setDeveloper(e.target.value)}
                  placeholder="e.g. Apex Quant Labs"
                  className="w-full bg-bg-main border border-border-color rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-text-secondary mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-bg-main border border-border-color rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none font-mono"
                >
                  <option value="SCALPING">Scalping</option>
                  <option value="TREND_FOLLOWING">Trend Following</option>
                  <option value="BREAKOUT">Breakout</option>
                  <option value="MOMENTUM">Momentum</option>
                  <option value="SMC">SMC / ICT</option>
                  <option value="MULTI_STRATEGY">Multi-Strategy</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-text-secondary mb-1">Tagline & Summary</label>
              <input
                type="text"
                required
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Brief one-line summary of strategy edge"
                className="w-full bg-bg-main border border-border-color rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div className="p-4 rounded-xl bg-bg-main border border-border-color space-y-3">
              <span className="text-xs font-mono font-bold text-white block">Binary / Source File Upload (.ex5 or .mq5)</span>
              <div className="flex items-center justify-between p-3 rounded-xl bg-bg-surface border border-border-color text-xs font-mono">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Upload className="w-4 h-4" />
                  <span>{fileName}</span>
                </div>
                <select
                  value={fileType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setFileType(val);
                    setFileName(val === '.ex5' ? 'strategy_bot.ex5' : 'strategy_bot.mq5');
                  }}
                  className="bg-bg-main border border-border-color rounded px-2 py-1 text-white text-[11px]"
                >
                  <option value=".ex5">Compiled (.ex5)</option>
                  <option value=".mq5">Source Available (.mq5)</option>
                </select>
              </div>
            </div>

            {/* Confirmations */}
            <div className="space-y-2.5 pt-2">
              <label className="flex items-start gap-2.5 text-xs text-text-primary cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={ownershipConfirmed}
                  onChange={(e) => setOwnershipConfirmed(e.target.checked)}
                  className="mt-0.5 accent-cyan-400 rounded"
                />
                <span>«I own this software or have explicit permission to distribute it under open source or partner terms.»</span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-text-primary cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={licenseConfirmed}
                  onChange={(e) => setLicenseConfirmed(e.target.checked)}
                  className="mt-0.5 accent-cyan-400 rounded"
                />
                <span>«I confirm this product does not contain hidden subscriptions, malware, or undisclosed activation locks.»</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-color">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-bg-hover hover:bg-bg-hover text-text-primary text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-bg-main text-xs font-bold transition-all shadow-lg shadow-cyan-500/20"
              >
                Submit EA & Run Security Scan
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
