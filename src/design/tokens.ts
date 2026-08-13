/**
 * AppexQuant Markets Global - Semantic Design Token System
 * Inspired by Samsung One UI and iOS financial application aesthetics.
 */

export const designTokens = {
  colors: {
    dark: {
      background: {
        primary: '#0B0E11',   // Binance Dark Main
        secondary: '#181A20', // Binance Card/Surface
        tertiary: '#2B3139',  // Binance Input/Hover
        glass: 'rgba(24, 26, 32, 0.85)',
      },
      surface: {
        primary: '#181A20',
        secondary: '#2B3139',
        border: '#2B3139',
        borderHover: '#FCD535',
      },
      text: {
        primary: '#EAECEF',
        secondary: '#848E9C',
        muted: '#474F59',
        inverse: '#181A20',
      },
      accent: {
        primary: '#FCD535',   // Binance Gold
        primaryHover: '#F0B90B',
        primaryMuted: 'rgba(252, 213, 53, 0.1)',
      },
      status: {
        success: '#0ECB81',  // Binance Green
        successMuted: 'rgba(14, 203, 129, 0.1)',
        danger: '#F6465D',   // Binance Red
        dangerMuted: 'rgba(246, 70, 93, 0.1)',
        warning: '#F0B90B',
        warningMuted: 'rgba(240, 185, 11, 0.1)',
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
        borderHover: '#F0B90B',
      },
      text: {
        primary: '#1E2329',
        secondary: '#707A8A',
        muted: '#AEB4BC',
        inverse: '#FFFFFF',
      },
      accent: {
        primary: '#F0B90B',   // Darker Gold for legibility on Light Mode
        primaryHover: '#C99400',
        primaryMuted: 'rgba(240, 185, 11, 0.1)',
      },
      status: {
        success: '#03A66D',
        successMuted: 'rgba(3, 166, 109, 0.1)',
        danger: '#CF304A',
        dangerMuted: 'rgba(207, 48, 74, 0.1)',
        warning: '#C99400',
        warningMuted: 'rgba(201, 148, 0, 0.1)',
        info: '#0284C7',
      },
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px',
  },
  radius: {
    sm: '2px',   // Sharp Binance feel
    md: '4px',   // Binance-style standard cards and inputs
    lg: '8px',   // Container corners max
    xl: '12px',
    pill: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 3px 6px -1px rgba(0, 0, 0, 0.12), 0 1px 3px -1px rgba(0, 0, 0, 0.08)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.22), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
    glow: '0 0 12px rgba(252, 213, 53, 0.12)',
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    monoFamily: 'JetBrains Mono, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
};
