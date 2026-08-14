/**
 * AppexQuant Markets Global - Semantic Design Token System
 * Inspired by Samsung One UI and iOS financial application aesthetics.
 */

export const designTokens = {
  colors: {
    dark: {
      background: {
        primary: '#0B0E14',   // Deep Space
        secondary: '#181A20', // Surface Card
        tertiary: '#2B3139',  // Input/Hover
        glass: 'rgba(24, 26, 32, 0.85)',
      },
      surface: {
        primary: '#131822',
        secondary: '#181A20',
        border: '#2B3139',
        borderHover: '#38BDF8',
      },
      text: {
        primary: '#EAECEF',
        secondary: '#848E9C',
        muted: '#474F59',
        inverse: '#181A20',
      },
      accent: {
        primary: '#38BDF8',   // Ice Blue
        primaryHover: '#00E5FF',
        primaryMuted: 'rgba(56, 189, 248, 0.1)',
      },
      status: {
        success: '#22C55E',  // Profit
        successMuted: 'rgba(34, 197, 94, 0.1)',
        danger: '#EF4444',   // Risk
        dangerMuted: 'rgba(239, 68, 68, 0.1)',
        warning: '#F59E0B',  // Warning
        warningMuted: 'rgba(245, 158, 11, 0.1)',
        info: '#38BDF8',
      },
    },
    light: {
      background: {
        primary: '#FAFAFA',
        secondary: '#FFFFFF',
        tertiary: '#F5F5F5',
        glass: 'rgba(255, 255, 255, 0.9)',
      },
      surface: {
        primary: '#FFFFFF',
        secondary: '#F5F5F5',
        border: '#EAECEF',
        borderHover: '#00E5FF',
      },
      text: {
        primary: '#1E2329',
        secondary: '#707A8A',
        muted: '#AEB4BC',
        inverse: '#FFFFFF',
      },
      accent: {
        primary: '#0284C7',
        primaryHover: '#0369A1',
        primaryMuted: 'rgba(2, 132, 199, 0.1)',
      },
      status: {
        success: '#16A34A',
        successMuted: 'rgba(22, 163, 74, 0.1)',
        danger: '#DC2626',
        dangerMuted: 'rgba(220, 38, 38, 0.1)',
        warning: '#D97706',
        warningMuted: 'rgba(217, 119, 6, 0.1)',
        info: '#0284C7',
      },
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '16px',
    xl: '20px',
    pill: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 3px 6px -1px rgba(0, 0, 0, 0.12), 0 1px 3px -1px rgba(0, 0, 0, 0.08)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.22), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
    glow: '0 0 12px rgba(56, 189, 248, 0.15)',
  },
  typography: {
    fontFamily: 'Plus Jakarta Sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    monoFamily: 'JetBrains Mono, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
};
