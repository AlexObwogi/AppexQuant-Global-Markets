/**
 * AppexQuant Markets Global - Authoritative Global State System
 * Single Source of Truth for Auth, Accounts, Markets, Connection, Risk, Flags, and Theme.
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { UserProfile, AuthSession } from '../types/user.ts';
import { TradingAccount } from '../types/account.ts';
import { ConnectionStatus, InstrumentCategory, MarketInstrument } from '../types/market.ts';
import { BrokerConnection } from '../types/broker.ts';
import { RiskState } from '../types/risk.ts';
import { FeatureFlags, defaultFeatureFlags } from '../types/featureFlags.ts';
import { ThemeMode, applyThemeToDocument } from '../design/theme.ts';
import { logAuditEvent } from '../observability/audit.ts';
import { derivAuthService } from '../services/deriv/authService.ts';

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

export const initialGlobalState: GlobalState = {
  user: null,
  session: {
    sessionId: 'sess-init-101',
    userId: '',
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
  accounts: [],
  selectedAccountId: null,
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
  | { type: 'SET_SESSION_ELEVATION'; payload: { isElevated: boolean; elevatedUntil: string | null } }
  | { type: 'UPDATE_ACCOUNT_BALANCE'; payload: { balance: number; currency?: string; loginid?: string } };

function globalReducer(state: GlobalState, action: GlobalAction): GlobalState {
  switch (action.type) {
    case 'UPDATE_ACCOUNT_BALANCE': {
      const { balance, currency, loginid } = action.payload;
      const updatedAccounts = state.accounts.map((acc) => {
        if (!loginid || acc.accountNumber === loginid || acc.id === state.selectedAccountId) {
          const cur = currency || acc.currency;
          const unrealizedPl = acc.balance.unrealizedPl || 0;
          const equity = balance + unrealizedPl;
          const margin = acc.balance.margin || 0;
          const marginLevel = margin > 0 ? (equity / margin) * 100 : 0;
          return {
            ...acc,
            balance: {
              ...acc.balance,
              balance,
              equity,
              freeMargin: Math.max(0, equity - margin),
              marginLevel,
              ...(currency ? { currency } : {}),
            },
          };
        }
        return acc;
      });
      return {
        ...state,
        accounts: updatedAccounts,
      };
    }
    case 'SET_USER_PROFILE': {
      if (!action.payload) {
        return {
          ...state,
          user: null,
          session: {
            ...state.session,
            userId: 'usr-default-001',
            isAuthenticated: false,
          },
        };
      }

      const p = action.payload;
      const accountId = p.loginid || p.id;
      const isDemo = p.accountType === 'demo' || accountId.startsWith('VR');
      const currency = p.currency || p.preferences?.currency || 'USD';
      const balanceNum = typeof p.balance === 'number' ? p.balance : 0;

      const updatedAccount: TradingAccount = {
        id: `acc-${accountId}`,
        userId: accountId,
        brokerId: 'deriv-01',
        accountNumber: accountId,
        accountName: p.displayName || `Deriv ${isDemo ? 'Demo' : 'Real'} Account`,
        type: isDemo ? 'DEMO' : 'REAL',
        currency,
        server: isDemo ? 'Deriv-Demo' : 'Deriv-Server',
        isPrimary: true,
        isConnected: true,
        balance: {
          currency,
          balance: balanceNum,
          equity: balanceNum,
          margin: 0,
          freeMargin: balanceNum,
          marginLevel: 0,
          unrealizedPl: 0,
        },
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        user: p,
        accounts: [updatedAccount],
        selectedAccountId: updatedAccount.id,
        executionEnvironment: isDemo ? 'DEMO' : 'LIVE',
        session: {
          ...state.session,
          userId: accountId,
          isAuthenticated: true,
        },
      };
    }

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

  // Listen to Deriv WebSocket real-time balance stream
  useEffect(() => {
    const unsubscribe = derivAuthService.onBalanceChange((balanceData) => {
      dispatch({ type: 'UPDATE_ACCOUNT_BALANCE', payload: balanceData });
    });
    return unsubscribe;
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
