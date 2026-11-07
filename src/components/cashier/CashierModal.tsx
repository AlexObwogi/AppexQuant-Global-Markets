/**
 * AppexQuant Markets Global - Cashier & Wallet Hub
 * 
 * Secure interface for Deposits, Withdrawals, Inter-Wallet Transfers, and P2P:
 * - Direct handoff to official Deriv cashier portals via openCashier
 * - Native inter-wallet transfers with explicit rate check and confirm dialog
 * - Compliant with Deriv terms (no custom deposit inputs or deposit proxying)
 */

import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../../state/GlobalStateContext.tsx';
import { useMarketData } from '../../state/MarketDataContext.tsx';
import { derivTradingClient } from '../../services/deriv/tradingClient.ts';
import { openCashier } from '../../services/deriv/cashierHandoff.ts';
import { walletPollingService, WalletDataResponse } from '../../services/walletPollingService.ts';
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
  RefreshCw,
  X,
  AlertCircle,
  ArrowRight,
  Loader2,
  Check,
} from 'lucide-react';

interface CashierModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'deposit' | 'withdrawal' | 'transfer' | 'p2p';
}

interface UserAccountItem {
  id: string;
  currency: string;
  label: string;
  balance: number;
}

export const CashierModal: React.FC<CashierModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'deposit',
}) => {
  const { state, dispatch, selectedAccount } = useGlobalState();
  const { balance: marketBalance, currency: marketCurrency, reconnect } = useMarketData();

  const [activeTab, setActiveTab] = useState<'deposit' | 'withdrawal' | 'transfer' | 'p2p'>(defaultTab);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Transfer state
  const [userAccounts, setUserAccounts] = useState<UserAccountItem[]>([]);
  const [sourceId, setSourceId] = useState<string>('');
  const [destId, setDestId] = useState<string>('');
  const [amount, setAmount] = useState<string>('10');
  const [isRateLoading, setIsRateLoading] = useState<boolean>(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateToken, setRateToken] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferUnavailable, setTransferUnavailable] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isExecutingTransfer, setIsExecutingTransfer] = useState<boolean>(false);
  const [transferSuccessMsg, setTransferSuccessMsg] = useState<string | null>(null);

  const [walletData, setWalletData] = useState<WalletDataResponse>(walletPollingService.getLastData());

  useEffect(() => {
    const unsub = walletPollingService.subscribe((data) => {
      setWalletData(data);
    });
    return unsub;
  }, []);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Load real accounts for transfers
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    apiFetch('/api/wallet/summary')
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted || !json?.data) return;
        const list: UserAccountItem[] = [];

        if (Array.isArray(json.data.wallets)) {
          json.data.wallets.forEach((w: any) => {
            list.push({
              id: w.id,
              currency: (w.currency || 'USD').toUpperCase(),
              label: `${w.currency || 'USD'} Wallet (${w.id})`,
              balance: Number(w.balance || 0),
            });
          });
        }

        if (Array.isArray(json.data.tradingAccounts)) {
          json.data.tradingAccounts.forEach((t: any) => {
            list.push({
              id: t.loginid,
              currency: (t.currency || 'USD').toUpperCase(),
              label: `${t.isVirtual ? 'Demo' : 'Real'} Options Account (${t.loginid})`,
              balance: Number(t.balance || 0),
            });
          });
        }

        setUserAccounts(list);
        if (list.length >= 2) {
          setSourceId(list[0].id);
          setDestId(list[1].id);
        } else if (list.length === 1) {
          setSourceId(list[0].id);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const activeAcc = selectedAccount || state.accounts[0];
  const derivAccountId = derivTradingClient.getCurrentAccountId() || activeAcc?.accountNumber || state.user?.derivAccountId || state.session.userId || 'Primary Account';
  const isReal = derivTradingClient.isRealAccount() || activeAcc?.type === 'REAL' || state.executionEnvironment === 'LIVE' || derivAccountId.startsWith('CR') || !derivAccountId.startsWith('VR');

  const matchingWallet = walletData.wallets.find((w) => w.loginid === derivAccountId || w.id === activeAcc?.id) ||
                         walletData.wallets.find((w) => w.balance > 0) ||
                         walletData.wallets[0];

  const currentBalance = (activeAcc?.balance?.balance !== undefined && activeAcc.balance.balance > 0)
    ? activeAcc.balance.balance
    : (matchingWallet?.balance ?? (typeof marketBalance === 'number' && marketBalance > 0 ? marketBalance : selectedAccount?.balance?.balance ?? 0));
  const currentCurrency = matchingWallet?.currency || activeAcc?.currency || marketCurrency || selectedAccount?.balance?.currency || 'USD';

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

  const fromAcc = userAccounts.find((a) => a.id === sourceId);
  const toAcc = userAccounts.find((a) => a.id === destId);
  const needsExchangeRate = fromAcc && toAcc && fromAcc.currency !== toAcc.currency;

  const handlePrepareTransfer = async () => {
    setTransferError(null);
    setTransferUnavailable(false);
    setTransferSuccessMsg(null);

    const numAmt = Number(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setTransferError('Please enter a valid transfer amount.');
      return;
    }
    if (numAmt < 1 || numAmt > 10000) {
      setTransferError('Deriv limits transfers between 1 and 10,000 USD equivalent (max 10 transfers per day).');
      return;
    }
    if (!sourceId || !destId || sourceId === destId) {
      setTransferError('Please select two distinct accounts for transfer.');
      return;
    }

    if (needsExchangeRate) {
      setIsRateLoading(true);
      try {
        const res = await apiFetch(`/api/wallet/exchange-rate?from=${fromAcc.currency}&to=${toAcc.currency}`);
        const json = await res.json();
        if (json?.data?.exchangeRate) {
          setExchangeRate(json.data.exchangeRate);
          setRateToken(json.data.rateToken || null);
          setShowConfirmModal(true);
        } else {
          setTransferError(json?.error?.message || 'Failed to fetch cross-currency exchange rate from Deriv.');
        }
      } catch (err: any) {
        setTransferError('Network error fetching exchange rate.');
      } finally {
        setIsRateLoading(false);
      }
    } else {
      setExchangeRate(1.0);
      setRateToken(null);
      setShowConfirmModal(true);
    }
  };

  const handleConfirmTransfer = async () => {
    setIsExecutingTransfer(true);
    setTransferError(null);
    try {
      const requestId = crypto.randomUUID();
      const res = await apiFetch('/api/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromId: sourceId,
          toId: destId,
          amount: Number(amount),
          requestId,
          fromCurrency: fromAcc?.currency,
          toCurrency: toAcc?.currency,
          exchangeRate: exchangeRate || undefined,
          rateToken: rateToken || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json?.data?.transferId) {
        setShowConfirmModal(false);
        setTransferSuccessMsg(`Transfer completed successfully! (ID: ${json.data.transferId})`);
        handleManualBalanceRefresh();
      } else {
        setShowConfirmModal(false);
        if (res.status === 403 || res.status === 404 || json?.error?.code === 'TRANSFER_UNAVAILABLE') {
          setTransferUnavailable(true);
          setTransferError(json?.error?.message || 'Native transfer is unavailable for this app registration.');
        } else {
          setTransferError(json?.error?.message || 'Transfer was rejected by Deriv.');
        }
      }
    } catch (err: any) {
      setShowConfirmModal(false);
      setTransferError('Failed to execute transfer.');
    } finally {
      setIsExecutingTransfer(false);
    }
  };

  const calculatedReceiveAmount = () => {
    const numAmt = Number(amount) || 0;
    if (!needsExchangeRate || !exchangeRate) return numAmt;
    return numAmt * exchangeRate;
  };

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
                  Cashier &amp; Wallets
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
              <div className="bg-[#15171e] p-4 rounded-xl border border-[#2a2e39] space-y-3">
                <span className="text-sm font-bold text-white block">
                  Fund Your Account
                </span>
                <p className="text-xs text-[#9699a0] leading-relaxed">
                  On Deriv: Home -&gt; Wallet -&gt; Deposit.
                </p>
                
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div className="p-3 bg-[#1c1f26] rounded-lg border border-[#2a2e39] text-center space-y-1">
                    <CreditCard className="w-5 h-5 text-emerald-400 mx-auto" />
                    <span className="text-[11px] font-bold text-white block">Cards &amp; E-Wallets</span>
                  </div>
                  <div className="p-3 bg-[#1c1f26] rounded-lg border border-[#2a2e39] text-center space-y-1">
                    <Coins className="w-5 h-5 text-amber-400 mx-auto" />
                    <span className="text-[11px] font-bold text-white block">Crypto Wallets</span>
                  </div>
                  <div className="p-3 bg-[#1c1f26] rounded-lg border border-[#2a2e39] text-center space-y-1">
                    <Building2 className="w-5 h-5 text-sky-400 mx-auto" />
                    <span className="text-[11px] font-bold text-white block">Bank Transfers</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#00a86b]/10 border border-[#00a86b]/20 p-3.5 rounded-xl flex items-start space-x-2.5 text-xs text-[#9699a0]">
                <ShieldCheck className="w-4 h-4 text-[#00a86b] shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-white">Official Gateway Handoff:</strong> When you complete your deposit on Deriv Cashier, you will be returned back here with your fresh balance updated automatically.
                </div>
              </div>

              <button
                type="button"
                onClick={() => openCashier('deposit')}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-[#00a86b] hover:bg-[#00ba77] active:scale-[0.99] text-white transition-all cursor-pointer shadow-lg flex items-center justify-center space-x-2"
              >
                <span>Deposit</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* WITHDRAWAL TAB */}
          {activeTab === 'withdrawal' && (
            <div className="space-y-4">
              <div className="bg-[#15171e] p-4 rounded-xl border border-[#2a2e39] space-y-3">
                <span className="text-sm font-bold text-white block">
                  Withdraw Funds
                </span>
                <p className="text-xs text-[#9699a0] leading-relaxed">
                  On Deriv: Home -&gt; Wallet -&gt; Withdraw. Deriv will email you a verification link; open it on this same device. Withdrawals can take time.
                </p>
                <div className="flex justify-between items-center text-xs font-mono py-1 border-t border-[#2a2e39] pt-2">
                  <span className="text-[#9699a0]">Available Balance:</span>
                  <span className="text-white font-bold">${currentBalance.toFixed(2)} {currentCurrency}</span>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-start space-x-2.5 text-xs text-[#9699a0]">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-white">Secure Cashier Redirect:</strong> Complete authorization on Deriv's secure verification page to process payout.
                </div>
              </div>

              <button
                type="button"
                onClick={() => openCashier('withdraw')}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-[#ff444f] hover:bg-[#ff555f] active:scale-[0.99] text-white transition-all cursor-pointer shadow-lg flex items-center justify-center space-x-2"
              >
                <span>Open Deriv to withdraw</span>
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
                    Native Inter-Wallet Transfer
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                    Zero Fees • Instant
                  </span>
                </div>
                <p className="text-[#9699a0] leading-relaxed">
                  Transfer funds between your authorized Deriv wallets and trading accounts.
                </p>

                {/* Limits Hint */}
                <div className="p-2 bg-[#1c1f26] rounded-lg border border-[#2a2e39] text-[11px] font-mono text-[#9699a0]">
                  Deriv Limits: <strong className="text-white">1 to 10,000 USD</strong> equivalent per transfer (max 10 transfers/day).
                </div>

                {userAccounts.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-[10px] font-mono text-[#9699a0] uppercase block mb-1">
                        From Account / Wallet
                      </label>
                      <select
                        value={sourceId}
                        onChange={(e) => setSourceId(e.target.value)}
                        className="w-full bg-[#1c1f26] border border-[#2a2e39] rounded-lg p-2.5 text-xs font-mono text-white font-bold outline-none"
                      >
                        {userAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.label} — Balance: {acc.currency} {acc.balance.toFixed(2)}
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
                        To Account / Wallet
                      </label>
                      <select
                        value={destId}
                        onChange={(e) => setDestId(e.target.value)}
                        className="w-full bg-[#1c1f26] border border-[#2a2e39] rounded-lg p-2.5 text-xs font-mono text-white font-bold outline-none"
                      >
                        {userAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id} disabled={acc.id === sourceId}>
                            {acc.label} — Balance: {acc.currency} {acc.balance.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[10px] font-mono text-[#9699a0] mb-1">
                        <span>Transfer Amount ({fromAcc?.currency || 'USD'})</span>
                        <div className="flex space-x-1">
                          {['25%', '50%', '75%', '100%'].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => {
                                const avail = fromAcc?.balance || 0;
                                const factor = Number(pct.replace('%', '')) / 100;
                                setAmount((avail * factor).toFixed(2));
                              }}
                              className="px-1.5 py-0.5 rounded bg-[#2a2e39] hover:bg-sky-500/20 text-[#9699a0] hover:text-sky-400 text-[9px] font-bold cursor-pointer"
                            >
                              {pct}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-[#1c1f26] border border-[#2a2e39] rounded-lg p-2.5 text-xs font-mono text-white font-bold outline-none focus:border-sky-400"
                        placeholder="10"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#9699a0] italic py-2">
                    Loading accounts...
                  </p>
                )}
              </div>

              {transferError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-mono leading-relaxed space-y-2">
                  <p>{transferError}</p>
                  {transferUnavailable && (
                    <button
                      type="button"
                      onClick={() => openCashier('transfer')}
                      className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs transition-colors cursor-pointer inline-flex items-center space-x-1.5"
                    >
                      <span>Transfer on Deriv</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {transferSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono flex items-center space-x-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{transferSuccessMsg}</span>
                </div>
              )}

              <button
                type="button"
                disabled={isRateLoading || !sourceId || !destId || sourceId === destId}
                onClick={handlePrepareTransfer}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white transition-all cursor-pointer shadow-lg flex items-center justify-center space-x-2"
              >
                {isRateLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                <span>Review &amp; Execute Transfer</span>
              </button>
            </div>
          )}

          {/* P2P TAB */}
          {activeTab === 'p2p' && (
            <div className="space-y-4">
              <div className="bg-[#15171e] p-4 rounded-xl border border-[#2a2e39] space-y-3 text-xs">
                <span className="font-semibold text-white block text-sm">
                  Peer-to-Peer (P2P) Cashier
                </span>
                <p className="text-[#9699a0] leading-relaxed">
                  Buy or sell USD directly using local payment methods with escrow protection on Deriv P2P.
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
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
                onClick={() => openCashier('p2p')}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-black font-bold transition-all cursor-pointer shadow-lg flex items-center justify-center space-x-2"
              >
                <span>Launch P2P</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
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
              <span>Refresh Balance</span>
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

      {/* Explicit Transfer Confirmation Dialog Modal (HARD SAFETY RULE) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#15171e] border border-[#2a2e39] rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a2e39]">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Confirm Money Transfer</h3>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-[#9699a0] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#1c1f26] p-3.5 rounded-xl border border-[#2a2e39] space-y-2.5 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-[#2a2e39]">
                <span className="text-[#9699a0]">From Account:</span>
                <span className="text-white font-bold">{fromAcc?.label}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2a2e39]">
                <span className="text-[#9699a0]">To Account:</span>
                <span className="text-white font-bold">{toAcc?.label}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2a2e39]">
                <span className="text-[#9699a0]">Transfer Amount:</span>
                <span className="text-amber-400 font-bold">{amount} {fromAcc?.currency}</span>
              </div>
              {needsExchangeRate && (
                <div className="flex justify-between py-1 border-b border-[#2a2e39]">
                  <span className="text-[#9699a0]">Exchange Rate:</span>
                  <span className="text-sky-400 font-bold">1 {fromAcc?.currency} = {exchangeRate} {toAcc?.currency}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-[#9699a0]">Destination Receive:</span>
                <span className="text-emerald-400 font-bold">{calculatedReceiveAmount().toFixed(4)} {toAcc?.currency}</span>
              </div>
            </div>

            <p className="text-[11px] text-[#9699a0] leading-relaxed">
              Real money transfer. By clicking confirm, this amount will be immediately deducted from your source wallet on Deriv.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2.5 rounded-xl border border-[#2a2e39] text-xs font-bold text-[#9699a0] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExecutingTransfer}
                onClick={handleConfirmTransfer}
                className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
              >
                {isExecutingTransfer ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Confirm &amp; Execute</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
