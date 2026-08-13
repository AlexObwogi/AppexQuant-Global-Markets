/**
 * AppexQuant Markets Global - Tabs Component
 */

import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  id?: string;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, id, className = '' }) => {
  const containerId = id || `tabs-${Math.random().toString(36).substring(2, 8)}`;

  return (
    <div
      id={containerId}
      className={`flex items-center gap-0.5 p-0.5 bg-[#F5F5F5] dark:bg-[#181A20] border border-[#EAECEF] dark:border-[#2B3139] rounded-[4px] overflow-x-auto scrollbar-none ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            id={`tab-item-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-[3px] transition-all whitespace-nowrap cursor-pointer ${
              isActive
                ? 'bg-white text-[#F0B90B] dark:bg-[#2B3139] dark:text-[#FCD535] shadow-sm'
                : 'text-[#707A8A] dark:text-[#848E9C] hover:text-[#1E2329] dark:hover:text-[#EAECEF] hover:bg-white/50 dark:hover:bg-white/[0.02]'
            }`}
          >
            {tab.icon && <span className="w-3.5 h-3.5">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
