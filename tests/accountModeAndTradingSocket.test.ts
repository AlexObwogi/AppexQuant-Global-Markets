import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isDerivAccountVirtual } from '../src/state/GlobalStateContext.tsx';
import { derivTradingClient, DerivTradingClient } from '../src/services/deriv/tradingClient.ts';

describe('Account Mode Derivation & Trading Socket Connectivity', () => {
  describe('isDerivAccountVirtual Helper', () => {
    it('classifies accounts as virtual strictly when is_virtual === 1', () => {
      expect(isDerivAccountVirtual({ loginid: 'CR123456', is_virtual: 1 })).toBe(true);
      expect(isDerivAccountVirtual({ loginid: 'CR999999', is_virtual: true })).toBe(true);
    });

    it('classifies accounts as real strictly when is_virtual === 0', () => {
      // Even if loginid had custom text, is_virtual: 0 overrides everything
      expect(isDerivAccountVirtual({ loginid: 'VR123456', is_virtual: 0 })).toBe(false);
      expect(isDerivAccountVirtual({ loginid: 'CR123456', is_virtual: false })).toBe(false);
    });

    it('derives mode from isVirtual boolean property', () => {
      expect(isDerivAccountVirtual({ isVirtual: true })).toBe(true);
      expect(isDerivAccountVirtual({ isVirtual: false })).toBe(false);
    });

    it('derives mode from account_type string when is_virtual is omitted', () => {
      expect(isDerivAccountVirtual({ account_type: 'demo' })).toBe(true);
      expect(isDerivAccountVirtual({ account_type: 'virtual' })).toBe(true);
      expect(isDerivAccountVirtual({ account_type: 'real' })).toBe(false);
    });

    it('derives mode from accountType string when is_virtual is omitted', () => {
      expect(isDerivAccountVirtual({ accountType: 'demo' })).toBe(true);
      expect(isDerivAccountVirtual({ accountType: 'real' })).toBe(false);
    });

    it('derives mode from type string (DEMO vs REAL)', () => {
      expect(isDerivAccountVirtual({ type: 'DEMO' })).toBe(true);
      expect(isDerivAccountVirtual({ type: 'REAL' })).toBe(false);
    });

    it('defaults safely to real (false) when null or ambiguous', () => {
      expect(isDerivAccountVirtual(null)).toBe(false);
      expect(isDerivAccountVirtual({})).toBe(false);
    });
  });

  describe('DerivTradingClient Mode & Socket Connectivity', () => {
    let client: DerivTradingClient;

    beforeEach(() => {
      client = new DerivTradingClient();
    });

    it('reflects isReal strictly from setIsReal without prefix guessing', () => {
      expect(client.isRealAccount()).toBe(false);

      client.setIsReal(true);
      expect(client.isRealAccount()).toBe(true);

      client.setIsReal(false);
      expect(client.isRealAccount()).toBe(false);
    });

    it('handles ensureConnected gracefully when socket is already open', async () => {
      // Mock isConnected = true
      vi.spyOn(client, 'isConnected').mockReturnValue(true);
      const connectSpy = vi.spyOn(client, 'connect');

      await client.ensureConnected('CR10001');
      expect(connectSpy).not.toHaveBeenCalled();
    });

    it('falls back to public Deriv WebSocket URL when OTP request fails or is unauthenticated', async () => {
      // Mock global fetch to return 401 unauthenticated
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }));

      // Mock WebSocket
      let capturedUrl = '';
      class MockWebSocket {
        readyState = 1; // WebSocket.OPEN
        onopen: any = null;
        onmessage: any = null;
        onerror: any = null;
        onclose: any = null;

        constructor(url: string) {
          capturedUrl = url;
          setTimeout(() => {
            if (this.onopen) this.onopen({} as any);
          }, 10);
        }

        send() {}
        close() {}
      }

      const originalWS = global.WebSocket;
      (global as any).WebSocket = MockWebSocket;

      try {
        await client.connect();
        expect(capturedUrl).toContain('wss://ws.derivws.com/websockets/v3?app_id=');
      } finally {
        global.fetch = originalFetch;
        (global as any).WebSocket = originalWS;
        client.disconnect();
      }
    });
  });
});
