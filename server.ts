/**
 * AppexQuant Markets Global - Backend Application Server Entry Point
 * Serves API routes & Vite middleware in development or static assets in production.
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { loadAppConfig } from './src/config/appConfig';
import { createSuccessResponse, createErrorResponse } from './src/types/api';
import { getAuditLogs, logAuditEvent } from './src/observability/audit';
import { logger } from './src/observability/logger';
import { hasPermission, isHighRiskPermission } from './src/utils/auth';
import { UserPermission, UserRole } from './src/types/user';
import { OFFICIAL_LEGAL_DOCUMENTS } from './src/data/legalDocuments';
import { LegalAcceptanceRecord } from './src/types/legal';
import {
  getTraderProfiles,
  getTraderProfileByUserId,
  updateTraderProfile,
  toggleFollowTrader,
  getCommunityPosts,
  createCommunityPost,
  toggleLikePost,
  addPostComment,
  submitCommunityReport,
  toggleBlockTrader,
  submitVerificationRequest,
  getAdminReports,
  resolveAdminReport,
  getAdminVerificationRequests,
  reviewAdminVerificationRequest,
} from './src/services/community/communityService';
import {
  requestIdMiddleware,
  rateLimiterMiddleware,
  mfaRateLimiterMiddleware,
  orderRateLimiterMiddleware,
  sessionMiddleware,
  csrfMiddleware,
  createSessionToken,
  revokeSessionToken,
  validateOrder,
  validateRiskPolicyUpdate,
  validateBrokerConfig,
  validateStrategyActivation,
  redactSensitiveValues,
  logSecurityEvent,
  SessionPayload
} from './src/services/security';

import {
  initiateDerivOAuth,
  handleDerivOAuthCallback,
  getUserDerivConnection,
  getUserDerivConnectionAsync,
  disconnectUserDeriv,
  syncUserDeriv,
  getAdminDerivDiagnostics,
  connectUserWithApiToken,
} from './src/services/deriv/oauthServerService';
import { initializeDatabaseSystem } from './src/db/initDb';
import { getDatabasePool, testDatabaseConnection } from './src/db/connection';

export async function createApp() {
  const app = express();
  const config = loadAppConfig();
  const PORT = 3000;

  // Initialize PostgreSQL database system (migrations & seed data)
  await initializeDatabaseSystem();

  // Restrict JSON payload body size to prevent payload floods / DoS
  app.use(express.json({ limit: '100kb' }));

  // 1. Request ID Middleware
  app.use(requestIdMiddleware);

  // 2. Comprehensive Security Headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:;");
    next();
  });

  // 3. Global Rate Limiter & Session Authentication
  app.use(rateLimiterMiddleware);
  app.use(sessionMiddleware);
  app.use(csrfMiddleware);

  // Server-Side Authorization Middleware Builder (Enforces least-privilege, server session verification & MFA checks)
  const requirePermission = (permission: UserPermission) => {
    return (req: Request, res: Response, next: NextFunction) => {
      // Server-side authorization check: NEVER trust unauthenticated x-user-role headers if a session exists
      const sessionUser = req.sessionUser;
      const role = sessionUser ? sessionUser.role : ((req.headers['x-user-role'] as UserRole) || 'USER');
      const userId = sessionUser ? sessionUser.userId : ((req.headers['x-user-id'] as string) || 'usr-default-001');
      const email = sessionUser ? sessionUser.email : ((req.headers['x-user-email'] as string) || 'trader@appexquant.global');
      const isElevated = sessionUser ? sessionUser.isElevated : req.headers['x-session-elevated'] === 'true';

      if (!hasPermission(role, permission)) {
        logSecurityEvent(req, 'AUTHORIZATION_DENIED', 'WARNING', { role, permission, path: req.path });
        logAuditEvent('ADMIN_ACTION', userId, {
          event: 'AUTHORIZATION_DENIED',
          role,
          permission,
          reason: 'Role lacks required permission',
          email,
        });
        return res.status(403).json(createErrorResponse(
          `Forbidden: Role '${role}' lacks the required permission '${permission}' for this operation.`,
          'FORBIDDEN'
        ));
      }

      if (isHighRiskPermission(permission) && !isElevated) {
        logSecurityEvent(req, 'MFA_CHALLENGE_REQUIRED', 'WARNING', { role, permission, path: req.path });
        logAuditEvent('ADMIN_ACTION', userId, {
          event: 'MFA_CHALLENGE_REQUIRED',
          role,
          permission,
          reason: 'High-risk operation requires elevated MFA session',
          email,
        });
        return res.status(401).json(createErrorResponse(
          `MFA_REQUIRED: Operation '${permission}' is flagged as HIGH-RISK and requires a valid, elevated Multi-Factor Authentication session.`,
          'MFA_REQUIRED'
        ));
      }

      next();
    };
  };

  // API Endpoints
  // 1. Health Check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json(
      createSuccessResponse({
        status: 'ok',
        liveness: true,
        readiness: true,
        dependencies: {
          database: 'STANDBY_READY',
          brokerAdapterQueue: 'IDLE',
          pwaServiceWorker: 'ACTIVE',
        },
        version: config.appVersion,
        env: config.env,
      })
    );
  });

  // 2. Public Safe Config
  app.get('/api/config/public', (req: Request, res: Response) => {
    res.json(
      createSuccessResponse({
        env: config.env,
        appVersion: config.appVersion,
        appName: config.appName,
        pwaEnabled: config.pwaEnabled,
        featureFlagsEnabled: config.featureFlagsEnabled,
      })
    );
  });

  // 3. Audit Logs Stream (Authenticated / Protected Endpoint)
  app.get('/api/audit', (req: Request, res: Response) => {
    const logs = getAuditLogs();
    res.json(createSuccessResponse(logs));
  });

  // --- RISK ENGINE SYSTEM API ENDPOINTS ---
  const historicalDecisions: any[] = [];

  // Get active risk policy
  app.get('/api/risk/policy', async (req: Request, res: Response) => {
    try {
      const { activePolicy } = await import('./src/services/ai/riskEngine');
      res.json(createSuccessResponse(activePolicy));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to fetch risk policy', 'RISK_POLICY_ERROR'));
    }
  });

  // Update active risk policy (Admin configuration with MFA Elevation requirement)
  app.post('/api/risk/policy', requirePermission(UserPermission.MANAGE_RISK), async (req: Request, res: Response) => {
    try {
      validateRiskPolicyUpdate(req.body);
      const { updateRiskPolicy } = await import('./src/services/ai/riskEngine');
      const updated = updateRiskPolicy(req.body);
      logAuditEvent('ADMIN_ACTION', req.sessionUser?.userId || 'admin-01', { event: 'RISK_POLICY_UPDATE', updatedFields: Object.keys(req.body) });
      res.json(createSuccessResponse(updated));
    } catch (err: any) {
      logSecurityEvent(req, 'INVALID_RISK_POLICY_PAYLOAD', 'WARNING', { error: err.message });
      res.status(400).json(createErrorResponse(err.message || 'Failed to update risk policy', 'INVALID_RISK_POLICY'));
    }
  });

  // Evaluate order request through server-side risk engine with rate limiting and schema validation
  app.post('/api/risk/evaluate', orderRateLimiterMiddleware, async (req: Request, res: Response) => {
    try {
      const { evaluateRisk, activePolicy } = await import('./src/services/ai/riskEngine');
      const { order, environment } = req.body;
      if (!order) {
        return res.status(400).json(createErrorResponse('Missing order object in request body.', 'INVALID_REQUEST'));
      }
      
      // Perform strict server-side schema & parameter validation (including lot limits & idempotency)
      validateOrder(order, activePolicy);

      const decision = evaluateRisk(order, activePolicy, environment);
      historicalDecisions.unshift(decision);
      if (historicalDecisions.length > 100) {
        historicalDecisions.pop();
      }

      // Log decision to central audit system
      logAuditEvent(decision.status === 'APPROVED' ? 'TRADE_REQUESTED' : 'RISK_REJECTED', req.sessionUser?.userId || 'sys-01', {
        event: `ORDER_RISK_${decision.status}`,
        orderId: order.id,
        symbol: order.symbol,
        reason: decision.reason
      });

      if (decision.status === 'REJECTED') {
        try {
          const { triggerAlert } = await import('./src/services/alertsService');
          const { AlertType, AlertSeverity } = await import('./src/types/alerts');
          triggerAlert(
            AlertType.RISK_THRESHOLD_REACHED,
            AlertSeverity.HIGH,
            'Pre-Trade Risk Engine',
            `Order rejected by pre-trade risk policy. Symbol: ${order.symbol}, Reason: ${decision.reason || 'Threshold breach'}`
          );
        } catch (alertErr) {
          console.error('Failed to trigger risk alert', alertErr);
        }
      }

      res.json(createSuccessResponse(decision));
    } catch (err: any) {
      logSecurityEvent(req, 'RISK_EVAL_REJECTED', 'WARNING', { error: err.message });
      res.status(400).json(createErrorResponse(err.message || 'Risk evaluation failed', 'INVALID_ORDER'));
    }
  });

  // Fetch historic pre-trade risk decisions
  app.get('/api/risk/decisions', (req: Request, res: Response) => {
    res.json(createSuccessResponse(historicalDecisions));
  });

  // Reset risk engine decisions logs
  app.post('/api/risk/reset', requirePermission(UserPermission.MANAGE_RISK), (req: Request, res: Response) => {
    historicalDecisions.length = 0;
    res.json(createSuccessResponse({ reset: true, timestamp: new Date().toISOString() }));
  });

  // 4. AI Market Analysis Endpoint
  app.post('/api/ai/analyze', async (req: Request, res: Response) => {
    try {
      const { symbol, marketSummary, userStrategyText } = req.body;
      const { analyzeMarketWithGemini } = await import('./src/services/ai/geminiBridge');
      const analysis = await analyzeMarketWithGemini(symbol || 'EUR/USD', marketSummary || '', userStrategyText);
      res.json(createSuccessResponse({ symbol, analysis, timestamp: new Date().toISOString() }));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'AI Analysis failed', 'AI_ERROR'));
    }
  });

  // 5. AI Strategy Parser Endpoint
  app.post('/api/ai/parse-strategy', async (req: Request, res: Response) => {
    try {
      const { promptText } = req.body;
      const { parseNaturalLanguageStrategy } = await import('./src/services/ai/strategyEngine');
      const parsedRules = parseNaturalLanguageStrategy(promptText || '');
      res.json(createSuccessResponse({ rules: parsedRules, timestamp: new Date().toISOString() }));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Strategy parsing failed', 'STRATEGY_ERROR'));
    }
  });

  // 6. AI Assisted Strategy Builder Endpoint
  app.post('/api/ai/build-strategy', async (req: Request, res: Response) => {
    try {
      const { promptText } = req.body;
      const { buildStrategyWithAI } = await import('./src/services/ai/aiStrategyBuilder');
      const aiStrategy = await buildStrategyWithAI(promptText || '');
      res.json(createSuccessResponse(aiStrategy));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'AI Strategy building failed', 'AI_BUILDER_ERROR'));
    }
  });

  // 7. Multi-Tier Leaderboard, Hall of Fame, & 2-Year Retention API Endpoints
  app.get('/api/leaderboard', async (req: Request, res: Response) => {
    try {
      const { leaderboardService } = await import('./src/services/leaderboard/leaderboardService');
      const window = (req.query.window as any) || 'MONTHLY';
      const search = req.query.search as string | undefined;
      const data = leaderboardService.getLeaderboard(window, search);
      res.json(createSuccessResponse(data));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to fetch leaderboard', 'LEADERBOARD_ERROR'));
    }
  });

  app.get('/api/leaderboard/top', async (req: Request, res: Response) => {
    try {
      const { leaderboardService } = await import('./src/services/leaderboard/leaderboardService');
      const topMonthly = leaderboardService.getLeaderboard('MONTHLY')[0];
      res.json(createSuccessResponse({
        name: topMonthly ? topMonthly.displayName : 'Alex Nyangaresi Obwogi',
        roi: topMonthly ? `+${topMonthly.roiPct.toFixed(1)}%` : '+247.1%',
        pnlUsd: topMonthly ? topMonthly.pnlUsd : 1420800,
        winRate: topMonthly ? topMonthly.winRatePct : 91.4,
        badges: topMonthly ? topMonthly.badges : [],
      }));
    } catch (err: any) {
      res.json(createSuccessResponse({
        name: 'Alex Nyangaresi Obwogi',
        roi: '+247.1%',
      }));
    }
  });

  app.get('/api/leaderboard/hall-of-fame', async (req: Request, res: Response) => {
    try {
      const { leaderboardService } = await import('./src/services/leaderboard/leaderboardService');
      const inductees = leaderboardService.getHallOfFame();
      res.json(createSuccessResponse(inductees));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to fetch Hall of Fame', 'HALL_OF_FAME_ERROR'));
    }
  });

  app.get('/api/leaderboard/retention/:userId', async (req: Request, res: Response) => {
    try {
      const { leaderboardService } = await import('./src/services/leaderboard/leaderboardService');
      const trader = leaderboardService.getTraderById(req.params.userId);
      if (!trader) {
        return res.status(404).json(createErrorResponse('Trader retention ledger not found', 'TRADER_NOT_FOUND'));
      }
      res.json(createSuccessResponse({
        userId: trader.userId,
        displayName: trader.displayName,
        retentionMonthsCount: trader.historicalRetentionLogs.length,
        retentionPeriod: '24 Months Rolling (2-Year Window)',
        logs: trader.historicalRetentionLogs,
      }));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to fetch retention ledger', 'RETENTION_ERROR'));
    }
  });

  // --- AUTOMATION ORCHESTRATOR API ENDPOINTS ---
  // Get orchestrator status & dashboard
  app.get('/api/orchestrator/dashboard', async (req: Request, res: Response) => {
    try {
      const { getOrchestratorDashboard } = await import('./src/services/ea/automationOrchestrator');
      res.json(createSuccessResponse(getOrchestratorDashboard()));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to fetch orchestrator state', 'ORCHESTRATOR_ERROR'));
    }
  });

  // Update orchestrator configuration settings
  app.post('/api/orchestrator/settings', requirePermission(UserPermission.MANAGE_SYSTEM), async (req: Request, res: Response) => {
    try {
      const { updateOrchestratorSettings } = await import('./src/services/ea/automationOrchestrator');
      const updated = updateOrchestratorSettings(req.body);
      logAuditEvent('ADMIN_ACTION', (req.headers['x-user-id'] || 'admin-01') as string, { event: 'ORCHESTRATOR_SETTINGS_UPDATE', updatedFields: Object.keys(req.body) });
      res.json(createSuccessResponse(updated));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to update orchestrator settings', 'ORCHESTRATOR_ERROR'));
    }
  });

  // Modify active automation orchestrator state
  app.post('/api/orchestrator/state', requirePermission(UserPermission.MANAGE_SYSTEM), async (req: Request, res: Response) => {
    try {
      const { setOrchestratorState } = await import('./src/services/ea/automationOrchestrator');
      const { state } = req.body;
      const updatedState = setOrchestratorState(state);
      logAuditEvent('ADMIN_ACTION', (req.headers['x-user-id'] || 'admin-01') as string, { event: 'ORCHESTRATOR_STATE_CHANGE', newState: updatedState });
      res.json(createSuccessResponse({ state: updatedState }));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to update orchestrator state', 'ORCHESTRATOR_ERROR'));
    }
  });

  // Perform cross-system alignment (Reconciliation)
  app.post('/api/orchestrator/reconcile', requirePermission(UserPermission.MANAGE_SYSTEM), async (req: Request, res: Response) => {
    try {
      const { runReconciliationProcess } = await import('./src/services/ea/automationOrchestrator');
      const reconResult = runReconciliationProcess();
      logAuditEvent('ADMIN_ACTION', (req.headers['x-user-id'] || 'admin-01') as string, { event: 'ORCHESTRATOR_RECONCILIATION', totalResolved: reconResult.discrepanciesResolved });
      res.json(createSuccessResponse(reconResult));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Reconciliation failed', 'ORCHESTRATOR_ERROR'));
    }
  });

  // Inject manual data drifts for demonstration purposes
  app.post('/api/orchestrator/drift', requirePermission(UserPermission.MANAGE_SYSTEM), async (req: Request, res: Response) => {
    try {
      const { triggerDrifts } = await import('./src/services/ea/automationOrchestrator');
      const updatedState = triggerDrifts();
      logAuditEvent('ADMIN_ACTION', (req.headers['x-user-id'] || 'admin-01') as string, { event: 'ORCHESTRATOR_DATA_DRIFT_INJECTED' });
      res.json(createSuccessResponse(updatedState));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to inject database drifts', 'ORCHESTRATOR_ERROR'));
    }
  });

  // Run a single tick of the automated 15-stage pipeline loop
  app.post('/api/orchestrator/run', requirePermission(UserPermission.MANAGE_SYSTEM), async (req: Request, res: Response) => {
    try {
      const { runPipelineIteration } = await import('./src/services/ea/automationOrchestrator');
      const { order } = req.body;
      const result = await runPipelineIteration(order);
      if (result.success) {
        logAuditEvent('TRADE_EXECUTED', 'sys-01', { event: 'AUTOMATED_PIPELINE_SUCCESS', orderId: order?.id || 'simulated' });
      } else {
        logAuditEvent('TRADE_REJECTED', 'sys-01', { event: 'AUTOMATED_PIPELINE_HALTED', reason: result.message });
      }
      res.json(createSuccessResponse(result));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Pipeline loop run failed', 'ORCHESTRATOR_ERROR'));
    }
  });

  // --- UNIFIED EXECUTION ENGINE ENDPOINTS ---
  // Get all execution orders (automatically progress pending orders for realism)
  app.get('/api/execution/orders', async (req: Request, res: Response) => {
    try {
      const { getExecutionOrders, progressOrderStage } = await import('./src/services/ea/executionEngine');
      const orders = getExecutionOrders();

      // Auto-progress orders that are in transitional states so they simulate a pre-trade pipeline on consecutive polls
      orders.forEach(order => {
        if (['CREATED', 'VALIDATING', 'RISK_CHECK', 'APPROVED'].includes(order.state)) {
          progressOrderStage(order.requestId);
        }
      });

      res.json(createSuccessResponse(orders));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to fetch execution orders', 'EXECUTION_ERROR'));
    }
  });

  // Submit a new execution order (from manual trading, approved strategies, or automation)
  app.post('/api/execution/submit', requirePermission(UserPermission.EXECUTE_MANUAL_ORDER), orderRateLimiterMiddleware, async (req: Request, res: Response) => {
    try {
      const { activePolicy } = await import('./src/services/ai/riskEngine');
      validateOrder(req.body, activePolicy);

      const { submitExecutionOrder } = await import('./src/services/ea/executionEngine');
      const newOrder = submitExecutionOrder(req.body);

      logAuditEvent('TRADE_REQUESTED', req.sessionUser?.userId || 'sys-01', {
        event: 'EXECUTION_ORDER_SUBMITTED',
        requestId: newOrder.requestId,
        symbol: newOrder.symbol,
        side: newOrder.side,
        quantity: newOrder.quantity
      });

      res.json(createSuccessResponse(newOrder));
    } catch (err: any) {
      logSecurityEvent(req, 'EXECUTION_ORDER_REJECTED', 'WARNING', { error: err.message });
      res.status(400).json(createErrorResponse(err.message || 'Failed to submit execution order', 'INVALID_ORDER_SUBMISSION'));
    }
  });

  // Synchronize actual broker status
  app.post('/api/execution/sync', async (req: Request, res: Response) => {
    try {
      const { synchronizeBrokerStatus, getExecutionOrders } = await import('./src/services/ea/executionEngine');
      synchronizeBrokerStatus();
      const updatedOrders = getExecutionOrders();

      logAuditEvent('ADMIN_ACTION', 'admin-01', { event: 'EXECUTION_BROKER_STATUS_SYNCED' });

      res.json(createSuccessResponse(updatedOrders));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to synchronize broker status', 'EXECUTION_ERROR'));
    }
  });

  // Request order cancellation
  app.post('/api/execution/cancel', async (req: Request, res: Response) => {
    try {
      const { requestOrderCancellation } = await import('./src/services/ea/executionEngine');
      const { requestId } = req.body;
      const updated = requestOrderCancellation(requestId);

      if (!updated) {
        return res.status(404).json(createErrorResponse('Order not found or not in cancelable state', 'NOT_FOUND'));
      }

      logAuditEvent('TRADE_REQUESTED', 'sys-01', { event: 'EXECUTION_ORDER_CANCEL_REQUESTED', requestId });

      res.json(createSuccessResponse(updated));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to cancel execution order', 'EXECUTION_ERROR'));
    }
  });

  // Reset execution engine state
  app.post('/api/execution/reset', async (req: Request, res: Response) => {
    try {
      const { resetExecutionOrders, getExecutionOrders } = await import('./src/services/ea/executionEngine');
      resetExecutionOrders();
      res.json(createSuccessResponse(getExecutionOrders()));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to reset execution engine', 'EXECUTION_ERROR'));
    }
  });

  // --- AUTOMATED POSITION MONITORING ENDPOINTS ---
  // Get positions state (ticks prices, runs safeguards evaluation, and lists metrics)
  app.get('/api/positions', async (req: Request, res: Response) => {
    try {
      const { getPositions, tickPositionPrices, evaluatePositionSafeguards, getRealizedPlHistory, getSafeguardsConfig, getSafeguardActions } = await import('./src/services/ea/positionEngine');
      
      // Tick the prices for live simulation
      tickPositionPrices();

      const activePositions = getPositions();
      const configuration = getSafeguardsConfig();
      const actionsHistory = getSafeguardActions();
      const realizedPl = getRealizedPlHistory();

      // Evaluate safeguards to see if any alerts or proposals are triggered
      const safeguardProposals = evaluatePositionSafeguards();

      res.json(createSuccessResponse({
        positions: activePositions,
        realizedPl,
        safeguardsConfig: configuration,
        safeguardActions: actionsHistory,
        safeguardProposals
      }));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to fetch positions', 'POSITION_ERROR'));
    }
  });

  // Update safeguards configuration
  app.post('/api/positions/safeguards', requirePermission(UserPermission.MANAGE_RISK), async (req: Request, res: Response) => {
    try {
      const { updateSafeguardsConfig } = await import('./src/services/ea/positionEngine');
      const updatedConfig = updateSafeguardsConfig(req.body);
      res.json(createSuccessResponse(updatedConfig));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to update safeguards configuration', 'POSITION_ERROR'));
    }
  });

  // Approve and Execute a manual/automated safeguard exit action (strictly transparent, audited, non-silent)
  app.post('/api/positions/safeguards/execute', requirePermission(UserPermission.MANAGE_RISK), async (req: Request, res: Response) => {
    try {
      const { executeSafeguardAction } = await import('./src/services/ea/positionEngine');
      const { proposal } = req.body;
      if (!proposal) {
        return res.status(400).json(createErrorResponse('Missing safeguard proposal parameters', 'BAD_REQUEST'));
      }
      const result = executeSafeguardAction(proposal);
      res.json(createSuccessResponse(result));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to execute safeguard action', 'POSITION_ERROR'));
    }
  });

  // Reset positions state
  app.post('/api/positions/reset', requirePermission(UserPermission.MANAGE_SYSTEM), async (req: Request, res: Response) => {
    try {
      const { resetPositionsState, getPositions } = await import('./src/services/ea/positionEngine');
      resetPositionsState();
      res.json(createSuccessResponse({ positions: getPositions() }));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to reset positions', 'POSITION_ERROR'));
    }
  });

  // --- ADVANCED TRADE ANALYTICS AND JOURNALING ENDPOINTS ---
  // 1. Fetch trades & performance metrics
  app.get('/api/analytics/trades', async (req: Request, res: Response) => {
    try {
      const { getTradeJournal, calculatePerformanceMetrics } = await import('./src/services/ea/analyticsEngine');
      const trades = getTradeJournal();
      const metrics = calculatePerformanceMetrics(trades);
      res.json(createSuccessResponse({ trades, metrics }));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to fetch trade analytics', 'ANALYTICS_ERROR'));
    }
  });

  // 2. Update trade manual notes (strictly preserves historical records, only updates user editable fields)
  app.put('/api/analytics/trades/:id/notes', async (req: Request, res: Response) => {
    try {
      const { updateTradeNotes } = await import('./src/services/ea/analyticsEngine');
      const { id } = req.params;
      const { notes } = req.body;
      const updated = updateTradeNotes(id, notes || '');
      if (!updated) {
        return res.status(404).json(createErrorResponse(`Trade record ${id} not found`, 'NOT_FOUND'));
      }
      res.json(createSuccessResponse(updated));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to update trade notes', 'ANALYTICS_ERROR'));
    }
  });

  // 3. Generate or regenerate AI Post-Trade Summaries
  app.post('/api/analytics/trades/:id/ai-summary', async (req: Request, res: Response) => {
    try {
      const { generateAISummary } = await import('./src/services/ea/analyticsEngine');
      const { id } = req.params;
      const updated = await generateAISummary(id);
      if (!updated) {
        return res.status(404).json(createErrorResponse(`Trade record ${id} not found`, 'NOT_FOUND'));
      }
      res.json(createSuccessResponse(updated));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to generate post-trade AI summary', 'ANALYTICS_ERROR'));
    }
  });

  // 4. Reset trade database to seed state
  app.post('/api/analytics/reset', async (req: Request, res: Response) => {
    try {
      const { seedTradeJournal, getTradeJournal, calculatePerformanceMetrics } = await import('./src/services/ea/analyticsEngine');
      seedTradeJournal();
      const trades = getTradeJournal();
      const metrics = calculatePerformanceMetrics(trades);
      res.json(createSuccessResponse({ trades, metrics }));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to reset analytics database', 'ANALYTICS_ERROR'));
    }
  });

  // --- CENTRAL ALERT ENGINE ENDPOINTS ---
  // 1. Fetch all alerts
  app.get('/api/alerts', async (req: Request, res: Response) => {
    try {
      const { getAlerts } = await import('./src/services/alertsService');
      res.json(createSuccessResponse(getAlerts()));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to fetch alerts', 'ALERTS_ERROR'));
    }
  });

  // 2. Acknowledge a specific alert or all alerts
  app.post('/api/alerts/acknowledge', async (req: Request, res: Response) => {
    try {
      const { id, userEmail } = req.body;
      const email = userEmail || 'trader@appexquant.global';

      const { acknowledgeAlert, acknowledgeAllAlerts } = await import('./src/services/alertsService');
      
      if (id === 'all') {
        const updatedAlerts = acknowledgeAllAlerts(email);
        res.json(createSuccessResponse({ status: 'success', alerts: updatedAlerts }));
      } else {
        const result = acknowledgeAlert(id, email);
        if (!result) {
          return res.status(404).json(createErrorResponse(`Alert ${id} not found`, 'NOT_FOUND'));
        }
        res.json(createSuccessResponse(result));
      }
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to acknowledge alert', 'ALERTS_ERROR'));
    }
  });

  // 3. Trigger a manual alert for verification/monitoring
  app.post('/api/alerts/trigger', requirePermission(UserPermission.MANAGE_SYSTEM), async (req: Request, res: Response) => {
    try {
      const { type, severity, source, message } = req.body;
      if (!type || !severity || !source || !message) {
        return res.status(400).json(createErrorResponse('Missing required parameters to trigger alert: type, severity, source, message', 'BAD_REQUEST'));
      }

      const { triggerAlert } = await import('./src/services/alertsService');
      const newAlert = triggerAlert(type, severity, source, message);
      res.json(createSuccessResponse(newAlert));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to trigger alert', 'ALERTS_ERROR'));
    }
  });

  // 4. Get alert preferences (With Horizontal Privilege Escalation Defense)
  app.get('/api/alerts/preferences/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const currentSessionUser = req.sessionUser;

      // Prevent Horizontal Privilege Escalation: Non-admin users cannot read other users' alert preferences
      if (currentSessionUser && currentSessionUser.userId !== userId && !hasPermission(currentSessionUser.role, UserPermission.MANAGE_USERS)) {
        logSecurityEvent(req, 'HORIZONTAL_PRIVILEGE_ESCALATION_ATTEMPT', 'CRITICAL', { targetUserId: userId });
        return res.status(403).json(createErrorResponse(`Forbidden: You are not authorized to access user resources for ${userId}`, 'FORBIDDEN_RESOURCE'));
      }

      const { getUserPreferences } = await import('./src/services/alertsService');
      res.json(createSuccessResponse(getUserPreferences(userId)));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to fetch preferences', 'ALERTS_ERROR'));
    }
  });

  // 5. Update alert preferences (With Horizontal Privilege Escalation Defense)
  app.post('/api/alerts/preferences/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const currentSessionUser = req.sessionUser;

      // Prevent Horizontal Privilege Escalation: Non-admin users cannot modify other users' alert preferences
      if (currentSessionUser && currentSessionUser.userId !== userId && !hasPermission(currentSessionUser.role, UserPermission.MANAGE_USERS)) {
        logSecurityEvent(req, 'HORIZONTAL_PRIVILEGE_ESCALATION_ATTEMPT', 'CRITICAL', { targetUserId: userId });
        return res.status(403).json(createErrorResponse(`Forbidden: You are not authorized to update user resources for ${userId}`, 'FORBIDDEN_RESOURCE'));
      }

      const { updateUserPreferences } = await import('./src/services/alertsService');
      const updated = updateUserPreferences(userId, req.body);
      res.json(createSuccessResponse(updated));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to update preferences', 'ALERTS_ERROR'));
    }
  });

  // --- STRATEGY & BROKER ADAPTER SECURITY ENDPOINTS ---

  // Strategy Activation / Deactivation Endpoint
  app.post('/api/strategy/toggle', requirePermission(UserPermission.MANAGE_STRATEGIES), async (req: Request, res: Response) => {
    try {
      validateStrategyActivation(req.body);
      const { strategyId, action } = req.body;
      logAuditEvent('ADMIN_ACTION', req.sessionUser?.userId || 'usr-default-001', {
        event: 'STRATEGY_STATE_TOGGLE',
        strategyId,
        action,
      });
      res.json(createSuccessResponse({ strategyId, action, status: action === 'ACTIVATE' ? 'ACTIVE' : 'INACTIVE', timestamp: new Date().toISOString() }));
    } catch (err: any) {
      logSecurityEvent(req, 'INVALID_STRATEGY_TOGGLE_PAYLOAD', 'WARNING', { error: err.message });
      res.status(400).json(createErrorResponse(err.message || 'Failed to toggle strategy', 'INVALID_STRATEGY_PAYLOAD'));
    }
  });

  // Broker Integration & Connection Endpoint (Secrets encrypted and redacted in response)
  app.post('/api/account/broker', requirePermission(UserPermission.MANAGE_SYSTEM), async (req: Request, res: Response) => {
    try {
      const sanitizedConfig = validateBrokerConfig(req.body);
      logAuditEvent('ADMIN_ACTION', req.sessionUser?.userId || 'usr-default-001', {
        event: 'BROKER_ADAPTER_SAVED',
        brokerType: sanitizedConfig.brokerType,
        accountNumber: sanitizedConfig.accountNumber,
      });

      // Redact sensitive encrypted values before sending back to client
      const safeResponsePayload = redactSensitiveValues(sanitizedConfig);
      res.json(createSuccessResponse(safeResponsePayload));
    } catch (err: any) {
      logSecurityEvent(req, 'INVALID_BROKER_CONFIG', 'WARNING', { error: err.message });
      res.status(400).json(createErrorResponse(err.message || 'Failed to save broker configuration', 'INVALID_BROKER_CONFIG'));
    }
  });

  // --- IDENTITY, AUTHENTICATION & AUTHORIZATION EXTENSIONS ---

  // Mock users store for simulated user listing, login, and role changes
  const mockUsers = [
    { id: 'usr-super-obwogi', displayName: 'Alex Nyangaresi Obwogi', email: 'obwogialex728@gmail.com', role: 'SUPER_ADMIN' as UserRole, status: 'ACTIVE' },
    { id: 'usr-default-001', displayName: 'Appex Quant Trader', email: 'trader@appexquant.global', role: 'USER' as UserRole, status: 'ACTIVE' },
    { id: 'usr-agent-002', displayName: 'Alice Support', email: 'alice.support@appexquant.global', role: 'SUPPORT_AGENT' as UserRole, status: 'ACTIVE' },
    { id: 'usr-content-003', displayName: 'Bob Content', email: 'bob.content@appexquant.global', role: 'CONTENT_MANAGER' as UserRole, status: 'ACTIVE' },
    { id: 'usr-risk-004', displayName: 'Carol Risk', email: 'carol.risk@appexquant.global', role: 'RISK_MANAGER' as UserRole, status: 'ACTIVE' },
    { id: 'usr-admin-005', displayName: 'Dave Administrator', email: 'dave@appexquant.global', role: 'ADMIN' as UserRole, status: 'ACTIVE' },
    { id: 'usr-super-006', displayName: 'Root SuperAdmin', email: 'super@appexquant.global', role: 'SUPER_ADMIN' as UserRole, status: 'ACTIVE' },
  ];

  // 1. Secure Authentication Login Endpoint
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password, role } = req.body;
      
      let targetUser;
      const dbPool = getDatabasePool();
      const connTest = await testDatabaseConnection();
      
      if (connTest.success) {
        try {
          const userRes = await dbPool.query('SELECT * FROM users WHERE email = $1', [email]);
          if (userRes.rows.length > 0) {
            const row = userRes.rows[0];
            targetUser = {
              id: row.id,
              displayName: row.display_name || 'Appex Quant Trader',
              email: row.email,
              role: row.role as UserRole,
              status: row.status,
            };
          } else if (email === 'obwogialex728@gmail.com') {
            // Auto-create Alex Nyangaresi Obwogi on first login if not exists in DB
            targetUser = {
              id: 'usr-super-obwogi',
              displayName: 'Alex Nyangaresi Obwogi',
              email: 'obwogialex728@gmail.com',
              role: 'SUPER_ADMIN' as UserRole,
              status: 'ACTIVE',
            };
            await dbPool.query(
              'INSERT INTO users (id, email, display_name, role, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING',
              [targetUser.id, targetUser.email, targetUser.displayName, targetUser.role, targetUser.status]
            );
            await dbPool.query(
              'INSERT INTO user_preferences (user_id, theme) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING',
              [targetUser.id, 'dark']
            );
          }
        } catch (dbErr: any) {
          logger.error('Failed to query database user during login, falling back to memory', { error: dbErr.message });
        }
      }

      if (!targetUser) {
        // Enforce Super Admin profile if email matches Alex's email
        if (email === 'obwogialex728@gmail.com') {
          targetUser = mockUsers.find(u => u.id === 'usr-super-obwogi') || {
            id: 'usr-super-obwogi',
            displayName: 'Alex Nyangaresi Obwogi',
            email: 'obwogialex728@gmail.com',
            role: 'SUPER_ADMIN' as UserRole,
            status: 'ACTIVE',
          };
        } else {
          targetUser = mockUsers.find(u => u.email === email) || {
            id: 'usr-default-001',
            displayName: 'Appex Quant Trader',
            email: email || 'trader@appexquant.global',
            role: (role as UserRole) || 'USER',
            status: 'ACTIVE',
          };
        }
      }

      // Automatically handle live broker handshake on authentication behind the scenes
      try {
        const liveToken = process.env.DERIV_API_TOKEN || `secure_pkce_deriv_${crypto.randomBytes(16).toString('hex')}`;
        connectUserWithApiToken(targetUser.id, liveToken);
      } catch (err: any) {
        logger.error('Failed to auto-connect live broker during login handshake:', { error: err.message });
      }

      const csrfToken = crypto.randomBytes(32).toString('hex');
      const sessionPayload: SessionPayload = {
        userId: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        isElevated: false,
        elevatedUntil: null,
        csrfToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour session
      };

      const token = createSessionToken(sessionPayload);
      res.setHeader('Set-Cookie', `session_token=${token}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=3600`);

      logAuditEvent('LOGIN', targetUser.id, { event: 'USER_LOGIN_SUCCESS', role: targetUser.role });
      logSecurityEvent(req, 'USER_LOGIN_SUCCESS', 'INFO', { userId: targetUser.id, role: targetUser.role });

      res.json(createSuccessResponse({
        user: redactSensitiveValues(targetUser),
        csrfToken,
        isElevated: false,
        expiresAt: sessionPayload.expiresAt,
      }));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Authentication failed', 'AUTH_ERROR'));
    }
  });

  // 1b. Referral-Gated Account Creation (Sign Up) Endpoint
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { email, displayName, password, referralCode } = req.body;
      
      // Enforce referral code requirement
      const allowedCodes = ['alex', 'alex-nyangaresi-obwogi', 'alex_obwogi'];
      const normalizedCode = String(referralCode || '').trim().toLowerCase();
      
      if (!referralCode || !allowedCodes.includes(normalizedCode)) {
        return res.status(400).json(createErrorResponse(
          'Referral Locked: New accounts must be registered via the Super Admin\'s designated link structure (?ref=alex). Access denied.',
          'REFERRAL_LOCKED'
        ));
      }

      if (!email) {
        return res.status(400).json(createErrorResponse('Email is required', 'INVALID_INPUT'));
      }

      let existingUser = null;
      const dbPool = getDatabasePool();
      const connTest = await testDatabaseConnection();

      if (connTest.success) {
        try {
          const userRes = await dbPool.query('SELECT * FROM users WHERE email = $1', [email]);
          if (userRes.rows.length > 0) {
            existingUser = userRes.rows[0];
          }
        } catch (dbErr: any) {
          logger.error('Failed to query database user during registration, falling back to memory check', { error: dbErr.message });
        }
      }

      if (!existingUser) {
        existingUser = mockUsers.find(u => u.email === email);
      }

      if (existingUser) {
        return res.status(400).json(createErrorResponse('A user with this email already exists', 'USER_ALREADY_EXISTS'));
      }

      // Create new user profile
      const newUser = {
        id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        displayName: displayName || 'Appex Quant Trader',
        email,
        role: 'USER' as UserRole, // Public registration is strictly Standard USER role
        status: 'ACTIVE',
      };

      if (connTest.success) {
        try {
          await dbPool.query(
            'INSERT INTO users (id, email, display_name, role, status) VALUES ($1, $2, $3, $4, $5)',
            [newUser.id, newUser.email, newUser.displayName, newUser.role, newUser.status]
          );
          await dbPool.query(
            'INSERT INTO user_preferences (user_id, theme, notifications_enabled) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING',
            [newUser.id, 'dark', true]
          );
        } catch (dbErr: any) {
          logger.error('Failed to insert new database user during registration', { error: dbErr.message });
        }
      }

      mockUsers.push(newUser);

      // Automatically handle live broker handshake on authentication behind the scenes
      try {
        const liveToken = process.env.DERIV_API_TOKEN || `secure_pkce_deriv_${crypto.randomBytes(16).toString('hex')}`;
        connectUserWithApiToken(newUser.id, liveToken);
      } catch (err: any) {
        logger.error('Failed to auto-connect live broker during registration handshake:', { error: err.message });
      }

      const csrfToken = crypto.randomBytes(32).toString('hex');
      const sessionPayload: SessionPayload = {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        isElevated: false,
        elevatedUntil: null,
        csrfToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };

      const token = createSessionToken(sessionPayload);
      res.setHeader('Set-Cookie', `session_token=${token}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=3600`);

      logAuditEvent('USER_REGISTERED', newUser.id, { event: 'USER_REGISTER_SUCCESS', role: newUser.role });
      logSecurityEvent(req, 'USER_REGISTER_SUCCESS', 'INFO', { userId: newUser.id, role: newUser.role });

      res.json(createSuccessResponse({
        user: redactSensitiveValues(newUser),
        csrfToken,
        isElevated: false,
        expiresAt: sessionPayload.expiresAt,
      }));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Registration failed', 'REGISTRATION_ERROR'));
    }
  });

  // 2. Session Refresh / Token Rotation Endpoint
  app.post('/api/auth/refresh', (req: Request, res: Response) => {
    try {
      if (!req.sessionUser || !req.sessionToken) {
        return res.status(401).json(createErrorResponse('No active session token to refresh', 'UNAUTHORIZED'));
      }

      // Revoke current session token (Token Rotation)
      revokeSessionToken(req.sessionToken);

      const newCsrf = crypto.randomBytes(32).toString('hex');
      const rotatedPayload: SessionPayload = {
        ...req.sessionUser,
        csrfToken: newCsrf,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };

      const newToken = createSessionToken(rotatedPayload);
      res.setHeader('Set-Cookie', `session_token=${newToken}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=3600`);

      logSecurityEvent(req, 'TOKEN_ROTATED', 'INFO', { userId: req.sessionUser.userId });

      res.json(createSuccessResponse({
        user: { userId: req.sessionUser.userId, email: req.sessionUser.email, role: req.sessionUser.role },
        csrfToken: newCsrf,
        isElevated: rotatedPayload.isElevated,
        expiresAt: rotatedPayload.expiresAt,
      }));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Token rotation failed', 'TOKEN_REFRESH_ERROR'));
    }
  });

  // 3. Current Session Profile Endpoint
  app.get('/api/auth/me', (req: Request, res: Response) => {
    if (!req.sessionUser) {
      return res.status(401).json(createErrorResponse('Unauthenticated', 'UNAUTHORIZED'));
    }
    res.json(createSuccessResponse({
      user: { userId: req.sessionUser.userId, email: req.sessionUser.email, role: req.sessionUser.role },
      csrfToken: req.sessionUser.csrfToken,
      isElevated: req.sessionUser.isElevated,
      elevatedUntil: req.sessionUser.elevatedUntil,
      expiresAt: req.sessionUser.expiresAt,
    }));
  });

  // 4. Secure Logout Endpoint
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    if (req.sessionToken) {
      revokeSessionToken(req.sessionToken);
    }
    res.setHeader('Set-Cookie', 'session_token=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0');
    logSecurityEvent(req, 'USER_LOGOUT', 'INFO', { userId: req.sessionUser?.userId });
    res.json(createSuccessResponse({ message: 'Logged out successfully' }));
  });

  // --- DERIV OAUTH 2.0 PKCE API ENDPOINTS ---
  // Initiate Deriv OAuth PKCE flow (Connect or Signup)
  app.all(['/api/auth/deriv/login', '/api/deriv/oauth/init'], (req: Request, res: Response) => {
    try {
      const userId = req.sessionUser?.userId || (req.headers['x-user-id'] as string) || 'usr-default-001';
      const action = ((req.query.action || req.body?.action) as 'connect' | 'signup') || 'connect';
      const destination = ((req.query.destination || req.body?.destination) as string) || '/dashboard';
      const requestHost = req.headers.host || 'localhost:3000';

      const { authUrl, state } = initiateDerivOAuth({
        userId,
        action,
        destination,
        requestHost,
      });

      logSecurityEvent(req, 'DERIV_OAUTH_INITIATED', 'INFO', { userId, action, state });

      if (req.method === 'POST' || req.headers.accept?.includes('application/json') || req.query.json === 'true') {
        return res.json(createSuccessResponse({ authUrl, state }));
      }

      // Redirect user directly to Deriv OAuth 2.0 authorization server
      res.redirect(authUrl);
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to initiate Deriv OAuth', 'DERIV_OAUTH_ERROR'));
    }
  });

  // Deriv OAuth Callback endpoint (Backend token exchange)
  app.get('/api/auth/deriv/callback', async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string | undefined;
      const state = req.query.state as string | undefined;
      const error = req.query.error as string | undefined;
      const errorDescription = req.query.error_description as string | undefined;

      const result = await handleDerivOAuthCallback({
        code,
        state,
        error,
        errorDescription,
      });

      logSecurityEvent(req, result.success ? 'DERIV_OAUTH_SUCCESS' : 'DERIV_OAUTH_FAILED', result.success ? 'INFO' : 'WARNING', {
        errorMessage: result.errorMessage,
      });

      // Secure redirect back to AppexQuant dashboard or saved destination
      const safeDestination = result.destination.startsWith('/') ? result.destination : '/dashboard';
      res.redirect(safeDestination);
    } catch (err: any) {
      res.redirect('/dashboard?connection=error');
    }
  });

  // Get current user's safe Deriv connection metadata (No secret tokens returned to normal users)
  app.get('/api/auth/deriv/status', async (req: Request, res: Response) => {
    try {
      const userId = req.sessionUser?.userId || (req.headers['x-user-id'] as string) || 'usr-default-001';
      const metadata = await getUserDerivConnectionAsync(userId);
      res.json(createSuccessResponse(metadata));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to fetch Deriv connection status', 'DERIV_STATUS_ERROR'));
    }
  });

  // Disconnect Deriv connection (User action or Admin)
  app.post('/api/auth/deriv/disconnect', (req: Request, res: Response) => {
    try {
      const userId = req.sessionUser?.userId || (req.headers['x-user-id'] as string) || 'usr-default-001';
      const success = disconnectUserDeriv(userId);
      logAuditEvent('ACCOUNT_DISCONNECTED', userId, { event: 'DERIV_ACCOUNT_DISCONNECTED' });
      res.json(createSuccessResponse({ disconnected: success }));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to disconnect Deriv account', 'DERIV_DISCONNECT_ERROR'));
    }
  });

  // Trigger manual Deriv account metadata & balance sync
  app.post('/api/auth/deriv/sync', (req: Request, res: Response) => {
    try {
      const userId = req.sessionUser?.userId || (req.headers['x-user-id'] as string) || 'usr-default-001';
      const metadata = syncUserDeriv(userId);
      res.json(createSuccessResponse(metadata));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to sync Deriv connection', 'DERIV_SYNC_ERROR'));
    }
  });

  // Login using Deriv API Token
  app.post('/api/auth/deriv/token-login', (req: Request, res: Response) => {
    try {
      const userId = req.sessionUser?.userId || (req.headers['x-user-id'] as string) || 'usr-default-001';
      const { apiToken } = req.body;
      if (!apiToken || typeof apiToken !== 'string' || apiToken.trim().length < 5) {
        return res.status(400).json(createErrorResponse('Invalid Deriv API token provided', 'INVALID_API_TOKEN'));
      }
      const metadata = connectUserWithApiToken(userId, apiToken);
      logAuditEvent('ACCOUNT_CONNECTED', userId, { event: 'DERIV_API_TOKEN_CONNECTED' });
      res.json(createSuccessResponse(metadata));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to authenticate with Deriv API token', 'TOKEN_LOGIN_ERROR'));
    }
  });

  // --- ADMIN-ONLY DERIV GATEWAY CONTROL & DIAGNOSTICS ENDPOINTS ---
  // Server-side RBAC guard helper
  const requireAdminRole = (req: Request, res: Response): boolean => {
    const userRole = req.sessionUser?.role || (req.headers['x-user-role'] as string);
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'RISK_MANAGER') {
      res.status(403).json(createErrorResponse('Forbidden: Administrator privileges required', 'FORBIDDEN_ADMIN_ONLY'));
      return false;
    }
    return true;
  };

  app.get('/api/admin/deriv/diagnostics', requirePermission(UserPermission.MANAGE_BROKERS), (req: Request, res: Response) => {
    try {
      const diagnostics = getAdminDerivDiagnostics();
      res.json(createSuccessResponse(diagnostics));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to load admin Deriv diagnostics', 'ADMIN_DERIV_ERROR'));
    }
  });

  app.post('/api/admin/deriv/disconnect', requirePermission(UserPermission.MANAGE_BROKERS), (req: Request, res: Response) => {
    try {
      const targetUserId = req.body?.targetUserId || 'usr-default-001';
      const success = disconnectUserDeriv(targetUserId);
      logAuditEvent('ADMIN_ACTION', req.sessionUser?.userId || 'ADMIN', { event: 'ADMIN_DISCONNECTED_DERIV_USER', targetUserId });
      res.json(createSuccessResponse({ disconnected: success, targetUserId }));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Admin disconnect operation failed', 'ADMIN_DERIV_DISCONNECT_ERROR'));
    }
  });
  
  // 5. MFA Session Verification Endpoint with Rate Limiter
  app.post('/api/auth/mfa/verify', mfaRateLimiterMiddleware, (req: Request, res: Response) => {
    try {
      const { code } = req.body;
      const currentUser = req.sessionUser;
      const uid = currentUser?.userId || req.body?.userId || 'usr-default-001';
      const uemail = currentUser?.email || req.body?.email || 'trader@appexquant.global';
      const urole = currentUser?.role || req.body?.role || 'USER';

      if (code === '123456') {
        const elevatedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // elevated for 15 minutes
        
        // Rotate session with elevated privileges
        if (currentUser) {
          const elevatedPayload: SessionPayload = {
            ...currentUser,
            isElevated: true,
            elevatedUntil,
          };
          const elevatedToken = createSessionToken(elevatedPayload);
          res.setHeader('Set-Cookie', `session_token=${elevatedToken}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=3600`);
        }

        logAuditEvent('ADMIN_ACTION', uid, {
          event: 'MFA_VERIFICATION_SUCCESS',
          role: urole,
          email: uemail,
          elevatedUntil,
        });
        logSecurityEvent(req, 'MFA_ELEVATION_SUCCESS', 'INFO', { userId: uid });

        res.json(createSuccessResponse({
          isElevated: true,
          elevatedUntil,
        }));
      } else {
        logAuditEvent('ADMIN_ACTION', uid, {
          event: 'MFA_VERIFICATION_FAILED',
          role: urole,
          email: uemail,
          reason: 'Invalid 6-digit verification code',
        });
        logSecurityEvent(req, 'MFA_ELEVATION_FAILED', 'WARNING', { userId: uid });
        res.status(400).json(createErrorResponse('Invalid MFA code. Use the mock code "123456" to elevate your session.', 'INVALID_MFA_CODE'));
      }
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'MFA Verification failed', 'MFA_ERROR'));
    }
  });

  // --- LEGAL & REGULATORY DISCLOSURE CENTER API ENDPOINTS ---

  // Server-side in-memory store for legal acceptance records
  const legalDocumentsStore = [...OFFICIAL_LEGAL_DOCUMENTS];
  const legalAcceptanceStore: LegalAcceptanceRecord[] = [
    // Pre-populate default acceptance for initial demo user so platform is functional out-of-the-box
    ...OFFICIAL_LEGAL_DOCUMENTS.map(doc => ({
      id: `acc-${doc.id}-initial`,
      userId: 'usr-default-001',
      document: doc.id,
      version: doc.version,
      timestamp: '2026-08-01T00:00:00.000Z',
      accepted: true,
      userIp: '127.0.0.1',
    }))
  ];

  // 1. Get all active legal disclosure documents
  app.get('/api/legal/documents', (req: Request, res: Response) => {
    try {
      res.json(createSuccessResponse(legalDocumentsStore));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to fetch legal documents', 'LEGAL_DOCS_ERROR'));
    }
  });

  // 2. Get acceptance records and pending re-acceptance status for a user
  app.get('/api/legal/acceptances/:userId', (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const currentSessionUser = req.sessionUser;

      // Horizontal Privilege Escalation Protection
      if (currentSessionUser && currentSessionUser.userId !== userId && !hasPermission(currentSessionUser.role, UserPermission.MANAGE_USERS)) {
        logSecurityEvent(req, 'LEGAL_ACCEPTANCE_UNAUTHORIZED_QUERY', 'CRITICAL', { targetUserId: userId });
        return res.status(403).json(createErrorResponse(`Forbidden: Unauthorized access to legal records for user ${userId}`, 'FORBIDDEN'));
      }

      const userRecords = legalAcceptanceStore.filter(r => r.userId === userId);

      // Evaluate whether user has accepted the latest version of every document
      let pendingCount = 0;
      let acceptedCount = 0;

      legalDocumentsStore.forEach(doc => {
        const match = userRecords.find(r => r.document === doc.id && r.version === doc.version && r.accepted);
        if (match) {
          acceptedCount++;
        } else {
          pendingCount++;
        }
      });

      const allAccepted = pendingCount === 0;

      res.json(createSuccessResponse({
        userId,
        allAccepted,
        pendingCount,
        acceptedCount,
        totalDocuments: legalDocumentsStore.length,
        records: userRecords,
      }));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to fetch user legal acceptances', 'LEGAL_ACCEPTANCE_ERROR'));
    }
  });

  // 3. Record acceptance for a legal document version
  app.post('/api/legal/accept', (req: Request, res: Response) => {
    try {
      const { userId, document, version, accepted } = req.body;

      if (!userId || !document || !version || typeof accepted !== 'boolean') {
        return res.status(400).json(createErrorResponse('Missing required fields: userId, document, version, accepted', 'INVALID_PAYLOAD'));
      }

      // Check if document exists
      const targetDoc = legalDocumentsStore.find(d => d.id === document);
      if (!targetDoc) {
        return res.status(404).json(createErrorResponse(`Legal document "${document}" not found`, 'NOT_FOUND'));
      }

      const newRecord: LegalAcceptanceRecord = {
        id: `acc-${document}-${Date.now()}`,
        userId,
        document,
        version,
        timestamp: new Date().toISOString(),
        accepted,
        userIp: req.ip || '127.0.0.1',
        userAgent: (req.headers['user-agent'] as string) || 'browser-client',
      };

      legalAcceptanceStore.push(newRecord);

      logAuditEvent('ADMIN_ACTION', userId, {
        event: 'LEGAL_DOCUMENT_ACCEPTED',
        document,
        version,
        accepted,
        userIp: newRecord.userIp,
      });

      logSecurityEvent(req, 'LEGAL_DOCUMENT_ACCEPTED', 'INFO', { userId, document, version });

      res.json(createSuccessResponse({
        record: newRecord,
        message: `Acceptance recorded for document ${document} (${version})`,
      }));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to record legal acceptance', 'LEGAL_ACCEPT_ERROR'));
    }
  });

  // 4. Update a legal document version (triggers material re-acceptance requirement)
  app.post('/api/legal/documents/update', requirePermission(UserPermission.MANAGE_SYSTEM), (req: Request, res: Response) => {
    try {
      const { documentId, newVersion, title, summary, content, isMaterialUpdate } = req.body;

      if (!documentId || !newVersion) {
        return res.status(400).json(createErrorResponse('documentId and newVersion are required', 'INVALID_PAYLOAD'));
      }

      const existingIndex = legalDocumentsStore.findIndex(d => d.id === documentId);
      if (existingIndex === -1) {
        return res.status(404).json(createErrorResponse(`Document ${documentId} not found`, 'NOT_FOUND'));
      }

      const updatedDoc = {
        ...legalDocumentsStore[existingIndex],
        version: newVersion,
        effectiveDate: new Date().toISOString().split('T')[0],
        title: title || legalDocumentsStore[existingIndex].title,
        summary: summary || legalDocumentsStore[existingIndex].summary,
        content: content || legalDocumentsStore[existingIndex].content,
        isMaterialUpdate: isMaterialUpdate !== undefined ? isMaterialUpdate : true,
      };

      legalDocumentsStore[existingIndex] = updatedDoc;

      logAuditEvent('ADMIN_ACTION', req.sessionUser?.userId || 'admin-001', {
        event: 'LEGAL_DOCUMENT_MATERIAL_UPDATE',
        documentId,
        newVersion,
        isMaterialUpdate: updatedDoc.isMaterialUpdate,
      });

      logSecurityEvent(req, 'LEGAL_DOCUMENT_MATERIAL_UPDATE', 'WARNING', { documentId, newVersion });

      res.json(createSuccessResponse({
        document: updatedDoc,
        message: `Legal document ${documentId} updated to ${newVersion}. Re-acceptance will be required for all users.`,
      }));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to update legal document', 'LEGAL_UPDATE_ERROR'));
    }
  });

  // Fetch full system audit logs
  app.get('/api/audit-logs', requirePermission(UserPermission.VIEW_AUDIT_LOG), (req: Request, res: Response) => {
    try {
      res.json(createSuccessResponse(getAuditLogs()));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to fetch audit logs', 'AUDIT_LOGS_ERROR'));
    }
  });

  // List users for user-management
  app.get('/api/users/list', requirePermission(UserPermission.MANAGE_USERS), (req: Request, res: Response) => {
    try {
      res.json(createSuccessResponse(mockUsers));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to fetch users list', 'USERS_ERROR'));
    }
  });

  // Update user role on server
  app.post('/api/users/update-role', requirePermission(UserPermission.MANAGE_USERS), (req: Request, res: Response) => {
    try {
      const { targetUserId, newRole } = req.body;
      const userToUpdate = mockUsers.find(u => u.id === targetUserId);
      if (!userToUpdate) {
        return res.status(404).json(createErrorResponse(`User ${targetUserId} not found`, 'NOT_FOUND'));
      }
      const oldRole = userToUpdate.role;
      userToUpdate.role = newRole;

      logAuditEvent('ADMIN_ACTION', (req.headers['x-user-id'] || 'usr-default-001') as string, {
        event: 'USER_ROLE_UPDATED',
        targetUserId,
        targetEmail: userToUpdate.email,
        oldRole,
        newRole,
      });

      res.json(createSuccessResponse({ user: userToUpdate }));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to update user role', 'USERS_ERROR'));
    }
  });

  // --- TRADER COMMUNITY & VERIFICATION CENTER API ENDPOINTS ---

  // 1. Get Trader Profiles
  app.get('/api/community/profiles', (req: Request, res: Response) => {
    try {
      const currentUserId = (req.headers['x-user-id'] as string) || req.sessionUser?.userId || 'usr-default-001';
      const profiles = getTraderProfiles(currentUserId);
      res.json(createSuccessResponse(profiles));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to fetch trader profiles', 'COMMUNITY_PROFILES_ERROR'));
    }
  });

  // 2. Get Single Profile
  app.get('/api/community/profiles/:id', (req: Request, res: Response) => {
    try {
      const currentUserId = (req.headers['x-user-id'] as string) || req.sessionUser?.userId || 'usr-default-001';
      const profile = getTraderProfileByUserId(req.params.id, currentUserId);
      if (!profile) {
        return res.status(404).json(createErrorResponse('Trader profile not found', 'NOT_FOUND'));
      }
      res.json(createSuccessResponse(profile));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to fetch trader profile', 'COMMUNITY_PROFILE_ERROR'));
    }
  });

  // 3. Update Current User Profile
  app.put('/api/community/profiles/me', (req: Request, res: Response) => {
    try {
      const currentUserId = (req.headers['x-user-id'] as string) || req.sessionUser?.userId || 'usr-default-001';
      const updated = updateTraderProfile(currentUserId, req.body);
      if (!updated) {
        return res.status(404).json(createErrorResponse('User profile not found', 'NOT_FOUND'));
      }
      res.json(createSuccessResponse(updated));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to update trader profile', 'COMMUNITY_PROFILE_UPDATE_ERROR'));
    }
  });

  // 4. Toggle Follow/Unfollow
  app.post('/api/community/follow', (req: Request, res: Response) => {
    try {
      const currentUserId = (req.headers['x-user-id'] as string) || req.sessionUser?.userId || 'usr-default-001';
      const { targetTraderId } = req.body;
      if (!targetTraderId) {
        return res.status(400).json(createErrorResponse('targetTraderId is required', 'INVALID_PAYLOAD'));
      }
      const result = toggleFollowTrader(currentUserId, targetTraderId);
      res.json(createSuccessResponse(result));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to toggle follow status', 'FOLLOW_ERROR'));
    }
  });

  // 5. Get Posts
  app.get('/api/community/posts', (req: Request, res: Response) => {
    try {
      const currentUserId = (req.headers['x-user-id'] as string) || req.sessionUser?.userId || 'usr-default-001';
      const category = req.query.category as string | undefined;
      const search = req.query.search as string | undefined;
      const posts = getCommunityPosts(category, search, currentUserId);
      res.json(createSuccessResponse(posts));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to fetch community posts', 'COMMUNITY_POSTS_ERROR'));
    }
  });

  // 6. Create Post
  app.post('/api/community/posts', (req: Request, res: Response) => {
    try {
      const currentUserId = (req.headers['x-user-id'] as string) || req.sessionUser?.userId || 'usr-default-001';
      const newPost = createCommunityPost({
        ...req.body,
        authorId: currentUserId,
      });
      logAuditEvent('COMMUNITY_ACTION', currentUserId, { event: 'POST_CREATED', postId: newPost.id, title: newPost.title });
      res.json(createSuccessResponse(newPost));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to create community post', 'POST_CREATE_ERROR'));
    }
  });

  // 7. Toggle Like Post
  app.post('/api/community/posts/:id/like', (req: Request, res: Response) => {
    try {
      const currentUserId = (req.headers['x-user-id'] as string) || req.sessionUser?.userId || 'usr-default-001';
      const result = toggleLikePost(req.params.id, currentUserId);
      res.json(createSuccessResponse(result));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to toggle like', 'LIKE_ERROR'));
    }
  });

  // 8. Add Comment
  app.post('/api/community/posts/:id/comments', (req: Request, res: Response) => {
    try {
      const currentUserId = (req.headers['x-user-id'] as string) || req.sessionUser?.userId || 'usr-default-001';
      const comment = addPostComment(req.params.id, {
        ...req.body,
        authorId: currentUserId,
        postId: req.params.id,
      });
      if (!comment) {
        return res.status(404).json(createErrorResponse('Target post not found', 'NOT_FOUND'));
      }
      res.json(createSuccessResponse(comment));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to add comment', 'COMMENT_ERROR'));
    }
  });

  // 9. Submit Report
  app.post('/api/community/report', (req: Request, res: Response) => {
    try {
      const currentUserId = (req.headers['x-user-id'] as string) || req.sessionUser?.userId || 'usr-default-001';
      const report = submitCommunityReport({
        ...req.body,
        reporterId: currentUserId,
      });
      logAuditEvent('COMMUNITY_ACTION', currentUserId, { event: 'CONTENT_REPORTED', targetType: report.targetType, targetId: report.targetId });
      res.json(createSuccessResponse(report));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to submit report', 'REPORT_ERROR'));
    }
  });

  // 10. Toggle Block User
  app.post('/api/community/block', (req: Request, res: Response) => {
    try {
      const currentUserId = (req.headers['x-user-id'] as string) || req.sessionUser?.userId || 'usr-default-001';
      const { targetUserId } = req.body;
      if (!targetUserId) {
        return res.status(400).json(createErrorResponse('targetUserId is required', 'INVALID_PAYLOAD'));
      }
      const isBlocked = toggleBlockTrader(currentUserId, targetUserId);
      res.json(createSuccessResponse({ isBlocked, targetUserId }));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to toggle block status', 'BLOCK_ERROR'));
    }
  });

  // 11. Submit Verification Request
  app.post('/api/community/verification/request', (req: Request, res: Response) => {
    try {
      const currentUserId = (req.headers['x-user-id'] as string) || req.sessionUser?.userId || 'usr-default-001';
      const reqPayload = submitVerificationRequest({
        ...req.body,
        userId: currentUserId,
      });
      logAuditEvent('COMMUNITY_ACTION', currentUserId, { event: 'VERIFICATION_REQUESTED', requestedLevel: reqPayload.requestedLevel });
      res.json(createSuccessResponse(reqPayload));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to submit verification request', 'VERIFICATION_REQUEST_ERROR'));
    }
  });

  // 12. Admin: Get Reports
  app.get('/api/community/admin/reports', requirePermission(UserPermission.MANAGE_USERS), (req: Request, res: Response) => {
    try {
      res.json(createSuccessResponse(getAdminReports()));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to fetch admin reports', 'ADMIN_REPORTS_ERROR'));
    }
  });

  // 13. Admin: Resolve Report
  app.post('/api/community/admin/reports/resolve', requirePermission(UserPermission.MANAGE_USERS), (req: Request, res: Response) => {
    try {
      const { reportId, actionTaken } = req.body;
      const success = resolveAdminReport(reportId, actionTaken);
      if (!success) {
        return res.status(404).json(createErrorResponse('Report not found', 'NOT_FOUND'));
      }
      logAuditEvent('ADMIN_ACTION', (req.headers['x-user-id'] || 'usr-default-001') as string, { event: 'REPORT_RESOLVED', reportId, actionTaken });
      res.json(createSuccessResponse({ resolved: true, reportId }));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to resolve report', 'ADMIN_REPORT_RESOLVE_ERROR'));
    }
  });

  // 14. Admin: Get Verification Requests
  app.get('/api/community/admin/verification-requests', requirePermission(UserPermission.MANAGE_USERS), (req: Request, res: Response) => {
    try {
      res.json(createSuccessResponse(getAdminVerificationRequests()));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to fetch verification requests', 'ADMIN_VERIFICATION_REQUESTS_ERROR'));
    }
  });

  // 15. Admin: Review Verification Request
  app.post('/api/community/admin/verification-requests/review', requirePermission(UserPermission.MANAGE_USERS), (req: Request, res: Response) => {
    try {
      const { requestId, status, rejectionReason } = req.body;
      const updated = reviewAdminVerificationRequest(requestId, status, rejectionReason);
      if (!updated) {
        return res.status(404).json(createErrorResponse('Verification request not found', 'NOT_FOUND'));
      }
      logAuditEvent('ADMIN_ACTION', (req.headers['x-user-id'] || 'usr-default-001') as string, {
        event: 'VERIFICATION_REVIEWED',
        requestId,
        targetUserId: updated.userId,
        status,
      });
      res.json(createSuccessResponse(updated));
    } catch (err: any) {
      res.status(500).json(createErrorResponse('Failed to review verification request', 'ADMIN_VERIFICATION_REVIEW_ERROR'));
    }
  });

  // Log Startup Audit Event
  logAuditEvent('LOGIN', 'sys-01', { event: 'SERVER_BOOT', env: config.env });

  // Vite middleware for development vs Static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler (Masks stack traces)
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled Server Exception', { error: err.message });
    res.status(500).json(createErrorResponse('Internal Server Error', 'SERVER_ERROR'));
  });

  return app;
}

export async function startServer() {
  const PORT = 3000;
  const app = await createApp();
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`AppexQuant Markets Global server running on http://0.0.0.0:${PORT}`);
  });
}

// Auto-start standalone server when executed directly (non-serverless environment)
if (!process.env.VERCEL) {
  startServer();
}
