/**
 * AppexQuant Markets Global - Metric Card Component
 * Accessible financial metrics with non-color status labels (+$2,000 ↑ PROFIT / -$20 ↓ LOSS).
 */

import React, { ReactNode } from 'react';
import { Card } from './Card.js';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: string;
  type?: 'profit' | 'loss' | 'neutral' | 'info';
  statusLabel?: string;
  subtext?: string;
  icon?: ReactNode;
  id?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  type = 'neutral',
  statusLabel,
  subtext,
  icon,
  id,
}) => {
  const cardId = id || `metric-${Math.random().toString(36).substring(2, 8)}`;

  const typeConfig = {
    profit: {
      text: 'text-[#0ECB81] dark:text-[#0ECB81]',
      badge: 'bg-[#0ECB81]/10 text-[#03A66D] dark:text-[#0ECB81] border-[#0ECB81]/20 dark:border-[#0ECB81]/25',
      defaultTag: 'Gain',
      icon: <ArrowUpRight className="w-3 h-3 text-[#03A66D] dark:text-[#0ECB81]" />,
    },
    loss: {
      text: 'text-[#CF304A] dark:text-[#F6465D]',
      badge: 'bg-[#F6465D]/10 text-[#CF304A] dark:text-[#F6465D] border-[#F6465D]/20 dark:border-[#F6465D]/25',
      defaultTag: 'Loss',
      icon: <ArrowDownRight className="w-3 h-3 text-[#CF304A] dark:text-[#F6465D]" />,
    },
    neutral: {
      text: 'text-[#1E2329] dark:text-[#EAECEF]',
      badge: 'bg-[#F5F5F5] dark:bg-[#2B3139] text-[#707A8A] dark:text-[#848E9C] border-[#EAECEF] dark:border-[#2B3139]',
      defaultTag: 'Stable',
      icon: <Minus className="w-3 h-3 text-[#707A8A] dark:text-[#848E9C]" />,
    },
    info: {
      text: 'text-[#F0B90B] dark:text-[#FCD535]',
      badge: 'bg-[#FCD535]/10 text-[#C99400] dark:text-[#FCD535] border-[#FCD535]/20 dark:border-[#FCD535]/25',
      defaultTag: 'Active',
      icon: null,
    },
  };

  const cfg = typeConfig[type];

  return (
    <Card id={cardId} className="p-3.5 sm:p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-[#707A8A] dark:text-[#848E9C]">{label}</span>
        {icon && <div className="p-1 rounded-md bg-[#F5F5F5] dark:bg-[#2B3139] text-[#707A8A] dark:text-[#848E9C]">{icon}</div>}
      </div>

      <div className="my-0.5">
        <div className={`text-lg sm:text-xl font-bold font-mono ${cfg.text}`}>{value}</div>
      </div>

      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#EAECEF] dark:border-[#2B3139] text-[10px]">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-semibold text-[10px] ${cfg.badge}`}>
          {cfg.icon}
          {statusLabel || cfg.defaultTag}
        </span>
        {subtext && <span className="text-[#707A8A] dark:text-[#848E9C] text-[10px] font-normal">{subtext}</span>}
      </div>
    </Card>
  );
};
