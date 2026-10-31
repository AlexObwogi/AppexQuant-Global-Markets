/**
 * AppexQuant Markets Global - Adaptive Mobile Bottom Navigation
 * High-ergonomics touch navigation bar for mobile viewports.
 */

import React from 'react';
import { useGlobalState, AppViewRoute } from '../../state/GlobalStateContext.tsx';
import { LayoutDashboard, BarChart2, Zap, ArrowRightLeft, Menu } from 'lucide-react';

interface BottomNavProps {
  onOpenMore: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenMore }) => {
  const { state, dispatch } = useGlobalState();

  const primaryItems: { id: AppViewRoute; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'markets', label: 'Markets', icon: <BarChart2 className="w-5 h-5" /> },
    { id: 'trade', label: 'Trade', icon: <ArrowRightLeft className="w-5 h-5" /> },
    { id: 'signals', label: 'Signals', icon: <Zap className="w-5 h-5" /> },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#15171e]/98 backdrop-blur-xl border-t border-[#2a2e39] px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-2xl select-none"
      role="navigation"
      aria-label="Mobile Navigation"
    >
      {primaryItems.map((item) => {
        const isActive = state.currentRoute === item.id;
        return (
          <button
            key={item.id}
            onClick={() => dispatch({ type: 'SET_ROUTE', payload: item.id })}
            className={`flex flex-col items-center justify-center flex-1 max-w-[76px] min-h-[48px] py-1 rounded-xl text-[10px] font-semibold transition-all duration-150 cursor-pointer active:scale-95 touch-manipulation ${
              isActive
                ? 'text-[#ff444f]'
                : 'text-[#9699a0] hover:text-[#ffffff]'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'bg-[#ff444f]/15 text-[#ff444f] shadow-xs scale-105'
                  : 'text-[#9699a0]'
              }`}
            >
              {item.icon}
            </div>
            <span className={`text-[10px] leading-tight mt-0.5 tracking-tight ${isActive ? 'font-bold text-[#ffffff]' : 'font-medium'}`}>
              {item.label}
            </span>
          </button>
        );
      })}

      {/* More / Menu Drawer Trigger */}
      <button
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center flex-1 max-w-[76px] min-h-[48px] py-1 rounded-xl text-[10px] font-medium text-[#9699a0] hover:text-[#ffffff] cursor-pointer active:scale-95 touch-manipulation transition-all duration-150"
      >
        <div className="p-1.5 rounded-xl text-[#9699a0]">
          <Menu className="w-5 h-5" />
        </div>
        <span className="text-[10px] leading-tight mt-0.5 tracking-tight font-medium">
          Menu
        </span>
      </button>
    </nav>
  );
};
