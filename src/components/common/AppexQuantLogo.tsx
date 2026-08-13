import React from 'react';

interface LogoProps {
  variant?: 'full' | 'symbol' | 'wordmark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'light' | 'dark';
  className?: string;
}

export const AppexQuantLogo: React.FC<LogoProps> = ({ 
  variant = 'full', 
  size = 'md', 
  theme = 'dark', 
  className = '' 
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const logoClasses = `${sizeMap[size]} ${className}`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 200 200" className={logoClasses}>
        <defs>
          <linearGradient id="metalSilver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E5E7EB" />
            <stop offset="50%" stopColor="#9CA3AF" />
            <stop offset="100%" stopColor="#6B7280" />
          </linearGradient>
          <linearGradient id="goldHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <radialGradient id="blueGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="95" fill="url(#blueGlow)" />
        <circle cx="100" cy="100" r="90" fill="none" stroke="#3B82F6" strokeWidth="1" opacity="0.5" />
        <path d="M100 20 L40 170 H60 L100 80 L140 170 H160 Z" fill="url(#metalSilver)" stroke="#1F2937" strokeWidth="1" />
        <path d="M100 160 L100 40 L125 65 M100 40 L75 65" fill="none" stroke="url(#goldHighlight)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {variant !== 'symbol' && (
        <div className={`flex flex-col ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          <span className="font-black text-xl tracking-tighter">APPEXQUANT</span>
          <span className="text-[10px] tracking-[0.2em] uppercase opacity-70">MARKETS GLOBAL</span>
        </div>
      )}
    </div>
  );
};
