/**
 * AppexQuant Markets Global - Elite Verified Badge Component
 * Implements:
 * 1. Triple-Leader Purple Badge (3x #1 leaderboard victories)
 * 2. All-Time Earner Gold Badge (Reigning top earner with social verification checkmark style)
 * 3. Institutional Cyan & Algo Master Emerald
 */

import React from 'react';
import { VerifiedBadge, VerifiedBadgeType } from '../../types/leaderboard.ts';
import { Crown, CheckCircle2, ShieldCheck, Sparkles, Check } from 'lucide-react';

interface VerifiedLeaderBadgeProps {
  badge: VerifiedBadge;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export const VerifiedLeaderBadge: React.FC<VerifiedLeaderBadgeProps> = ({
  badge,
  size = 'md',
}) => {
  const isTripleLeader = badge.type === 'TRIPLE_LEADER_PURPLE';
  const isAllTimeGold = badge.type === 'ALL_TIME_EARNER_GOLD';

  // Size mapping
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  if (isAllTimeGold) {
    return (
      <span
        title={`${badge.label}: ${badge.description}`}
        className={`inline-flex items-center font-extrabold rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-sm shadow-amber-500/20 tracking-tight transition-all duration-300 hover:scale-105 select-none ${sizeClasses}`}
      >
        <span className="relative flex items-center justify-center">
          <span className="absolute -inset-1 rounded-full bg-amber-400/30 blur-xs animate-pulse" />
          <span className="relative w-4 h-4 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-black font-black shadow-xs">
            <Check className="w-2.5 h-2.5 stroke-[3.5]" />
          </span>
        </span>
        <span className="bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent drop-shadow-xs font-black">
          {badge.label}
        </span>
      </span>
    );
  }

  if (isTripleLeader) {
    return (
      <span
        title={`${badge.label}: ${badge.description}`}
        className={`inline-flex items-center font-extrabold rounded-full bg-purple-900/40 text-purple-300 border border-purple-500/60 shadow-sm shadow-purple-500/30 tracking-tight transition-all duration-300 hover:scale-105 select-none ${sizeClasses}`}
      >
        <span className="relative flex items-center justify-center text-purple-300">
          <Crown className={`${iconSizes} text-purple-300 fill-purple-400/30`} />
        </span>
        <span className="bg-gradient-to-r from-purple-200 via-pink-200 to-purple-300 bg-clip-text text-transparent font-black">
          {badge.label}
        </span>
      </span>
    );
  }

  if (badge.type === 'INSTITUTIONAL_CYAN') {
    return (
      <span
        title={`${badge.label}: ${badge.description}`}
        className={`inline-flex items-center font-bold rounded-full bg-cyan-950/40 text-cyan-300 border border-cyan-500/40 shadow-xs tracking-tight ${sizeClasses}`}
      >
        <ShieldCheck className={`${iconSizes} text-cyan-400`} />
        <span>{badge.label}</span>
      </span>
    );
  }

  return (
    <span
      title={`${badge.label}: ${badge.description}`}
      className={`inline-flex items-center font-bold rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-500/40 shadow-xs tracking-tight ${sizeClasses}`}
    >
      <Sparkles className={`${iconSizes} text-emerald-400`} />
      <span>{badge.label}</span>
    </span>
  );
};
