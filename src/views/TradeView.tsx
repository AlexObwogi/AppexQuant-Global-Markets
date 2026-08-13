/**
 * AppexQuant Markets Global - Centralized Pre-Trade Risk Engine Command Desk
 * Enforces a strict server-side pipeline: Strategy Intent → Order Request → Validation → Risk Engine → Broker Adapter.
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Play,
  RotateCcw,
  Activity,
  History,
  Info,
  Server,
  Zap,
  CheckCircle,
  XCircle,
  SlidersHorizontal,
  RefreshCw,
  AlertTriangle,
  Cpu,
  User,
  Shield,
  Trash2
} from 'lucide-react';
import { OrderRequest, RiskPolicy, RiskDecision, MarketEnvironmentState, defaultMarketEnvironment, CheckResult } from '../services/ai/riskEngine';
import { ExecutionCommandDesk } from '../components/eas/ExecutionCommandDesk';
import { useApiFetch } from '../utils/apiFetch';
import { ArrowRightLeft } from 'lucide-react';

export const TradeView: React.FC = () => {
  const apiFetch = useApiFetch();
  // App States
  const [activePolicy, setActivePolicy] = useState<RiskPolicy | null>(null);
  const [marketEnv, setMarketEnv] = useState<MarketEnvironmentState>(defaultMarketEnvironment);
  const [decisionsHistory, setDecisionsHistory] = useState<RiskDecision[]>([]);
  const [currentDecision, setCurrentDecision] = useState<RiskDecision | null>(null);
  const [activeSection, setActiveSection] = useState<'execution' | 'simulation' | 'policy' | 'history'>('execution');

  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Form States for Simulated Order Request
  const [orderForm, setOrderForm] = useState<Omit<OrderRequest, 'id' | 'timestamp'>>({
    strategyId: 'strat-ai-01',
    strategyName: 'Alpha-Pulse Gemini RL',
    symbol: 'EURUSD',
    type: 'MARKET',
    direction: 'BUY',
    volume: 1.5,
    price: 1.08450,
    sl: 1.08200,
    tp: 1.09200,
    brokerId: 'EXNESS'
  });

  // Load state from backend on mount
  useEffect(() => {
    fetchPolicy();
    fetchDecisions();
  }, []);

  const fetchPolicy = async () => {
    try {
      const res = await apiFetch('/api/risk/policy');
      const data = await res.json();
      if (data.success) {
        setActivePolicy(data.data);
      }
    } catch (err) {
      console.error('Failed to load risk policy from server:', err);
    }
  };

  const fetchDecisions = async () => {
    try {
      const res = await apiFetch('/api/risk/decisions');
      const data = await res.json();
      if (data.success) {
        setDecisionsHistory(data.data);
        if (data.data.length > 0 && !currentDecision) {
          setCurrentDecision(data.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load risk decisions:', err);
    }
  };

  // Submit Order to Server Risk Engine
  const handleEvaluateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const fullOrder: OrderRequest = {
      ...orderForm,
      id: `ord-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      timestamp: new Date().toISOString()
    };

    try {
      const res = await apiFetch('/api/risk/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: fullOrder,
          environment: marketEnv
        })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentDecision(data.data);
        // Refresh history to include this decision
        fetchDecisions();

        // If pre-trade risk analysis APPROVED, dynamically forward it to the Unified Execution Engine!
        if (data.data.status === 'APPROVED') {
          try {
            await apiFetch('/api/execution/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                accountId: 'acc-demo-001',
                strategyId: orderForm.strategyId,
                symbol: orderForm.symbol,
                side: orderForm.direction === 'BUY' ? 'BUY' : 'SHORT',
                orderType: orderForm.type,
                quantity: orderForm.volume,
                price: orderForm.price,
                timeInForce: 'GTC',
                source: 'STRATEGY',
                riskDecisionId: data.data.orderId
              })
            });
            // Automatically focus the Execution Desk to see the live pre-trade workflow and timeline!
            setActiveSection('execution');
          } catch (err) {
            console.error('Failed to route approved order to the Execution Desk:', err);
          }
        }
      }
    } catch (err) {
      console.error('Failed to evaluate order via backend:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update Policy on Server
  const handleUpdatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePolicy) return;
    setIsSavingPolicy(true);

    try {
      const res = await apiFetch('/api/risk/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activePolicy)
      });
      const data = await res.json();
      if (data.success) {
        setActivePolicy(data.data);
        // Alert success
        alert('Server Risk Policy updated successfully. All subsequent checks will enforce these new rules.');
      }
    } catch (err) {
      console.error('Failed to save policy:', err);
    } finally {
      setIsSavingPolicy(false);
    }
  };

  // Clear Decision Logs
  const handleClearLogs = async () => {
    setIsClearing(true);
    try {
      await apiFetch('/api/risk/reset', { method: 'POST' });
      setDecisionsHistory([]);
      setCurrentDecision(null);
    } catch (err) {
      console.error('Failed to clear logs:', err);
    } finally {
      setIsClearing(false);
    }
  };

  // Helper to change form inputs
  const handleFormChange = (key: keyof typeof orderForm, value: any) => {
    setOrderForm(prev => {
      const next = { ...prev, [key]: value };
      // Sync Sl/Tp automatically if price changes to keep them logical
      if (key === 'price') {
        const priceNum = Number(value);
        if (next.direction === 'BUY') {
          next.sl = Number((priceNum - 0.0025).toFixed(5));
          next.tp = Number((priceNum + 0.0075).toFixed(5));
        } else {
          next.sl = Number((priceNum + 0.0025).toFixed(5));
          next.tp = Number((priceNum - 0.0075).toFixed(5));
        }
      }
      return next;
    });
  };

  // Sync SL/TP logic based on Direction
  const handleDirectionChange = (dir: 'BUY' | 'SHORT') => {
    setOrderForm(prev => {
      const next = { ...prev, direction: dir };
      const priceNum = Number(prev.price);
      if (dir === 'BUY') {
        next.sl = Number((priceNum - 0.0025).toFixed(5));
        next.tp = Number((priceNum + 0.0075).toFixed(5));
      } else {
        next.sl = Number((priceNum + 0.0025).toFixed(5));
        next.tp = Number((priceNum - 0.0075).toFixed(5));
      }
      return next;
    });
  };

  // Helper to adjust environment values
  const handleEnvChange = (key: keyof MarketEnvironmentState, value: any) => {
    setMarketEnv(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Pre-validate Risk/Reward (Client-side helper UI warning)
  const calculateRRRatio = () => {
    const risk = Math.abs(orderForm.price - orderForm.sl);
    const reward = Math.abs(orderForm.tp - orderForm.price);
    return risk > 0 ? Number((reward / risk).toFixed(2)) : 0;
  };

  const rrRatio = calculateRRRatio();
  const isRRValid = rrRatio >= 2.0 && rrRatio <= 3.0;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 font-sans text-text-primary dark:text-text-primary">
      {/* Risk Engine Header / Pipeline Banner */}
      <div className="relative overflow-hidden p-4 rounded-[4px] bg-bg-surface border border-border-color dark:border-[#2B3139] shadow-xs">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Shield className="w-32 h-32 text-color-warning dark:text-accent-primary" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-[4px] bg-accent-primary/10 text-color-warning dark:text-accent-primary border border-accent-primary/25">
                <ShieldCheck className="w-4 h-4 animate-pulse" />
              </span>
              <div>
                <h1 className="text-base font-bold text-text-primary tracking-tight">AppexQuant Centrally Enforced Risk Engine</h1>
                <p className="text-[10px] text-text-secondary mt-0.5 font-mono font-bold uppercase">
                  PRE-TRADE DEFENSE PLATFORM • 19-POINT MANDATORY GATEWAY
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-bg-main dark:bg-[#2B3139] border border-border-color dark:border-[#2B3139] p-1.5 rounded-[2px]">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-color-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-color-success"></span>
            </span>
            <span className="text-text-secondary dark:text-text-secondary">SERVER ENGINE:</span>
            <span className="text-color-success font-bold uppercase">LIVE & SHIELDED</span>
          </div>
        </div>

        {/* Visual Pipeline flow chart */}
        <div className="mt-4 pt-4 border-t border-border-color dark:border-[#2B3139]/60">
          <div className="grid grid-cols-5 gap-1.5 md:gap-4 text-center items-center font-mono text-[9px] md:text-xs">
            <div className="flex flex-col items-center p-2 rounded-[2px] bg-bg-main dark:bg-[#0B0E11] border border-border-color dark:border-[#2B3139] relative">
              <User className="w-3.5 h-3.5 text-text-secondary mb-1" />
              <span className="text-text-primary font-bold uppercase">1. INTENT</span>
              <span className="text-[8px] text-text-secondary mt-0.5">Trader or EA</span>
              <div className="absolute top-1/2 -right-2 md:-right-3 translate-y-[-50%] text-text-secondary font-black z-10 hidden md:block">➔</div>
            </div>
            <div className="flex flex-col items-center p-2 rounded-[2px] bg-bg-main dark:bg-[#0B0E11] border border-border-color dark:border-[#2B3139] relative">
              <Cpu className="w-3.5 h-3.5 text-text-secondary mb-1" />
              <span className="text-text-primary font-bold uppercase">2. VALIDATION</span>
              <span className="text-[8px] text-text-secondary mt-0.5">Parameters Syntax</span>
              <div className="absolute top-1/2 -right-2 md:-right-3 translate-y-[-50%] text-text-secondary font-black z-10 hidden md:block">➔</div>
            </div>
            <div className={`flex flex-col items-center p-2 rounded-[2px] border relative transition-all ${
              currentDecision?.status === 'REJECTED' ? 'bg-color-danger/10 border-color-danger/30 text-color-danger dark:text-color-danger' :
              currentDecision?.status === 'APPROVED' ? 'bg-color-success/10 border-color-success/30 text-color-success dark:text-color-success' :
              'bg-accent-primary/5 border-accent-primary/25 text-color-warning'
            }`}>
              <ShieldAlert className="w-3.5 h-3.5 mb-1" />
              <span className="font-bold uppercase">3. RISK ENGINE</span>
              <span className="text-[8px] mt-0.5">19 Critical Checks</span>
              <div className="absolute top-1/2 -right-2 md:-right-3 translate-y-[-50%] text-text-secondary font-black z-10 hidden md:block">➔</div>
            </div>
            <div className={`flex flex-col items-center p-2 rounded-[2px] border relative transition-all ${
              currentDecision?.status === 'REJECTED' ? 'bg-color-danger/10 border-color-danger/20 text-color-danger dark:text-color-danger' :
              currentDecision?.status === 'APPROVED' ? 'bg-color-success/10 border-color-success/20 text-color-success dark:text-color-success' :
              'bg-bg-main dark:bg-[#0B0E11] border-border-color dark:border-[#2B3139] text-text-secondary dark:text-text-secondary'
            }`}>
              <Activity className="w-3.5 h-3.5 mb-1" />
              <span className="font-bold uppercase">4. PIPELINE STATE</span>
              <span className="text-[8px] mt-0.5 uppercase">
                {currentDecision ? currentDecision.status : 'Awaiting Order'}
              </span>
              <div className="absolute top-1/2 -right-2 md:-right-3 translate-y-[-50%] text-text-secondary font-black z-10 hidden md:block">➔</div>
            </div>
            <div className="flex flex-col items-center p-2 rounded-[2px] bg-bg-main dark:bg-[#0B0E11] border border-border-color dark:border-[#2B3139]">
              <Server className="w-3.5 h-3.5 text-text-secondary mb-1" />
              <span className="text-text-primary font-bold uppercase">5. EXECUTION</span>
              <span className="text-[8px] text-text-secondary mt-0.5">Broker Gateway</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-color dark:border-[#2B3139] gap-1 font-mono text-xs overflow-x-auto no-scrollbar pb-1 whitespace-nowrap">
        <button
          onClick={() => setActiveSection('execution')}
          className={`px-3 py-1.5 rounded-t-[4px] transition-all font-bold border-t-2 text-xs ${
            activeSection === 'execution'
              ? 'bg-accent-primary/10 border-accent-primary text-color-warning dark:text-accent-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary dark:hover:text-text-primary hover:bg-bg-secondary dark:hover:bg-[#2B3139]'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5 inline mr-1" />
          Execution Command Desk
        </button>
        <button
          onClick={() => setActiveSection('simulation')}
          className={`px-3 py-1.5 rounded-t-[4px] transition-all font-bold border-t-2 text-xs ${
            activeSection === 'simulation'
              ? 'bg-accent-primary/10 border-accent-primary text-color-warning dark:text-accent-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary dark:hover:text-text-primary hover:bg-bg-secondary dark:hover:bg-[#2B3139]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 inline mr-1" />
          Pre-Trade Simulator
        </button>
        <button
          onClick={() => setActiveSection('policy')}
          className={`px-3 py-1.5 rounded-t-[4px] transition-all font-bold border-t-2 text-xs ${
            activeSection === 'policy'
              ? 'bg-accent-primary/10 border-accent-primary text-color-warning dark:text-accent-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary dark:hover:text-text-primary hover:bg-bg-secondary dark:hover:bg-[#2B3139]'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 inline mr-1" />
          Configure Risk Policies (Admin)
        </button>
        <button
          onClick={() => setActiveSection('history')}
          className={`px-3 py-1.5 rounded-t-[4px] transition-all font-bold border-t-2 text-xs ${
            activeSection === 'history'
              ? 'bg-accent-primary/10 border-accent-primary text-color-warning dark:text-accent-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary dark:hover:text-text-primary hover:bg-bg-secondary dark:hover:bg-[#2B3139]'
          }`}
        >
          <History className="w-3.5 h-3.5 inline mr-1" />
          Evaluation Logs ({decisionsHistory.length})
        </button>
      </div>

      {/* Content Panels */}
      {activeSection === 'execution' && (
        <ExecutionCommandDesk />
      )}

      {activeSection === 'simulation' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Order & Environment inputs */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. Interactive Order Simulator Form */}
            <Card variant="surface" className="p-5 border-border-color space-y-4">
              <h2 className="text-sm font-bold text-text-secondary flex items-center gap-2 border-b border-border-color/60 pb-2.5">
                <Zap className="w-4 h-4 text-sky-400" />
                <span>Simulate Order Request Pipeline</span>
              </h2>

              <form onSubmit={handleEvaluateOrder} className="space-y-4">
                {/* Symbol and Volume */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-text-secondary">INSTRUMENT / SYMBOL</label>
                    <select
                      value={orderForm.symbol}
                      onChange={(e) => handleFormChange('symbol', e.target.value)}
                      className="w-full bg-bg-hover border border-border-color rounded-lg p-2 text-xs text-text-primary font-mono focus:border-sky-500/60 focus:outline-none"
                    >
                      <option value="EURUSD">EUR/USD (Forex)</option>
                      <option value="GBPUSD">GBP/USD (Forex)</option>
                      <option value="XAUUSD">XAU/USD (Gold - Metals)</option>
                      <option value="BTCUSD">BTC/USD (Bitcoin - Crypto)</option>
                      <option value="XRPUSD">XRP/USD (Ripple - Blocked)</option>
                      <option value="MEMEUSDT">MEME/USDT (Toxic - Blocked)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-text-secondary">LOT SIZE VOLUME</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={orderForm.volume}
                      onChange={(e) => handleFormChange('volume', parseFloat(e.target.value) || 0)}
                      className="font-mono text-xs text-text-primary bg-bg-hover border-border-color"
                    />
                  </div>
                </div>

                {/* Direction and Order Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-text-secondary">DIRECTION</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleDirectionChange('BUY')}
                        className={`py-1.5 rounded-lg font-mono text-xs font-bold border transition-all ${
                          orderForm.direction === 'BUY'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-bg-hover text-text-secondary border-border-color hover:bg-bg-hover'
                        }`}
                      >
                        BUY (LONG)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDirectionChange('SHORT')}
                        className={`py-1.5 rounded-lg font-mono text-xs font-bold border transition-all ${
                          orderForm.direction === 'SHORT'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-bg-hover text-text-secondary border-border-color hover:bg-bg-hover'
                        }`}
                      >
                        SELL (SHORT)
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-text-secondary">ORDER TYPE</label>
                    <select
                      value={orderForm.type}
                      onChange={(e) => handleFormChange('type', e.target.value)}
                      className="w-full bg-bg-hover border border-border-color rounded-lg p-2 text-xs text-text-primary font-mono focus:border-sky-500/60 focus:outline-none"
                    >
                      <option value="MARKET">MARKET ORDER (Immediate)</option>
                      <option value="LIMIT">LIMIT ORDER (Pending)</option>
                    </select>
                  </div>
                </div>

                {/* Price configuration */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-text-secondary">ENTRY PRICE</label>
                    <Input
                      type="number"
                      step="0.00001"
                      value={orderForm.price}
                      onChange={(e) => handleFormChange('price', parseFloat(e.target.value) || 0)}
                      className="font-mono text-xs text-text-primary bg-bg-hover border-border-color"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-text-secondary">STOP LOSS (SL)</label>
                    <Input
                      type="number"
                      step="0.00001"
                      value={orderForm.sl}
                      onChange={(e) => handleFormChange('sl', parseFloat(e.target.value) || 0)}
                      className="font-mono text-xs text-text-primary bg-bg-hover border-border-color"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-text-secondary">TAKE PROFIT (TP)</label>
                    <Input
                      type="number"
                      step="0.00001"
                      value={orderForm.tp}
                      onChange={(e) => handleFormChange('tp', parseFloat(e.target.value) || 0)}
                      className="font-mono text-xs text-text-primary bg-bg-hover border-border-color"
                    />
                  </div>
                </div>

                {/* Pre-trade client checks */}
                <div className="p-3 bg-bg-hover rounded-xl border border-border-color flex justify-between items-center text-[11px] font-mono">
                  <div className="space-y-0.5">
                    <span className="text-text-secondary uppercase text-[9px] block">Expected Risk:Reward</span>
                    <span className={`font-bold ${isRRValid ? 'text-sky-400' : 'text-amber-400'}`}>
                      1 : {rrRatio.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    {isRRValid ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-bold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        R:R Guardrail Passed
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Strict RR (2.0 - 3.0) Warned
                      </span>
                    )}
                  </div>
                </div>

                {/* EA Source & Target Broker */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-text-secondary">STRATEGY ROUTE</label>
                    <select
                      value={orderForm.strategyId}
                      onChange={(e) => {
                        const sel = e.target;
                        setOrderForm(prev => ({
                          ...prev,
                          strategyId: sel.value,
                          strategyName: sel.options[sel.selectedIndex].text
                        }));
                      }}
                      className="w-full bg-bg-hover border border-border-color rounded-lg p-2 text-xs text-text-primary font-mono focus:border-sky-500/60 focus:outline-none"
                    >
                      <option value="strat-ai-01">Alpha-Pulse Gemini RL</option>
                      <option value="strat-01">Bollinger-Breakout v4</option>
                      <option value="strat-02">SMA-Crossover Trend</option>
                      <option value="strat-unregistered">Suspended Strategy (Blocked)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-text-secondary">EXECUTION GATEWAY</label>
                    <select
                      value={orderForm.brokerId}
                      onChange={(e) => handleFormChange('brokerId', e.target.value)}
                      className="w-full bg-bg-hover border border-border-color rounded-lg p-2 text-xs text-text-primary font-mono focus:border-sky-500/60 focus:outline-none"
                    >
                      <option value="EXNESS">Exness MT5 Gateway</option>
                      <option value="DERIV">Deriv WebSocket Gateway</option>
                      <option value="JUSTMARKETS">JustMarkets API</option>
                    </select>
                  </div>
                </div>

                {/* Run Trigger */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-text-primary font-mono text-xs py-2.5 font-bold"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-1 justify-center">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      SUBMITTING ORDER PIPELINE...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 justify-center">
                      <Play className="w-3.5 h-3.5 fill-current" />
                      EVALUATE AND EXECUTE ORDER
                    </span>
                  )}
                </Button>
              </form>
            </Card>

            {/* 2. Interactive Environmental Conditions State */}
            <Card variant="surface" className="p-5 border-border-color space-y-4">
              <div className="flex justify-between items-center border-b border-border-color/60 pb-2.5">
                <h2 className="text-sm font-bold text-text-secondary flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Simulate Environment (19 Variables)</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setMarketEnv(defaultMarketEnvironment)}
                  className="text-[10px] text-text-secondary hover:text-text-primary font-mono flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  RESET ENV
                </button>
              </div>

              <div className="space-y-3.5 font-mono text-[11px]">
                {/* Circuit Breakers & System Controls */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-bg-hover rounded-xl border border-border-color space-y-1">
                    <span className="text-[9px] text-text-secondary block font-bold">ACCOUNT STATE</span>
                    <select
                      value={marketEnv.accountStatus}
                      onChange={(e) => handleEnvChange('accountStatus', e.target.value)}
                      className="bg-transparent text-text-primary border-0 focus:outline-none text-xs font-bold"
                    >
                      <option value="ACTIVE" className="bg-bg-hover">ACTIVE (Normal)</option>
                      <option value="SUSPENDED" className="bg-bg-hover">SUSPENDED (Locked)</option>
                    </select>
                  </div>
                  <div className="p-2.5 bg-bg-hover rounded-xl border border-border-color space-y-1">
                    <span className="text-[9px] text-text-secondary block font-bold">BROKER STATUS</span>
                    <select
                      value={marketEnv.brokerStatus}
                      onChange={(e) => handleEnvChange('brokerStatus', e.target.value)}
                      className="bg-transparent text-text-primary border-0 focus:outline-none text-xs font-bold"
                    >
                      <option value="CONNECTED" className="bg-bg-hover">CONNECTED (Healthy)</option>
                      <option value="DISCONNECTED" className="bg-bg-hover">DISCONNECTED (Offline)</option>
                    </select>
                  </div>
                </div>

                {/* Session and Market Age */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-bg-hover rounded-xl border border-border-color space-y-1">
                    <span className="text-[9px] text-text-secondary block font-bold">TRADING SESSION</span>
                    <select
                      value={marketEnv.currentTradingSession}
                      onChange={(e) => handleEnvChange('currentTradingSession', e.target.value)}
                      className="bg-transparent text-text-primary border-0 focus:outline-none text-xs font-bold"
                    >
                      <option value="NEW_YORK" className="bg-bg-hover">NEW YORK</option>
                      <option value="LONDON" className="bg-bg-hover">LONDON</option>
                      <option value="TOKYO" className="bg-bg-hover">TOKYO</option>
                      <option value="WEEKEND" className="bg-bg-hover">WEEKEND (Restricted)</option>
                    </select>
                  </div>
                  <div className="p-2.5 bg-bg-hover rounded-xl border border-border-color space-y-1">
                    <span className="text-[9px] text-text-secondary block font-bold">MARKET DATA AGE</span>
                    <select
                      onChange={(e) => {
                        const ms = parseInt(e.target.value);
                        const stamp = new Date(Date.now() - ms).toISOString();
                        handleEnvChange('marketDataTimestamp', stamp);
                      }}
                      className="bg-transparent text-text-primary border-0 focus:outline-none text-xs font-bold"
                    >
                      <option value="100">100 ms (Fresh)</option>
                      <option value="2000">2000 ms (Normal)</option>
                      <option value="15000">15,000 ms (Stale)</option>
                    </select>
                  </div>
                </div>

                {/* Sliders */}
                <div className="space-y-2.5 p-3 bg-bg-hover rounded-xl border border-border-color">
                  {/* Daily loss */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-text-secondary uppercase text-[9px]">Simulated Daily Loss</span>
                      <span className="text-amber-400 font-bold">${marketEnv.currentDailyLoss.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="4000"
                      step="50"
                      value={marketEnv.currentDailyLoss}
                      onChange={(e) => handleEnvChange('currentDailyLoss', parseFloat(e.target.value))}
                      className="w-full accent-sky-500 bg-bg-hover h-1 rounded-lg"
                    />
                  </div>

                  {/* Account exposure */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-text-secondary uppercase text-[9px]">Simulated Portfolio Exposure</span>
                      <span className="text-sky-400 font-bold">${marketEnv.currentAccountExposure.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="120000"
                      step="1000"
                      value={marketEnv.currentAccountExposure}
                      onChange={(e) => handleEnvChange('currentAccountExposure', parseFloat(e.target.value))}
                      className="w-full accent-sky-500 bg-bg-hover h-1 rounded-lg"
                    />
                  </div>

                  {/* Open positions count */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-text-secondary uppercase text-[9px]">Current Open Positions</span>
                      <span className="text-text-secondary font-bold">{marketEnv.openPositionsCount} Positions</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={marketEnv.openPositionsCount}
                      onChange={(e) => handleEnvChange('openPositionsCount', parseInt(e.target.value))}
                      className="w-full accent-sky-500 bg-bg-hover h-1 rounded-lg"
                    />
                  </div>

                  {/* Spread */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-text-secondary uppercase text-[9px]">Live Bid/Ask Spread</span>
                      <span className="text-amber-500 font-bold">{marketEnv.spreadPips.toFixed(1)} Pips</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="8.0"
                      step="0.1"
                      value={marketEnv.spreadPips}
                      onChange={(e) => handleEnvChange('spreadPips', parseFloat(e.target.value))}
                      className="w-full accent-sky-500 bg-bg-hover h-1 rounded-lg"
                    />
                  </div>

                  {/* Expected slippage */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-text-secondary uppercase text-[9px]">Simulated Execution Slippage</span>
                      <span className="text-amber-500 font-bold">{marketEnv.expectedSlippagePips.toFixed(1)} Pips</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={marketEnv.expectedSlippagePips}
                      onChange={(e) => handleEnvChange('expectedSlippagePips', parseFloat(e.target.value))}
                      className="w-full accent-sky-500 bg-bg-hover h-1 rounded-lg"
                    />
                  </div>

                  {/* Frequency limit simulation */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-text-secondary uppercase text-[9px]">Recent Orders/Min Frequency</span>
                      <span className="text-amber-500 font-bold">{marketEnv.ordersInLastMinuteCount} Orders</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={marketEnv.ordersInLastMinuteCount}
                      onChange={(e) => handleEnvChange('ordersInLastMinuteCount', parseInt(e.target.value))}
                      className="w-full accent-sky-500 bg-bg-hover h-1 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: Live Pre-Trade Decision Panel & 19 checks */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Primary Risk Decision Output */}
            <Card variant="surface" className="p-5 border-border-color space-y-4">
              <h2 className="text-sm font-bold text-text-secondary flex items-center justify-between border-b border-border-color/60 pb-2.5">
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-400" />
                  <span>Server-Side Risk Engine Decision</span>
                </span>
                {currentDecision && (
                  <span className="text-[10px] font-mono text-text-secondary uppercase">
                    REQ ID: {currentDecision.orderId}
                  </span>
                )}
              </h2>

              {!currentDecision ? (
                <div className="p-8 text-center bg-bg-hover/40 rounded-xl border border-border-color space-y-2">
                  <Shield className="w-10 h-10 text-text-secondary mx-auto animate-pulse" />
                  <p className="text-xs text-text-secondary font-mono">No order evaluation requested in this session yet.</p>
                  <p className="text-[10px] text-text-secondary leading-relaxed font-mono">
                    Adjust the order settings on the left or system parameters, then click <strong className="text-sky-400">Evaluate and Execute Order</strong> to initiate server-side pre-trade check.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Major Status Banner */}
                  <div className={`p-5 rounded-2xl border flex gap-4 items-start ${
                    currentDecision.status === 'APPROVED'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}>
                    {currentDecision.status === 'APPROVED' ? (
                      <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-8 h-8 text-rose-400 shrink-0" />
                    )}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-mono font-black border px-2.5 py-0.5 rounded-full ${
                          currentDecision.status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-rose-500/15 text-rose-400 border-rose-500/25'
                        }`}>
                          {currentDecision.status}
                        </span>
                        <span className="text-[10px] font-mono text-text-secondary">
                          {new Date(currentDecision.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs font-mono font-bold leading-relaxed">
                        {currentDecision.reason}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-text-secondary pt-1 border-t border-border-color">
                        <span>STRATEGY: <strong className="text-text-secondary">{currentDecision.strategy}</strong></span>
                        <span>SYMBOL: <strong className="text-text-secondary">{currentDecision.symbol}</strong></span>
                        <span>DECISION RULE: <strong className="text-sky-400">{currentDecision.rule}</strong></span>
                        <span>STATUS LOG: <strong className="text-text-secondary">SAVED SERVER-SIDE</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* 19 checks detailed list */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-wider">
                      Gateway Checks Breakdown (19/19 checks executed):
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
                      {currentDecision.checks.map((check, idx) => (
                        <div
                          key={check.name}
                          className={`p-2.5 rounded-xl border flex items-start gap-2.5 text-[11px] font-mono transition-all ${
                            check.passed
                              ? 'bg-bg-hover/40 border-border-color hover:bg-bg-hover/25'
                              : 'bg-rose-500/5 border-rose-500/20'
                          }`}
                        >
                          <span className="text-text-secondary font-bold w-4 text-right shrink-0 mt-0.5">
                            {(idx + 1).toString().padStart(2, '0')}
                          </span>
                          {check.passed ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 space-y-0.5 min-w-0">
                            <div className="flex justify-between items-center gap-1.5">
                              <span className={`font-bold truncate ${check.passed ? 'text-text-secondary' : 'text-rose-300'}`}>
                                {check.name}
                              </span>
                              <span className={`text-[9px] font-bold px-1 rounded uppercase ${
                                check.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {check.passed ? 'PASSED' : 'FAILED'}
                              </span>
                            </div>
                            <div className="flex justify-between text-[10px] text-text-secondary">
                              <span>Value: <strong className="text-text-secondary">{check.value}</strong></span>
                              <span>Limit: <strong className="text-text-secondary">{check.threshold}</strong></span>
                            </div>
                            <p className="text-[9px] text-text-secondary leading-normal pt-0.5">
                              {check.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* POLICY CONFIGURATION TAB */}
      {activeSection === 'policy' && (
        <Card variant="surface" className="p-5 border-border-color space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-border-color/60 pb-3">
            <div>
              <h2 className="text-sm font-bold text-text-secondary flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-sky-400" />
                <span>Configure Server-Side Pre-Trade Policies</span>
              </h2>
              <p className="text-[11px] text-text-secondary font-mono mt-0.5">
                ADMIN ACCESS SECURED • DYNAMIC UPDATE ENFORCES REAL-TIME COMPLIANCE
              </p>
            </div>
            <button
              onClick={fetchPolicy}
              className="text-[10px] text-sky-400 hover:text-sky-300 font-mono self-start flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              RELOAD ACTIVE POLICY
            </button>
          </div>

          {!activePolicy ? (
            <div className="p-6 text-center font-mono">
              <RefreshCw className="w-6 h-6 animate-spin text-text-secondary mx-auto" />
              <span className="text-xs text-text-secondary block mt-2">Loading Server Policy...</span>
            </div>
          ) : (
            <form onSubmit={handleUpdatePolicy} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono text-xs">
                
                {/* Section A: Exposure & Limits */}
                <div className="p-4 bg-bg-hover rounded-xl border border-border-color space-y-4">
                  <h3 className="text-[11px] font-bold text-sky-400 uppercase tracking-wider border-b border-border-color pb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-sky-400" />
                    <span>Capital & Exposure</span>
                  </h3>

                  <div className="space-y-1">
                    <label className="text-[10px] text-text-secondary uppercase font-bold">Max Position Size (Lots)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={activePolicy.maxPositionSizeLots}
                      onChange={(e) => setActivePolicy({ ...activePolicy, maxPositionSizeLots: parseFloat(e.target.value) || 1.0 })}
                      className="bg-bg-hover border-border-color text-xs text-text-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-text-secondary uppercase font-bold">Max Account Exposure ($ USD)</label>
                    <Input
                      type="number"
                      value={activePolicy.maxAccountExposure}
                      onChange={(e) => setActivePolicy({ ...activePolicy, maxAccountExposure: parseInt(e.target.value) || 50000 })}
                      className="bg-bg-hover border-border-color text-xs text-text-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-text-secondary uppercase font-bold">Max Strategy Exposure ($ USD)</label>
                    <Input
                      type="number"
                      value={activePolicy.maxStrategyExposure}
                      onChange={(e) => setActivePolicy({ ...activePolicy, maxStrategyExposure: parseInt(e.target.value) || 20000 })}
                      className="bg-bg-hover border-border-color text-xs text-text-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-text-secondary uppercase font-bold">Max Correlated Exposure ($ USD)</label>
                    <Input
                      type="number"
                      value={activePolicy.maxCorrelatedExposure}
                      onChange={(e) => setActivePolicy({ ...activePolicy, maxCorrelatedExposure: parseInt(e.target.value) || 30000 })}
                      className="bg-bg-hover border-border-color text-xs text-text-primary"
                    />
                  </div>
                </div>

                {/* Section B: Risk & Drawdown */}
                <div className="p-4 bg-bg-hover rounded-xl border border-border-color space-y-4">
                  <h3 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider border-b border-border-color pb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Risk & Drawdown Limits</span>
                  </h3>

                  <div className="space-y-1">
                    <label className="text-[10px] text-text-secondary uppercase font-bold">Max Daily Loss Limit ($ USD)</label>
                    <Input
                      type="number"
                      value={activePolicy.maxDailyLoss}
                      onChange={(e) => setActivePolicy({ ...activePolicy, maxDailyLoss: parseInt(e.target.value) || 1000 })}
                      className="bg-bg-hover border-border-color text-xs text-text-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-text-secondary uppercase font-bold">Max Drawdown Limit (% Pct)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={activePolicy.maxDailyDrawdownPct}
                      onChange={(e) => setActivePolicy({ ...activePolicy, maxDailyDrawdownPct: parseFloat(e.target.value) || 3.0 })}
                      className="bg-bg-hover border-border-color text-xs text-text-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-text-secondary uppercase font-bold">Max Open Positions Count</label>
                    <Input
                      type="number"
                      value={activePolicy.maxOpenPositions}
                      onChange={(e) => setActivePolicy({ ...activePolicy, maxOpenPositions: parseInt(e.target.value) || 5 })}
                      className="bg-bg-hover border-border-color text-xs text-text-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-text-secondary uppercase font-bold">Min Margin Buffer (% Free)</label>
                    <Input
                      type="number"
                      value={activePolicy.minMarginAvailable}
                      onChange={(e) => setActivePolicy({ ...activePolicy, minMarginAvailable: parseInt(e.target.value) || 20 })}
                      className="bg-bg-hover border-border-color text-xs text-text-primary"
                    />
                  </div>
                </div>

                {/* Section C: Technical Thresholds & Safety */}
                <div className="p-4 bg-bg-hover rounded-xl border border-border-color space-y-4">
                  <h3 className="text-[11px] font-bold text-rose-500 uppercase tracking-wider border-b border-border-color pb-1.5 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-rose-500" />
                    <span>Execution & Feeds</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] text-text-secondary uppercase font-bold">Max Spread (Pips)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={activePolicy.maxSpreadPips}
                        onChange={(e) => setActivePolicy({ ...activePolicy, maxSpreadPips: parseFloat(e.target.value) || 2.0 })}
                        className="bg-bg-hover border-border-color text-xs text-text-primary font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-text-secondary uppercase font-bold">Max Slippage (Pips)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={activePolicy.maxSlippagePips}
                        onChange={(e) => setActivePolicy({ ...activePolicy, maxSlippagePips: parseFloat(e.target.value) || 1.0 })}
                        className="bg-bg-hover border-border-color text-xs text-text-primary font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-text-secondary uppercase font-bold">Max Market Data Age (ms)</label>
                    <Input
                      type="number"
                      value={activePolicy.maxMarketDataAgeMs}
                      onChange={(e) => setActivePolicy({ ...activePolicy, maxMarketDataAgeMs: parseInt(e.target.value) || 5000 })}
                      className="bg-bg-hover border-border-color text-xs text-text-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] text-text-secondary uppercase font-bold">Min Int. (ms)</label>
                      <Input
                        type="number"
                        value={activePolicy.minOrderIntervalMs}
                        onChange={(e) => setActivePolicy({ ...activePolicy, minOrderIntervalMs: parseInt(e.target.value) || 1000 })}
                        className="bg-bg-hover border-border-color text-xs text-text-primary font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-text-secondary uppercase font-bold">Max Freq (Orders/m)</label>
                      <Input
                        type="number"
                        value={activePolicy.maxOrdersPerMinute}
                        onChange={(e) => setActivePolicy({ ...activePolicy, maxOrdersPerMinute: parseInt(e.target.value) || 10 })}
                        className="bg-bg-hover border-border-color text-xs text-text-primary font-mono"
                      />
                    </div>
                  </div>

                  {/* Circuit Breaker Manual Toggle */}
                  <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-rose-400 uppercase block">Global Circuit Breaker</span>
                      <span className="text-[8px] text-text-secondary">Instantly halt all execution pipelines</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePolicy({ ...activePolicy, circuitBreakerActive: !activePolicy.circuitBreakerActive })}
                      className={`px-3 py-1 rounded font-mono font-bold text-[10px] border transition-all ${
                        activePolicy.circuitBreakerActive
                          ? 'bg-rose-500 text-text-primary border-rose-600 animate-pulse'
                          : 'bg-bg-hover text-text-secondary border-border-color hover:text-text-primary'
                      }`}
                    >
                      {activePolicy.circuitBreakerActive ? 'TRIGGERED (HALT)' : 'ARMED / NORMAL'}
                    </button>
                  </div>
                </div>

              </div>

              {/* Save trigger */}
              <div className="pt-4 border-t border-border-color flex justify-end gap-3 font-mono text-xs">
                <Button
                  type="submit"
                  disabled={isSavingPolicy}
                  className="bg-emerald-600 hover:bg-emerald-500 text-text-primary font-bold px-6 py-2"
                >
                  {isSavingPolicy ? 'SAVING POLICIES TO SERVER...' : 'COMMIT SYSTEM-WIDE RISK POLICIES'}
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {/* HISTORICAL DECISIONS LOG TAB */}
      {activeSection === 'history' && (
        <Card variant="surface" className="p-5 border-border-color space-y-4">
          <div className="flex justify-between items-center border-b border-border-color/60 pb-3">
            <div>
              <h2 className="text-sm font-bold text-text-secondary flex items-center gap-2">
                <History className="w-4 h-4 text-sky-400" />
                <span>Pre-Trade Risk Decisions Audit Log</span>
              </h2>
              <p className="text-[11px] text-text-secondary font-mono mt-0.5">
                COMPLIANCE LOGS PROTECTED BY SECURE SERVER CONTEXT • CHRONOLOGICAL METRIC RUNS
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchDecisions}
                className="px-3 py-1 bg-bg-hover border border-border-color hover:bg-bg-hover rounded font-mono text-[10px] text-text-secondary flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                RELOAD
              </button>
              <button
                onClick={handleClearLogs}
                disabled={isClearing || decisionsHistory.length === 0}
                className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 rounded font-mono text-[10px] text-rose-400 flex items-center gap-1.5"
              >
                <Trash2 className="w-3 h-3" />
                CLEAR LOGS
              </button>
            </div>
          </div>

          {decisionsHistory.length === 0 ? (
            <div className="p-12 text-center bg-bg-hover/40 rounded-xl border border-border-color space-y-2">
              <History className="w-10 h-10 text-text-secondary mx-auto" />
              <p className="text-xs text-text-secondary font-mono">No evaluation records found on the server.</p>
              <p className="text-[10px] text-text-secondary font-mono">
                Historical records persist for active sessions and clear upon manual flush or container restart.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-border-color text-text-secondary text-[10px] uppercase font-bold">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Strategy</th>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Decision</th>
                    <th className="py-2.5 px-3">Violated Rule</th>
                    <th className="py-2.5 px-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {decisionsHistory.map((item) => (
                    <tr
                      key={item.orderId}
                      onClick={() => {
                        setCurrentDecision(item);
                        setActiveSection('simulation');
                      }}
                      className="hover:bg-bg-hover/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-3 text-text-secondary">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-3 text-sky-400 font-bold group-hover:underline">
                        {item.orderId}
                      </td>
                      <td className="py-3 px-3 text-text-secondary">{item.strategy}</td>
                      <td className="py-3 px-3 text-text-secondary">{item.symbol}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          item.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-text-secondary">
                        {item.rule === 'ALL_RULES_PASSED' ? '-' : item.rule}
                      </td>
                      <td className="py-3 px-3 text-text-secondary truncate max-w-[200px]" title={item.reason}>
                        {item.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Info Footnote on Pre-Trade Risk Framework */}
      <div className="flex gap-2.5 p-4 rounded-xl bg-bg-hover border border-border-color text-xs text-text-secondary leading-relaxed">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-text-secondary">Technical Architecture Specifications:</p>
          <p>
            The AppexQuant Risk Engine utilizes a server-side **isolated memory gateway**. Before any trade transaction payload reaches the broker REST or WebSocket stream, it is serialized and validated against the 19 critical checks defined in this component. Any single parameter violation drops the trade packet, logs a security alert event to the audit trail stream, and halts down-pipeline broker execution.
          </p>
        </div>
      </div>
    </div>
  );
};
