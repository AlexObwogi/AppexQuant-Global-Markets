/**
 * AppexQuant Markets Global - Creator Revenue Split & Payout Portal
 * Gamified tier progression, weekly splits, immutable ledger settlements & public profile manager.
 */

import React, { useState } from 'react';
import {
  DollarSign,
  Award,
  TrendingUp,
  Users,
  Share2,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import {
  getCreatorSummary,
  requestCreatorPayout,
  CREATOR_TIER_CONFIGS,
} from '../../services/creatorRevenueService.ts';
import { Button } from '../ui/Button.tsx';

export const CreatorRevenueDashboard: React.FC = () => {
  const [summary, setSummary] = useState(() => getCreatorSummary('CRT-ALEX-01'));
  const [copiedLink, setCopiedLink] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<string>('500');
  const [payoutAddress, setPayoutAddress] = useState<string>('0x71C...489B (USDT TRC20)');
  const [payoutMessage, setPayoutMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { profile, tierConfig } = summary;

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/trader/${profile.username}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleExecutePayout = () => {
    const amt = parseFloat(payoutAmount);
    if (isNaN(amt) || amt <= 0) {
      setPayoutMessage({ type: 'error', text: 'Please enter a valid numeric payout amount.' });
      return;
    }
    const res = requestCreatorPayout(profile.id, amt, payoutAddress);
    if (res.success) {
      setSummary(getCreatorSummary(profile.id));
      setPayoutMessage({ type: 'success', text: res.message });
      setTimeout(() => {
        setIsPayoutModalOpen(false);
        setPayoutMessage(null);
      }, 2500);
    } else {
      setPayoutMessage({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Profile & Tier Banner */}
      <div className="p-6 bg-surface-primary border border-border-subtle rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-amber-500/20 border border-primary/30 flex items-center justify-center font-bold text-xl text-primary font-mono">
              {profile.displayName.substring(0, 2).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-surface-primary border border-border-subtle">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-text-primary">{profile.displayName}</h2>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider"
                style={{ backgroundColor: `${tierConfig.badgeColor}20`, color: tierConfig.badgeColor, border: `1px solid ${tierConfig.badgeColor}40` }}
              >
                {tierConfig.tier} TIER ({tierConfig.revenueSplitPct}% SHARE)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> VERIFIED PROVIDER
              </span>
            </div>
            <p className="text-xs text-text-secondary line-clamp-1">{profile.bio}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="text-xs gap-1.5">
            {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            {copiedLink ? 'Link Copied!' : 'Share Public Profile'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsPayoutModalOpen(true)}
            className="text-xs gap-1.5 bg-primary text-black font-bold"
          >
            <CreditCard className="w-3.5 h-3.5" /> Request Payout
          </Button>
        </div>
      </div>

      {/* Revenue & Tier Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-surface-primary border border-border-subtle rounded-xl space-y-1">
          <div className="flex items-center justify-between text-text-secondary text-xs">
            <span>Available Balance</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-black text-emerald-400">
            ${summary.currentBalanceUsd.toLocaleString()}
          </div>
          <p className="text-[11px] text-text-secondary">Ready for instant settlement</p>
        </div>

        <div className="p-4 bg-surface-primary border border-border-subtle rounded-xl space-y-1">
          <div className="flex items-center justify-between text-text-secondary text-xs">
            <span>Lifetime Payouts</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-mono font-black text-text-primary">
            ${summary.lifetimeEarningsUsd.toLocaleString()}
          </div>
          <p className="text-[11px] text-text-secondary">From subscriptions & profit splits</p>
        </div>

        <div className="p-4 bg-surface-primary border border-border-subtle rounded-xl space-y-1">
          <div className="flex items-center justify-between text-text-secondary text-xs">
            <span>Active Copiers & AUM</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-mono font-black text-text-primary">
            {profile.activeCopiersCount} <span className="text-xs text-text-secondary font-normal">(${(profile.aumUsd / 1000).toFixed(0)}k AUM)</span>
          </div>
          <p className="text-[11px] text-text-secondary">Win Rate: {profile.winRatePct}% • PF: {profile.profitFactor}</p>
        </div>

        <div className="p-4 bg-surface-primary border border-border-subtle rounded-xl space-y-1">
          <div className="flex items-center justify-between text-text-secondary text-xs">
            <span>Next Tier: DIAMOND</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-mono font-black text-amber-400">
            85% <span className="text-xs text-text-secondary font-normal">Revenue Share</span>
          </div>
          <p className="text-[11px] text-text-secondary">Needs 500 followers ($1M AUM)</p>
        </div>
      </div>

      {/* Tier Road Map */}
      <div className="p-5 bg-surface-primary border border-border-subtle rounded-2xl space-y-3">
        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Creator Revenue Tier Ladder</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.values(CREATOR_TIER_CONFIGS).map((t) => {
            const isCurrent = t.tier === profile.tier;
            return (
              <div
                key={t.tier}
                className={`p-3 rounded-xl border transition-all ${isCurrent ? 'bg-primary/10 border-primary shadow-md shadow-primary/10' : 'bg-surface-secondary/40 border-border-subtle'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono" style={{ color: t.badgeColor }}>
                    {t.tier}
                  </span>
                  {isCurrent && <span className="text-[10px] font-bold text-primary">CURRENT</span>}
                </div>
                <div className="text-lg font-mono font-black text-text-primary mt-1">{t.revenueSplitPct}%</div>
                <div className="text-[10px] text-text-secondary mt-0.5">
                  {t.minFollowers > 0 ? `${t.minFollowers}+ copiers` : 'Default'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Immutable Ledger Entries */}
      <div className="p-5 bg-surface-primary border border-border-subtle rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Immutable Revenue Ledger History
          </h3>
          <span className="text-xs font-mono text-text-secondary">Weekly SHA-256 Batch Audits</span>
        </div>

        <div className="divide-y divide-border-subtle">
          {summary.ledgerEntries.map((entry) => (
            <div key={entry.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-text-primary">{entry.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${entry.status === 'SETTLED' ? 'bg-emerald-500/10 text-emerald-400' : entry.status === 'PAID_OUT' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {entry.status}
                  </span>
                  <span className="text-xs text-text-secondary font-mono">[{entry.batchPeriod}]</span>
                </div>
                <div className="text-[10px] text-text-secondary font-mono truncate max-w-sm">
                  Hash: {entry.hashDigest}
                </div>
              </div>

              <div className="text-right sm:self-center">
                <div className={`text-sm font-mono font-bold ${entry.netCreatorPayoutUsd >= 0 ? 'text-emerald-400' : 'text-text-primary'}`}>
                  {entry.netCreatorPayoutUsd >= 0 ? `+$${entry.netCreatorPayoutUsd.toFixed(2)}` : `-$${Math.abs(entry.netCreatorPayoutUsd).toFixed(2)}`}
                </div>
                <div className="text-[10px] text-text-secondary">
                  Gross: ${entry.grossAmountUsd} (Platform Cut: {entry.platformCutPct}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payout Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-surface-primary border border-border-subtle rounded-2xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-text-primary">Request Ledger Payout</h3>
            <p className="text-xs text-text-secondary">
              Settlements are cryptographically dispatched to your verified crypto address or bank ledger.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-text-secondary font-semibold uppercase">Amount (USD)</label>
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  max={summary.currentBalanceUsd}
                  className="w-full mt-1 p-2.5 bg-surface-secondary border border-border-subtle rounded-xl text-xs font-mono text-text-primary"
                />
                <span className="text-[10px] text-text-secondary mt-1 block">
                  Available: ${summary.currentBalanceUsd.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="text-[10px] text-text-secondary font-semibold uppercase">Destination Address / IBAN</label>
                <input
                  type="text"
                  value={payoutAddress}
                  onChange={(e) => setPayoutAddress(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-surface-secondary border border-border-subtle rounded-xl text-xs font-mono text-text-primary"
                />
              </div>

              {payoutMessage && (
                <div className={`p-3 rounded-xl text-xs font-medium ${payoutMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                  {payoutMessage.text}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsPayoutModalOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleExecutePayout} className="bg-primary text-black font-bold">
                Confirm & Sign Payout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
