/**
 * AppexQuant Markets Global - Metric Card Component
 * Accessible financial metrics with non-color status labels (+$2,000 ↑ PROFIT / -$20 ↓ LOSS).
 */

import React, { ReactNode } from 'react';
import { Card } from './Card.tsx';
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
      text: 'text-color-success',
      badge: 'bg-color-success/10 text-color-success border-color-success/20',
      defaultTag: 'Gain',
      icon: <ArrowUpRight className="w-3 h-3 text-color-success" />,
    },
    loss: {
      text: 'text-color-danger',
      badge: 'bg-color-danger/10 text-color-danger border-color-danger/20',
      defaultTag: 'Loss',
      icon: <ArrowDownRight className="w-3 h-3 text-color-danger" />,
    },
    neutral: {
      text: 'text-text-primary',
      badge: 'bg-bg-secondary text-text-secondary border-border-color',
      defaultTag: 'Stable',
      icon: <Minus className="w-3 h-3 text-text-secondary" />,
    },
    info: {
      text: 'text-accent-primary',
      badge: 'bg-accent-primary/10 text-accent-primary border-accent-primary/20',
      defaultTag: 'Active',
      icon: null,
    },
  };

  const cfg = typeConfig[type];

  return (
    <Card id={cardId} className="p-3.5 sm:p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-text-secondary">{label}</span>
        {icon && <div className="p-1 rounded-md bg-bg-secondary text-text-secondary">{icon}</div>}
      </div>

      <div className="my-0.5">
        <div className={`text-lg sm:text-xl font-bold font-mono ${cfg.text}`}>{value}</div>
      </div>

      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border-color text-[10px]">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-semibold text-[10px] ${cfg.badge}`}>
          {cfg.icon}
          {statusLabel || cfg.defaultTag}
        </span>
        {subtext && <span className="text-text-secondary text-[10px] font-normal">{subtext}</span>}
      </div>
    </Card>
  );
};
