/**
 * AppexQuant Markets Global - EA Installation & Configuration Wizard Component
 * Step-by-step wizard for configuring risk parameters, account binding, and Deriv MT5 installation.
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ExpertAdvisor } from '../../types/ea.ts';
import { Bot, CheckCircle, Shield, Sliders, Server, Download, ArrowRight, ArrowLeft } from 'lucide-react';

interface EAInstallWizardProps {
  ea: ExpertAdvisor;
  onClose: () => void;
  onCompleteInstallation: (configuredEa: ExpertAdvisor) => void;
}

export const EAInstallWizard: React.FC<EAInstallWizardProps> = ({ ea, onClose, onCompleteInstallation }) => {
  const [step, setStep] = useState(1);
  const [selectedSymbol, setSelectedSymbol] = useState(ea.supportedSymbols[0] || 'EURUSD');
  const [riskPerTradePct, setRiskPerTradePct] = useState(1.0);
  const [maxDailyLossPct, setMaxDailyLossPct] = useState(3.0);
  const [maxConcurrentTrades, setMaxConcurrentTrades] = useState(3);
  const [useNewsFilter, setUseNewsFilter] = useState(true);
  const [accountType, setAccountType] = useState<'DEMO' | 'REAL'>('DEMO');

  const handleFinish = () => {
    onCompleteInstallation({
      ...ea,
      isInstalled: true,
      status: 'ONLINE',
      installedVersion: ea.version,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg-main/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-bg-surface border border-border-color rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-color pb-4">
          <div>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              INSTALLATION WIZARD (Step {step} of 4)
            </span>
            <h2 className="text-xl font-extrabold text-white mt-1">Configure {ea.name}</h2>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-white font-mono text-xs">
            ✕
          </button>
        </div>

        {/* Step 1: Account & Symbol */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              1. Select Deriv MT5 Account & Symbol
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-text-secondary mb-1.5">Deriv Account Environment</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccountType('DEMO')}
                    className={`p-3 rounded-xl border text-xs font-bold font-mono transition-all ${
                      accountType === 'DEMO'
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                        : 'bg-bg-main border-border-color text-text-secondary hover:text-white'
                    }`}
                  >
                    Deriv Demo (Risk-Free)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('REAL')}
                    className={`p-3 rounded-xl border text-xs font-bold font-mono transition-all ${
                      accountType === 'REAL'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                        : 'bg-bg-main border-border-color text-text-secondary hover:text-white'
                    }`}
                  >
                    Deriv Real (Live Account)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-text-secondary mb-1.5">Target Trading Symbol</label>
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="w-full bg-bg-main border border-border-color rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:border-cyan-500 outline-none"
                >
                  {ea.supportedSymbols.map((sym) => (
                    <option key={sym} value={sym}>
                      {sym} (Deriv MT5 Feed)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Risk Guardrails */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              2. Centralized Risk Engine Guardrails
            </h3>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-text-secondary">Risk Per Trade:</span>
                  <span className="text-cyan-400 font-bold">{riskPerTradePct}%</span>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="2.0"
                  step="0.25"
                  value={riskPerTradePct}
                  onChange={(e) => setRiskPerTradePct(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-text-secondary">Daily Loss Safeguard Limit:</span>
                  <span className="text-amber-400 font-bold">{maxDailyLossPct}%</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="6.0"
                  step="0.5"
                  value={maxDailyLossPct}
                  onChange={(e) => setMaxDailyLossPct(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-bg-main border border-border-color">
                <div>
                  <span className="text-xs font-bold text-white block">News Sentinel Filter</span>
                  <span className="text-[10px] text-text-secondary font-mono">Pause EA 30 mins before High-Impact CPI/NFP</span>
                </div>
                <input
                  type="checkbox"
                  checked={useNewsFilter}
                  onChange={(e) => setUseNewsFilter(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: MT5 Installation Guide */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-cyan-400" />
              3. MT5 Terminal Installation Guide
            </h3>

            <div className="p-4 rounded-xl bg-bg-main border border-border-color space-y-3 text-xs font-mono text-text-primary">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0">1</span>
                <span>Open your Deriv MetaTrader 5 desktop terminal or web platform.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0">2</span>
                <span>Click <strong className="text-white">File &gt; Open Data Folder</strong> &gt; <strong className="text-white">MQL5 &gt; Experts</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0">3</span>
                <span>Place the downloaded <strong className="text-white">.{ea.fileType === 'COMPILED_ONLY' ? 'ex5' : 'mq5'}</strong> binary into the Experts folder.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0">4</span>
                <span>Enable <strong className="text-white">Allow Algo Trading</strong> in MT5 Tools &gt; Options &gt; Expert Advisors.</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review & Deploy */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              4. Review Configuration & Deploy
            </h3>

            <div className="p-4 rounded-xl bg-bg-main border border-border-color space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-text-secondary">Expert Advisor:</span>
                <span className="text-white font-bold">{ea.name} (v{ea.version})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Target Account:</span>
                <span className={accountType === 'REAL' ? 'text-amber-400 font-bold' : 'text-cyan-400 font-bold'}>
                  Deriv {accountType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Trading Symbol:</span>
                <span className="text-white font-bold">{selectedSymbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Risk Limit:</span>
                <span className="text-emerald-400 font-bold">{riskPerTradePct}% per trade</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Daily Guardrail:</span>
                <span className="text-amber-400 font-bold">{maxDailyLossPct}% Max Loss</span>
              </div>
            </div>

            {accountType === 'REAL' && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 font-mono">
                ⚠ REAL ACCOUNT DEPLOYMENT: Autonomous execution requires explicit confirmation. Please ensure your risk parameters are fully verified.
              </div>
            )}
          </div>
        )}

        {/* Wizard Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border-color">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-xl bg-bg-hover hover:bg-bg-hover text-text-primary text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-bg-main text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                handleFinish();
                onClose();
              }}
              className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-bg-main text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle className="w-4 h-4" /> Complete & Install EA
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
