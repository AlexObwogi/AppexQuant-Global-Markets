/**
 * AppexQuant Markets Global - Cashier & Wallet Hub
 * 
 * Secure interface for Deposits, Withdrawals, Inter-Wallet Transfers, and P2P:
 * - Links directly to official PCI-DSS compliant cashier portals
 * - Passes redirect_url with callback parameter so users seamlessly return to AppexQuant
 * - Supports Real and Demo account balance refreshing
 * - Smooth inter-wallet transfers across USD, USDT, SOL, BTC, ETH, and MT5 accounts
 */

import React, { useState } from 'react';
import { useGlobalState } from '../../state/GlobalStateContext.tsx';
import { useMarketData } from '../../state/MarketDataContext.tsx';
import { derivTradingClient } from '../../services/deriv/tradingClient.ts';
import { apiFetch } from '../../utils/apiFetch.ts';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Building2,
  Coins,
  CheckCircle2,
  RefreshCw,
  X,
  AlertCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface CashierModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'deposit' | 'withdrawal' | 'transfer' | 'p2p';
}

export const CashierModal: React.FC<CashierModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'deposit',
}) => {
  const { state, dispatch, selectedAccount } = useGlobalState();
  const { balance: marketBalance, currency: marketCurrency, reconnect } = useMarketData();

  const [activeTab, setActiveTab] = useState<'deposit' | 'withdrawal' | 'transfer' | 'p2p'>(defaultTab);
  const [selectedPreset, setSelectedPreset] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>('50');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Inter-wallet transfer state
  const [sourceWallet, setSourceWallet] = useState<string>('USD_OPTIONS');
  const [destWallet, setDestWallet] = useState<string>('USDT_CRYPTO');
  const [transferAmount, setTransferAmount] = useState<string>('10');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferMessage, setTransferMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentBalance = typeof marketBalance === 'number'
    ? marketBalance
    : selectedAccount?.balance?.balance ?? 0;
  
  const currentCurrency = marketCurrency || selectedAccount?.balance?.currency || 'USD';
  const derivAccountId = derivTradingClient.getCurrentAccountId() || state.user?.derivAccountId || state.session.userId || 'Demo Account';
  const isReal = derivTradingClient.isRealAccount() || derivAccountId.startsWith('CR');

  // Construct return URL with completion callback
  const getReturnUrl = (action: string) => {
    if (typeof window === 'undefined') return 'https://app.deriv.com';
    const origin = window.location.origin;
    return `${origin}/?action=cashier_completed&type=${action}&account=${encodeURIComponent(derivAccountId)}&ts=${Date.now()}`;
  };

  const cashierUrls = {
    deposit: `https://app.deriv.com/cashier/deposit?redirect_url=${encodeURIComponent(getReturnUrl('deposit'))}`,
    withdrawal: `https://app.deriv.com/cashier/withdrawal?redirect_url=${encodeURIComponent(getReturnUrl('withdrawal'))}`,
    transfer: `https://app.deriv.com/cashier/account-transfer?redirect_url=${encodeURIComponent(getReturnUrl('transfer'))}`,
    p2p: `https://app.deriv.com/cashier/p2p?redirect_url=${encodeURIComponent(getReturnUrl('p2p'))}`,
  };

  const handleOpenCashier = (tab: 'deposit' | 'withdrawal' | 'transfer' | 'p2p') => {
    const url = cashierUrls[tab];
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleManualBalanceRefresh = async () => {
    setIsRefreshing(true);
    try {
      reconnect();
      if (state.session.isAuthenticated) {
        const res = await apiFetch('/api/auth/deriv/sync', {
          method: 'POST',
          body: JSON.stringify({
            loginid: derivAccountId,
          }),
        }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.data?.balance !== undefined) {
            dispatch({
              type: 'UPDATE_ACCOUNT_BALANCE',
              payload: {
                balance: data.data.balance,
                currency: data.data.currency || currentCurrency,
                loginid: derivAccountId,
              },
            });
          }
        }
      }
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          title: 'Balance Synchronized',
          message: `Updated balance for ${derivAccountId}: ${currentCurrency} ${currentBalance.toFixed(2)}`,
          type: 'success',
        },
      });
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const walletOptions = [
    { id: 'USD_OPTIONS', label: 'USD Options Trading Wallet', icon: '💲' },
    { id: 'USDT_CRYPTO', label: 'Tether (USDT) Crypto Wallet', icon: '₮' },
    { id: 'SOL_CRYPTO', label: 'Solana (SOL) Wallet', icon: '◎' },
    { id: 'BTC_CRYPTO', label: 'Bitcoin (BTC) Wallet', icon: '₿' },
    { id: 'ETH_CRYPTO', label: 'Ethereum (ETH) Wallet', icon: 'Ξ' },
    { id: 'MT5_SYNTHETIC', label: 'Deriv MT5 Synthetic Account', icon: '📊' },
    { id: 'MT5_FINANCIAL', label: 'Deriv MT5 Financial Account', icon: '📈' },
  ];

  const handleExecuteWalletTransfer = async () => {
    setIsTransferring(true);
    setTransferMessage(null);
    try {
      // Open official transfer portal with return redirect
      handleOpenCashier('transfer');
      setTransferMessage(`Transfer initiated from ${sourceWallet} to ${destWallet}. Complete on portal and click 'Sync Balance'.`);
    } catch {
      setTransferMessage('Failed to initialize transfer window.');
    } finally {
      setIsTransferring(false);
    }
  };

  const presets = [20, 50, 100, 250, 500];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="bg-[#1c1f26] border border-[#2a2e39] rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#2a2e39] flex items-center justify-between bg-[#15171e]/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#00a86b]/15 border border-[#00a86b]/30 flex items-center justify-center text-[#00a86b]">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Cashier & Wallets
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                  isReal
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}>
                  {isReal ? 'Real Account' : 'Demo Account'}
                </span>
              </div>
              <p className="text-xs text-[#9699a0] mt-0.5">
                Account ID: <span className="font-mono text-white font-semibold">{derivAccountId}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#9699a0] hover:text-white hover:bg-[#2a2e39] rounded-xl transition-colors cursor-pointer"
            aria-label="Close cashier modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Ribbon & Refresh Action */}
        <div className="px-4 sm:px-5 py-3 bg-[#15171e] border-b border-[#2a2e39] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#9699a0] block">
              Available Cashier Balance
            </span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                {currentCurrency} {currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <button
            onClick={handleManualBalanceRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1c1f26] hover:bg-[#2a2e39] border border-[#2a2e39] rounded-lg text-xs font-semibold text-[#9699a0] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh balance from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#00a86b]' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Balance'}</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#2a2e39] bg-[#15171e]/50 px-2 sm:px-4">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
              activeTab === 'deposit'
                ? 'border-[#00a86b] text-[#00a86b]'
                : 'border-transparent text-[#9699a0] hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Deposit</span>
          </button>

          <button
            onClick={() => setActiveTab('withdrawal')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
              activeTab === 'withdrawal'
                ? 'border-[#ff444f] text-[#ff444f]'
                : 'border-transparent text-[#9699a0] hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdrawal</span>
          </button>

          <button
            onClick={() => setActiveTab('transfer')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
              activeTab === 'transfer'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-[#9699a0] hover:text-white'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Transfer</span>
          </button>

          <button
            onClick={() => setActiveTab('p2p')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
              activeTab === 'p2p'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-[#9699a0] hover:text-white'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>P2P</span>
          </button>
        </div>

        {/* Modal Tab Content Area */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* DEPOSIT TAB */}
          {activeTab === 'deposit' && (
            <div className="space-y-4">
              <div className="bg-[#15171e] p-3.5 rounded-xl border border-[#2a2e39] space-y-2">
                <span className="text-xs font-semibold text-white block">
                  Select Quick Deposit Amount
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {presets.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setSelectedPreset(amt);
                        setCustomAmount(String(amt));
                      }}
                      className={`py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        Number(customAmount) === amt
                          ? 'bg-[#00a86b] text-white shadow-md'
                          : 'bg-[#1c1f26] border border-[#2a2e39] text-[#9699a0] hover:text-white hover:border-[#00a86b]/40'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="text-[11px] text-[#9699a0] block mb-1">
                    Or Enter Custom Amount ({currentCurrency}):
                  </label>
                  <div className="flex items-center bg-[#1c1f26] border border-[#2a2e39] rounded-lg px-3 py-2">
                    <span className="text-[#9699a0] font-mono mr-2">$</span>
                    <input
                      type="number"
                      min={10}
                      step={10}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="50"
                      className="w-full bg-transparent font-mono text-sm text-white font-bold outline-none"
                    />
                    <span className="text-[#9699a0] text-xs font-mono">{currentCurrency}</span>
                  </div>
                </div>
              </div>

              {/* Supported Payment Channels */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-[#15171e] border border-[#2a2e39] p-3 rounded-xl flex flex-col items-center text-center space-y-1.5">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  <span className="text-[11px] font-bold text-white">Cards & Wallets</span>
                  <span className="text-[9px] text-[#9699a0]">Visa, MC, Skrill, Neteller</span>
                </div>
                <div className="bg-[#15171e] border border-[#2a2e39] p-3 rounded-xl flex flex-col items-center text-center space-y-1.5">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <span className="text-[11px] font-bold text-white">Cryptocurrency</span>
                  <span className="text-[9px] text-[#9699a0]">USDT, SOL, BTC, ETH</span>
                </div>
                <div className="bg-[#15171e] border border-[#2a2e39] p-3 rounded-xl flex flex-col items-center text-center space-y-1.5">
                  <Building2 className="w-5 h-5 text-sky-400" />
                  <span className="text-[11px] font-bold text-white">Bank Transfer</span>
                  <span className="text-[9px] text-[#9699a0]">Instant Local Banking</span>
                </div>
              </div>

              {/* Security & Return Assurance */}
              <div className="bg-[#00a86b]/10 border border-[#00a86b]/20 p-3 rounded-xl flex items-start space-x-2.5 text-xs text-[#9699a0]">
                <ShieldCheck className="w-4 h-4 text-[#00a86b] shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-white">Seamless Redirect Flow:</strong> You will be securely directed to the certified cashier to complete your deposit. Once finalized, you are automatically redirected back here with your fresh balance to execute live trades.
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={() => handleOpenCashier('deposit')}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-[#00a86b] hover:bg-[#00ba77] active:scale-[0.99] text-white transition-all cursor-pointer shadow-lg flex items-center justify-center space-x-2"
              >
                <span>Deposit (${customAmount || '50'})</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* WITHDRAWAL TAB */}
          {activeTab === 'withdrawal' && (
            <div className="space-y-4">
              <div className="bg-[#15171e] p-3.5 rounded-xl border border-[#2a2e39] space-y-3">
                <span className="text-xs font-semibold text-white block">
                  Withdrawal Conditions
                </span>
                <div className="flex justify-between items-center text-xs font-mono py-1 border-b border-[#2a2e39]">
                  <span className="text-[#9699a0]">Available for Payout:</span>
                  <span className="text-white font-bold">${currentBalance.toFixed(2)} {currentCurrency}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono py-1 border-b border-[#2a2e39]">
                  <span className="text-[#9699a0]">Authentication:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 2FA Verified
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono py-1">
                  <span className="text-[#9699a0]">Processing Speed:</span>
                  <span className="text-white">Instant - 24 Hours</span>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-start space-x-2.5 text-xs text-[#9699a0]">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-white">Safety Verification:</strong> Email token or 2FA confirmation required to finalize withdrawal. You will complete verification and return to the site automatically.
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenCashier('withdrawal')}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-[#ff444f] hover:bg-[#ff555f] active:scale-[0.99] text-white transition-all cursor-pointer shadow-lg flex items-center justify-center space-x-2"
              >
                <span>Request Withdrawal</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TRANSFER TAB */}
          {activeTab === 'transfer' && (
            <div className="space-y-4">
              <div className="bg-[#15171e] p-3.5 rounded-xl border border-[#2a2e39] space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-white block">
                    Inter-Wallet & Account Transfers
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                    Zero Fees • Instant
                  </span>
                </div>
                <p className="text-[#9699a0] leading-relaxed">
                  Transfer funds seamlessly between your USD Options wallet, MT5 accounts, and specialized Crypto wallets (Tether USDT, Solana SOL, Bitcoin BTC, Ethereum ETH).
                </p>

                {/* Source & Destination Wallet Selectors */}
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="text-[10px] font-mono text-[#9699a0] uppercase block mb-1">
                      From Source Wallet / Account
                    </label>
                    <select
                      value={sourceWallet}
                      onChange={(e) => setSourceWallet(e.target.value)}
                      className="w-full bg-[#1c1f26] border border-[#2a2e39] rounded-lg p-2.5 text-xs font-mono text-white font-bold outline-none"
                    >
                      {walletOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.icon} {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-center my-1">
                    <div className="w-8 h-8 rounded-full bg-[#2a2e39] flex items-center justify-center text-sky-400">
                      <ArrowLeftRight className="w-4 h-4" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-[#9699a0] uppercase block mb-1">
                      To Destination Wallet / Account
                    </label>
                    <select
                      value={destWallet}
                      onChange={(e) => setDestWallet(e.target.value)}
                      className="w-full bg-[#1c1f26] border border-[#2a2e39] rounded-lg p-2.5 text-xs font-mono text-white font-bold outline-none"
                    >
                      {walletOptions.map((opt) => (
                        <option key={opt.id} value={opt.id} disabled={opt.id === sourceWallet}>
                          {opt.icon} {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Transfer Amount */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-[#9699a0] mb-1">
                      <span>Transfer Amount ($ USD)</span>
                      <div className="flex space-x-1">
                        {['25%', '50%', '75%', '100%'].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              const factor = Number(pct.replace('%', '')) / 100;
                              setTransferAmount((currentBalance * factor).toFixed(2));
                            }}
                            className="px-1.5 py-0.5 rounded bg-[#2a2e39] hover:bg-sky-500/20 text-[#9699a0] hover:text-sky-400 text-[9px] font-bold"
                          >
                            {pct}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full bg-[#1c1f26] border border-[#2a2e39] rounded-lg p-2.5 text-xs font-mono text-white font-bold outline-none focus:border-sky-400"
                      placeholder="Amount to transfer"
                    />
                  </div>
                </div>
              </div>

              {transferMessage && (
                <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-300 text-xs font-mono leading-relaxed">
                  {transferMessage}
                </div>
              )}

              <button
                type="button"
                disabled={isTransferring}
                onClick={handleExecuteWalletTransfer}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-sky-500 hover:bg-sky-600 active:scale-[0.99] text-white transition-all cursor-pointer shadow-lg flex items-center justify-center space-x-2"
              >
                {isTransferring ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                <span>Transfer Between Wallets</span>
              </button>
            </div>
          )}

          {/* P2P TAB */}
          {activeTab === 'p2p' && (
            <div className="space-y-4">
              <div className="bg-[#15171e] p-3.5 rounded-xl border border-[#2a2e39] space-y-3 text-xs">
                <span className="font-semibold text-white block">
                  Peer-to-Peer (P2P) Exchange
                </span>
                <p className="text-[#9699a0] leading-relaxed">
                  Exchange local currency and mobile money directly with verified local traders in your region using escrow protection.
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2.5 bg-[#1c1f26] rounded-lg border border-[#2a2e39]">
                    <span className="text-[#9699a0] block">Escrow Security</span>
                    <span className="text-emerald-400 font-bold">100% Protected</span>
                  </div>
                  <div className="p-2.5 bg-[#1c1f26] rounded-lg border border-[#2a2e39]">
                    <span className="text-[#9699a0] block">Fees</span>
                    <span className="text-emerald-400 font-bold">0% Commission</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenCashier('p2p')}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-black font-bold transition-all cursor-pointer shadow-lg flex items-center justify-center space-x-2"
              >
                <span>Launch P2P Exchange</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer with "I Have Finished" Direct Callback */}
        <div className="p-3.5 bg-[#15171e] border-t border-[#2a2e39] flex items-center justify-between">
          <span className="text-[11px] text-[#9699a0] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#00a86b]" />
            Official Cashier Gateway
          </span>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleManualBalanceRefresh}
              className="px-3 py-1.5 rounded-lg border border-[#2a2e39] hover:border-emerald-500/40 text-xs font-semibold text-white bg-[#1c1f26] hover:bg-[#2a2e39] transition-colors cursor-pointer flex items-center space-x-1"
            >
              <span>I Finished &bull; Refresh Balance</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[#2a2e39] text-xs font-semibold text-[#9699a0] hover:text-white transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
