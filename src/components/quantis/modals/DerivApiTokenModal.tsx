/**
 * Quantis FX - Deriv API Token Connection Modal
 * Allows connecting direct Deriv WebSocket API tokens with:
 * - Real-time authorization verification
 * - Permission scope inspection (Read, Trade, Payments, Admin)
 * - Encrypted/Local storage
 * - One-click disconnect & switch account
 */

import React, { useState } from 'react';
import { useQuantis } from '../../../state/QuantisContext.tsx';
import {
  KeyRound,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Shield,
  Trash2,
  ExternalLink,
  Lock,
  Wallet,
} from 'lucide-react';

export const DerivApiTokenModal: React.FC = () => {
  const {
    derivApiToken,
    tokenStatus,
    tokenAccount,
    isTokenModalOpen,
    setTokenModalOpen,
    saveApiToken,
    clearApiToken,
  } = useQuantis();

  const [inputToken, setInputToken] = useState(derivApiToken || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isTokenModalOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) {
      setErrorMessage('Please enter your Deriv API token.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    const success = await saveApiToken(inputToken);
    setIsVerifying(false);

    if (success) {
      setTimeout(() => {
        setTokenModalOpen(false);
      }, 700);
    } else {
      setErrorMessage('Invalid token or connection failed. Please ensure the token has "Trade" and "Read" scopes enabled.');
    }
  };

  const handleDisconnect = () => {
    clearApiToken();
    setInputToken('');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Deriv API Token</span>
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                  tokenStatus === 'VALID'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {tokenStatus === 'VALID' ? 'Connected' : 'Disconnected'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Connect your Deriv account via official API Token.
              </p>
            </div>
          </div>
          <button
            onClick={() => setTokenModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConnect} className="p-4 sm:p-5 space-y-4">
          {tokenStatus === 'VALID' && tokenAccount ? (
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Active Account:</span>
                <span className="text-xs font-mono font-bold text-slate-100 px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                  {tokenAccount.loginid} ({tokenAccount.isVirtual ? 'DEMO' : 'REAL'})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Live Balance:</span>
                <span className="text-sm font-mono font-bold text-emerald-400">
                  {tokenAccount.currency} {tokenAccount.balance.toFixed(2)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-700/60">
                <span className="text-[11px] text-slate-400 block mb-1.5">Authorized Scopes:</span>
                <div className="flex flex-wrap gap-1.5">
                  {tokenAccount.scopes.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                API Token
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder="Paste your Deriv API token here..."
                  className="w-full h-11 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Tokens can be created in your Deriv portal under <strong>Security & Limits &gt; API Token</strong> with <em>Read</em> and <em>Trade</em> scopes.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <a
              href="https://app.deriv.com/account/api-token"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
            >
              <span>Get Deriv Token</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <div className="flex items-center space-x-2">
              {tokenStatus === 'VALID' ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              ) : null}

              <button
                type="submit"
                disabled={isVerifying}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{tokenStatus === 'VALID' ? 'Re-verify Token' : 'Connect Account'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
