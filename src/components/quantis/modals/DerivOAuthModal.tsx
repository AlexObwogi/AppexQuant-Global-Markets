/**
 * Quantis FX - Deriv OAuth Log In / Sign Up Modal
 * Supports full Deriv OAuth 2.0 Single Sign-On flow with official permissions:
 * - Scopes: read, trade, payments, trading_information
 * - One-click redirect to Deriv SSO authorization portal
 * - Instant new account creation link with affiliate attribution
 */

import React, { useState } from 'react';
import { useQuantis } from '../../../state/QuantisContext.tsx';
import {
  Shield,
  X,
  ExternalLink,
  CheckCircle2,
  Lock,
  ArrowRight,
  Zap,
  Globe,
  Loader2,
} from 'lucide-react';

export const DerivOAuthModal: React.FC = () => {
  const { isOAuthModalOpen, setOAuthModalOpen } = useQuantis();
  const [isRedirecting, setIsRedirecting] = useState(false);

  if (!isOAuthModalOpen) return null;

  const handleOAuthLogin = () => {
    setIsRedirecting(true);
    window.location.href = '/api/auth/deriv/login?action=connect&destination=/dashboard';
  };

  const handleCreateAccount = () => {
    setIsRedirecting(true);
    window.location.href = '/api/auth/deriv/signup?action=signup&destination=/dashboard';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Deriv OAuth 2.0</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Single Sign-On
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Official third-party authentication gateway.
              </p>
            </div>
          </div>
          <button
            onClick={() => setOAuthModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Requested Authorization Scopes
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Read Access:</strong> View balances, open contracts, and transaction history.</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Trading Execution:</strong> Open and close contracts via Quantis Bot Suite.</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Trading Information:</strong> Query market pricing and live proposals.</span>
              </li>
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[11px] text-blue-300/80 leading-relaxed flex items-start space-x-2">
            <Lock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>
              Your credentials are never stored on Quantis FX. Authentication occurs on Deriv's secure servers and can be revoked at any time.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleOAuthLogin}
              disabled={isRedirecting}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Redirecting to Deriv...</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span>Authorize &amp; Log In with Deriv</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              onClick={handleCreateAccount}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <span>Don't have an account? Sign Up on Deriv</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
