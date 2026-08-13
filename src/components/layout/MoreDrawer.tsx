/**
 * AppexQuant Markets Global - Mobile 'More' Drawer Menu
 * Grouped navigation with touch-optimized targets.
 */

import React from 'react';
import { useGlobalState, AppViewRoute } from '../../state/GlobalStateContext';
import { Drawer } from '../ui/Modal';
import { navItems, NavItem } from './Sidebar';

interface MoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MoreDrawer: React.FC<MoreDrawerProps> = ({ isOpen, onClose }) => {
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

  const handleSelectRoute = (route: AppViewRoute) => {
    dispatch({ type: 'SET_ROUTE', payload: route });
    onClose();
  };

  const renderSection = (title: string, items: NavItem[]) => (
    <div className="mb-4">
      <div className="text-xs font-semibold text-text-secondary mb-2 px-1">
        {title}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map((item) => {
          const isActive = state.currentRoute === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectRoute(item.id)}
              className={`p-3 rounded-xl flex items-center space-x-2.5 text-left border transition-all cursor-pointer ${
                isActive
                  ? 'bg-accent-primary/10 border-accent-primary/40 text-accent-primary font-bold shadow-xs'
                  : 'bg-bg-surface border-border-color text-text-primary hover:bg-bg-hover'
              }`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-accent-primary/20 text-accent-primary' : 'bg-bg-elevated text-text-secondary'}`}>
                {item.icon}
              </div>
              <span className="text-xs font-semibold leading-tight line-clamp-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="AppexQuant Navigation" side="bottom">
      <div className="pt-2 pb-6 max-h-[70vh] overflow-y-auto pr-1">
        {renderSection('Trading & Core Hubs', coreItems)}
        {renderSection('Intelligence & Strategy Hub', resourceItems)}
        {renderSection('Community & Account Settings', systemItems)}
        {isAdminOrOwner && adminItems.length > 0 && renderSection('Administration Controls', adminItems)}
      </div>
    </Drawer>
  );
};
