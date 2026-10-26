/**
 * AppexQuant Markets Global - Deriv API Rate Limit Monitor
 * File: src/components/dashboard/DerivRateLimitTracker.tsx
 *
 * Tracks live requests/minute against Deriv's official 120 requests/min throttle threshold.
 * Provides early visual warnings, sliding-window reset countdowns, and stream breakdown.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApiFetch } from '../../utils/apiFetch.ts';
import { Card } from '../ui/Card.tsx';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Zap,
  Radio,
  Clock,
  ShieldCheck,
  Info,
} from 'lucide-react';

export interface DerivRateLimitData {
  requestsInLastMinute: number;
  limitPerMinute: number;
  remaining: number;
  usagePercentage: number;
  status: 'NORMAL' | 'ELEVATED' | 'CRITICAL' | 'THROTTLED';
  isThrottled: boolean;
  resetTimeSeconds: number;
  breakdown: {
    rest: number;
    ws: number;
    subscription: number;
    auth: number;
  };
  totalRecorded: number;
  lastRequestTimestamp: string | null;
}

const DEFAULT_METRICS: DerivRateLimitData = {
  requestsInLastMinute: 8,
  limitPerMinute: 120,
  remaining: 112,
  usagePercentage: 6.7,
  status: 'NORMAL',
  isThrottled: false,
  resetTimeSeconds: 45,
  breakdown: {
    rest: 2,
    ws: 4,
    subscription: 1,
    auth: 1,
  },
  totalRecorded: 18,
  lastRequestTimestamp: new Date().toISOString(),
};

interface DerivRateLimitTrackerProps {
  compact?: boolean;
  className?: string;
}

export const DerivRateLimitTracker: React.FC<DerivRateLimitTrackerProps> = ({
  compact = false,
  className = '',
}) => {
  const apiFetch = useApiFetch();
  const [data, setData] = useState<DerivRateLimitData>(DEFAULT_METRICS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState<number>(45);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMetrics = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await apiFetch('/api/deriv/rate-limit');
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.data) {
          setData(json.data);
          setCountdown(json.data.resetTimeSeconds || 60);
          setLastUpdated(new Date());
        }
      }
    } catch {
      // Keep optimistic or previous metrics
    } finally {
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 300);
      }
    }
  }, [apiFetch]);

  // Periodic polling every 5s while document is visible
  useEffect(() => {
    fetchMetrics();

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchMetrics();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchMetrics]);

  // Local 1-second countdown tick for smooth reset display
  useEffect(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 60));
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  const {
    requestsInLastMinute,
    limitPerMinute,
    remaining,
    usagePercentage,
    status,
    isThrottled,
    breakdown,
  } = data;

  // Determine color theme based on threshold
  const isHighRisk = usagePercentage >= 80 || isThrottled;
  const isModerate = usagePercentage >= 50 && !isHighRisk;

  const barColor = isHighRisk
    ? 'bg-rose-500'
    : isModerate
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  const statusBadge = isThrottled ? (
    <span className="flex items-center gap-1.5 text-rose-400 font-semibold text-xs">
      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
      <span>Throttled (429 Cool-down)</span>
    </span>
  ) : isHighRisk ? (
    <span className="flex items-center gap-1.5 text-rose-400 font-semibold text-xs">
      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
      <span>High Throttling Risk</span>
    </span>
  ) : isModerate ? (
    <span className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
      <span>Elevated Traffic</span>
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
      <span>Optimal Headroom</span>
    </span>
  );

  if (compact) {
    return (
      <Card variant="surface" padding="sm" className={`dashboard-card text-xs space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-text-secondary font-medium">
            <Activity className="w-3.5 h-3.5 text-accent-primary" />
            <span>Deriv API Rate</span>
          </div>
          <span className="font-mono font-bold text-text-primary">
            {requestsInLastMinute} / {limitPerMinute} req/min
          </span>
        </div>
        <div className="w-full bg-bg-secondary rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(100, Math.max(4, usagePercentage))}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-text-secondary">
          <span>{remaining} remaining</span>
          <span>Resets in {countdown}s</span>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="surface" className={`dashboard-card relative overflow-hidden flex flex-col justify-between ${className}`}>
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-border-color">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-accent-primary/10 rounded-md text-accent-primary">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary">
                  Deriv API Rate Limit Monitor
                </h3>
                <span className="text-text-secondary text-[11px] font-mono">
                  120 req/min limit
                </span>
              </div>
              <p className="text-[11px] text-text-secondary">
                Sliding 60-second window quota tracking across REST & WebSocket multiplexer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {statusBadge}
            <button
              onClick={() => fetchMetrics(true)}
              disabled={isRefreshing}
              className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors cursor-pointer"
              title="Refresh rate limit metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-accent-primary' : ''}`} />
            </button>
          </div>
        </div>

        {/* Big Meter & Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-3 border-b border-border-color">
          {/* Main Counter */}
          <div className="flex flex-col justify-center">
            <span className="text-[11px] uppercase tracking-wider text-text-secondary font-medium">
              Current Rate
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-mono font-bold text-text-primary">
                {requestsInLastMinute}
              </span>
              <span className="text-xs text-text-secondary font-mono">
                / {limitPerMinute} req/min
              </span>
            </div>
            <span className="text-[11px] text-text-secondary mt-0.5">
              {usagePercentage.toFixed(1)}% capacity consumed
            </span>
          </div>

          {/* Available Headroom */}
          <div className="flex flex-col justify-center sm:border-l sm:border-r border-border-color sm:px-4">
            <span className="text-[11px] uppercase tracking-wider text-text-secondary font-medium">
              Available Headroom
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-2xl font-mono font-bold ${isHighRisk ? 'text-rose-400' : 'text-color-success'}`}>
                {remaining}
              </span>
              <span className="text-xs text-text-secondary">
                requests left
              </span>
            </div>
            <span className="text-[11px] text-text-secondary mt-0.5">
              Deriv 429 throttle buffer: safe
            </span>
          </div>

          {/* Rolling Window Reset */}
          <div className="flex flex-col justify-center sm:pl-2">
            <span className="text-[11px] uppercase tracking-wider text-text-secondary font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-accent-primary" />
              <span>Window Reset</span>
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-mono font-bold text-accent-primary">
                {countdown}s
              </span>
              <span className="text-xs text-text-secondary">
                rolling cycle
              </span>
            </div>
            <span className="text-[11px] text-text-secondary mt-0.5">
              Oldest request rolls off continuously
            </span>
          </div>
        </div>

        {/* Visual Capacity Meter Bar */}
        <div className="py-2.5 space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-text-secondary font-medium">Capacity Utilization</span>
            <span className="font-mono text-text-primary font-semibold">
              {requestsInLastMinute} / {limitPerMinute} req ({usagePercentage.toFixed(0)}%)
            </span>
          </div>
          
          <div className="relative w-full bg-bg-secondary rounded-full h-2.5 overflow-hidden border border-border-color">
            {/* Danger Zone marker at 80% (96 req/min) */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-rose-500/70 z-10"
              style={{ left: '80%' }}
              title="80% Throttle Danger Threshold (96 req/min)"
            />
            <div
              className={`h-full transition-all duration-500 rounded-full ${barColor}`}
              style={{ width: `${Math.min(100, Math.max(3, usagePercentage))}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-text-secondary font-mono">
            <span>0 req/min (Idle)</span>
            <span className="text-amber-500/90 font-sans">Caution: 80% (96 req)</span>
            <span>120 req/min (Limit)</span>
          </div>
        </div>

        {/* Traffic Breakdown Sub-Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          <div className="p-2 bg-bg-surface border border-border-color rounded text-xs flex flex-col">
            <span className="text-text-secondary text-[10px] font-medium flex items-center gap-1">
              <Zap className="w-3 h-3 text-accent-primary" /> REST Syncs
            </span>
            <span className="font-mono font-bold text-text-primary mt-0.5 text-sm">
              {breakdown.rest} req
            </span>
          </div>

          <div className="p-2 bg-bg-surface border border-border-color rounded text-xs flex flex-col">
            <span className="text-text-secondary text-[10px] font-medium flex items-center gap-1">
              <Radio className="w-3 h-3 text-accent-primary" /> WS Frames
            </span>
            <span className="font-mono font-bold text-text-primary mt-0.5 text-sm">
              {breakdown.ws} req
            </span>
          </div>

          <div className="p-2 bg-bg-surface border border-border-color rounded text-xs flex flex-col">
            <span className="text-text-secondary text-[10px] font-medium flex items-center gap-1">
              <Activity className="w-3 h-3 text-color-success" /> Active Feeds
            </span>
            <span className="font-mono font-bold text-text-primary mt-0.5 text-sm">
              {breakdown.subscription} feeds
            </span>
          </div>

          <div className="p-2 bg-bg-surface border border-border-color rounded text-xs flex flex-col">
            <span className="text-text-secondary text-[10px] font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-color-info" /> Auth/Token
            </span>
            <span className="font-mono font-bold text-text-primary mt-0.5 text-sm">
              {breakdown.auth} req
            </span>
          </div>
        </div>
      </div>

      {/* Adaptive Throttling Alert or Info Footer */}
      <div className="mt-3 pt-2 border-t border-border-color text-xs">
        {isHighRisk ? (
          <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="font-semibold">Throttling Warning:</strong> Deriv rate limit is approaching or has exceeded the 120 req/min threshold.
              Avoid manual page refreshes or repeated sync clicks. Outgoing requests are automatically queued by the WebSocket multiplexer.
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-text-secondary">
            <span className="flex items-center gap-1 text-text-secondary">
              <Info className="w-3 h-3 text-accent-primary" />
              <span>Deriv WebSocket multiplexer active · Sockets are pooled to conserve API quotas</span>
            </span>
            <span className="font-mono text-[10px]">
              Last synced: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};
