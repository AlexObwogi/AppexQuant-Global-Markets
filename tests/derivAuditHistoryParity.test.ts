import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchDerivHistory,
  normalizeAndRegisterDerivRecord,
  getAllCertificates,
  getCertificateById,
  verifyCertificate,
} from '../src/services/cryptographicAuditService.ts';

describe('Deriv History Fetching & Audit Trail Parity', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes Deriv option trade items to match the AuditTrailViewer schema', async () => {
    const rawTrade = {
      contract_id: 9912048,
      transaction_id: 1849201,
      symbol: 'R_100',
      action: 'BUY',
      buy_price: 10.0,
      sell_price: 19.5,
      profit: 9.5,
      purchase_time: 1700000000,
      sell_time: 1700000060,
      loginid: 'CR90214',
    };

    const cert = await normalizeAndRegisterDerivRecord(rawTrade, 'TRADE');

    expect(cert).toBeDefined();
    expect(cert.type).toBe('TRADE_EXECUTION');
    expect(cert.recordId).toBe('9912048');
    expect(cert.certificateId).toContain('CERT-DERIV-TRD-');
    expect(cert.payloadHash).toMatch(/^[0-9a-f]{64}$/);
    expect(cert.isVerified).toBe(true);
    expect(cert.tamperDetected).toBe(false);
    expect(cert.status).toBe('COMPLETED');
    expect(cert.metadata.symbol).toBe('R_100');
    expect(cert.metadata.pnl).toBe(9.5);
    expect(cert.metadata.traderId).toBe('CR90214');

    // Cryptographic verification test
    const verification = await verifyCertificate(cert.certificateId);
    expect(verification.valid).toBe(true);
    expect(verification.hashesMatch).toBe(true);
    expect(verification.signatureValid).toBe(true);
  });

  it('normalizes Deriv cashier statement items into the audit ledger', async () => {
    const rawStatementItem = {
      id: 'tx-statement-7721',
      transactionId: 'TXN-99410',
      actionType: 'DEPOSIT',
      amount: 250.0,
      currency: 'USD',
      balanceAfter: 750.0,
      timestamp: new Date().toISOString(),
      status: 'COMPLETED',
      description: 'Instant Cashier Deposit via Visa Card',
      loginid: 'CR108924',
    };

    const cert = await normalizeAndRegisterDerivRecord(rawStatementItem, 'STATEMENT');

    expect(cert).toBeDefined();
    expect(cert.type).toBe('LEDGER_SETTLEMENT');
    expect(cert.recordId).toBe('TXN-99410');
    expect(cert.certificateId).toContain('CERT-DERIV-TX-');
    expect(cert.isVerified).toBe(true);
    expect(cert.status).toBe('COMPLETED');
    expect(cert.metadata.pnl).toBe(250.0);

    const verification = await verifyCertificate(cert.certificateId);
    expect(verification.valid).toBe(true);
  });

  it('fetchDerivHistory successfully pulls Deriv records and integrates them into existing audit history', async () => {
    // Mock the global apiFetch response for /api/auth/deriv/statement
    const mockTransactions = [
      {
        id: 'tx-deriv-1',
        transactionId: 'TXN-88001',
        actionType: 'BUY',
        amount: -5.0,
        currency: 'USD',
        balanceAfter: 495.0,
        timestamp: new Date(Date.now() - 10000).toISOString(),
        status: 'COMPLETED',
        description: 'Rise contract purchased on Volatility 100 Index',
        loginid: 'CR108924',
      },
      {
        id: 'tx-deriv-2',
        transactionId: 'TXN-88002',
        actionType: 'DEPOSIT',
        amount: 100.0,
        currency: 'USD',
        balanceAfter: 595.0,
        timestamp: new Date().toISOString(),
        status: 'COMPLETED',
        description: 'Deriv Cashier Deposit',
        loginid: 'CR108924',
      },
    ];

    // Mock fetch to simulate the backend statement endpoint
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string | Request) => {
      const urlStr = typeof url === 'string' ? url : (url as any).url || '';
      if (urlStr.includes('/api/auth/deriv/statement')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              transactions: mockTransactions,
              totalCount: mockTransactions.length,
              lastSyncedAt: new Date().toISOString(),
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      return originalFetch(url);
    });

    try {
      const initialCertCount = getAllCertificates().length;
      const historyCerts = await fetchDerivHistory({ limit: 10 });

      expect(historyCerts.length).toBeGreaterThanOrEqual(initialCertCount);

      // Verify the normalized records are in the ledger
      const cert1 = historyCerts.find((c) => c.recordId === 'TXN-88001');
      const cert2 = historyCerts.find((c) => c.recordId === 'TXN-88002');

      expect(cert1).toBeDefined();
      expect(cert1?.type).toBe('TRADE_EXECUTION');
      expect(cert2).toBeDefined();
      expect(cert2?.type).toBe('LEDGER_SETTLEMENT');

      // Test idempotency: calling fetchDerivHistory again should not duplicate records
      const afterSecondCall = await fetchDerivHistory({ limit: 10 });
      const cert1Occurrences = afterSecondCall.filter((c) => c.recordId === 'TXN-88001');
      expect(cert1Occurrences.length).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('guarantees parity between site-executed trades and Deriv portal records', async () => {
    // 1. Site-executed trade record
    const siteTrade = await normalizeAndRegisterDerivRecord(
      {
        contract_id: 778899,
        transaction_id: 112233,
        symbol: 'frxEURUSD',
        action: 'BUY',
        buy_price: 5.0,
        sell_price: 9.75,
        profit: 4.75,
        loginid: 'CR9999',
      },
      'TRADE'
    );

    // 2. Deriv portal statement record
    const portalRecord = await normalizeAndRegisterDerivRecord(
      {
        transactionId: 'TXN-PORTAL-01',
        actionType: 'WITHDRAWAL',
        amount: -50.0,
        currency: 'USD',
        balanceAfter: 450.0,
        description: 'Deriv Portal E-Wallet Payout',
        status: 'COMPLETED',
        loginid: 'CR9999',
      },
      'STATEMENT'
    );

    const all = getAllCertificates();
    const siteTradeFound = all.find((c) => c.recordId === '778899');
    const portalRecordFound = all.find((c) => c.recordId === 'TXN-PORTAL-01');

    expect(siteTradeFound).toBeDefined();
    expect(portalRecordFound).toBeDefined();

    // Both pass independent cryptographic integrity validation
    const siteValid = await verifyCertificate(siteTrade.certificateId);
    const portalValid = await verifyCertificate(portalRecord.certificateId);

    expect(siteValid.valid).toBe(true);
    expect(portalValid.valid).toBe(true);
  });
});
