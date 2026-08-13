/**
 * AppexQuant Markets Global - Button Component
 */

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', isLoading = false, className = '', disabled, id, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-[4px] transition-all focus:outline-none disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap cursor-pointer';

    const variants = {
      primary: 'bg-[#F0B90B] hover:bg-[#C99400] text-white dark:bg-[#FCD535] dark:text-[#181A20] dark:hover:bg-[#F0B90B] shadow-xs',
      secondary: 'bg-[#F5F5F5] text-[#1E2329] hover:bg-[#EAECEF] border border-[#EAECEF] dark:bg-[#2B3139] dark:text-[#EAECEF] dark:hover:bg-[#353C46] dark:border-transparent',
      ghost: 'bg-transparent text-[#707A8A] hover:bg-[#F5F5F5] hover:text-[#1E2329] dark:text-[#848E9C] dark:hover:bg-[#2B3139] dark:hover:text-[#EAECEF]',
      danger: 'bg-[#CF304A] text-white hover:bg-[#B0233A] dark:bg-[#F6465D] dark:text-white dark:hover:bg-[#E03F54] shadow-xs',
      outline: 'bg-transparent text-[#F0B90B] border border-[#F0B90B] hover:bg-[#F0B90B]/5 dark:text-[#FCD535] dark:border-[#FCD535] dark:hover:bg-[#FCD535]/5',
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1 h-7 gap-1.5',
      md: 'text-xs px-3.5 py-1.5 h-9 gap-2',
      lg: 'text-sm px-5 py-2.5 h-11 gap-2.5',
    };

    return (
      <button
        ref={ref}
        id={id || `btn-${Math.random().toString(36).substring(2, 8)}`}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
