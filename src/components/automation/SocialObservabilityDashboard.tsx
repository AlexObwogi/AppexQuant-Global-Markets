/**
 * AppexQuant Markets Global - Real-Time Social Observability & Analytics Dashboard
 * Data visualization using Recharts for engagement metrics, reach estimates,
 * uptime tracking, and delivery success distribution.
 */

import React from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Share2,
  Users,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { SocialAnalyticsSummaryDTO } from '../../types/socialAutomation.ts';

interface SocialObservabilityDashboardProps {
  analytics: SocialAnalyticsSummaryDTO;
  loading?: boolean;
}

export const SocialObservabilityDashboard: React.FC<SocialObservabilityDashboardProps> = ({
  analytics,
  loading = false,
}) => {
  return (
    <div className="space-y-6">
      {/* 4 HIGH-DENSITY METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Published */}
        <div className="p-4 rounded-2xl bg-bg-surface border border-border-color space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">Dispatched Broadcasts</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-text-primary">
            {analytics.totalPublished.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-400 font-medium block">
            {analytics.overallSuccessRatePct}% Success Rate
          </span>
        </div>

        {/* Estimated Reach */}
        <div className="p-4 rounded-2xl bg-bg-surface border border-border-color space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">Estimated Total Reach</span>
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400">
            {analytics.estimatedReach.toLocaleString()}
          </div>
          <span className="text-[11px] text-text-secondary font-medium block">
            Across {analytics.activeChannelsCount} active channels
          </span>
        </div>

        {/* Pending In Queue */}
        <div className="p-4 rounded-2xl bg-bg-surface border border-border-color space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">Pending In Queue</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-300">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-300">
            {analytics.totalPending}
          </div>
          <span className="text-[11px] text-text-secondary font-medium block">
            Polled every 60 seconds by Celery
          </span>
        </div>

        {/* Delivery Failures */}
        <div className="p-4 rounded-2xl bg-bg-surface border border-border-color space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">Failed Dispatches</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-rose-400">
            {analytics.totalFailed}
          </div>
          <span className="text-[11px] text-rose-400/80 font-medium block">
            Eligible for single-click retry
          </span>
        </div>
      </div>

      {/* CHARTS ROW: 7-DAY DELIVERY TIME-SERIES & PLATFORM BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 7-DAY DELIVERY ACTIVITY AREA CHART */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-bg-surface border border-border-color space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border-color">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                7-Day Broadcast Delivery & Reach Velocity
              </h3>
              <p className="text-[11px] text-text-secondary">
                Aggregated daily throughput and estimated audience impressions.
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-main border border-border-color text-cyan-400">
              Live Feed
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.timeSeriesDelivery} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="deliveryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222F3E" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                    color: '#F8FAFC',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="successful"
                  name="Successful Dispatches"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#deliveryGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PLATFORM DISTRIBUTION BREAKDOWN */}
        <div className="p-5 rounded-2xl bg-bg-surface border border-border-color space-y-4">
          <div className="pb-2 border-b border-border-color">
            <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-cyan-400" />
              Delivery by Platform
            </h3>
            <p className="text-[11px] text-text-secondary">Channel share & execution success rates.</p>
          </div>

          <div className="space-y-3 pt-1">
            {analytics.platformDistribution.map((item) => {
              const platformName = item.platform.replace('_', ' ');
              return (
                <div key={item.platform} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-text-primary truncate">{platformName}</span>
                    <span className="font-mono text-cyan-400 font-bold">{item.count} posts</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-bg-main overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cyan-500"
                      style={{
                        width: `${Math.min(100, (item.count / Math.max(1, analytics.totalPublished)) * 100 * 2.5)}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-text-secondary">
                    <span>Target Uptime</span>
                    <span className="text-emerald-400 font-medium">{item.successRate}% Success</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
