/**
 * AppexQuant Markets Global - Main Application Entry Point
 * Implements route protection and view management.
 */

import React from 'react';
import { GlobalStateProvider, useGlobalState } from './state/GlobalStateContext.tsx';
import { MarketDataProvider } from './state/MarketDataContext.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import { AppShell } from './components/layout/AppShell.tsx';
import { AuthGate } from './components/auth/AuthGate.tsx';

import { DashboardView } from './views/DashboardView.tsx';
import { MarketsView } from './views/MarketsView.tsx';
import { SignalsView } from './views/SignalsView.tsx';
import { StrategiesView } from './views/StrategiesView.tsx';
import { BacktestView } from './views/BacktestView.tsx';
import { TradingWorkspaceView } from './views/TradingWorkspaceView.tsx';
import { StrategyLabView } from './views/StrategyLabView.tsx';
import { EAsView } from './views/EAsView.tsx';
import { AnalyticsView } from './views/AnalyticsView.tsx';
import { CalendarView } from './views/CalendarView.tsx';
import { NewsView } from './views/NewsView.tsx';
import { CommunityView } from './views/CommunityView.tsx';
import { LeaderboardView } from './views/LeaderboardView.tsx';
import { AccountView } from './views/AccountView.tsx';
import { LegalView } from './views/LegalView.tsx';
import { AdminBoundaryView } from './views/AdminBoundaryView.tsx';
import { SystemHealthView } from './views/SystemHealthView.tsx';
import { AutomationControlCenterView } from './views/AutomationControlCenterView.tsx';
import { EducationView } from './views/EducationView.tsx';
import { P2PView } from './views/P2PView.tsx';
import { MarketAnalysisView } from './views/MarketAnalysisView.tsx';
import { DashboardErrorView } from './views/DashboardErrorView.tsx';
import { AuditTrailViewer } from './components/audit/AuditTrailViewer.tsx';
import { RiskMirroringCalculator } from './components/calculator/RiskMirroringCalculator.tsx';
import { CreatorRevenueDashboard } from './components/creator/CreatorRevenueDashboard.tsx';
import { DeveloperPortalView } from './components/developer/DeveloperPortalView.tsx';
import { BotBuilderView } from './views/BotBuilderView.tsx';
import { QuantisAcademyView } from './views/QuantisAcademyView.tsx';
import { QuantisMarketplaceView } from './views/QuantisMarketplaceView.tsx';
import { QuantisProvider } from './state/QuantisContext.tsx';
import { QuantisModalsContainer } from './components/quantis/modals/QuantisModalsContainer.tsx';
import { Lock, ShieldAlert } from 'lucide-react';
import { Button } from './components/ui/Button.tsx';

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
    case 'landing':
      return <DashboardView />;
    case 'bot-builder':
      return <BotBuilderView />;
    case 'academy':
      return <QuantisAcademyView />;
    case 'marketplace':
      return <QuantisMarketplaceView />;
    case 'dashboard/error':
    case 'error':
      return <DashboardErrorView />;
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
    case 'audit':
      return <AuditTrailViewer />;
    case 'risk-calculator':
      return <RiskMirroringCalculator />;
    case 'creator-portal':
      return <CreatorRevenueDashboard />;
    case 'developer':
      return <DeveloperPortalView />;
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

function AuthUrlErrorConsumer() {
  const { dispatch } = useGlobalState();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('auth_error');
    const msg = params.get('message');
    const action = params.get('action');

    if (action === 'cashier_completed') {
      const type = params.get('type') || 'transaction';
      setSuccessMessage(`Cashier ${type} processed successfully! Your account wallet balance has been updated.`);
      
      // Perform immediate balance sync
      fetch('/api/auth/deriv/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.data?.balance !== undefined) {
            dispatch({
              type: 'UPDATE_ACCOUNT_BALANCE',
              payload: {
                balance: data.data.balance,
                currency: data.data.currency || 'USD',
                loginid: data.data.derivAccountId,
              },
            });
          }
        })
        .catch(() => {});

      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          title: 'Cashier Transaction Completed',
          message: `Cashier ${type} finalized. Returning to live trading desk.`,
          type: 'success',
        },
      });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (authError || msg) {
      const bannerText = msg || `Authentication notice: ${authError}`;
      setErrorMessage(bannerText);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [dispatch]);

  if (!errorMessage && !successMessage) return null;

  if (successMessage) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-lg flex items-center justify-between m-4 text-xs font-medium">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{successMessage}</span>
        </div>
        <button
          onClick={() => setSuccessMessage(null)}
          className="text-text-muted hover:text-text-primary ml-4 cursor-pointer"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-lg flex items-center justify-between m-4 text-xs font-medium">
      <div className="flex items-center space-x-2">
        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
        <span>{errorMessage}</span>
      </div>
      <button
        onClick={() => setErrorMessage(null)}
        className="text-text-muted hover:text-text-primary ml-4 cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GlobalStateProvider>
        <MarketDataProvider>
          <QuantisProvider>
            <AuthGate>
              <AppShell>
                <AuthUrlErrorConsumer />
                <ActiveViewRenderer />
              </AppShell>
            </AuthGate>
            <QuantisModalsContainer />
          </QuantisProvider>
        </MarketDataProvider>
      </GlobalStateProvider>
    </ErrorBoundary>
  );
}
