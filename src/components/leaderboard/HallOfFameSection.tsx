/**
 * AppexQuant Markets Global - Hall of Fame & Permanent Visual Thumbnail Archive
 * Section: "HALL OF FAME ✔️"
 * Displays permanent legacy inductees, verified telemetry performance thumbnails, trade analytics & audit hashes
 */

import React, { useState } from 'react';
import { HallOfFameInductee } from '../../types/leaderboard.ts';
import { VerifiedLeaderBadge } from './VerifiedLeaderBadge.tsx';
import {
  Award,
  Crown,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  ExternalLink,
  CheckCircle2,
  Lock,
  Eye,
  FileCheck2,
  Calendar,
} from 'lucide-react';

interface HallOfFameSectionProps {
  inductees: HallOfFameInductee[];
}

export const HallOfFameSection: React.FC<HallOfFameSectionProps> = ({ inductees }) => {
  const [selectedInductee, setSelectedInductee] = useState<HallOfFameInductee | null>(null);
  const [windowFilter, setWindowFilter] = useState<'ALL' | 'YEARLY' | 'MONTHLY'>('ALL');

  const filteredInductees = inductees.filter((inductee) => {
    if (windowFilter === 'ALL') return true;
    return inductee.inductionWindow === windowFilter;
  });

  return (
    <div className="space-y-6">
      {/* Hall of Fame Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-cyan-500/10 border border-amber-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Crown className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight flex items-center gap-2">
                HALL OF FAME ✔️
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-amber-500/20 text-amber-300 border border-amber-400/40 font-black uppercase shadow-xs">
                PERMANENT LEGACY INDUCTION
              </span>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary max-w-2xl leading-relaxed">
              Automated legacy repository archiving annual and monthly #1 tournament champions with high-resolution performance thumbnails, cryptographic telemetry hashes, and permanent verified badging.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-bg-surface border border-border-color shrink-0 font-mono text-xs">
            {(['ALL', 'YEARLY', 'MONTHLY'] as const).map((win) => (
              <button
                key={win}
                onClick={() => setWindowFilter(win)}
                className={`px-3.5 py-1.5 rounded-lg font-extrabold transition-all cursor-pointer ${
                  windowFilter === win
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                {win === 'ALL' ? 'All Inductees' : win === 'YEARLY' ? 'Annual Champions' : 'Monthly Laureates'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inductees Visual Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredInductees.map((inductee) => (
          <div
            key={inductee.id}
            className="group relative rounded-2xl bg-bg-surface border border-border-color hover:border-amber-500/50 shadow-lg hover:shadow-amber-500/10 transition-all duration-300 overflow-hidden flex flex-col justify-between"
          >
            {/* Visual Performance Thumbnail & Telemetry Archive Banner */}
            <div className="relative h-44 w-full bg-slate-900 overflow-hidden border-b border-border-color">
              <img
                src={inductee.verifiedTelemetryThumbnail}
                alt={`${inductee.displayName} Performance Record`}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-80"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg-surface via-bg-surface/40 to-transparent" />

              {/* Status Header Chip */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-black/80 backdrop-blur-md text-amber-300 border border-amber-400/40 shadow-md flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>{inductee.inductionPeriod}</span>
                </span>
              </div>

              <div className="absolute top-3 right-3">
                <span className="px-2 py-1 rounded-lg text-[9px] font-mono font-bold bg-cyan-950/80 backdrop-blur-md text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  <span>AUDITED</span>
                </span>
              </div>

              {/* Net PnL Highlight Overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-200/90 drop-shadow-md">
                    Verified PnL Captured
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-black text-emerald-400 drop-shadow-md">
                    +${inductee.totalPnlCapturedUsd.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-cyan-200/90 drop-shadow-md">
                    Audited Win Rate
                  </span>
                  <div className="text-base sm:text-lg font-mono font-extrabold text-cyan-300 drop-shadow-md">
                    {inductee.winRatePct}%
                  </div>
                </div>
              </div>
            </div>

            {/* Profile & Inductee Details */}
            <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-extrabold text-text-primary tracking-tight flex items-center gap-1.5">
                      <span>{inductee.displayName}</span>
                      <span className="text-[10px] text-text-muted">(@ {inductee.username})</span>
                    </h3>
                    <p className="text-xs font-bold text-amber-400 mt-0.5">
                      {inductee.inductionTitle}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-bg-elevated border border-border-color text-text-secondary">
                    {inductee.country}
                  </span>
                </div>

                {/* Verified Badges */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {inductee.badges.map((b) => (
                    <VerifiedLeaderBadge key={b.type} badge={b} size="sm" />
                  ))}
                </div>

                {/* Inductee Quote */}
                <blockquote className="text-xs text-text-secondary italic bg-bg-main/60 p-3 rounded-xl border border-border-color/60 leading-relaxed">
                  "{inductee.inducteeQuote}"
                </blockquote>
              </div>

              {/* Cryptographic Audit Hash & Inspection Button */}
              <div className="pt-3 border-t border-border-color space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                  <span className="flex items-center gap-1">
                    <FileCheck2 className="w-3 h-3 text-cyan-400" />
                    <span>Audit Hash:</span>
                  </span>
                  <span className="truncate max-w-[150px]" title={inductee.auditVerificationHash}>
                    {inductee.auditVerificationHash.substring(0, 16)}...
                  </span>
                </div>

                <button
                  onClick={() => setSelectedInductee(inductee)}
                  className="w-full py-2 px-3 rounded-xl bg-bg-elevated hover:bg-bg-hover text-text-primary border border-border-color font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5 text-accent-primary" />
                  <span>Inspect Audit Telemetry</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inductee Detailed Audit Telemetry Modal */}
      {selectedInductee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-bg-surface border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-primary">
                    {selectedInductee.displayName}
                  </h3>
                  <p className="text-xs text-amber-400 font-bold">
                    {selectedInductee.inductionTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInductee(null)}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Performance Thumbnail Preview in Modal */}
            <div className="rounded-xl overflow-hidden border border-border-color relative h-48">
              <img
                src={selectedInductee.verifiedTelemetryThumbnail}
                alt="Telemetry Record"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                <div className="text-white font-mono text-xs">
                  <div className="font-bold">Verified Tournament Record Snapshot</div>
                  <div className="text-[10px] text-slate-300">Inducted at: {selectedInductee.inductedAt}</div>
                </div>
              </div>
            </div>

            {/* Metric Details */}
            <div className="grid grid-cols-3 gap-3 font-mono">
              <div className="p-3 rounded-xl bg-bg-main border border-border-color">
                <div className="text-[10px] text-text-secondary uppercase">Captured PnL</div>
                <div className="text-base font-black text-emerald-400 mt-0.5">
                  +${selectedInductee.totalPnlCapturedUsd.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-bg-main border border-border-color">
                <div className="text-[10px] text-text-secondary uppercase">Win Rate</div>
                <div className="text-base font-black text-cyan-400 mt-0.5">
                  {selectedInductee.winRatePct}%
                </div>
              </div>
              <div className="p-3 rounded-xl bg-bg-main border border-border-color">
                <div className="text-[10px] text-text-secondary uppercase">Profit Factor</div>
                <div className="text-base font-black text-purple-400 mt-0.5">
                  {selectedInductee.profitFactor}
                </div>
              </div>
            </div>

            {/* Verification Cryptographic Proof */}
            <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs font-mono space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>SHA-256 Telemetry Verification Fingerprint:</span>
              </div>
              <div className="text-[10px] text-slate-400 break-all select-all bg-black/40 p-2 rounded-lg border border-white/5">
                {selectedInductee.auditVerificationHash}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedInductee(null)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close Inductee Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
