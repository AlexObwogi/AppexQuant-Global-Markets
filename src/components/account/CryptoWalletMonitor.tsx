/**
 * AppexQuant Markets Global - Crypto & Fiat Local Wallet Monitor
 * Displays live account balances for USD, USDT, BTC, ETH, and SOL with periodic Deriv API polling.
 */

import React, { useState, useEffect } from 'react';
import { walletPollingService, WalletDataResponse, WalletItem } from '../../services/walletPollingService.ts';
import { useGlobalState } from '../../state/GlobalStateContext.tsx';
import {
  Wallet,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Coins,
  ShieldCheck,
  ExternalLink,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { Card } from '../ui/Card.tsx';
import { Badge } from '../ui/Badge.tsx';
import { openCashier } from '../../services/deriv/cashierHandoff.ts';

interface CryptoWalletMonitorProps {
  onLaunchCashier: (action: 'deposit' | 'withdrawal' | 'account-transfer' | 'p2p') => void;
}

export const CryptoWalletMonitor: React.FC<CryptoWalletMonitorProps> = ({ onLaunchCashier }) => {
  const { state, refreshBalances } = useGlobalState();
  const isBalanceHidden = state.isBalanceHidden;
  const wallets = state.wallets;
  const totalUsdValue = state.totalUsdValue;
  const lastSyncedAt = state.lastWalletsSyncedAt;
  const isSyncing = state.isWalletsLoading;

  const [intervalSec, setIntervalSec] = useState<number>(15);
  const [timeAgo, setTimeAgo] = useState<string>('Just now');

  useEffect(() => {
    walletPollingService.setPollingInterval(intervalSec);
  }, [intervalSec]);

  // Relative time ticker
  useEffect(() => {
    const timer = setInterval(() => {
      if (!lastSyncedAt) return;
      const elapsedMs = Date.now() - new Date(lastSyncedAt).getTime();
      const seconds = Math.floor(elapsedMs / 1000);
      if (seconds < 5) setTimeAgo('Just now');
      else if (seconds < 60) setTimeAgo(`${seconds}s ago`);
      else setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
    }, 2000);
    return () => clearInterval(timer);
  }, [lastSyncedAt]);

  const handleManualSync = async () => {
    await refreshBalances();
  };

  const formatBalance = (amount: number, symbol: string, currency: string) => {
    if (isBalanceHidden) return '••••••';
    if (currency === 'USD' || currency === 'USDT') {
      return `${symbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${amount.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })} ${currency}`;
  };

  const formatUsdValuation = (val: number) => {
    if (isBalanceHidden) return '••••••';
    return `$ ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Card variant="surface" className="p-4 sm:p-5 space-y-4 shadow-sm border border-border-color dark:border-[#2B3139]">
      {/* Header Banner & Polling Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-color/60">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#00a86b]/15 border border-[#00a86b]/30 flex items-center justify-center text-[#00a86b] shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-text-primary tracking-tight">
                Multi-Asset Wallet Monitor
              </h3>
              <Badge variant="accent" size="sm" className="font-mono text-[10px]">
                LIVE DERIV API
              </Badge>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Monitors USD options trading balance and specialized crypto wallets (USDT, BTC, ETH, SOL).
            </p>
          </div>
        </div>

        {/* Polling Service Control Bar */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-bg-hover rounded-lg border border-border-color text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-text-secondary" />
            <span className="text-text-secondary text-[11px]">Poll:</span>
            <select
              value={intervalSec}
              onChange={(e) => setIntervalSec(Number(e.target.value))}
              className="bg-transparent font-bold text-text-primary outline-none cursor-pointer text-xs"
            >
              <option value={10}>10s</option>
              <option value={15}>15s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
              <option value={0}>Pause</option>
            </select>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#00a86b]/15 hover:bg-[#00a86b]/25 border border-[#00a86b]/30 text-[#00a86b] font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Poll fresh wallet balances from Deriv API"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Polling...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>

      {/* Portfolio Net USD Valuation summary */}
      <div className="p-3.5 bg-bg-hover/70 rounded-xl border border-border-color/60 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-text-secondary block">
            Net Portfolio Estimated Valuation
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-text-primary mt-0.5 block">
            {formatUsdValuation(totalUsdValue)}
          </span>
        </div>

        <div className="text-right space-y-0.5">
          <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1 justify-end">
            <ShieldCheck className="w-3.5 h-3.5" /> Direct Deriv Sync
          </span>
          <span className="text-[11px] font-mono text-text-secondary block">
            Last polled: <strong className="text-text-primary">{timeAgo}</strong>
          </span>
        </div>
      </div>

      {/* Grid of Individual Wallets */}
      {wallets.length === 0 ? (
        <div className="p-8 text-center bg-bg-surface border border-border-color rounded-xl space-y-3">
          <Coins className="w-10 h-10 text-text-secondary mx-auto opacity-50" />
          <p className="text-sm font-semibold text-text-primary">
            No wallets yet. Fund your wallet on Deriv
          </p>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            You can create and manage crypto and fiat wallets on Deriv. Deposits and withdrawals are completed securely on Deriv cashier.
          </p>
          <button
            onClick={() => openCashier('deposit')}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#00a86b] hover:bg-[#00ba77] text-white font-bold text-xs transition-all cursor-pointer shadow-md"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Fund Wallet on Deriv</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {wallets.map((w: WalletItem) => (
            <div
              key={w.id}
              className="p-3.5 bg-bg-surface border border-border-color hover:border-[#00a86b]/40 rounded-xl space-y-3 transition-all shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{w.icon}</span>
                  <div>
                    <span className="text-xs font-bold text-text-primary block leading-none">
                      {w.currency}
                    </span>
                    <span className="text-[10px] text-text-secondary mt-0.5 block">
                      {w.name}
                    </span>
                  </div>
                </div>

                <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {w.isVirtual ? 'DEMO' : 'ACTIVE'}
                </span>
              </div>

              <div className="pt-1 border-t border-border-color/40">
                <span className="text-sm sm:text-base font-bold font-mono text-text-primary block">
                  {formatBalance(w.balance, w.symbol, w.currency)}
                </span>
                <span className="text-[10px] font-mono text-text-secondary">
                  USD Value: {formatUsdValuation(w.usdValue)}
                </span>
              </div>

              {/* Per-Wallet Action Controls */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-border-color/40 text-[10px]">
                <button
                  onClick={() => openCashier('deposit')}
                  className="py-1.5 px-2 rounded-lg bg-[#00a86b]/15 hover:bg-[#00a86b]/25 border border-[#00a86b]/30 text-[#00a86b] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  title={`Deposit ${w.currency}`}
                >
                  <ArrowDownLeft className="w-3 h-3" />
                  <span>Deposit</span>
                </button>

                <button
                  onClick={() => openCashier('withdraw')}
                  className="py-1.5 px-2 rounded-lg bg-[#ff444f]/15 hover:bg-[#ff444f]/25 border border-[#ff444f]/30 text-[#ff444f] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  title={`Withdraw ${w.currency}`}
                >
                  <ArrowUpRight className="w-3 h-3" />
                  <span>Withdraw</span>
                </button>

                <button
                  onClick={() => onLaunchCashier('account-transfer')}
                  className="py-1.5 px-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400 font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  title={`Transfer ${w.currency}`}
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>Transfer</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
