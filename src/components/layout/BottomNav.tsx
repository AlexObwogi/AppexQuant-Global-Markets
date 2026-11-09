/**
 * Quantis FX - Mobile Bottom Navigation
 * Sleek, dark mode touch navigation bar matching Quantis FX design specifications (#0F172A, #06B6D4).
 */

import React from 'react';
import { useGlobalState, AppViewRoute } from '../../state/GlobalStateContext.tsx';
import { LayoutDashboard, Bot, GraduationCap, ShoppingBag, Menu } from 'lucide-react';

interface BottomNavProps {
  onOpenMore: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenMore }) => {
  const { state, dispatch } = useGlobalState();

  const primaryItems: { id: AppViewRoute; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'bot-builder', label: 'Bot Studio', icon: <Bot className="w-5 h-5" /> },
    { id: 'academy', label: 'Academy', icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'marketplace', label: 'Marketplace', icon: <ShoppingBag className="w-5 h-5" /> },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-2xl select-none"
      role="navigation"
      aria-label="Quantis FX Mobile Navigation"
    >
      {primaryItems.map((item) => {
        const isActive = state.currentRoute === item.id;
        return (
          <button
            key={item.id}
            onClick={() => dispatch({ type: 'SET_ROUTE', payload: item.id })}
            className={`flex flex-col items-center justify-center flex-1 max-w-[76px] min-h-[48px] py-1 rounded-xl text-[10px] font-semibold transition-all duration-150 cursor-pointer active:scale-95 touch-manipulation ${
              isActive
                ? 'text-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 shadow-xs scale-105'
                  : 'text-slate-400'
              }`}
            >
              {item.icon}
            </div>
            <span className={`text-[10px] leading-tight mt-0.5 tracking-tight ${isActive ? 'font-bold text-white' : 'font-medium'}`}>
              {item.label}
            </span>
          </button>
        );
      })}

      {/* More / Menu Drawer Trigger */}
      <button
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center flex-1 max-w-[76px] min-h-[48px] py-1 rounded-xl text-[10px] font-medium text-slate-400 hover:text-white cursor-pointer active:scale-95 touch-manipulation transition-all duration-150"
      >
        <div className="p-1.5 rounded-xl text-slate-400">
          <Menu className="w-5 h-5" />
        </div>
        <span className="text-[10px] leading-tight mt-0.5 tracking-tight font-medium">
          Menu
        </span>
      </button>
    </nav>
  );
};
