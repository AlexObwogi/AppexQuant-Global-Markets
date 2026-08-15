# AppexQuant Backend Diagnostic Report

Scanned root: `/app/applet`
Files scanned: 244
Relative imports checked: 508

## 1. Broken / unresolvable relative imports

Found **227** broken import(s) — each of these WILL crash the corresponding serverless function at runtime with `ERR_MODULE_NOT_FOUND`:

| File | Line | Broken import path | Fix |
|---|---|---|---|
| `api/auth/deriv/callback.ts` | 8 | `../../../src/services/deriv/oauthServerService.js` | File not found |
| `api/index.ts` | 2 | `../server.js` | File not found |
| `generateAuthGate.cjs` | 11 | `../../state/GlobalStateContext` | File not found |
| `generateAuthGate.cjs` | 12 | `../../utils/apiFetch` | File not found |
| `patch_authgate.cjs` | 8 | `../../state/GlobalStateContext` | File not found |
| `patch_authgate.cjs` | 9 | `../../utils/apiFetch` | File not found |
| `replace.js` | 16 | `../components/market/MarketIntelligencePanel` | File does not exist under any extension |
| `rewrite_authgate.cjs` | 9 | `../../state/GlobalStateContext` | File not found |
| `rewrite_authgate.cjs` | 10 | `../../utils/apiFetch` | File not found |
| `server.ts` | 10 | `./src/config/appConfig.js` | File not found |
| `server.ts` | 11 | `./src/types/api.js` | File not found |
| `server.ts` | 12 | `./src/observability/audit.js` | File not found |
| `server.ts` | 13 | `./src/observability/logger.js` | File not found |
| `server.ts` | 14 | `./src/utils/auth.js` | File not found |
| `server.ts` | 15 | `./src/types/user.js` | File not found |
| `server.ts` | 16 | `./src/data/legalDocuments.js` | File not found |
| `server.ts` | 17 | `./src/types/legal.js` | File not found |
| `server.ts` | 18 | `./src/services/community/communityService.js` | File not found |
| `server.ts` | 35 | `./src/services/security.js` | File not found |
| `server.ts` | 54 | `./src/services/deriv/oauthServerService.js` | File not found |
| `server.ts` | 64 | `./src/db/initDb.js` | File not found |
| `server.ts` | 65 | `./src/db/connection.js` | File not found |
| `src/App.tsx` | 7 | `./state/GlobalStateContext.js` | File not found |
| `src/App.tsx` | 8 | `./state/MarketDataContext.js` | File not found |
| `src/App.tsx` | 9 | `./components/common/ErrorBoundary.js` | File not found |
| `src/App.tsx` | 10 | `./components/layout/AppShell.js` | File not found |
| `src/App.tsx` | 11 | `./components/auth/AuthGate.js` | File not found |
| `src/App.tsx` | 13 | `./views/DashboardView.js` | File not found |
| `src/App.tsx` | 14 | `./views/MarketsView.js` | File not found |
| `src/App.tsx` | 15 | `./views/SignalsView.js` | File not found |
| `src/App.tsx` | 16 | `./views/StrategiesView.js` | File not found |
| `src/App.tsx` | 17 | `./views/BacktestView.js` | File not found |
| `src/App.tsx` | 18 | `./views/TradingWorkspaceView.js` | File not found |
| `src/App.tsx` | 19 | `./views/StrategyLabView.js` | File not found |
| `src/App.tsx` | 20 | `./views/EAsView.js` | File not found |
| `src/App.tsx` | 21 | `./views/AnalyticsView.js` | File not found |
| `src/App.tsx` | 22 | `./views/CalendarView.js` | File not found |
| `src/App.tsx` | 23 | `./views/NewsView.js` | File not found |
| `src/App.tsx` | 24 | `./views/CommunityView.js` | File not found |
| `src/App.tsx` | 25 | `./views/LeaderboardView.js` | File not found |
| `src/App.tsx` | 26 | `./views/AccountView.js` | File not found |
| `src/App.tsx` | 27 | `./views/LegalView.js` | File not found |
| `src/App.tsx` | 28 | `./views/AdminBoundaryView.js` | File not found |
| `src/App.tsx` | 29 | `./views/SystemHealthView.js` | File not found |
| `src/App.tsx` | 30 | `./views/AutomationControlCenterView.js` | File not found |
| `src/App.tsx` | 31 | `./views/EducationView.js` | File not found |
| `src/App.tsx` | 32 | `./views/P2PView.js` | File not found |
| `src/App.tsx` | 33 | `./views/MarketAnalysisView.js` | File not found |
| `src/App.tsx` | 35 | `./components/ui/Button.js` | File not found |
| `src/auth/index.ts` | 1 | `./pkce.js` | File not found |
| `src/auth/index.ts` | 2 | `./useDerivAuth.js` | File not found |
| `src/auth/pkce.ts` | 7 | `../utils/auth/pkce.js` | File not found |
| `src/auth/useDerivAuth.ts` | 5 | `../utils/auth/useDerivAuth.js` | File not found |
| `src/components/admin/AdminPortal.tsx` | 2 | `../../state/GlobalStateContext.js` | File not found |
| `src/components/admin/AdminPortal.tsx` | 3 | `../../utils/apiFetch.js` | File not found |
| `src/components/admin/AdminPortal.tsx` | 4 | `../../views/SystemHealthView.js` | File not found |
| `src/components/admin/AdminPortal.tsx` | 5 | `../../views/admin/DerivIntegrationsView.js` | File not found |
| `src/components/admin/AdminPortal.tsx` | 23 | `../../components/ui/Button.js` | File not found |
| `src/components/admin/DerivIntegrationsView.tsx` | 8 | `../../utils/apiFetch.js` | File not found |
| `src/components/admin/DerivIntegrationsView.tsx` | 9 | `../../services/deriv/DerivIntegrationService.js` | File not found |
| `src/components/admin/DerivIntegrationsView.tsx` | 22 | `../../components/ui/Button.js` | File not found |
| `src/components/ai/AICommandCenter.tsx` | 7 | `../../state/GlobalStateContext.js` | File not found |
| `src/components/ai/AICommandCenter.tsx` | 8 | `../../state/MarketDataContext.js` | File not found |
| `src/components/ai/AICommandCenter.tsx` | 9 | `../../types/ai.js` | File not found |
| `src/components/ai/AICommandCenter.tsx` | 10 | `../../services/ai/strategyEngine.js` | File not found |
| `src/components/ai/SignalCard.tsx` | 7 | `../../types/ai.js` | File not found |
| `src/components/ai/SignalCard.tsx` | 8 | `../common/AnimatedCounter.js` | File not found |
| `src/components/analysis/AiExplanationPanel.tsx` | 3 | `../../services/ai/geminiBridge.js` | File not found |
| `src/components/analysis/AiExplanationPanel.tsx` | 4 | `../../types/market.js` | File not found |
| `src/components/analysis/AiExplanationPanel.tsx` | 5 | `../../services/deriv/derivTypes.js` | File not found |
| `src/components/analysis/ConfluenceSummary.tsx` | 3 | `../../services/ai/confluenceEngine.js` | File not found |
| `src/components/analysis/ConfluenceSummary.tsx` | 4 | `../../types/market.js` | File not found |
| `src/components/analysis/ConfluenceSummary.tsx` | 5 | `../../services/deriv/derivTypes.js` | File not found |
| `src/components/auth/AuthGate.tsx` | 12 | `../../state/GlobalStateContext.js` | File not found |
| `src/components/auth/AuthGate.tsx` | 13 | `../../utils/apiFetch.js` | File not found |
| `src/components/auth/AuthGate.tsx` | 14 | `../../utils/auth.js` | File not found |
| `src/components/auth/AuthGate.tsx` | 19 | `../../services/deriv/authService.js` | File not found |
| `src/components/auth/AuthGate.tsx` | 39 | `../common/AppexQuantLogo.js` | File not found |
| `src/components/auth/DerivConnectionModal.tsx` | 7 | `../../state/GlobalStateContext.js` | File not found |
| `src/components/auth/DerivConnectionModal.tsx` | 8 | `../../utils/apiFetch.js` | File not found |
| `src/components/auth/DerivConnectionModal.tsx` | 10 | `../ui/StatusPill.js` | File not found |
| `src/components/auth/DerivConnectionStatus.tsx` | 2 | `../../state/MarketDataContext.js` | File not found |
| `src/components/auth/DerivConnectionStatus.tsx` | 3 | `../ui/StatusPill.js` | File not found |
| `src/components/automation/ActiveStrategiesTable.tsx` | 8 | `../../types/automationControl.js` | File not found |
| `src/components/automation/AutomationEventStream.tsx` | 10 | `../../types/automationControl.js` | File not found |
| `src/components/automation/DecisionChainModal.tsx` | 23 | `../../types/automationControl.js` | File not found |
| `src/components/automation/StrategyActivationWizardModal.tsx` | 29 | `../../types/automationControl.js` | File not found |
| `src/components/automation/StrategyActivationWizardModal.tsx` | 40 | `../../services/automationControlService.js` | File not found |
| `src/components/chart/InteractiveCandleChart.tsx` | 8 | `../../services/deriv/derivTypes.js` | File not found |
| `src/components/chart/InteractiveCandleChart.tsx` | 9 | `../../state/MarketDataContext.js` | File not found |
| `src/components/common/AmbientBackground.tsx` | 8 | `../../design/motion.js` | File not found |
| `src/components/common/ComingSoonPlaceholder.tsx` | 7 | `../ui/Card.js` | File not found |
| `src/components/common/ComingSoonPlaceholder.tsx` | 8 | `../ui/Badge.js` | File not found |
| `src/components/common/EnvironmentSelector.tsx` | 7 | `../../state/GlobalStateContext.js` | File not found |
| `src/components/common/EnvironmentSelector.tsx` | 8 | `./LiveAuthorizationModal.js` | File not found |
| `src/components/common/ErrorBoundary.tsx` | 7 | `../ui/ErrorState.js` | File not found |
| `src/components/common/ErrorBoundary.tsx` | 8 | `../../types/api.js` | File not found |
| `src/components/common/ErrorBoundary.tsx` | 9 | `../../observability/logger.js` | File not found |
| `src/components/common/LiveAuthorizationModal.tsx` | 7 | `../../state/GlobalStateContext.js` | File not found |
| `src/components/common/LiveAuthorizationModal.tsx` | 8 | `../../utils/apiFetch.js` | File not found |
| `src/components/common/OfflineBanner.tsx` | 7 | `../../state/GlobalStateContext.js` | File not found |
| `src/components/common/PWAInstallPrompt.tsx` | 8 | `../ui/Card.js` | File not found |
| `src/components/common/PWAInstallPrompt.tsx` | 9 | `../ui/Button.js` | File not found |
| `src/components/common/PerformanceDisclaimer.tsx` | 7 | `../../types/legal.js` | File not found |
| `src/components/common/SystemFailSafeBanner.tsx` | 8 | `../../services/failSafeEngineService.js` | File not found |
| `src/components/common/SystemFailSafeBanner.tsx` | 9 | `../../types/failSafe.js` | File not found |
| `src/components/common/ThemeSelector.tsx` | 7 | `../../state/GlobalStateContext.js` | File not found |
| `src/components/common/ThemeSelector.tsx` | 8 | `../../design/theme.js` | File not found |
| `src/components/community/AdminCommunityConsoleModal.tsx` | 6 | `../../types/community.js` | File not found |
| `src/components/community/AdminCommunityConsoleModal.tsx` | 7 | `./VerificationBadge.js` | File not found |
| `src/components/community/CreatePostModal.tsx` | 7 | `../../types/community.js` | File not found |
| `src/components/community/EditProfileModal.tsx` | 6 | `../../types/community.js` | File not found |
| `src/components/community/PostCard.tsx` | 7 | `../../types/community.js` | File not found |
| `src/components/community/PostCard.tsx` | 8 | `./VerificationBadge.js` | File not found |
| `src/components/community/PostCard.tsx` | 9 | `../common/PerformanceDisclaimer.js` | File not found |
| `src/components/community/RequestVerificationModal.tsx` | 7 | `../../types/community.js` | File not found |
| `src/components/community/TraderProfileCard.tsx` | 6 | `../../types/community.js` | File not found |
| `src/components/community/TraderProfileCard.tsx` | 7 | `./VerificationBadge.js` | File not found |
| `src/components/community/VerificationBadge.tsx` | 7 | `../../types/community.js` | File not found |
| `src/components/eas/AutomatedPositionMonitoring.tsx` | 28 | `../../services/ea/positionEngine.js` | File not found |
| `src/components/eas/AutomatedPositionMonitoring.tsx` | 29 | `../../utils/apiFetch.js` | File not found |
| `src/components/eas/AutomationOrchestrator.tsx` | 2 | `../../utils/apiFetch.js` | File not found |
| `src/components/eas/EADetailModal.tsx` | 8 | `../../types/ea.js` | File not found |
| `src/components/eas/EAInstallWizard.tsx` | 8 | `../../types/ea.js` | File not found |
| `src/components/eas/EAPerformanceDashboard.tsx` | 7 | `../../types/ea.js` | File not found |
| `src/components/eas/EAPerformanceDashboard.tsx` | 8 | `../../services/ea/eaEngine.js` | File not found |
| `src/components/eas/EASubmitModal.tsx` | 8 | `../../types/ea.js` | File not found |
| `src/components/eas/ExecutionCommandDesk.tsx` | 24 | `../../types/execution.js` | File not found |
| `src/components/eas/ExecutionCommandDesk.tsx` | 25 | `../../utils/apiFetch.js` | File not found |
| `src/components/eas/ExecutionCommandDesk.tsx` | 26 | `../../state/GlobalStateContext.js` | File not found |
| `src/components/eas/ExecutionCommandDesk.tsx` | 27 | `../../utils/auth.js` | File not found |
| `src/components/eas/ExecutionCommandDesk.tsx` | 28 | `../../types/user.js` | File not found |
| `src/components/failsafe/FailSafeControlModal.tsx` | 9 | `../../services/failSafeEngineService.js` | File not found |
| `src/components/failsafe/FailSafeControlModal.tsx` | 10 | `../../types/failSafe.js` | File not found |
| `src/components/health/CircuitBreakerPanel.tsx` | 6 | `../../types/health.js` | File not found |
| `src/components/health/DependencyTopologyGraph.tsx` | 7 | `../../types/health.js` | File not found |
| `src/components/health/DependencyTopologyGraph.tsx` | 8 | `./ServiceStatusBadge.js` | File not found |
| `src/components/health/HealthAuditLogTable.tsx` | 6 | `../../types/health.js` | File not found |
| `src/components/health/HealthAuditLogTable.tsx` | 7 | `./ServiceStatusBadge.js` | File not found |
| `src/components/health/ServiceCard.tsx` | 7 | `../../types/health.js` | File not found |
| `src/components/health/ServiceCard.tsx` | 8 | `./ServiceStatusBadge.js` | File not found |
| `src/components/health/ServiceStatusBadge.tsx` | 6 | `../../types/health.js` | File not found |
| `src/components/layout/AppShell.tsx` | 7 | `../../state/GlobalStateContext.js` | File not found |
| `src/components/layout/AppShell.tsx` | 8 | `./Header.js` | File not found |
| `src/components/layout/AppShell.tsx` | 9 | `./Sidebar.js` | File not found |
| `src/components/layout/AppShell.tsx` | 10 | `./BottomNav.js` | File not found |
| `src/components/layout/AppShell.tsx` | 11 | `./MoreDrawer.js` | File not found |
| `src/components/layout/AppShell.tsx` | 12 | `./ProductionFooter.js` | File not found |
| `src/components/layout/AppShell.tsx` | 13 | `../common/OfflineBanner.js` | File not found |
| `src/components/layout/AppShell.tsx` | 14 | `../common/SystemFailSafeBanner.js` | File not found |
| `src/components/layout/AppShell.tsx` | 15 | `../common/PWAInstallPrompt.js` | File not found |
| `src/components/layout/AppShell.tsx` | 16 | `../common/PWAInstallBanner.js` | File not found |
| `src/components/layout/AppShell.tsx` | 17 | `../common/CinematicBackground.js` | File not found |
| `src/components/layout/AppShell.tsx` | 18 | `../common/EnvironmentSelector.js` | File not found |
| `src/components/layout/BottomNav.tsx` | 7 | `../../state/GlobalStateContext.js` | File not found |
| `src/components/layout/Header.tsx` | 7 | `../../state/GlobalStateContext.js` | File not found |
| `src/components/layout/Header.tsx` | 8 | `../../state/MarketDataContext.js` | File not found |
| `src/components/layout/Header.tsx` | 9 | `../common/EnvironmentSelector.js` | File not found |
| `src/components/layout/Header.tsx` | 10 | `../common/ThemeSelector.js` | File not found |
| `src/components/layout/Header.tsx` | 12 | `../auth/DerivConnectionStatus.js` | File not found |
| `src/components/layout/Header.tsx` | 13 | `../auth/DerivConnectionModal.js` | File not found |
| `src/components/layout/Header.tsx` | 14 | `../../utils/userStatusPresentation.js` | File not found |
| `src/components/layout/MoreDrawer.tsx` | 7 | `../../state/GlobalStateContext.js` | File not found |
| `src/components/layout/MoreDrawer.tsx` | 8 | `../ui/Modal.js` | File not found |
| `src/components/layout/MoreDrawer.tsx` | 9 | `./Sidebar.js` | File not found |
| `src/components/layout/Sidebar.tsx` | 7 | `../../state/GlobalStateContext.js` | File not found |
| `src/components/leaderboard/HallOfFameSection.tsx` | 8 | `../../types/leaderboard.js` | File not found |
| `src/components/leaderboard/HallOfFameSection.tsx` | 9 | `./VerifiedLeaderBadge.js` | File not found |
| `src/components/leaderboard/RetentionModal.tsx` | 7 | `../../types/leaderboard.js` | File not found |
| `src/components/leaderboard/RetentionModal.tsx` | 8 | `./VerifiedLeaderBadge.js` | File not found |
| `src/components/leaderboard/VerifiedLeaderBadge.tsx` | 10 | `../../types/leaderboard.js` | File not found |
| `src/components/market/MarketIntelligencePanel.tsx` | 3 | `../../types/market.js` | File not found |
| `src/components/market/MarketIntelligencePanel.tsx` | 4 | `../../services/deriv/derivTypes.js` | File not found |
| `src/components/market/MarketIntelligencePanel.tsx` | 5 | `../../state/MarketDataContext.js` | File not found |
| `src/components/market/MarketIntelligencePanel.tsx` | 6 | `../../types/ai.js` | File not found |
| `src/components/market/MarketIntelligencePanel.tsx` | 7 | `../../services/ai/strategyEngine.js` | File not found |
| `src/components/market/MarketIntelligencePanel.tsx` | 8 | `../../services/ai/signalEngine.js` | File not found |
| `src/components/market/MarketIntelligencePanel.tsx` | 9 | `../../services/ai/confluenceEngine.js` | File not found |
| `src/components/market/MarketSelectorModal.tsx` | 7 | `../../state/MarketDataContext.js` | File not found |
| `src/components/market/MarketSelectorModal.tsx` | 8 | `../../types/market.js` | File not found |
| `src/components/news/NewsSentinelFeed.tsx` | 7 | `../../services/ai/newsSentinelEngine.js` | File not found |
| `src/components/news/NewsSentinelFeed.tsx` | 8 | `../../types/ai.js` | File not found |
| `src/components/signals/SignalCard.tsx` | 7 | `../../types/aiIntelligence.js` | File not found |
| `src/components/signals/SignalDetailModal.tsx` | 7 | `../../types/aiIntelligence.js` | File not found |
| `src/components/strategies/MarketScanner.tsx` | 6 | `../strategy/StrategyScannerModal.js` | File not found |
| `src/components/strategies/MarketScanner.tsx` | 7 | `../../types/ai.js` | File not found |
| `src/components/strategies/StrategyBuilderModal.tsx` | 6 | `../strategy/StrategyBuilderModal.js` | File not found |
| `src/components/strategies/StrategyBuilderModal.tsx` | 7 | `../../types/ai.js` | File not found |
| `src/components/strategy/StrategyBuilderModal.tsx` | 10 | `../../types/ai.js` | File not found |
| `src/components/strategy/StrategyBuilderModal.tsx` | 11 | `../../services/ai/backtestEngine.js` | File not found |
| `src/components/strategy/StrategyBuilderModal.tsx` | 12 | `../../types/backtest.js` | File not found |
| `src/components/strategy/StrategyBuilderModal.tsx` | 13 | `../../services/ai/strategyEngine.js` | File not found |
| `src/components/strategy/StrategyBuilderModal.tsx` | 14 | `../../services/ai/aiStrategyBuilder.js` | File not found |
| `src/components/strategy/StrategyBuilderModal.tsx` | 15 | `../../utils/apiFetch.js` | File not found |
| `src/components/strategy/StrategyCombinerModal.tsx` | 3 | `../../types/ai.js` | File not found |
| `src/components/strategy/StrategyScannerModal.tsx` | 8 | `../../types/ai.js` | File not found |
| `src/components/strategy/StrategyScannerModal.tsx` | 9 | `../../state/MarketDataContext.js` | File not found |
| `src/components/strategy/StrategyScannerModal.tsx` | 10 | `../../services/ai/strategyEngine.js` | File not found |
| `src/components/success/SuccessStoriesSection.tsx` | 8 | `../../types/ea.js` | File not found |
| `src/components/success/SuccessStoriesSection.tsx` | 9 | `../../services/success/successStoryService.js` | File not found |
| `src/components/success/SuccessStoriesSection.tsx` | 10 | `../community/VerificationBadge.js` | File not found |
| `src/components/success/SuccessStoriesSection.tsx` | 11 | `../common/PerformanceDisclaimer.js` | File not found |
| `src/components/trading/PositionsPanel.tsx` | 2 | `../../state/GlobalStateContext.js` | File not found |
| `src/components/trading/PositionsPanel.tsx` | 3 | `../ui/Card.js` | File not found |
| `src/components/ui/EmptyState.tsx` | 10 | `./Card.js` | File not found |
| `src/components/ui/EmptyState.tsx` | 11 | `./Button.js` | File not found |
| `src/components/ui/ErrorState.tsx` | 8 | `./Card.js` | File not found |
| `src/components/ui/ErrorState.tsx` | 9 | `./Button.js` | File not found |
| `src/components/ui/MetricCard.tsx` | 7 | `./Card.js` | File not found |
| `src/components/ui/Modal.tsx` | 8 | `../../design/motion.js` | File not found |
| `src/components/ui/StatusIndicator.tsx` | 7 | `../../types/market.js` | File not found |
| `src/data/communityData.ts` | 5 | `../types/community.js` | File not found |
| `src/data/legalDocuments.ts` | 6 | `../types/legal.js` | File not found |
| `src/database/index.ts` | 5 | `./schema.js` | File not found |
| `src/database/index.ts` | 6 | `./models.js` | File not found |
| `src/database/models.ts` | 7 | `./schema.js` | File not found |
| `src/db/connection.ts` | 9 | `../observability/logger.js` | File not found |
| `src/db/initDb.ts` | 6 | `./connection.js` | File not found |
| `src/db/initDb.ts` | 7 | `./migrations.js` | File not found |
| `src/db/initDb.ts` | 8 | `./seed.js` | File not found |
| `src/db/initDb.ts` | 9 | `../observability/logger.js` | File not found |
| `src/db/migrations.ts` | 8 | `./connection.js` | File not found |
| `src/db/migrations.ts` | 9 | `../observability/logger.js` | File not found |
| `src/db/seed.ts` | 6 | `./connection.js` | File not found |
| `src/db/seed.ts` | 7 | `../observability/logger.js` | File not found |
| `src/lib/supabase.ts` | 8 | `../observability/logger.js` | File not found |
| `src/services/education/strategyLibrary.ts` | 31 | `../types/canonicalStrategy` | File not found |

## 2. Every environment variable referenced in code

Cross-check this list, name for name, against what is actually set in your Vercel project settings for the **Production** environment.

- `APP_URL`
- `DATABASE_URL`
- `DERIV_AFFILIATE_TOKEN`
- `DERIV_API_TOKEN`
- `DERIV_APP_ID`
- `DERIV_CLIENT_ID`
- `DERIV_CLIENT_SECRET`
- `DERIV_OAUTH_CLIENT_ID`
- `DERIV_OAUTH_CLIENT_SECRET`
- `DERIV_OAUTH_REDIRECT_URI`
- `DERIV_OAUTH_SCOPES`
- `DERIV_REDIRECT_URI`
- `DERIV_UTM_CAMPAIGN`
- `DERIV_UTM_MEDIUM`
- `DERIV_UTM_SOURCE`
- `DISABLE_HMR`
- `ENABLE_OAUTH_SIMULATION`
- `ENCRYPTION_KEY`
- `GEMINI_API_KEY`
- `JWT_SECRET`
- `NODE_ENV`
- `SESSION_SECRET`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `VERCEL`
- `X`
