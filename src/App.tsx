/**
 * AppexQuant Markets Global - Main Application Entry Point
 * Implements route protection and view management.
 */

import React from 'react';
import { GlobalStateProvider, useGlobalState } from './state/GlobalStateContext.js';
import { MarketDataProvider } from './state/MarketDataContext.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.js';
import { AppShell } from './components/layout/AppShell.js';
import { AuthGate } from './components/auth/AuthGate.js';

import { DashboardView } from './views/DashboardView.js';
import { MarketsView } from './views/MarketsView.js';
import { SignalsView } from './views/SignalsView.js';
import { StrategiesView } from './views/StrategiesView.js';
import { BacktestView } from './views/BacktestView.js';
import { TradingWorkspaceView } from './views/TradingWorkspaceView.js';
import { StrategyLabView } from './views/StrategyLabView.js';
import { EAsView } from './views/EAsView.js';
import { AnalyticsView } from './views/AnalyticsView.js';
import { CalendarView } from './views/CalendarView.js';
import { NewsView } from './views/NewsView.js';
import { CommunityView } from './views/CommunityView.js';
import { LeaderboardView } from './views/LeaderboardView.js';
import { AccountView } from './views/AccountView.js';
import { LegalView } from './views/LegalView.js';
import { AdminBoundaryView } from './views/AdminBoundaryView.js';
import { SystemHealthView } from './views/SystemHealthView.js';
import { AutomationControlCenterView } from './views/AutomationControlCenterView.js';
import { EducationView } from './views/EducationView.js';
import { P2PView } from './views/P2PView.js';
import { MarketAnalysisView } from './views/MarketAnalysisView.js';
import { Lock, ShieldAlert } from 'lucide-react';
import { Button } from './components/ui/Button.js';

function AccessDeniedView() {
  const { dispatch } = useGlobalState();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center max-w-md mx-auto space-y-4">
      <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <Lock className="w-10 h-10" />
      </div>
      <h2 className="text-lg font-bold text-text-primary">Administrative Access Required</h2>
      <p className="text-xs text-text-secondary leading-relaxed">
        This portal section is reserved for system administrators, risk managers, and operators. Switch role in Admin Portal or return to Dashboard.
      </p>
      <Button
        onClick={() => dispatch({ type: 'SET_ROUTE', payload: 'dashboard' })}
        variant="primary"
        size="sm"
      >
        Return to Dashboard
      </Button>
    </div>
  );
}

function ActiveViewRenderer() {
  const { state } = useGlobalState();
  const userRole = state.user?.role || 'USER';
  const isAdminOrOwner = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'RISK_MANAGER';

  switch (state.currentRoute) {
    case 'dashboard':
      return <DashboardView />;
    case 'markets':
      return <MarketsView />;
    case 'signals':
      return <SignalsView />;
    case 'strategies':
      return <StrategiesView />;
    case 'backtest':
      return <BacktestView />;
    case 'strategy-lab':
      return <StrategyLabView />;
    case 'trade':
      return <TradingWorkspaceView />;
    case 'eas':
      return <EAsView />;
    case 'automation':
      return isAdminOrOwner ? <AutomationControlCenterView /> : <AccessDeniedView />;
    case 'education':
      return <EducationView />;
    case 'p2p':
      return <P2PView />;
    case 'ai-analysis':
      return <MarketAnalysisView />;
    case 'analytics':
      return <AnalyticsView />;
    case 'calendar':
      return <CalendarView />;
    case 'news':
      return <NewsView />;
    case 'community':
      return <CommunityView />;
    case 'leaderboard':
      return <LeaderboardView />;
    case 'account':
      return <AccountView />;
    case 'legal':
      return <LegalView />;
    case 'admin':
      return isAdminOrOwner ? <AdminBoundaryView /> : <AccessDeniedView />;
    case 'health':
      return isAdminOrOwner ? <SystemHealthView /> : <AccessDeniedView />;
    default:
      return <DashboardView />;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <GlobalStateProvider>
        <AuthGate>
          <MarketDataProvider>
            <AppShell>
              <ActiveViewRenderer />
            </AppShell>
          </MarketDataProvider>
        </AuthGate>
      </GlobalStateProvider>
    </ErrorBoundary>
  );
}
