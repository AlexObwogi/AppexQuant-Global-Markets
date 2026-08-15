/**
 * AppexQuant Markets Global - P2P Marketplace & Merchant Infrastructure View
 * Phase 7 Institutional-grade P2P trading platform with escrow state machine, secure chat, dispute resolution & merchant CMS.
 */

import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../state/GlobalStateContext.tsx';
import {
  getStoredP2PState,
  saveStoredP2PState,
  P2PStateStore
} from '../services/p2p/p2pEngine.ts';
import { P2POffer, P2POrder, P2PChatMessage, P2PDispute } from '../types/p2p.ts';
import {
  ShieldCheck,
  Search,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquare,
  Lock,
  PlusCircle,
  Briefcase,
  Award,
  Send,
  XCircle,
  FileText,
  DollarSign,
  HelpCircle,
  ChevronRight,
  RefreshCw,
  Building2
} from 'lucide-react';

export const P2PView: React.FC = () => {
  const { state, dispatch } = useGlobalState();
  const [activeTab, setActiveTab] = useState<'marketplace' | 'orders' | 'merchant' | 'disputes'>('marketplace');
  const [p2pState, setP2pState] = useState<P2PStateStore>(getStoredP2PState());
  const [selectedAsset, setSelectedAsset] = useState<string>('USDT');
  const [selectedFiat, setSelectedFiat] = useState<string>('KES');
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOffer, setSelectedOffer] = useState<P2POffer | null>(null);
  const [orderAmountFiat, setOrderAmountFiat] = useState<string>('');
  const [activeOrder, setActiveOrder] = useState<P2POrder | null>(null);
  const [chatInput, setChatInput] = useState<string>('');
  const [disputeModalOpen, setDisputeModalOpen] = useState<boolean>(false);
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [disputeDesc, setDisputeDesc] = useState<string>('');
  const [merchantAppOpen, setMerchantAppOpen] = useState<boolean>(false);
  const [bizName, setBizName] = useState<string>('');

  // Save p2pState on change
  useEffect(() => {
    saveStoredP2PState(p2pState);
  }, [p2pState]);

  const handleCreateOrder = (offer: P2POffer) => {
    const fiatVal = Number(orderAmountFiat);
    if (!fiatVal || fiatVal < offer.minOrderLimit || fiatVal > offer.maxOrderLimit) {
      alert(`Please enter an amount between ${offer.minOrderLimit} and ${offer.maxOrderLimit}`);
      return;
    }

    const cryptoVal = fiatVal / offer.price;
    const newOrder: P2POrder = {
      id: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
      offerId: offer.id,
      buyerId: offer.type === 'BUY' ? offer.merchant.userId : (state.user?.id || 'usr_self'),
      sellerId: offer.type === 'BUY' ? (state.user?.id || 'usr_self') : offer.merchant.userId,
      merchantId: offer.merchantId,
      type: offer.type,
      asset: offer.asset,
      fiat: offer.fiat,
      cryptoAmount: Number(cryptoVal.toFixed(4)),
      fiatAmount: fiatVal,
      unitPrice: offer.price,
      status: 'PAYMENT_PENDING',
      paymentMethod: offer.paymentMethods[0] || 'M-Pesa',
      buyerMarkedPaid: false,
      sellerConfirmedPaid: false,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60000).toISOString()
    };

    const initialChat: P2PChatMessage = {
      id: `MSG-${Date.now()}`,
      orderId: newOrder.id,
      senderId: 'sys',
      senderName: 'AppexQuant Escrow System',
      isSystem: true,
      message: `P2P Order ${newOrder.id} created successfully. Escrow locked securely. Please complete payment within 15 minutes.`,
      timestamp: new Date().toLocaleTimeString()
    };

    setP2pState((prev) => ({
      ...prev,
      orders: [newOrder, ...prev.orders],
      chats: { ...prev.chats, [newOrder.id]: [initialChat] }
    }));

    setActiveOrder(newOrder);
    setSelectedOffer(null);
    setActiveTab('orders');
    dispatch({ type: 'ADD_NOTIFICATION', payload: { title: 'P2P Order Created', message: `Order ${newOrder.id} initiated in escrow mode.`, type: 'success' } });
  };

  const handleAdvanceOrderState = (orderId: string, nextStatus: P2POrder['status'], actionMessage: string) => {
    setP2pState((prev) => {
      const updatedOrders = prev.orders.map((o) => {
        if (o.id === orderId) {
          const updated = { ...o, status: nextStatus };
          if (nextStatus === 'PAYMENT_MARKED') updated.buyerMarkedPaid = true;
          if (nextStatus === 'COMPLETED' || nextStatus === 'ASSET_RELEASE_PENDING') updated.sellerConfirmedPaid = true;
          return updated;
        }
        return o;
      });

      const sysMsg: P2PChatMessage = {
        id: `MSG-${Date.now()}`,
        orderId,
        senderId: 'sys',
        senderName: 'AppexQuant Escrow System',
        isSystem: true,
        message: actionMessage,
        timestamp: new Date().toLocaleTimeString()
      };

      const existingChats = prev.chats[orderId] || [];
      return {
        ...prev,
        orders: updatedOrders,
        chats: { ...prev.chats, [orderId]: [...existingChats, sysMsg] }
      };
    });

    if (activeOrder && activeOrder.id === orderId) {
      const refreshed = p2pState.orders.find((o) => o.id === orderId);
      if (refreshed) setActiveOrder({ ...refreshed, status: nextStatus });
    }
  };

  const handleSendChatMessage = (orderId: string) => {
    if (!chatInput.trim()) return;
    const msg: P2PChatMessage = {
      id: `MSG-${Date.now()}`,
      orderId,
      senderId: state.user?.id || 'usr_self',
      senderName: state.user?.displayName || 'Trader',
      isSystem: false,
      message: chatInput,
      timestamp: new Date().toLocaleTimeString()
    };

    setP2pState((prev) => {
      const orderChats = prev.chats[orderId] || [];
      return {
        ...prev,
        chats: { ...prev.chats, [orderId]: [...orderChats, msg] }
      };
    });
    setChatInput('');
  };

  const handleRaiseDispute = () => {
    if (!activeOrder || !disputeReason) return;
    const dispute: P2PDispute = {
      id: `DSP-${Math.floor(1000 + Math.random() * 9000)}`,
      orderId: activeOrder.id,
      raisedByUserId: state.user?.id || 'usr_self',
      reason: disputeReason,
      description: disputeDesc,
      status: 'OPEN',
      createdAt: new Date().toISOString()
    };

    handleAdvanceOrderState(activeOrder.id, 'DISPUTED', `Dispute raised by ${state.user?.displayName || 'User'}: ${disputeReason}`);
    setP2pState((prev) => ({
      ...prev,
      disputes: [dispute, ...prev.disputes]
    }));
    setDisputeModalOpen(false);
    setDisputeReason('');
    setDisputeDesc('');
  };

  const handleApplyMerchant = () => {
    if (!bizName.trim()) return;
    setP2pState((prev) => ({
      ...prev,
      userMerchantApplication: {
        status: 'PENDING',
        businessName: bizName,
        submittedAt: new Date().toISOString()
      }
    }));
    setMerchantAppOpen(false);
    alert('Merchant application submitted successfully. Pending compliance review.');
  };

  const filteredOffers = p2pState.offers.filter(
    (o) =>
      o.asset === selectedAsset &&
      o.fiat === selectedFiat &&
      (o.type === tradeType || tradeType === 'BUY') &&
      (o.merchant.name.toLowerCase().includes(searchQuery.toLowerCase()) || o.paymentMethods.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-bg-surface border border-border-color rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Secure Escrow P2P
            </span>
            <span className="text-xs text-text-secondary">Zero-Fee Merchant Exchange</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            AppexQuant Global P2P Marketplace
          </h1>
          <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
            Trade USDT, BTC, and fiat securely with verified merchants using M-Pesa, Bank Transfer, and automated escrow protection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setMerchantAppOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-sm cursor-pointer flex items-center gap-2"
          >
            <Briefcase className="w-4 h-4" /> Become a Merchant
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border-color space-x-4">
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`pb-3 px-4 text-sm font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'marketplace' ? 'border-sky-400 text-sky-400' : 'border-transparent text-text-secondary hover:text-text-secondary'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" /> Marketplace Offers
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-4 text-sm font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'orders' ? 'border-sky-400 text-sky-400' : 'border-transparent text-text-secondary hover:text-text-secondary'
          }`}
        >
          <Clock className="w-4 h-4" /> Active Orders ({p2pState.orders.filter(o => o.status !== 'COMPLETED').length})
        </button>
        <button
          onClick={() => setActiveTab('merchant')}
          className={`pb-3 px-4 text-sm font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'merchant' ? 'border-sky-400 text-sky-400' : 'border-transparent text-text-secondary hover:text-text-secondary'
          }`}
        >
          <Building2 className="w-4 h-4" /> Merchant Portal
        </button>
        <button
          onClick={() => setActiveTab('disputes')}
          className={`pb-3 px-4 text-sm font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'disputes' ? 'border-sky-400 text-sky-400' : 'border-transparent text-text-secondary hover:text-text-secondary'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" /> Dispute Center ({p2pState.disputes.length})
        </button>
      </div>

      {/* MARKETPLACE TAB */}
      {activeTab === 'marketplace' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-[#131822] border border-border-color rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex bg-[#0B0E14] p-1 rounded-xl border border-border-color">
                <button
                  onClick={() => setTradeType('BUY')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    tradeType === 'BUY' ? 'bg-emerald-500 text-text-secondary shadow-md' : 'text-text-secondary hover:text-text-secondary'
                  }`}
                >
                  Buy Asset
                </button>
                <button
                  onClick={() => setTradeType('SELL')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    tradeType === 'SELL' ? 'bg-rose-500 text-text-secondary shadow-md' : 'text-text-secondary hover:text-text-secondary'
                  }`}
                >
                  Sell Asset
                </button>
              </div>

              <div className="flex bg-[#0B0E14] p-1 rounded-xl border border-border-color">
                {['USDT', 'BTC', 'ETH'].map((ast) => (
                  <button
                    key={ast}
                    onClick={() => setSelectedAsset(ast)}
                    className={`px-3 py-2 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      selectedAsset === ast ? 'bg-sky-500 text-text-secondary' : 'text-text-secondary hover:text-text-secondary'
                    }`}
                  >
                    {ast}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={selectedFiat}
                onChange={(e) => setSelectedFiat(e.target.value)}
                className="bg-[#0B0E14] border border-border-color rounded-xl px-4 py-2 text-xs font-mono text-text-secondary outline-none focus:border-sky-500"
              >
                <option value="KES">KES (Kenyan Shilling)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>

              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search merchant or payment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-border-color rounded-xl pl-10 pr-4 py-2 text-xs text-text-secondary outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Offers Table / Grid */}
          <div className="bg-[#131822] border border-border-color rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-color text-[11px] font-mono uppercase tracking-wider text-text-secondary bg-bg-hover/50">
                    <th className="p-4">Merchant</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Available / Limit</th>
                    <th className="p-4">Payment Methods</th>
                    <th className="p-4 text-right">Trade Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredOffers.length > 0 ? (
                    filteredOffers.map((offer) => (
                      <tr key={offer.id} className="hover:bg-bg-hover/40 transition">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <img src={offer.merchant.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-border-color" />
                            <div>
                              <div className="font-bold text-text-secondary flex items-center gap-1.5">
                                {offer.merchant.name}
                                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                              </div>
                              <div className="text-[10px] text-text-secondary font-mono flex items-center gap-2 mt-0.5">
                                <span>{offer.merchant.completedOrders} orders</span>
                                <span>•</span>
                                <span className="text-emerald-400">{offer.merchant.completionRate}% completion</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-mono font-bold text-base text-text-secondary">
                            {offer.price.toLocaleString()} <span className="text-xs font-normal text-text-secondary">{offer.fiat}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono">
                          <div className="text-text-secondary font-semibold">{offer.availableAmount} {offer.asset}</div>
                          <div className="text-[10px] text-text-secondary">Limit: {offer.minOrderLimit.toLocaleString()} - {offer.maxOrderLimit.toLocaleString()} {offer.fiat}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5">
                            {offer.paymentMethods.map((m, i) => (
                              <span key={i} className="px-2 py-0.5 rounded text-[10px] font-mono bg-bg-hover border border-border-color text-sky-300">
                                {m}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedOffer(offer)}
                            className={`px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-md ${
                              tradeType === 'BUY' ? 'bg-emerald-500 hover:bg-emerald-400 text-text-secondary' : 'bg-rose-500 hover:bg-rose-400 text-text-secondary'
                            }`}
                          >
                            {tradeType === 'BUY' ? `Buy ${offer.asset}` : `Sell ${offer.asset}`}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-text-secondary">
                        No active P2P offers found for this currency pair.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="bg-[#131822] border border-border-color rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-text-secondary mb-4">Active Escrow & Past Orders</h3>
            <div className="space-y-4">
              {p2pState.orders.length > 0 ? (
                p2pState.orders.map((ord) => (
                  <div key={ord.id} className="bg-[#0B0E14] border border-border-color rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-sky-400">{ord.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${ord.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {ord.status}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-text-secondary">
                        {ord.type} {ord.cryptoAmount} {ord.asset} for <span className="text-emerald-400">{ord.fiatAmount.toLocaleString()} {ord.fiat}</span>
                      </div>
                      <div className="text-[11px] text-text-secondary font-mono">
                        Payment Method: <span className="text-text-secondary">{ord.paymentMethod}</span> • Time Limit: 15 mins
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveOrder(ord)}
                        className="px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-4 h-4" /> Open Escrow & Chat
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-text-secondary">
                  No orders initiated yet. Select an offer from the marketplace to begin.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MERCHANT PORTAL TAB */}
      {activeTab === 'merchant' && (
        <div className="bg-[#131822] border border-border-color rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between pb-6 border-b border-border-color">
            <div>
              <h3 className="text-lg font-bold text-text-secondary">Merchant Dashboard & Inventory</h3>
              <p className="text-xs text-text-secondary">Manage active P2P liquidity offers, release schedules, and completion stats.</p>
            </div>
            <button
              onClick={() => alert('Create Offer modal opened.')}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-text-secondary font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <PlusCircle className="w-4 h-4" /> Create New Offer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0B0E14] border border-border-color p-4 rounded-xl">
              <span className="text-text-secondary text-[11px] font-mono block">COMPLETION RATE</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">99.4%</span>
            </div>
            <div className="bg-[#0B0E14] border border-border-color p-4 rounded-xl">
              <span className="text-text-secondary text-[11px] font-mono block">COMPLETED ORDERS (30D)</span>
              <span className="text-2xl font-bold font-mono text-sky-400">342</span>
            </div>
            <div className="bg-[#0B0E14] border border-border-color p-4 rounded-xl">
              <span className="text-text-secondary text-[11px] font-mono block">ESCROW RELEASE SPEED</span>
              <span className="text-2xl font-bold font-mono text-text-secondary">3.2 mins</span>
            </div>
          </div>
        </div>
      )}

      {/* DISPUTE CENTER TAB */}
      {activeTab === 'disputes' && (
        <div className="bg-[#131822] border border-border-color rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <div>
              <h3 className="text-lg font-bold text-text-secondary">Dispute Resolution Center</h3>
              <p className="text-xs text-text-secondary">Active order disputes handled by AppexQuant moderation team.</p>
            </div>
          </div>

          <div className="space-y-4">
            {p2pState.disputes.length > 0 ? (
              p2pState.disputes.map((d) => (
                <div key={d.id} className="bg-[#0B0E14] border border-border-color rounded-xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-400">{d.id} • Order {d.orderId}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">{d.status}</span>
                  </div>
                  <div className="text-sm font-bold text-text-secondary">Reason: {d.reason}</div>
                  <p className="text-xs text-text-secondary">{d.description}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-text-secondary">
                No active disputes. All transactions proceeding smoothly.
              </div>
            )}
          </div>
        </div>
      )}

      {/* BUY / SELL ORDER CREATION MODAL */}
      {selectedOffer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131822] border border-border-color rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button onClick={() => setSelectedOffer(null)} className="absolute top-5 right-5 text-text-secondary hover:text-text-secondary cursor-pointer">
              <XCircle className="w-6 h-6" />
            </button>

            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${selectedOffer.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {selectedOffer.type} {selectedOffer.asset}
                </span>
                <span className="text-xs text-text-secondary font-mono">Merchant: {selectedOffer.merchant.name}</span>
              </div>
              <h3 className="text-xl font-bold text-text-secondary">Place P2P Escrow Order</h3>
            </div>

            <div className="bg-[#0B0E14] border border-border-color rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-text-secondary">Unit Price:</span>
                <span className="text-text-secondary font-bold">{selectedOffer.price} {selectedOffer.fiat}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Available Inventory:</span>
                <span className="text-sky-400">{selectedOffer.availableAmount} {selectedOffer.asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Order Limits:</span>
                <span className="text-text-secondary">{selectedOffer.minOrderLimit} - {selectedOffer.maxOrderLimit} {selectedOffer.fiat}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-text-secondary font-medium block">I Want to Pay / Receive ({selectedOffer.fiat})</label>
              <input
                type="number"
                placeholder={`Enter amount in ${selectedOffer.fiat}`}
                value={orderAmountFiat}
                onChange={(e) => setOrderAmountFiat(e.target.value)}
                className="w-full bg-[#0B0E14] border border-border-color rounded-xl px-4 py-3 text-sm font-mono text-text-secondary outline-none focus:border-sky-500"
              />
              {orderAmountFiat && !isNaN(Number(orderAmountFiat)) && (
                <div className="text-xs text-sky-400 font-mono pt-1">
                  You will receive approx: {(Number(orderAmountFiat) / selectedOffer.price).toFixed(4)} {selectedOffer.asset}
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-200">
              <strong>Escrow Notice:</strong> Funds are locked in AppexQuant secure vault until payment confirmation is verified.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setSelectedOffer(null)} className="px-5 py-2.5 bg-bg-hover border border-border-color rounded-xl text-xs font-semibold text-text-secondary cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => handleCreateOrder(selectedOffer)}
                className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-text-secondary font-bold text-xs rounded-xl shadow-lg shadow-sky-500/20 cursor-pointer transition"
              >
                Confirm & Lock Escrow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE ORDER ESCROW & CHAT MODAL */}
      {activeOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131822] border border-border-color rounded-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setActiveOrder(null)} className="absolute top-5 right-5 text-text-secondary hover:text-text-secondary cursor-pointer">
              <XCircle className="w-6 h-6" />
            </button>

            <div className="flex items-center justify-between pb-4 border-b border-border-color">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-sky-400">{activeOrder.id}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {activeOrder.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-text-secondary mt-1">Secure P2P Escrow Room</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order Details & Actions */}
              <div className="space-y-4">
                <div className="bg-[#0B0E14] border border-border-color rounded-xl p-4 space-y-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Total Fiat:</span>
                    <span className="text-emerald-400 font-bold">{activeOrder.fiatAmount} {activeOrder.fiat}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Asset Amount:</span>
                    <span className="text-text-secondary font-bold">{activeOrder.cryptoAmount} {activeOrder.asset}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Payment Method:</span>
                    <span className="text-sky-400">{activeOrder.paymentMethod}</span>
                  </div>
                </div>

                {/* State Machine Transition Buttons */}
                <div className="space-y-2">
                  {activeOrder.status === 'PAYMENT_PENDING' && (
                    <button
                      onClick={() => handleAdvanceOrderState(activeOrder.id, 'PAYMENT_MARKED', 'Buyer marked payment as sent via M-Pesa / Bank.')}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-text-secondary font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                    >
                      Mark Payment Sent
                    </button>
                  )}

                  {activeOrder.status === 'PAYMENT_MARKED' && (
                    <button
                      onClick={() => handleAdvanceOrderState(activeOrder.id, 'COMPLETED', 'Payment verified and escrow assets released successfully.')}
                      className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-text-secondary font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                    >
                      Confirm Payment & Release Asset
                    </button>
                  )}

                  <button
                    onClick={() => setDisputeModalOpen(true)}
                    className="w-full py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle className="w-4 h-4" /> Raise Dispute
                  </button>
                </div>
              </div>

              {/* Secure Chat */}
              <div className="bg-[#0B0E14] border border-border-color rounded-xl p-4 flex flex-col h-72">
                <div className="text-xs font-bold text-text-secondary mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-sky-400" /> Secure Order Chat
                </div>
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-3">
                  {(p2pState.chats[activeOrder.id] || []).map((msg) => (
                    <div key={msg.id} className={`p-2.5 rounded-xl text-xs ${msg.isSystem ? 'bg-bg-hover border border-border-color text-sky-300 font-mono text-[10px]' : 'bg-bg-hover/80 text-text-secondary'}`}>
                      <div className="flex justify-between text-[10px] text-text-secondary mb-1">
                        <span>{msg.senderName}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <p>{msg.message}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type message to counterparty..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage(activeOrder.id)}
                    className="flex-1 bg-bg-hover border border-border-color rounded-xl px-3 py-2 text-xs text-text-secondary outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={() => handleSendChatMessage(activeOrder.id)}
                    className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-text-secondary rounded-xl font-bold text-xs cursor-pointer transition flex items-center justify-center"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MERCHANT APPLICATION MODAL */}
      {merchantAppOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131822] border border-border-color rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button onClick={() => setMerchantAppOpen(false)} className="absolute top-5 right-5 text-text-secondary hover:text-text-secondary cursor-pointer">
              <XCircle className="w-6 h-6" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-text-secondary">Become a Verified Merchant</h3>
              <p className="text-xs text-text-secondary">Submit your entity details for liquidity provision and zero-fee P2P offers.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-secondary font-medium block mb-1">Business / Entity Name</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Liquidity LTD"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-border-color rounded-xl px-4 py-2.5 text-xs text-text-secondary outline-none focus:border-sky-500"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                <strong>Compliance Check:</strong> Identity verification documents and source of funds declaration will be requested upon submission.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setMerchantAppOpen(false)} className="px-4 py-2 bg-bg-hover border border-border-color rounded-xl text-xs text-text-secondary">Cancel</button>
              <button onClick={handleApplyMerchant} className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-text-secondary font-bold text-xs rounded-xl cursor-pointer">
                Submit Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISPUTE MODAL */}
      {disputeModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131822] border border-border-color rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button onClick={() => setDisputeModalOpen(false)} className="absolute top-5 right-5 text-text-secondary hover:text-text-secondary cursor-pointer">
              <XCircle className="w-6 h-6" />
            </button>

            <h3 className="text-lg font-bold text-text-secondary">Raise Order Dispute</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-secondary font-medium block mb-1">Dispute Reason</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-border-color rounded-xl px-4 py-2.5 text-xs text-text-secondary outline-none focus:border-sky-500"
                >
                  <option value="">Select reason...</option>
                  <option value="Payment not received">Payment not received</option>
                  <option value="Incorrect payment amount">Incorrect payment amount</option>
                  <option value="Third-party payment violation">Third-party payment violation</option>
                  <option value="Unresponsive counterparty">Unresponsive counterparty</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-text-secondary font-medium block mb-1">Description & Evidence</label>
                <textarea
                  rows={4}
                  placeholder="Describe the issue and provide transaction reference codes..."
                  value={disputeDesc}
                  onChange={(e) => setDisputeDesc(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-border-color rounded-xl p-3 text-xs text-text-secondary outline-none focus:border-sky-500"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setDisputeModalOpen(false)} className="px-4 py-2 bg-bg-hover border border-border-color rounded-xl text-xs text-text-secondary">Cancel</button>
              <button onClick={handleRaiseDispute} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-text-primary font-bold text-xs rounded-xl cursor-pointer">
                Submit Dispute to Moderators
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
