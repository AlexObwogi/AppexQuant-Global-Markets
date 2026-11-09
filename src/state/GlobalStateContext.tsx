/**
 * AppexQuant Markets Global - Authoritative Global State System
 * Single Source of Truth for Auth, Accounts, Markets, Connection, Risk, Flags, and Theme.
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { UserProfile, AuthSession } from '../types/user.ts';
import { TradingAccount } from '../types/account.ts';
import { ConnectionStatus, InstrumentCategory, MarketInstrument } from '../types/market.ts';
import { BrokerConnection } from '../types/broker.ts';
import { RiskState } from '../types/risk.ts';
import { FeatureFlags, defaultFeatureFlags } from '../types/featureFlags.ts';
import { ThemeMode, applyThemeToDocument } from '../design/theme.ts';
import { logAuditEvent } from '../observability/audit.ts';
import { derivAuthService, handleActiveAccountChange } from '../services/deriv/authService.ts';
import { derivWs } from '../services/deriv/DerivWebSocketManager.ts';
import { derivBrowserClient } from '../services/deriv/browserClient.ts';
import { derivTradingClient } from '../services/deriv/tradingClient.ts';
import { walletPollingService, WalletItem } from '../services/walletPollingService.ts';

/**
 * Derives whether an account is Virtual (Demo) or Real strictly from Deriv API parameters.
 * Deriv API convention: is_virtual: 1 (Demo), 0 (Real).
 */
export function isDerivAccountVirtual(item: any): boolean {
  if (!item) return false;
  if (item.is_virtual === 1 || item.is_virtual === true) return true;
  if (item.is_virtual === 0 || item.is_virtual === false) return false;
  if (item.isVirtual === true) return true;
  if (item.isVirtual === false) return false;
  if (typeof item.account_type === 'string') {
    const t = item.account_type.toLowerCase();
    if (t === 'demo' || t === 'virtual') return true;
    if (t === 'real') return false;
  }
  if (typeof item.accountType === 'string') {
    const t = item.accountType.toLowerCase();
    if (t === 'demo' || t === 'virtual') return true;
    if (t === 'real') return false;
  }
  if (typeof item.type === 'string') {
    const t = item.type.toUpperCase();
    if (t === 'DEMO') return true;
    if (t === 'REAL') return false;
  }
  return false;
}

export type AppViewRoute =
  | 'landing'
  | 'dashboard'
  | 'dashboard/error'
  | 'error'
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
  | 'strategy-lab'
  | 'audit'
  | 'risk-calculator'
  | 'creator-portal'
  | 'developer'
  | 'bot-builder'
  | 'academy'
  | 'marketplace';

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
  wallets: WalletItem[];
  totalUsdValue: number;
  lastWalletsSyncedAt: string | null;
  isWalletsLoading: boolean;
}

