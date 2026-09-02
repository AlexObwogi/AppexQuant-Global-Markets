/**
 * AppexQuant Markets Global - Deriv Stream Gateway Route
 * Production WebSocket / Event Stream Gateway Handler for /api/deriv/stream
 *
 * Implements:
 * - Proper WebSocket Upgrade / Stream Dispatch
 * - Resilient Upstream Deriv WebSocket Connection
 * - Live Heartbeat & Ping/Pong Latency Tracking
 * - Multiplexed Subscription Registry
 * - Downstream Client Lifecycle & Resource Cleanup
 */

import type { IncomingMessage } from 'http';
import { derivGateway } from '../../../src/services/deriv/DerivGateway.ts';
import { logger } from '../../../src/observability/logger.ts';

// Dynamic route configuration for serverless / edge environments
export const dynamic = 'force-dynamic';

/**
 * Handle HTTP GET / Stream Negotiation / Server-Sent Events / Gateway Status
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const accept = request.headers.get('accept') || '';
    const isEventStream = accept.includes('text/event-stream') || url.searchParams.get('format') === 'sse';

    // Ensure upstream gateway is connected
    if (derivGateway.getConnectionState() === 'DISCONNECTED') {
      derivGateway.connect().catch((err) => {
        logger.warn('[GatewayRoute] Upstream connect notice:', { error: err?.message || String(err) });
      });
    }

    // 1. Server-Sent Events (SSE) Streaming Fallback
    if (isEventStream) {
      const symbol = url.searchParams.get('symbol') || '';
      let unsubTick: (() => void) | null = null;
      let unsubBalance: (() => void) | null = null;
      let unsubProfile: (() => void) | null = null;
      let unsubStatus: (() => void) | null = null;
      let heartbeatTimer: NodeJS.Timeout | null = null;

      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();

          const sendEvent = (event: string, data: any) => {
            try {
              controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            } catch {}
          };

          // Initial state transmission
          sendEvent('status', derivGateway.getStatus());
          const profile = derivGateway.getProfile();
          if (profile) sendEvent('profile', profile);
          const balance = derivGateway.getBalance();
          if (balance) sendEvent('balance', balance);

          // Symbol subscription
          if (symbol) {
            unsubTick = derivGateway.subscribeTick(symbol, (tick) => {
              sendEvent('tick', tick);
            });
          }

          unsubBalance = derivGateway.onBalanceChange((bal) => {
            sendEvent('balance', bal);
          });

          unsubProfile = derivGateway.onProfileChange((prof) => {
            sendEvent('profile', prof);
          });

          unsubStatus = derivGateway.onStatusChange((stat) => {
            sendEvent('status', stat);
          });

          // Periodic SSE Heartbeat Ping (every 15s)
          heartbeatTimer = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
            } catch {}
          }, 15000);
        },
        cancel() {
          if (unsubTick) unsubTick();
          if (unsubBalance) unsubBalance();
          if (unsubProfile) unsubProfile();
          if (unsubStatus) unsubStatus();
          if (heartbeatTimer) clearInterval(heartbeatTimer);
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    // 2. Standard HTTP JSON Gateway Status & Diagnostic Information
    const status = derivGateway.getStatus();
    return new Response(
      JSON.stringify({
        status: 'success',
        data: {
          endpoint: '/api/deriv/stream',
          gateway: 'AppexQuant-Deriv-Gateway',
          protocols: ['WebSocket (RFC 6455)', 'Server-Sent Events (SSE)'],
          connectionState: status.state,
          isAuthorized: status.isAuthorized,
          activeSymbolsCount: status.activeSymbolsCount,
          subscribedSymbolsCount: status.subscribedSymbolsCount,
          connectedClientsCount: status.connectedClientsCount,
          latencyMs: status.latencyMs,
          uptimeSeconds: status.uptimeSeconds,
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err: any) {
    logger.error('[GatewayRoute] Error handling stream request:', { error: err?.message || String(err) });
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Internal Gateway Error',
        code: 'GATEWAY_ERROR',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Node / Express / Vercel Serverless WebSocket Upgrade Helper
 */
export function handleUpgrade(req: IncomingMessage, socket: any, head: Buffer) {
  const server = (req as any).socket?.server || (socket as any).server;
  if (server) {
    const wss = derivGateway.attachWebSocketServer(server, '/api/deriv/stream');
    wss.handleUpgrade(req, socket, head, (clientWs) => {
      wss.emit('connection', clientWs, req);
    });
  }
}
