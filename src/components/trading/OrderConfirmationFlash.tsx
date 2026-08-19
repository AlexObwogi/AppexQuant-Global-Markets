/**
 * AppexQuant Markets Global - Order Confirmation Flash Animation Component
 * Provides subtle, high-visibility green/red flash feedback on confirmed order executions.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight, Zap, X } from 'lucide-react';

export interface ConfirmedOrderEvent {
  id: string;
  symbol: string;
  side: 'BUY' | 'SHORT' | 'SELL';
  orderType: string;
  quantity: number;
  price: number;
  timestamp: Date | string;
  status: 'FILLED' | 'REJECTED' | 'CANCELLED';
  message?: string;
}

interface OrderConfirmationFlashProps {
  activeOrder: ConfirmedOrderEvent | null;
  onDismiss: () => void;
}

export const OrderConfirmationFlash: React.FC<OrderConfirmationFlashProps> = ({
  activeOrder,
  onDismiss,
}) => {
  if (!activeOrder) return null;

  const isBuy = activeOrder.side === 'BUY';
  const isFilled = activeOrder.status === 'FILLED';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 pointer-events-none z-50 flex items-start justify-center pt-16 px-4">
        {/* Subtle Screen Border Flash Ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className={`absolute inset-0 border-4 ${
            isFilled
              ? isBuy
                ? 'border-emerald-500/40 shadow-[inset_0_0_80px_rgba(16,185,129,0.2)]'
                : 'border-rose-500/40 shadow-[inset_0_0_80px_rgba(244,63,94,0.2)]'
              : 'border-amber-500/40 shadow-[inset_0_0_80px_rgba(245,158,11,0.2)]'
          }`}
        />

        {/* Floating Notification Card */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="pointer-events-auto bg-bg-surface/95 backdrop-blur-md border border-border-color shadow-2xl rounded-2xl p-4 max-w-md w-full flex items-center justify-between gap-3 font-sans"
        >
          <div className="flex items-center space-x-3">
            {/* Status Icon Badge */}
            <div
              className={`p-2.5 rounded-xl border ${
                isFilled
                  ? isBuy
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              {isFilled ? (
                isBuy ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono uppercase ${
                  isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {activeOrder.side} {activeOrder.orderType}
                </span>
                <span className="text-xs text-text-secondary font-mono">
                  {activeOrder.status}
                </span>
              </div>
              
              <div className="text-sm font-bold text-text-primary font-mono mt-0.5">
                {activeOrder.quantity} Lot {activeOrder.symbol} @ {activeOrder.price.toFixed(activeOrder.price > 100 ? 2 : 5)}
              </div>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-main rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
