/**
 * AppexQuant Markets Global - Authoritative Global State System
 * Single Source of Truth for Auth, Accounts, Markets, Connection, Risk, Flags, and Theme.
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { UserProfile, AuthSession } from '../types/user';
import { TradingAccount } from '../types/account';
import { ConnectionStatus, InstrumentCategory, MarketInstrument } from '../types/market';
import { BrokerConnection } from '../types/broker';
import { RiskState } from '../types/risk';
import { FeatureFlags, defaultFeatureFlags } from '../types/featureFlags';
import { ThemeMode, applyThemeToDocument } from '../design/theme';
import { logAuditEvent } from '../observability/audit';

export type AppViewRoute =
  | 'dashboard'
  | 'markets'
  | 'signals'
  | 'strategies'
  | 'backtest'
  | 'trade'
  | 'eas'
  | 'analytics'
  | 'calendar'
  | 'news'
  | 'community'
  | 'leaderboard'
  | 'account'
  | 'legal'
  | 'admin'
  | 'health'
  | 'automation'
  | 'education'
  | 'p2p'
  | 'ai-analysis'
  | 'strategy-lab';

export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
}

export type ExecutionEnvironment = 'DEMO' | 'PAPER' | 'LIVE';

export interface GlobalState {
  user: UserProfile | null;
  session: AuthSession;
  connectionStatus: ConnectionStatus;
  executionEnvironment: ExecutionEnvironment;
  selectedBroker: BrokerConnection | null;
  accounts: TradingAccount[];
  selectedAccountId: string | null;
  selectedMarket: {
    category: InstrumentCategory;
    instrument: MarketInstrument | null;
    timeframe: string;
  };
  riskState: RiskState;
  featureFlags: FeatureFlags;
  notifications: ToastNotification[];
  theme: ThemeMode;
  currentRoute: AppViewRoute;
  isBalanceHidden: boolean;
}

const initialUser: UserProfile = {
  id: 'usr-default-001',
  email: 'trader@appexquant.global',
  displayName: 'Alex Nyangaresi Obwogi',
  role: 'USER',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  preferences: {
    theme: 'dark',
    currency: 'USD',
    timezone: 'UTC',
    notificationsEnabled: true,
  },
};

const initialAccount: TradingAccount = {
  id: 'acc-demo-001',
  userId: 'usr-default-001',
  brokerId: 'deriv-01',
  accountNumber: 'CR-7849201',
  accountName: 'Demo Practice Account',
  type: 'DEMO',
  currency: 'USD',
  server: 'Deriv-Demo',
  isPrimary: true,
  isConnected: false, // Phase 1 default disconnected
  balance: {
    currency: 'USD',
    balance: 0,
    equity: 0,
    margin: 0,
    freeMargin: 0,
    marginLevel: 0,
    unrealizedPl: 0,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const initialGlobalState: GlobalState = {
  user: null,
  session: {
    sessionId: 'sess-init-101',
    userId: 'usr-default-001',
    token: null,
    expiresAt: null,
    isAuthenticated: false,
    lastActive: new Date().toISOString(),
    isElevated: false,
    elevatedUntil: null,
  },
  connectionStatus: 'OFFLINE', // Phase 1 default
  executionEnvironment: 'DEMO', // Safe default execution environment
  selectedBroker: null,
  accounts: [initialAccount],
  selectedAccountId: 'acc-demo-001',
  selectedMarket: {
    category: 'FOREX',
    instrument: null,
    timeframe: 'H1',
  },
  riskState: {
    currentDailyDrawdownPct: 0,
    isDailyDrawdownBreached: false,
    isTradingAllowed: true,
    rules: {
      maxDailyDrawdownPct: 5,
      maxPositionSizeLots: 10,
      maxOpenPositions: 5,
      requireStopLoss: true,
      blockTradingOnHighNews: true,
      maxLeverage: 100,
    },
  },
  featureFlags: defaultFeatureFlags,
  notifications: [],
  theme: (typeof window !== 'undefined' && (localStorage.getItem('appex_theme_mode_v1') as ThemeMode)) || 'system',
  currentRoute: 'dashboard',
  isBalanceHidden: typeof window !== 'undefined' ? localStorage.getItem('appex_balance_hidden_v1') === 'true' : false,
};

export type GlobalAction =
  | { type: 'SET_THEME'; payload: ThemeMode }
  | { type: 'TOGGLE_BALANCE_HIDDEN' }
  | { type: 'SET_BALANCE_HIDDEN'; payload: boolean }
  | { type: 'SET_ROUTE'; payload: AppViewRoute }
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'SET_EXECUTION_ENVIRONMENT'; payload: ExecutionEnvironment }
  | { type: 'SELECT_ACCOUNT'; payload: string }
  | { type: 'SELECT_BROKER'; payload: BrokerConnection | null }
  | { type: 'SET_FEATURE_FLAG'; payload: { flag: keyof FeatureFlags; value: boolean } }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<ToastNotification, 'id' | 'timestamp'> }
  | { type: 'DISMISS_NOTIFICATION'; payload: string }
  | { type: 'SET_USER_PROFILE'; payload: UserProfile | null }
  | { type: 'SET_SESSION_ELEVATION'; payload: { isElevated: boolean; elevatedUntil: string | null } };

function globalReducer(state: GlobalState, action: GlobalAction): GlobalState {
  switch (action.type) {
    case 'SET_USER_PROFILE':
      return {
        ...state,
        user: action.payload,
        session: {
          ...state.session,
          userId: action.payload ? action.payload.id : 'usr-default-001',
          isAuthenticated: !!action.payload,
        },
      };

    case 'SET_SESSION_ELEVATION':
      return {
        ...state,
        session: {
          ...state.session,
          isElevated: action.payload.isElevated,
          elevatedUntil: action.payload.elevatedUntil,
        },
      };

    case 'SET_THEME':
      try {
        localStorage.setItem('appex_theme_mode_v1', action.payload);
      } catch (e) {
        // ignore
      }
      return { ...state, theme: action.payload };

    case 'TOGGLE_BALANCE_HIDDEN': {
      const nextVal = !state.isBalanceHidden;
      try {
        localStorage.setItem('appex_balance_hidden_v1', String(nextVal));
      } catch (e) {
        // ignore
      }
      return { ...state, isBalanceHidden: nextVal };
    }

    case 'SET_BALANCE_HIDDEN':
      try {
        localStorage.setItem('appex_balance_hidden_v1', String(action.payload));
      } catch (e) {
        // ignore
      }
      return { ...state, isBalanceHidden: action.payload };

    case 'SET_ROUTE':
      return { ...state, currentRoute: action.payload };

    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };

    case 'SET_EXECUTION_ENVIRONMENT':
      logAuditEvent('EXECUTION_ENVIRONMENT_CHANGED', state.user?.id || 'usr-default', {
        previousEnv: state.executionEnvironment,
        newEnv: action.payload,
      });
      return { ...state, executionEnvironment: action.payload };

    case 'SELECT_ACCOUNT':
      return { ...state, selectedAccountId: action.payload };

    case 'SELECT_BROKER':
      return { ...state, selectedBroker: action.payload };

    case 'SET_FEATURE_FLAG':
      return {
        ...state,
        featureFlags: {
          ...state.featureFlags,
          [action.payload.flag]: action.payload.value,
        },
      };

    case 'ADD_NOTIFICATION': {
      const newNotif: ToastNotification = {
        ...action.payload,
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        notifications: [newNotif, ...state.notifications].slice(0, 5),
      };
    }

    case 'DISMISS_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload),
      };

    default:
      return state;
  }
}

interface GlobalContextProps {
  state: GlobalState;
  dispatch: React.Dispatch<GlobalAction>;
  selectedAccount: TradingAccount | null;
}

const GlobalStateContext = createContext<GlobalContextProps | undefined>(undefined);

export const GlobalStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(globalReducer, initialGlobalState);

  // Apply Theme on change and listen to system preference if 'system'
  useEffect(() => {
    applyThemeToDocument(state.theme);

    if (state.theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
      const handleChange = () => {
        applyThemeToDocument('system');
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [state.theme]);

  // Online / Offline window listeners for automatic Connection Status
  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'DEGRADED' });
    };
    const handleOffline = () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'OFFLINE' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (navigator.onLine) {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'DEGRADED' }); // Degraded because broker isn't connected in Phase 1
    } else {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'OFFLINE' });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const selectedAccount =
    state.accounts.find((acc) => acc.id === state.selectedAccountId) || state.accounts[0] || null;

  return (
    <GlobalStateContext.Provider value={{ state, dispatch, selectedAccount }}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = (): GlobalContextProps => {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
};
