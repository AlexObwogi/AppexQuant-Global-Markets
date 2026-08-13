/**
 * AppexQuant Markets Global - Input & Select Components
 */

import React, { InputHTMLAttributes, SelectHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substring(2, 8)}`;

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-[11px] font-bold uppercase tracking-wider text-[#707A8A] dark:text-[#848E9C]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full h-9 px-3 bg-white dark:bg-[#181A20] border border-[#EAECEF] dark:border-[#2B3139] rounded-[4px] text-xs text-[#1E2329] dark:text-[#EAECEF] placeholder-[#AEB4BC] dark:placeholder-[#474F59] focus:outline-none focus:border-[#F0B90B] dark:focus:border-[#FCD535] transition-colors ${
            error ? 'border-[#CF304A] dark:border-[#F6465D]' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="text-[10px] text-[#CF304A] dark:text-[#F6465D] mt-0.5 font-semibold">{error}</p>}
        {!error && helperText && <p className="text-[10px] text-[#707A8A] dark:text-[#848E9C] mt-0.5">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', id, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substring(2, 8)}`;

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-[11px] font-bold uppercase tracking-wider text-[#707A8A] dark:text-[#848E9C]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full h-9 px-2 bg-white dark:bg-[#181A20] border border-[#EAECEF] dark:border-[#2B3139] rounded-[4px] text-xs text-[#1E2329] dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B] dark:focus:border-[#FCD535] transition-colors ${
            error ? 'border-[#CF304A] dark:border-[#F6465D]' : ''
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white text-[#1E2329] dark:bg-[#181A20] dark:text-[#EAECEF]">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-[10px] text-[#CF304A] dark:text-[#F6465D] mt-0.5 font-semibold">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
