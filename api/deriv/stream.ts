/**
 * AppexQuant Markets Global - Deriv WebSocket Stream Handler
 * Dedicated Vercel Node Serverless Endpoint for /api/deriv/stream
 *
 * Implements:
 * - Direct HTTP 101 Switching Protocols WebSocket Upgrade Handshake
 * - Server-Sent Events (SSE) Fallback Stream
 * - HTTP 200 Gateway Health & Diagnostic Status
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { IncomingMessage } from 'http';
import { derivGateway } from '../../src/services/deriv/DerivGateway.ts';
import { logger } from '../../src/observability/logger.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Ensure resilient upstream connection to Deriv
    if (derivGateway.getConnectionState() === 'DISCONNECTED') {
      derivGateway.connect().catch((err) => {
        logger.warn('[DerivStreamHandler] Upstream connection notice:', { error: err?.message || String(err) });
      });
    }

    const upgradeHeader = req.headers['upgrade'];
    const connectionHeader = req.headers['connection'];
    const isWsUpgrade =
      (typeof upgradeHeader === 'string' && upgradeHeader.toLowerCase() === 'websocket') ||
      (typeof connectionHeader === 'string' && connectionHeader.toLowerCase().includes('upgrade'));

    // 1. True WebSocket Handshake (Sends HTTP 101 Switching Protocols)
    if (isWsUpgrade) {
      const socket = req.socket || (res as any)?.socket;
      if (!socket) {
        res.status(400).json({ error: 'Socket unavailable for WebSocket upgrade' });
        return;
      }

      const head = (req as any).rawBody || Buffer.alloc(0);
      derivGateway.handleUpgrade(req as unknown as IncomingMessage, socket, head);
      return;
    }

    // 2. Server-Sent Events (SSE) Fallback Stream
    const acceptHeader = req.headers['accept'] || '';
    const isSSE =
      (typeof acceptHeader === 'string' && acceptHeader.includes('text/event-stream')) ||
      req.query?.format === 'sse';

    if (isSSE) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof (res as any).flushHeaders === 'function') {
        (res as any).flushHeaders();
      }

      res.write(`data: ${JSON.stringify({ type: 'status', data: derivGateway.getStatus() })}\n\n`);

      const symbol = (req.query?.symbol as string) || '';
      let unsubTick: (() => void) | null = null;

      if (symbol) {
        unsubTick = derivGateway.subscribeTick(symbol, (tick) => {
          try {
            res.write(`data: ${JSON.stringify({ type: 'tick', data: tick })}\n\n`);
          } catch {}
        });
      }

      const unsubBalance = derivGateway.onBalanceChange((bal) => {
        try {
          res.write(`data: ${JSON.stringify({ type: 'balance', data: bal })}\n\n`);
        } catch {}
      });

      const unsubProfile = derivGateway.onProfileChange((prof) => {
        try {
          res.write(`data: ${JSON.stringify({ type: 'profile', data: prof })}\n\n`);
        } catch {}
      });

      const unsubStatus = derivGateway.onStatusChange((status) => {
        try {
          res.write(`data: ${JSON.stringify({ type: 'status', data: status })}\n\n`);
        } catch {}
      });

      const ssePing = setInterval(() => {
        try {
          res.write(`: ping ${Date.now()}\n\n`);
        } catch {}
      }, 15000);

      req.on('close', () => {
        clearInterval(ssePing);
        if (unsubTick) unsubTick();
        unsubBalance();
        unsubProfile();
        unsubStatus();
        res.end();
      });

      return;
    }

    // 3. HTTP 200 Gateway Diagnostic Status Info
    const status = derivGateway.getStatus();
    res.status(200).json({
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
    });
  } catch (err: any) {
    logger.error('[DerivStreamHandler] Error handling stream request:', { error: err?.message || String(err) });
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        message: 'Internal Gateway Error',
        code: 'GATEWAY_ERROR',
      });
    }
  }
}
