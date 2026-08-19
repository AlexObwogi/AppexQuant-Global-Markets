/**
 * AppexQuant Markets Global - Centralized Pre-Trade Risk Engine Command Desk
 * Enforces a strict server-side pipeline: Strategy Intent → Order Request → Validation → Risk Engine → Broker Adapter.
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
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
import { OrderRequest, RiskPolicy, RiskDecision, MarketEnvironmentState, defaultMarketEnvironment, CheckResult } from '../services/ai/riskEngine.ts';
import { ExecutionCommandDesk } from '../components/eas/ExecutionCommandDesk.tsx';
import { useApiFetch } from '../utils/apiFetch.ts';
import { ArrowRightLeft } from 'lucide-react';

export const TradeView: React.FC = () => {
  const apiFetch = useApiFetch();
  // App States
  const [activePolicy, setActivePolicy] = useState<RiskPolicy | null>(null);
  const [marketEnv, setMarketEnv] = useState<MarketEnvironmentState>(defaultMarketEnvironment);
  const [decisionsHistory, setDecisionsHistory] = useState<RiskDecision[]>([]);
  const [currentDecision, setCurrentDecision] = useState<RiskDecision | null>(null);
  const [activeSection, setActiveSection] = useState<'execution' | 'policy' | 'history'>('execution');

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

      {activeSection === 'policy' && (
        <Card variant="surface" className="p-5 border-border-color space-y-6">
          <h2 className="text-sm font-bold text-text-primary">Policy Management Offline</h2>
          <p className="text-xs text-text-secondary">Please configure these settings on the server level directly.</p>
        </Card>
      )}

      {activeSection === 'history' && (
        <Card variant="surface" className="p-5 border-border-color space-y-6">
          <h2 className="text-sm font-bold text-text-primary">Evaluation Logs</h2>
          {decisionsHistory.length === 0 ? (
            <p className="text-xs text-text-secondary">No evaluation logs available.</p>
          ) : (
            <div className="space-y-2">
              {decisionsHistory.map((dec, idx) => (
                <div key={idx} className="p-2 border border-border-color rounded">
                  {dec.status} - {new Date(dec.timestamp).toLocaleString()}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

    </div>
  );
};
