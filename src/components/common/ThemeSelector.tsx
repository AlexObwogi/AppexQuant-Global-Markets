/**
 * AppexQuant Markets Global - Premium System-Aware Theme Engine Selector
 * Aligned with Binance visual style and layout constraints.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useGlobalState } from '../../state/GlobalStateContext.tsx';
import { ThemeMode, getEffectiveTheme } from '../../design/theme.ts';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';

export const ThemeSelector: React.FC = () => {
  const { state, dispatch } = useGlobalState();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentMode = state.theme;
  const effectiveTheme = getEffectiveTheme(currentMode);

  // Toggle directly on main button click
  const handleMainToggle = () => {
    if (effectiveTheme === 'light') {
      dispatch({ type: 'SET_THEME', payload: 'dark' });
    } else {
      dispatch({ type: 'SET_THEME', payload: 'light' });
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div id="theme-selector-container" ref={containerRef} className="relative inline-block text-left">
      <div className="flex items-center bg-white dark:bg-[#181A20] border border-[#EAECEF] dark:border-[#2B313A] rounded-md overflow-hidden">
        {/* Main single button control */}
        <button
          id="theme-selector-toggle-btn"
          onClick={handleMainToggle}
          className="flex items-center justify-center p-2 text-[#1E2329] dark:text-[#EAECEF] hover:text-[#FCD535] dark:hover:text-[#FCD535] transition-colors cursor-pointer"
          title={`Switch to ${effectiveTheme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {effectiveTheme === 'light' ? (
            <Sun className="w-4 h-4 text-[#F0B90B]" />
          ) : (
            <Moon className="w-4 h-4 text-[#FCD535]" />
          )}
        </button>

        {/* Small chevron drop indicator */}
        <button
          id="theme-selector-dropdown-trigger"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 border-l border-[#EAECEF] dark:border-[#2B313A] hover:bg-[#F5F5F5] dark:hover:bg-[#2B313A] transition-colors flex items-center justify-center cursor-pointer text-[#707A8A] dark:text-[#848E9C]"
          title="Theme Options"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Compact hover/click popover */}
      {isOpen && (
        <div
          id="theme-selector-dropdown"
          className="absolute right-0 mt-1 w-28 bg-white dark:bg-[#1E2329] border border-[#EAECEF] dark:border-[#2B313A] rounded-md shadow-lg z-50 py-1"
        >
          {[
            { id: 'system' as ThemeMode, label: 'System', icon: <Monitor className="w-3.5 h-3.5" /> },
            { id: 'light' as ThemeMode, label: 'Light', icon: <Sun className="w-3.5 h-3.5 text-[#F0B90B]" /> },
            { id: 'dark' as ThemeMode, label: 'Dark', icon: <Moon className="w-3.5 h-3.5 text-[#FCD535]" /> },
          ].map((item) => {
            const isSelected = currentMode === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  dispatch({ type: 'SET_THEME', payload: item.id });
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#F5F5F5] dark:bg-[#2B313A] text-[#FCD535] font-semibold'
                    : 'text-[#1E2329] dark:text-[#EAECEF] hover:bg-[#F5F5F5] dark:hover:bg-[#2B313A]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
