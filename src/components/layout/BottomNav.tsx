/**
 * AppexQuant Markets Global - Adaptive Mobile Bottom Navigation
 * Rule 20: Prioritizes primary screens (Home, Markets, Signals, Trade, More).
 */

import React from 'react';
import { useGlobalState, AppViewRoute } from '../../state/GlobalStateContext.js';
import { LayoutDashboard, BarChart2, Zap, ArrowRightLeft, MoreHorizontal } from 'lucide-react';

interface BottomNavProps {
  onOpenMore: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenMore }) => {
  const { state, dispatch } = useGlobalState();

  const primaryItems: { id: AppViewRoute; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'markets', label: 'Markets', icon: <BarChart2 className="w-5 h-5" /> },
    { id: 'signals', label: 'Signals', icon: <Zap className="w-5 h-5" /> },
    { id: 'trade', label: 'Trade', icon: <ArrowRightLeft className="w-5 h-5" /> },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-nav/95 backdrop-blur-md border-t border-border-color px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-2xl">
      {primaryItems.map((item) => {
        const isActive = state.currentRoute === item.id;
        return (
          <button
            key={item.id}
            onClick={() => dispatch({ type: 'SET_ROUTE', payload: item.id })}
            className={`flex flex-col items-center justify-center min-w-[50px] min-h-[38px] rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              isActive ? 'text-accent-primary font-extrabold' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <div className={`p-1 rounded-md transition-colors ${isActive ? 'bg-accent-primary/10' : ''}`}>
              {item.icon}
            </div>
            <span className="text-[9px] scale-95 leading-none mt-0.5">{item.label}</span>
          </button>
        );
      })}
      <button
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center min-w-[50px] min-h-[38px] rounded-lg text-[10px] font-bold text-text-secondary hover:text-text-primary cursor-pointer"
      >
        <div className="p-1">
          <MoreHorizontal className="w-5 h-5" />
        </div>
        <span className="text-[9px] scale-95 leading-none mt-0.5">More</span>
      </button>
    </nav>
  );
};
