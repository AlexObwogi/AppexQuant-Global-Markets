/**
 * AppexQuant Markets Global - Explicit Verification Badge Component
 * Mandated Verification Levels: UNVERIFIED | IDENTITY_VERIFIED | ACCOUNT_VERIFIED | PERFORMANCE_VERIFIED
 */

import React from 'react';
import { VerificationStatus } from '../../types/community.ts';
import { ShieldCheck, UserCheck, Award, AlertCircle, Info } from 'lucide-react';

interface VerificationBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  connectedAccountNote?: string;
  className?: string;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  status,
  size = 'md',
  showDetails = false,
  connectedAccountNote,
  className = '',
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'PERFORMANCE_VERIFIED':
        return {
          label: 'PERFORMANCE VERIFIED',
          icon: <Award className="w-3.5 h-3.5 shrink-0" />,
          color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
          description: connectedAccountNote || 'Audited via direct connected live broker trading records.',
        };
      case 'ACCOUNT_VERIFIED':
        return {
          label: 'ACCOUNT VERIFIED',
          icon: <ShieldCheck className="w-3.5 h-3.5 shrink-0" />,
          color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
          dot: 'bg-cyan-400',
          description: connectedAccountNote || 'Connected live broker account confirmed. Trade logs self-reported.',
        };
      case 'IDENTITY_VERIFIED':
        return {
          label: 'IDENTITY VERIFIED',
          icon: <UserCheck className="w-3.5 h-3.5 shrink-0" />,
          color: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
          dot: 'bg-sky-400',
          description: 'Government ID confirmed. No broker account connected.',
        };
      case 'UNVERIFIED':
      default:
        return {
          label: 'UNVERIFIED / SELF-REPORTED',
          icon: <AlertCircle className="w-3.5 h-3.5 shrink-0" />,
          color: 'bg-bg-hover text-text-secondary border-border-color',
          dot: 'bg-slate-500',
          description: 'Self-reported details. No connected broker record or identity verification on file.',
        };
    }
  };

  const config = getBadgeConfig();

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px]'
      : size === 'lg'
      ? 'px-3 py-1 text-xs font-bold'
      : 'px-2.5 py-1 text-[11px] font-semibold';

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses} ${config.color} font-mono uppercase tracking-wider shadow-sm`}
        title={config.description}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        {config.icon}
        <span>{config.label}</span>
      </span>

      {showDetails && (
        <span className="text-[10px] text-text-secondary font-mono italic flex items-center gap-1">
          <Info className="w-3 h-3 text-text-secondary" />
          <span>{config.description}</span>
        </span>
      )}
    </div>
  );
};
