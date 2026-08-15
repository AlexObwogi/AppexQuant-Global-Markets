import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  RotateCcw,
  Activity,
  History,
  Info,
  Server,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  ArrowRightLeft,
  Clock,
  Coins,
  ShieldCheck,
  Send,
  X,
  Gauge
} from 'lucide-react';
import { ExecutionOrder, OrderExecutionState } from '../../types/execution.ts';
import { useApiFetch } from '../../utils/apiFetch.ts';
import { useGlobalState } from '../../state/GlobalStateContext.tsx';
import { hasPermission } from '../../utils/auth.ts';
import { UserPermission } from '../../types/user.ts';

export const ExecutionCommandDesk: React.FC = () => {
  const apiFetch = useApiFetch();
  const { state } = useGlobalState();
  const canManageSystem = state.user && hasPermission(state.user.role, UserPermission.MANAGE_SYSTEM);
  const [orders, setOrders] = useState<ExecutionOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ExecutionOrder | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'working' | 'filled' | 'cancelled' | 'rejected' | 'failed'>('working');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  // Form State for Dispatching new approved orders
  const [dispatchForm, setDispatchForm] = useState({
    symbol: 'EURUSD',
    side: 'BUY' as 'BUY' | 'SHORT',
    orderType: 'MARKET' as 'MARKET' | 'LIMIT' | 'STOP',
    quantity: 1.0,
    price: 1.08500,
    timeInForce: 'GTC' as 'DAY' | 'GTC' | 'IOC' | 'FOK',
    source: 'MANUAL' as 'MANUAL' | 'STRATEGY' | 'AUTOMATION',
    strategyId: 'strat-01'
  });

  // Fetch orders from server
  const fetchOrders = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await apiFetch('/api/execution/orders');
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
        // If selected order is active, refresh its details
        if (selectedOrder) {
          const updatedSelected = data.data.find((o: ExecutionOrder) => o.requestId === selectedOrder.requestId);
          if (updatedSelected) {
            setSelectedOrder(updatedSelected);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load execution orders:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Poll for status updates (auto-progression of pending orders)
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 2500);
    return () => clearInterval(interval);
  }, [selectedOrder?.requestId]);

  // Handle Order Dispatch submission
  const handleDispatchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDispatching(true);

    const mappedPayload = {
      accountId: 'acc-demo-001',
      strategyId: dispatchForm.source === 'MANUAL' ? 'strat-manual' : dispatchForm.strategyId,
      symbol: dispatchForm.symbol,
      side: dispatchForm.side,
      orderType: dispatchForm.orderType,
      quantity: dispatchForm.quantity,
      price: dispatchForm.price,
      timeInForce: dispatchForm.timeInForce,
      source: dispatchForm.source,
      riskDecisionId: `risk-dec-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    };

    try {
      const res = await apiFetch('/api/execution/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappedPayload)
      });
      const data = await res.json();
      if (data.success) {
        // Set tab to pending to watch the live pre-trade progression
        setActiveTab('pending');
        setSelectedOrder(data.data);
        await fetchOrders(true);
      }
    } catch (err) {
      console.error('Failed to dispatch order:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  // Request order cancellation
  const handleCancelOrder = async (requestId: string) => {
    try {
      const res = await apiFetch('/api/execution/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      });
      const data = await res.json();
      if (data.success) {
        await fetchOrders(true);
      }
    } catch (err) {
      console.error('Failed to cancel order:', err);
    }
  };

  // Synchronize actual broker status
  const handleSyncBroker = async () => {
    setIsSyncing(true);
    try {
      const res = await apiFetch('/api/execution/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
        if (selectedOrder) {
          const updated = data.data.find((o: ExecutionOrder) => o.requestId === selectedOrder.requestId);
          if (updated) setSelectedOrder(updated);
        }
        // If working is currently empty but we have filled, switch tab
        const hasWorking = data.data.some((o: ExecutionOrder) => ['SUBMITTED', 'PARTIALLY_FILLED'].includes(o.state));
        if (!hasWorking) {
          setActiveTab('filled');
        }
      }
    } catch (err) {
      console.error('Failed to sync broker status:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Reset Engine Logs
  const handleResetEngine = async () => {
    if (!window.confirm('Are you sure you want to reset the execution dashboard and reseed historical logs?')) return;
    try {
      const res = await apiFetch('/api/execution/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Failed to reset execution engine:', err);
    }
  };

  // Categorize orders into Dashboard tabs
  const getCategorizedOrders = () => {
    return orders.filter(order => {
      switch (activeTab) {
        case 'pending':
          return ['CREATED', 'VALIDATING', 'RISK_CHECK', 'APPROVED'].includes(order.state);
        case 'working':
          return ['SUBMITTED', 'PARTIALLY_FILLED'].includes(order.state);
        case 'filled':
          return order.state === 'FILLED';
        case 'cancelled':
          return ['CANCEL_REQUESTED', 'CANCELLED'].includes(order.state);
        case 'rejected':
          return order.state === 'REJECTED';
        case 'failed':
          return order.state === 'FAILED' || order.state === 'UNKNOWN';
        default:
          return false;
      }
    });
  };

  // Metrics summary calculations
  const calculateStats = () => {
    const filledOrders = orders.filter(o => o.state === 'FILLED');
    const totalLatency = filledOrders.reduce((sum, o) => sum + (o.executionLatencyMs || 0), 0);
    const avgLatency = filledOrders.length > 0 ? Math.round(totalLatency / filledOrders.length) : 0;

    const totalSlippage = filledOrders.reduce((sum, o) => sum + (o.slippagePips || 0), 0);
    const avgSlippage = filledOrders.length > 0 ? Number((totalSlippage / filledOrders.length).toFixed(2)) : 0;

    const totalCommission = orders.reduce((sum, o) => sum + (o.commission || 0), 0);

    return {
      pendingCount: orders.filter(o => ['CREATED', 'VALIDATING', 'RISK_CHECK', 'APPROVED'].includes(o.state)).length,
      workingCount: orders.filter(o => ['SUBMITTED', 'PARTIALLY_FILLED'].includes(o.state)).length,
      filledCount: filledOrders.length,
      cancelledCount: orders.filter(o => ['CANCEL_REQUESTED', 'CANCELLED'].includes(o.state)).length,
      rejectedCount: orders.filter(o => o.state === 'REJECTED').length,
      failedCount: orders.filter(o => o.state === 'FAILED' || o.state === 'UNKNOWN').length,
      avgLatency,
      avgSlippage,
      totalCommission: Number(totalCommission.toFixed(2))
    };
  };

  const stats = calculateStats();
  const currentCategoryOrders = getCategorizedOrders();

  // Price suggestion helper when changing symbols
  const handleSymbolChange = (sym: string) => {
    let suggestedPrice = 1.08500;
    if (sym === 'GBPUSD') suggestedPrice = 1.27520;
    if (sym === 'XAUUSD') suggestedPrice = 2338.40;
    if (sym === 'BTCUSD') suggestedPrice = 59250.00;
    if (sym === 'XRPUSD') suggestedPrice = 0.5620;
    if (sym === 'MEMEUSDT') suggestedPrice = 0.000142;

    setDispatchForm(prev => ({ ...prev, symbol: sym, price: suggestedPrice }));
  };

  // Color mapping helper
  const getStatusColor = (state: OrderExecutionState) => {
    switch (state) {
      case 'CREATED': return 'text-text-secondary bg-slate-500/10 border-slate-500/20';
      case 'VALIDATING': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 animate-pulse';
      case 'RISK_CHECK': return 'text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse';
      case 'APPROVED': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'SUBMITTED': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'PARTIALLY_FILLED': return 'text-teal-400 bg-teal-500/10 border-teal-500/20';
      case 'FILLED': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'CANCEL_REQUESTED': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'CANCELLED': return 'text-text-secondary bg-slate-500/10 border-slate-500/20';
      case 'REJECTED': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'FAILED': return 'text-rose-500 bg-rose-500/15 border-rose-500/35';
      default: return 'text-text-secondary bg-slate-500/5';
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-200">
      
      {/* 1. Metric Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-bg-surface border border-border-color flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-text-secondary block uppercase">Active Exposure</span>
            <span className="text-lg font-black text-slate-100 font-mono">
              {stats.workingCount} Working
            </span>
          </div>
          <span className="p-2 rounded-lg bg-sky-500/5 text-sky-400 border border-sky-500/10">
            <Activity className="w-5 h-5" />
          </span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border-color flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-text-secondary block uppercase">Avg Execution Latency</span>
            <span className="text-lg font-black text-emerald-400 font-mono">
              {stats.avgLatency} <span className="text-xs font-normal text-text-secondary">ms</span>
            </span>
          </div>
          <span className="p-2 rounded-lg bg-emerald-500/5 text-emerald-400 border border-emerald-500/10">
            <Clock className="w-5 h-5" />
          </span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border-color flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-text-secondary block uppercase">Average Slippage</span>
            <span className="text-lg font-black text-amber-400 font-mono">
              {stats.avgSlippage} <span className="text-xs font-normal text-text-secondary">pips</span>
            </span>
          </div>
          <span className="p-2 rounded-lg bg-amber-500/5 text-amber-400 border border-amber-500/10">
            <TrendingUp className="w-5 h-5" />
          </span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border-color flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-text-secondary block uppercase">Total Commissions</span>
            <span className="text-lg font-black text-slate-100 font-mono">
              ${stats.totalCommission}
            </span>
          </div>
          <span className="p-2 rounded-lg bg-indigo-500/5 text-indigo-400 border border-indigo-500/10">
            <Coins className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* 2. Primary Configuration & Execution layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Interactive Side: Dispatch Pre-Approved Order */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-bg-surface border border-border-color space-y-4">
            <div className="flex items-center gap-2 border-b border-border-color/80 pb-3">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Send className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-slate-100">Dispatch Pre-Approved Order</h3>
                <p className="text-[10px] font-mono text-text-secondary">INJECT TEST TRADES FROM APPROVED CHANNELS</p>
              </div>
            </div>

            <form onSubmit={handleDispatchOrder} className="space-y-4 text-xs font-mono">
              
              {/* Order Approved Source */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-text-secondary uppercase">1. Approved Order Source</label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'MANUAL', label: 'Manual' },
                    { id: 'STRATEGY', label: 'Strategy' },
                    { id: 'AUTOMATION', label: 'EA Engine' }
                  ].map((src) => (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => {
                        setDispatchForm(prev => ({
                          ...prev,
                          source: src.id as any,
                          strategyId: src.id === 'STRATEGY' ? 'strat-01' : src.id === 'AUTOMATION' ? 'strat-ai-01' : 'strat-manual'
                        }));
                      }}
                      className={`p-2 rounded-lg text-center font-bold text-[10px] border transition-all ${
                        dispatchForm.source === src.id
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                          : 'bg-bg-main text-text-secondary border-slate-850 hover:bg-bg-surface'
                      }`}
                    >
                      {src.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Strategy Details if Strategy or Automation chosen */}
              {dispatchForm.source !== 'MANUAL' && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-text-secondary uppercase">Approved Pipeline Route</label>
                  <select
                    value={dispatchForm.strategyId}
                    onChange={(e) => setDispatchForm(p => ({ ...p, strategyId: e.target.value }))}
                    className="w-full bg-bg-main border border-border-color rounded-lg p-2 text-white text-xs font-mono focus:border-sky-500/40 focus:outline-none"
                  >
                    <option value="strat-ai-01">Alpha-Pulse Gemini RL (AI Model)</option>
                    <option value="strat-01">Bollinger-Breakout v4 (Approved Rule)</option>
                    <option value="strat-02">SMA-Crossover Trend (Approved Rule)</option>
                  </select>
                </div>
              )}

              {/* Instrument Selection */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-text-secondary uppercase">2. Instrument Instrument</label>
                <select
                  value={dispatchForm.symbol}
                  onChange={(e) => handleSymbolChange(e.target.value)}
                  className="w-full bg-bg-main border border-border-color rounded-lg p-2 text-white text-xs font-mono focus:border-sky-500/40 focus:outline-none"
                >
                  <option value="EURUSD">EUR/USD (Forex - Liquid)</option>
                  <option value="GBPUSD">GBP/USD (Forex - Liquid)</option>
                  <option value="XAUUSD">XAU/USD (Gold - Commodity)</option>
                  <option value="BTCUSD">BTC/USD (Bitcoin - Crypto)</option>
                  <option value="XRPUSD">XRP/USD (Ripple - Blacklisted)</option>
                  <option value="MEMEUSDT">MEME/USDT (Toxic - Blacklisted)</option>
                </select>
              </div>

              {/* Side and OrderType */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-text-secondary uppercase">Side</label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setDispatchForm(prev => ({ ...prev, side: 'BUY' }))}
                      className={`p-1.5 rounded-lg font-bold text-center border transition-all ${
                        dispatchForm.side === 'BUY'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-bg-main text-text-secondary border-slate-850 hover:bg-bg-surface'
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setDispatchForm(prev => ({ ...prev, side: 'SHORT' }))}
                      className={`p-1.5 rounded-lg font-bold text-center border transition-all ${
                        dispatchForm.side === 'SHORT'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-bg-main text-text-secondary border-slate-850 hover:bg-bg-surface'
                      }`}
                    >
                      SHORT
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-text-secondary uppercase">Order Type</label>
                  <select
                    value={dispatchForm.orderType}
                    onChange={(e) => setDispatchForm(prev => ({ ...prev, orderType: e.target.value as any }))}
                    className="w-full bg-bg-main border border-border-color rounded-lg p-1.5 text-white text-xs font-mono focus:border-sky-500/40 focus:outline-none"
                  >
                    <option value="MARKET">MARKET</option>
                    <option value="LIMIT">LIMIT</option>
                    <option value="STOP">STOP</option>
                  </select>
                </div>
              </div>

              {/* Volume and price */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-text-secondary uppercase">Quantity (Lots)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={dispatchForm.quantity}
                    onChange={(e) => setDispatchForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0.1 }))}
                    className="w-full bg-bg-main border border-border-color rounded-lg p-1.5 text-white font-mono text-xs focus:border-sky-500/40 focus:outline-none text-right"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-text-secondary uppercase">Requested Price</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={dispatchForm.price}
                    onChange={(e) => setDispatchForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 1.0 }))}
                    className="w-full bg-bg-main border border-border-color rounded-lg p-1.5 text-white font-mono text-xs focus:border-sky-500/40 focus:outline-none text-right"
                  />
                </div>
              </div>

              {/* Time In Force */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-text-secondary uppercase">Time In Force</label>
                <div className="grid grid-cols-4 gap-1 text-[9px]">
                  {['DAY', 'GTC', 'IOC', 'FOK'].map((tif) => (
                    <button
                      key={tif}
                      type="button"
                      onClick={() => setDispatchForm(prev => ({ ...prev, timeInForce: tif as any }))}
                      className={`p-1.5 rounded font-bold text-center border transition-all ${
                        dispatchForm.timeInForce === tif
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                          : 'bg-bg-main text-text-secondary border-slate-850 hover:bg-bg-surface'
                      }`}
                    >
                      {tif}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Trigger */}
              <button
                type="submit"
                disabled={isDispatching}
                className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white py-2 px-4 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer mt-2"
              >
                {isDispatching ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Transmitting Intent...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Submit Pre-Approved Order</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick System Action Panel */}
          {canManageSystem && (
            <div className="p-4 rounded-xl bg-bg-surface border border-border-color space-y-3">
              <h4 className="text-xs font-bold text-text-primary font-mono flex items-center gap-1.5 uppercase">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span>Broker Sync Control</span>
              </h4>
              <p className="text-[10px] text-text-secondary leading-normal font-mono">
                The execution engine strictly holds orders in <strong className="text-sky-400">SUBMITTED</strong> state to await broker acknowledgment. Click below to synchronize actual broker statuses and resolve trade fills.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSyncBroker}
                  disabled={isSyncing}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-[10px] py-2 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sync Broker</span>
                </button>
                <button
                  onClick={handleResetEngine}
                  className="bg-bg-main text-text-secondary hover:text-white border border-slate-850 font-mono text-[10px] py-2 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Engine</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Tabbed Desk Workspace */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Table Header Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 border-b border-border-color pb-2.5 font-mono text-xs">
            {[
              { id: 'pending', label: 'Pending Gateway', count: stats.pendingCount },
              { id: 'working', label: 'Working Book', count: stats.workingCount },
              { id: 'filled', label: 'Filled Trades', count: stats.filledCount },
              { id: 'cancelled', label: 'Cancelled', count: stats.cancelledCount },
              { id: 'rejected', label: 'Rejected', count: stats.rejectedCount },
              { id: 'failed', label: 'Failed/Timeout', count: stats.failedCount }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all relative cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-bg-hover text-sky-400 border border-border-color font-black'
                    : 'text-text-secondary hover:text-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`ml-1.5 text-[9px] px-1 py-0.2 rounded-full font-black ${
                    activeTab === tab.id ? 'bg-sky-400/20 text-sky-400' : 'bg-bg-main text-text-secondary'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            
            {/* Orders matching active filter */}
            <div className={`${selectedOrder ? 'md:col-span-7' : 'md:col-span-12'} space-y-3`}>
              {currentCategoryOrders.length === 0 ? (
                <div className="p-12 text-center bg-bg-surface/40 rounded-xl border border-border-color/60 font-mono space-y-2">
                  <ArrowRightLeft className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
                  <p className="text-xs text-text-secondary uppercase font-black">No Orders in Category "{activeTab}"</p>
                  <p className="text-[10px] text-text-secondary leading-relaxed max-w-sm mx-auto">
                    {activeTab === 'working' && 'No active orders on the broker book. Place a new order using the dispatcher form on the left or evaluate an order from the Pre-Trade simulator.'}
                    {activeTab === 'pending' && 'No orders are currently in transit through the 19 pre-trade validation gates. Pending orders progress automatically within 5 seconds.'}
                    {activeTab === 'filled' && 'No filled execution records exist. Place a new approved order and click "Sync Broker" to simulate fills.'}
                    {activeTab === 'cancelled' && 'No cancelled order records.'}
                    {activeTab === 'rejected' && 'No orders rejected by the local Pre-Trade Risk gates. Try submitting XRPUSD or MEMEUSDT to trigger rejections.'}
                    {activeTab === 'failed' && 'No failed or timeout execution records.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentCategoryOrders.map((order) => {
                    const isSelected = selectedOrder?.requestId === order.requestId;
                    return (
                      <div
                        key={order.requestId}
                        onClick={() => setSelectedOrder(order)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer font-mono text-[11px] relative overflow-hidden ${
                          isSelected
                            ? 'bg-bg-hover border-sky-500/80 shadow-lg shadow-sky-500/5'
                            : 'bg-bg-surface border-border-color hover:border-slate-750'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-slate-100 text-xs">
                                {order.symbol}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                                order.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {order.side}
                              </span>
                              <span className="text-text-secondary text-[10px]">
                                {order.quantity} Lots @ {order.orderType}
                              </span>
                            </div>
                            <div className="text-[10px] text-text-secondary mt-1 flex items-center gap-1.5 flex-wrap">
                              <span>Req Price: <strong className="text-slate-200">${order.requestedPrice}</strong></span>
                              {order.fillPrice && (
                                <span className="text-emerald-400 font-bold">Fill Price: <strong>${order.fillPrice}</strong></span>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right flex flex-col items-end gap-1.5">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black border uppercase tracking-wider ${getStatusColor(order.state)}`}>
                              {order.state}
                            </span>
                            <span className="text-[9px] text-text-secondary">
                              {new Date(order.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Cancel Button inside Working items */}
                        {['SUBMITTED', 'PARTIALLY_FILLED'].includes(order.state) && (
                          <div className="mt-3.5 pt-2.5 border-t border-border-color/80 flex justify-between items-center">
                            <span className="text-[9px] text-text-secondary">Waiting for Exchange Match...</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelOrder(order.requestId);
                              }}
                              className="text-[9px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-bold px-2 py-0.8 rounded-lg border border-rose-500/20 transition-all flex items-center gap-1"
                            >
                              <X className="w-2.5 h-2.5" />
                              <span>Cancel Order</span>
                            </button>
                          </div>
                        )}

                        {/* Order Timeline Preview Bar */}
                        <div className="mt-2.5 pt-2 border-t border-border-color/50 flex justify-between text-[9px] text-text-secondary">
                          <span className="truncate max-w-[190px]">
                            Source: <strong className="text-text-secondary uppercase">{order.strategyId.replace('strat-', '')}</strong>
                          </span>
                          <span>
                            Steps: <strong className="text-sky-400 font-black">{order.timeline.length}/5</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Order Detailed Side Panel & Timeline */}
            <AnimatePresence>
              {selectedOrder && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="md:col-span-5 p-4 rounded-xl bg-bg-surface border border-border-color space-y-4 text-xs font-mono"
                >
                  <div className="flex justify-between items-start border-b border-border-color pb-2.5">
                    <div>
                      <h4 className="font-extrabold text-slate-200">Execution Lifecycle</h4>
                      <p className="text-[9px] text-text-secondary">REQ: {selectedOrder.requestId}</p>
                    </div>
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="text-text-secondary hover:text-white p-1 rounded-lg transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Summary Specs */}
                  <div className="space-y-2 bg-bg-main p-3 rounded-lg border border-slate-850 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-text-secondary uppercase">Instrument</span>
                      <span className="text-slate-200 font-extrabold">{selectedOrder.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary uppercase">Side</span>
                      <span className={`font-black ${selectedOrder.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>{selectedOrder.side}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary uppercase">Quantity</span>
                      <span className="text-slate-200">{selectedOrder.quantity} Lots</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary uppercase">Gateway Route</span>
                      <span className="text-sky-400 uppercase font-bold">{selectedOrder.strategyId}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-850/80 pt-1.5 mt-1.5">
                      <span className="text-text-secondary uppercase">Req Price</span>
                      <span className="text-slate-200 font-bold">${selectedOrder.requestedPrice}</span>
                    </div>
                    {selectedOrder.fillPrice && (
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Fill Price</span>
                        <span>${selectedOrder.fillPrice}</span>
                      </div>
                    )}
                    {selectedOrder.executionLatencyMs !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-text-secondary uppercase">Latency</span>
                        <span className="text-emerald-400 font-bold">{selectedOrder.executionLatencyMs} ms</span>
                      </div>
                    )}
                    {selectedOrder.slippagePips !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-text-secondary uppercase">Slippage</span>
                        <span className="text-amber-400 font-bold">{selectedOrder.slippagePips} pips</span>
                      </div>
                    )}
                    {selectedOrder.commission !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-text-secondary uppercase">Commissions</span>
                        <span className="text-text-primary font-bold">${selectedOrder.commission}</span>
                      </div>
                    )}
                  </div>

                  {/* Broker Response if any */}
                  {selectedOrder.brokerResponse && (
                    <div className="p-2.5 bg-sky-500/5 border border-sky-500/10 rounded-lg space-y-1">
                      <span className="text-[9px] font-bold text-sky-400 uppercase flex items-center gap-1">
                        <Server className="w-3 h-3" />
                        <span>Broker Acknowledgment</span>
                      </span>
                      <p className="text-[10px] text-text-primary leading-relaxed font-mono">
                        {selectedOrder.brokerResponse}
                      </p>
                    </div>
                  )}

                  {/* Vertical Timeline Stepper */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] text-text-secondary uppercase font-black tracking-wider border-b border-border-color pb-1 flex items-center gap-1">
                      <History className="w-3 h-3" />
                      <span>Order Lifecycle Timeline</span>
                    </h5>
                    
                    <div className="space-y-3.5 relative pl-3.5 before:absolute before:left-1 before:top-1.5 before:bottom-1.5 before:w-[1px] before:bg-bg-hover">
                      {selectedOrder.timeline.map((step, idx) => {
                        const isLast = idx === selectedOrder.timeline.length - 1;
                        return (
                          <div key={idx} className="relative space-y-1">
                            {/* Dot indicator */}
                            <span className={`absolute -left-4.5 top-1.5 w-2 h-2 rounded-full border ${
                              isLast ? 'bg-sky-400 border-sky-400 animate-ping' : 'bg-bg-surface border-border-color'
                            }`} />
                            
                            <div className="flex justify-between items-center text-[10px]">
                              <span className={`font-bold ${isLast ? 'text-sky-400' : 'text-text-secondary'}`}>
                                {step.state}
                              </span>
                              <span className="text-[8px] text-slate-600">
                                {new Date(step.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-[10px] text-text-secondary leading-normal">
                              {step.message}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

      </div>

    </div>
  );
};
