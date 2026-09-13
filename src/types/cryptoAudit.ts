/**
 * AppexQuant Markets Global - Cryptographic Trade Audit & Proof-of-Execution Types
 */

export type AuditCertificateType = 'TRADE_EXECUTION' | 'CHALLENGE_PHASE_PASS' | 'AI_SIGNAL_OUTCOME' | 'LEDGER_SETTLEMENT';

export interface CryptographicTradePayload {
  tradeId: string;
  orderId: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  volume: number;
  entryPrice: number;
  closePrice: number;
  pnl: number;
  openTimestamp: string;
  closeTimestamp: string;
  masterAccountId?: string;
  followerAccountId: string;
  executionLatencyMs: number;
  slippagePips: number;
  brokerTicket: string;
}

export interface CryptographicChallengePassPayload {
  challengeId: string;
  accountId: string;
  traderId: string;
  phase: 'PHASE_1' | 'PHASE_2' | 'FUNDED_VERIFICATION' | 'PRO_TIER';
  startingEquity: number;
  finalEquity: number;
  maxDailyDrawdownPct: number;
  totalProfitPct: number;
  tradingDaysCompleted: number;
  rulesCompliant: boolean;
  passedTimestamp: string;
}

export interface CryptographicSignalOutcomePayload {
  signalId: string;
  modelIdentifier: string;
  symbol: string;
  strategy: string;
  timeframe: string;
  entryTarget: number;
  takeProfit: number;
  stopLoss: number;
  actualClosePrice: number;
  realizedPnl: number;
  signalConfidencePct: number;
  generatedTimestamp: string;
  settledTimestamp: string;
}

export interface ProofOfExecutionCertificate {
  certificateId: string;
  type: AuditCertificateType;
  recordId: string;
  payloadHash: string;
  previousRecordHash: string;
  merkleLeafHash: string;
  signature: string;
  issuer: string;
  publicKeyFingerprint: string;
  timestamp: string;
  canonicalJson: string;
  verificationUrl: string;
  isVerified: boolean;
  tamperDetected: boolean;
  metadata: {
    symbol?: string;
    pnl?: number;
    traderId?: string;
    phase?: string;
    engineVersion: string;
  };
}

export interface CertificateVerificationResult {
  valid: boolean;
  certificateId: string;
  computedHash: string;
  storedHash: string;
  hashesMatch: boolean;
  signatureValid: boolean;
  chainIntegrityValid: boolean;
  verifiedAt: string;
  certificate?: ProofOfExecutionCertificate;
  error?: string;
}
