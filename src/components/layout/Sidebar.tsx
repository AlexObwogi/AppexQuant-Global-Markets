/**
 * AppexQuant Markets Global - Desktop Navigation Sidebar Component
 * Geometric Balance Design Theme
 */

import React from 'react';
import { useGlobalState, AppViewRoute } from '../../state/GlobalStateContext.tsx';
import {
  LayoutDashboard,
  BarChart2,
  Zap,
  Code2,
  LineChart,
  ArrowRightLeft,
  Bot,
  PieChart,
  Calendar,
  Newspaper,
  Users,
  User,
  ShieldCheck,
  Lock,
  Activity,
  Cpu,
  GraduationCap,
  DollarSign,
  Brain,
  FlaskConical,
  Trophy,
} from 'lucide-react';

export interface NavItem {
  id: AppViewRoute;
  label: string;
  icon: React.ReactNode;
  group: 'core' | 'resources' | 'system';
  badge?: string;
  isFuture?: boolean;
  adminOnly?: boolean;
}

export const navItems: NavItem[] = [
  // Group 1: Trading & Core Hubs
  { id: 'dashboard', label: 'Home Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, group: 'core' },
  { id: 'markets', label: 'Markets & Watchlist', icon: <BarChart2 className="w-4 h-4" />, group: 'core' },
  { id: 'trade', label: 'Trade Workspace', icon: <ArrowRightLeft className="w-4 h-4" />, group: 'core' },
  { id: 'analytics', label: 'Portfolio & Analytics', icon: <PieChart className="w-4 h-4" />, group: 'core' },

  // Group 2: Intelligence & Strategy Hub
  { id: 'education', label: 'Education Hub (Academy)', icon: <GraduationCap className="w-4 h-4 text-color-info" />, group: 'resources', badge: 'New' },
  { id: 'ai-analysis', label: 'AI Intelligence & Strategy Lab', icon: <Brain className="w-4 h-4 text-accent-primary" />, group: 'resources', badge: 'Pro' },
  { id: 'backtest', label: 'Backtesting Engine & EA Hub', icon: <LineChart className="w-4 h-4" />, group: 'resources' },
  { id: 'signals', label: 'Signals & Alerts', icon: <Zap className="w-4 h-4 text-accent-primary" />, group: 'resources' },

  // Group 3: Community & Account Settings
  { id: 'leaderboard', label: 'Leaderboard & Hall of Fame', icon: <Trophy className="w-4 h-4 text-amber-400" />, group: 'system', badge: 'Live' },
  { id: 'p2p', label: 'P2P Marketplace', icon: <DollarSign className="w-4 h-4 text-color-success" />, group: 'system', badge: 'Escrow' },
  { id: 'community', label: 'Trader Community & Directory', icon: <Users className="w-4 h-4 text-color-info" />, group: 'system' },
  { id: 'account', label: 'Profile & OAuth Broker Connection', icon: <User className="w-4 h-4" />, group: 'system' },
  { id: 'legal', label: 'Platform Settings & Security', icon: <ShieldCheck className="w-4 h-4" />, group: 'system' },

  // Group 4: Administration Controls
  { id: 'automation', label: 'Automation Control', icon: <Cpu className="w-4 h-4 text-color-info" />, group: 'system', badge: 'Ops', adminOnly: true },
  { id: 'health', label: 'System Operations', icon: <Activity className="w-4 h-4 text-color-info" />, group: 'system', badge: 'Live', adminOnly: true },
  { id: 'admin', label: 'Admin Portal', icon: <Lock className="w-4 h-4 text-color-danger" />, group: 'system', badge: 'Secure', adminOnly: true },
];

export const Sidebar: React.FC = () => {
  const { state, dispatch } = useGlobalState();
  const userRole = state.user?.role || 'USER';
  const isAdminOrOwner = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'RISK_MANAGER';

  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly && !isAdminOrOwner) return false;
    return true;
  });

  const coreItems = filteredNavItems.filter((i) => i.group === 'core' && !i.adminOnly);
  const resourceItems = filteredNavItems.filter((i) => i.group === 'resources' && !i.adminOnly);
  const systemItems = filteredNavItems.filter((i) => i.group === 'system' && !i.adminOnly);
  const adminItems = filteredNavItems.filter((i) => i.adminOnly);

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="mb-6">
      <div className="text-xs font-semibold text-text-secondary mb-2 px-3">
        {title}
      </div>
      <div className="space-y-1">
        {items.map((item) => {
          const isActive = state.currentRoute === item.id;
          return (
            <button
              key={item.id}
              onClick={() => dispatch({ type: 'SET_ROUTE', payload: item.id })}
              className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20 font-bold shadow-xs'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={isActive ? 'text-accent-primary' : 'text-text-secondary'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.isFuture && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-bg-surface text-text-secondary uppercase font-mono border border-border-color">
                  Future
                </span>
              )}
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-primary/10 text-accent-primary font-mono border border-accent-primary/20">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border-color bg-bg-nav p-6 shrink-0 justify-between h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
      <div>
        {renderNavGroup('Trading & Core Hubs', coreItems)}
        {renderNavGroup('Intelligence & Strategy Hub', resourceItems)}
        {renderNavGroup('Community & Account Settings', systemItems)}
        {isAdminOrOwner && adminItems.length > 0 && renderNavGroup('Administration Controls', adminItems)}
      </div>

      {/* Footer Profile Baseline */}
      <div className="pt-6 border-t border-border-color mt-auto">
        <div className="flex items-center space-x-3 text-text-secondary">
          <div className="w-8 h-8 rounded-full bg-bg-surface border border-accent-primary/30 flex items-center justify-center text-[10px] text-accent-primary font-bold uppercase">
            {state.user?.displayName ? state.user.displayName.substring(0, 2).toUpperCase() : (state.user?.derivAccountId ? state.user.derivAccountId.substring(0, 2) : 'AQ')}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-text-primary truncate">
              {state.user?.fullName || state.user?.displayName || state.user?.derivAccountId || 'Trader'}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-slate-400 font-mono">
                {state.user?.derivAccountId || 'AppexQuant'}
              </span>
              {state.user?.syncStatus === 'SYNCED' && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" title="Synced" />
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