const getInitialRoute = (): AppViewRoute => {
  if (typeof window !== 'undefined' && window.location) {
    const rawPath = window.location.pathname.replace(/^\//, '').trim().toLowerCase();
    if (rawPath === 'landing') {
      return 'landing';
    }
    if (rawPath === 'dashboard/error' || rawPath === 'error' || rawPath.startsWith('dashboard/error')) {
      return 'dashboard/error';
    }
    const validRoutes: AppViewRoute[] = [
      'landing', 'dashboard', 'dashboard/error', 'error', 'markets', 'signals', 'strategies', 'backtest', 
      'trade', 'eas', 'analytics', 'calendar', 'news', 'community', 
      'leaderboard', 'account', 'legal', 'admin', 'health', 'automation', 
      'education', 'p2p', 'ai-analysis', 'strategy-lab', 'bot-builder', 'academy', 'marketplace', 'risk-calculator'
    ];
    if (validRoutes.includes(rawPath as AppViewRoute)) {
      return rawPath as AppViewRoute;
    }
  }
  return 'dashboard';
};

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
  theme: (typeof window !== 'undefined' && (localStorage.getItem('appex_theme_mode_v1') as ThemeMode)) || 'dark',
  currentRoute: getInitialRoute(),
  isBalanceHidden: typeof window !== 'undefined' ? localStorage.getItem('appex_balance_hidden_v1') === 'true' : false,
  wallets: [],
  totalUsdValue: 0,
  lastWalletsSyncedAt: null,
  isWalletsLoading: false,
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
  | { type: 'SET_SYNC_STATUS'; payload: 'IDLE' | 'SYNCING' | 'SYNCED' | 'SYNC_FAILED' }
  | { type: 'SET_SESSION_ELEVATION'; payload: { isElevated: boolean; elevatedUntil: string | null } }
  | { type: 'UPDATE_ACCOUNT_BALANCE'; payload: { balance: number; currency?: string; loginid?: string } }
  | { type: 'SET_WALLETS_DATA'; payload: { wallets: WalletItem[]; totalUsdValue: number; lastSyncedAt: string } }
  | { type: 'SET_WALLETS_LOADING'; payload: boolean };

function globalReducer(state: GlobalState, action: GlobalAction): GlobalState {
  switch (action.type) {
    case 'SET_WALLETS_LOADING':
      return { ...state, isWalletsLoading: action.payload };

    case 'SET_WALLETS_DATA': {
      const { wallets, totalUsdValue, lastSyncedAt } = action.payload;

      const primaryWallet =
        wallets.find((w) => w.loginid === state.selectedAccountId || w.id === state.selectedAccountId) ||
        wallets.find((w) => w.currency === 'USD') ||
        wallets.find((w) => w.balance > 0) ||
        wallets[0];

      let updatedAccounts = state.accounts.map((acc) => {
        const matchingWallet = wallets.find(
          (w) =>
            w.loginid === acc.accountNumber ||
            w.id === acc.id ||
            w.id === `acc-${acc.accountNumber}` ||
            (acc.isPrimary && w.currency === acc.currency)
        );

        if (matchingWallet) {
          const cur = matchingWallet.currency || acc.currency;
          const newBal = matchingWallet.balance;
          const unrealizedPl = acc.balance.unrealizedPl || 0;
          const equity = newBal + unrealizedPl;
          const margin = acc.balance.margin || 0;
          const marginLevel = margin > 0 ? (equity / margin) * 100 : 0;
          return {
            ...acc,
            currency: cur,
            balance: {
              ...acc.balance,
              balance: newBal,
              equity,
              freeMargin: Math.max(0, equity - margin),
              marginLevel,
              currency: cur,
            },
          };
        }
        return acc;
      });

      if (updatedAccounts.length === 0 && wallets.length > 0) {
        const now = new Date().toISOString();
        updatedAccounts = wallets.map((w, idx) => {
          const isVirtual = isDerivAccountVirtual(w);
          return {
            id: `acc-${w.loginid || w.id}`,
            userId: state.user?.id || 'usr-default',
            brokerId: 'broker-deriv',
            accountNumber: w.loginid || w.id,
            accountName: w.name || `${w.currency} Account`,
            type: isVirtual ? 'DEMO' : 'REAL',
            isVirtual,
            currency: w.currency || 'USD',
            server: isVirtual ? 'Deriv-Demo' : 'Deriv-Server',
            isPrimary: idx === 0,
            isConnected: true,
            balance: {
              balance: w.balance,
              equity: w.balance,
              freeMargin: w.balance,
              margin: 0,
              marginLevel: 0,
              unrealizedPl: 0,
              currency: w.currency || 'USD',
            },
            createdAt: now,
            updatedAt: now,
          };
        });
      }

      let updatedUser = state.user;
      if (updatedUser && primaryWallet) {
        updatedUser = {
          ...updatedUser,
          balance: primaryWallet.balance,
          currency: primaryWallet.currency,
          syncStatus: 'SYNCED',
        };
      }

      return {
        ...state,
        wallets,
        totalUsdValue,
        lastWalletsSyncedAt: lastSyncedAt,
        isWalletsLoading: false,
        accounts: updatedAccounts,
        user: updatedUser,
      };
    }

    case 'UPDATE_ACCOUNT_BALANCE': {
      const { balance, currency, loginid } = action.payload;
      let matchFound = false;
      const updatedAccounts = state.accounts.map((acc) => {
        const isMatch = loginid
          ? (acc.accountNumber === loginid || acc.id === loginid || acc.id === `acc-${loginid}`)
          : (acc.id === state.selectedAccountId || state.accounts.length === 1);

        if (isMatch) {
          matchFound = true;
          const cur = currency || acc.currency;
          const unrealizedPl = acc.balance.unrealizedPl || 0;
          const equity = balance + unrealizedPl;
          const margin = acc.balance.margin || 0;
          const marginLevel = margin > 0 ? (equity / margin) * 100 : 0;
          return {
            ...acc,
            currency: cur,
            balance: {
              ...acc.balance,
              balance,
              equity,
              freeMargin: Math.max(0, equity - margin),
              marginLevel,
              currency: cur,
            },
          };
        }
        return acc;
      });

      const updatedWallets = state.wallets.map((w) => {
        if (loginid && (w.loginid === loginid || w.id === loginid || w.id === `acc-${loginid}`)) {
          return {
            ...w,
            balance,
            usdValue: w.currency === 'USD' ? balance : w.usdValue,
            lastUpdated: new Date().toISOString(),
          };
        }
        return w;
      });

      if (!matchFound) {
        const accId = loginid ? `acc-${loginid}` : state.selectedAccountId || 'acc-primary';
        const cur = currency || 'USD';
        const now = new Date().toISOString();
        const isVirtual = isDerivAccountVirtual({ loginid, currency });
        const newAcc: TradingAccount = {
          id: accId,
          userId: state.user?.id || 'usr-default',
          brokerId: 'broker-deriv',
          accountNumber: loginid || 'Primary',
          accountName: loginid || 'Primary Account',
          type: isVirtual ? 'DEMO' : 'REAL',
          isVirtual,
          currency: cur,
          server: isVirtual ? 'Deriv-Demo' : 'Deriv-Server',
          isPrimary: true,
          isConnected: true,
          balance: {
            balance,
            equity: balance,
            freeMargin: balance,
            margin: 0,
            marginLevel: 0,
            unrealizedPl: 0,
            currency: cur,
          },
          createdAt: now,
          updatedAt: now,
        };
        return {
          ...state,
          accounts: [...state.accounts, newAcc],
          wallets: updatedWallets,
          selectedAccountId: state.selectedAccountId || accId,
        };
      }

      return {
        ...state,
        accounts: updatedAccounts,
        wallets: updatedWallets,
      };
    }
    case 'SET_USER_PROFILE': {
      if (!action.payload) {
        return {
          ...state,
          user: null,
          accounts: [],
          selectedAccountId: null,
          session: {
            ...state.session,
            userId: '',
            isAuthenticated: false,
          },
        };
      }

      const p = action.payload;
      const primaryAccountId = p.loginid || p.id;
      const isDemo = p.accountType === 'demo';
      const currency = p.currency || p.preferences?.currency || 'USD';
      const balanceNum = typeof p.balance === 'number' ? p.balance : 0;

      const rawList = (p as any).accountList || (p as any).account_list || [];
      const accountItems = Array.isArray(rawList) && rawList.length > 0
        ? rawList
        : [{ loginid: primaryAccountId, account_type: isDemo ? 'demo' : 'real', currency, is_virtual: isDemo ? 1 : 0 }];

      const updatedAccounts: TradingAccount[] = accountItems.map((item: any) => {
        const itemLoginid = item.loginid || primaryAccountId;
        const itemIsDemo = isDerivAccountVirtual(item);
        const itemCurrency = item.currency || currency;
        const isPrimary = itemLoginid === primaryAccountId;
        const itemBalance = isPrimary ? balanceNum : 0;

        return {
          id: `acc-${itemLoginid}`,
          userId: itemLoginid,
          brokerId: 'deriv-01',
          accountNumber: itemLoginid,
          accountName: `Deriv ${itemIsDemo ? 'Demo' : 'Real'} (${itemLoginid})`,
          type: itemIsDemo ? 'DEMO' : 'REAL',
          isVirtual: itemIsDemo,
          currency: itemCurrency,
          server: itemIsDemo ? 'Deriv-Demo' : 'Deriv-Server',
          isPrimary,
          isConnected: true,
          balance: {
            currency: itemCurrency,
            balance: itemBalance,
            equity: itemBalance,
            margin: 0,
            freeMargin: itemBalance,
            marginLevel: 0,
            unrealizedPl: 0,
          },
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      const matchedAcc = updatedAccounts.find((a) => a.accountNumber === primaryAccountId) || updatedAccounts[0];

      if (matchedAcc) {
        const sessionType = matchedAcc.type === 'REAL' ? 'real' : 'demo';
        const accountListTypes = updatedAccounts.map((a) => ({
          idPrefix: a.accountNumber.slice(0, 3),
          type: a.type === 'REAL' ? 'real' : 'demo',
        }));
        console.log('[ACCOUNT_MODE]', {
          sessionType,
          accountListTypes,
          uiMode: sessionType,
          otpPath: sessionType,
        });
      }

      return {
        ...state,
        user: p,
        accounts: updatedAccounts,
        selectedAccountId: matchedAcc ? matchedAcc.id : null,
        executionEnvironment: matchedAcc?.type === 'REAL' ? 'LIVE' : 'DEMO',
        session: {
          ...state.session,
          userId: matchedAcc ? matchedAcc.accountNumber : primaryAccountId,
          isAuthenticated: true,
        },
      };
    }

    case 'SET_SYNC_STATUS':
      if (!state.user) return state;
      return {
        ...state,
        user: {
          ...state.user,
          syncStatus: action.payload,
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

    case 'SET_ROUTE': {
      if (typeof window !== 'undefined' && window.history) {
        const targetPath = action.payload === 'landing' ? '/' : `/${action.payload}`;
        if (window.location.pathname !== targetPath) {
          window.history.pushState(null, '', targetPath);
        }
      }
      return { ...state, currentRoute: action.payload };
    }

    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };

    case 'SET_EXECUTION_ENVIRONMENT': {
      logAuditEvent('EXECUTION_ENVIRONMENT_CHANGED', state.user?.id || 'usr-default', {
        previousEnv: state.executionEnvironment,
        newEnv: action.payload,
      });

      const targetType = action.payload === 'LIVE' ? 'REAL' : 'DEMO';
      const matchingAccount = state.accounts.find((acc) => acc.type === targetType);

      return {
        ...state,
        executionEnvironment: action.payload,
        ...(matchingAccount ? { selectedAccountId: matchingAccount.id } : {}),
      };
    }

    case 'SELECT_ACCOUNT': {
      const selectedAcc = state.accounts.find((a) => a.id === action.payload || a.accountNumber === action.payload);
      return {
        ...state,
        selectedAccountId: selectedAcc ? selectedAcc.id : action.payload,
        ...(selectedAcc ? { executionEnvironment: selectedAcc.type === 'REAL' ? 'LIVE' : 'DEMO' } : {}),
      };
    }

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

export interface GlobalContextProps {
  state: GlobalState;
  dispatch: React.Dispatch<GlobalAction>;
  selectedAccount: TradingAccount | null;
  refreshBalances: () => Promise<void>;
  setCurrentView: (route: AppViewRoute) => void;
  activeAccount: { id: string; type: 'real' | 'demo'; currency: string; balance: number } | null;
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

  // Online / Offline window listeners and WebSocket Status Synchronization
  useEffect(() => {
    const syncConnectionState = () => {
      const browserState = derivBrowserClient.getConnectionBadgeState();
      const wsState = derivWs.getConnectionState();

      if (browserState === 'CONNECTED' || wsState === 'CONNECTED') {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'ONLINE' });
      } else if (browserState === 'CONNECTING' || browserState === 'RECONNECTING' || wsState === 'CONNECTING' || wsState === 'RECONNECTING') {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'DEGRADED' });
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'OFFLINE' });
      } else {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'DEGRADED' });
      }
    };

    const unsubBrowser = derivBrowserClient.subscribeConnectionState((bState) => {
      if (bState === 'CONNECTED') {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'ONLINE' });
      } else if (bState === 'CONNECTING' || bState === 'RECONNECTING') {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'DEGRADED' });
      } else {
        syncConnectionState();
      }
    });

    const unsubWs = derivWs.onStatusChange(() => {
      syncConnectionState();
    });

    syncConnectionState();

    const handleOnline = () => {
      syncConnectionState();
    };
    const handleOffline = () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'OFFLINE' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubBrowser();
      unsubWs();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Popstate listener to handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const rawPath = window.location.pathname.replace(/^\//, '').trim().toLowerCase();
        const route: AppViewRoute = (!rawPath || rawPath === 'landing') ? 'landing' : (rawPath as AppViewRoute);
        dispatch({ type: 'SET_ROUTE', payload: route });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen to Deriv WebSocket real-time balance stream
  useEffect(() => {
    const unsubscribe = derivAuthService.onBalanceChange((balanceData) => {
      dispatch({ type: 'UPDATE_ACCOUNT_BALANCE', payload: balanceData });
    });
    return unsubscribe;
  }, []);

  // Authoritative Single Wallet Polling Engine Lifecycle
  useEffect(() => {
    walletPollingService.startPolling();

    const unsubscribe = walletPollingService.subscribe((walletData) => {
      dispatch({
        type: 'SET_WALLETS_DATA',
        payload: {
          wallets: walletData.wallets,
          totalUsdValue: walletData.totalUsdValue,
          lastSyncedAt: walletData.lastSyncedAt,
        },
      });

      // Synchronize active trading client balance
      const primary =
        walletData.wallets.find((w) => w.loginid === state.selectedAccountId || w.currency === 'USD') ||
        walletData.wallets[0];
      if (primary && typeof primary.balance === 'number') {
        derivTradingClient.setBalance(primary.balance, primary.currency);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [state.selectedAccountId]);

  // Unified global balance refresh accessible by any component
  const refreshBalances = useCallback(async () => {
    dispatch({ type: 'SET_WALLETS_LOADING', payload: true });
    try {
      const freshData = await walletPollingService.fetchWallets();
      dispatch({
        type: 'SET_WALLETS_DATA',
        payload: {
          wallets: freshData.wallets,
          totalUsdValue: freshData.totalUsdValue,
          lastSyncedAt: freshData.lastSyncedAt,
        },
      });
      const primary =
        freshData.wallets.find((w) => w.loginid === state.selectedAccountId || w.currency === 'USD') ||
        freshData.wallets[0];
      if (primary && typeof primary.balance === 'number') {
        derivTradingClient.setBalance(primary.balance, primary.currency);
      }
    } finally {
      dispatch({ type: 'SET_WALLETS_LOADING', payload: false });
    }
  }, [state.selectedAccountId]);

  const selectedAccount =
    state.accounts.find((acc) => acc.id === state.selectedAccountId) || state.accounts[0] || null;

  // Synchronize active trading socket connection and mode strictly from selectedAccount
  useEffect(() => {
    const isReal = selectedAccount ? selectedAccount.type === 'REAL' : state.executionEnvironment === 'LIVE';
    derivTradingClient.setIsReal(isReal);
    const targetAccountId = selectedAccount?.accountNumber || selectedAccount?.id || state.user?.derivAccountId;
    if (targetAccountId) {
      derivTradingClient.connect(targetAccountId).catch(() => {});
    } else {
      derivTradingClient.ensureConnected().catch(() => {});
    }
  }, [selectedAccount, state.executionEnvironment, state.user?.derivAccountId]);

  const setCurrentView = useCallback((route: AppViewRoute) => {
    dispatch({ type: 'SET_ROUTE', payload: route });
  }, []);

  const activeAccount = useMemo(() => {
    if (!selectedAccount) return null;
    return {
      id: selectedAccount.accountNumber || selectedAccount.id,
      type: (selectedAccount.type === 'REAL' ? 'real' : 'demo') as 'real' | 'demo',
      currency: selectedAccount.currency || 'USD',
      balance: selectedAccount.balance?.balance || 0,
    };
  }, [selectedAccount]);

  return (
    <GlobalStateContext.Provider
      value={{
        state,
        dispatch,
        selectedAccount,
        refreshBalances,
        setCurrentView,
        activeAccount,
      }}
    >
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
