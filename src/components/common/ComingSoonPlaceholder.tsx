/**
 * AppexQuant Markets Global - Phase Placeholder Component
 * Enforces strict backend contracts for planned architectural features.
 */

import React, { ReactNode } from 'react';
import { Card } from '../ui/Card.tsx';
import { Badge } from '../ui/Badge.tsx';
import { ShieldAlert, Layers } from 'lucide-react';

export interface ComingSoonPlaceholderProps {
  title: string;
  description: string;
  phaseNumber?: number;
  dependency?: string;
  currentStatus?: string;
  icon?: ReactNode;
  featureList?: string[];
  id?: string;
}

export const ComingSoonPlaceholder: React.FC<ComingSoonPlaceholderProps> = ({
  title,
  description,
  phaseNumber = 2,
  dependency = 'External Broker WebSocket Handshake Gateway',
  currentStatus = 'Architecturally Defined Contract (Pending Integration Authorization)',
  icon,
  featureList = [],
  id,
}) => {
  const compId = id || `placeholder-${Math.random().toString(36).substring(2, 8)}`;

  return (
    <div id={compId} className="max-w-4xl mx-auto space-y-6">
      <Card variant="surface" className="p-6 sm:p-8 border-border-color">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-color/80">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {icon || <Layers className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-100">{title}</h2>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">AppexQuant Command Center Architecture</p>
            </div>
          </div>
          <div>
            <Badge variant="warning" size="md" className="py-1 px-3 font-mono">
              PLANNED
            </Badge>
          </div>
        </div>

        <div className="py-6 space-y-4">
          <p className="text-sm text-text-primary leading-relaxed">{description}</p>

          <div className="p-4 rounded-xl bg-bg-main border border-border-color space-y-2 font-mono text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-text-secondary font-bold uppercase">PLANNED</span>
              <span className="text-amber-400 font-semibold">Phase {phaseNumber}+ Milestone</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 border-t border-border-color/80">
              <span className="text-text-secondary font-semibold">DEPENDENCY:</span>
              <span className="text-cyan-300 font-bold">{dependency}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 border-t border-border-color/80">
              <span className="text-text-secondary font-semibold">CURRENT STATUS:</span>
              <span className="text-emerald-400 font-bold">{currentStatus}</span>
            </div>
          </div>

          {featureList.length > 0 && (
            <div className="bg-bg-surface/80 border border-border-color rounded-xl p-4 sm:p-5 mt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3 font-mono">
                Planned Future Architecture Specifications:
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-primary">
                {featureList.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-bg-surface/60 border border-border-color text-xs text-text-secondary">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-text-primary">Production Safety Guarantee:</strong> No fake implementations or simulated metrics are displayed. Business execution logic remains disabled until explicit backend authorization.
          </span>
        </div>
      </Card>
    </div>
  );
};
