/**
 * AppexQuant Markets Global - Legal & Regulatory Disclosures System Types
 */

export type PerformanceEnvironmentType = 'DEMO' | 'SIMULATED' | 'BACKTEST' | 'PAPER' | 'LIVE';

export interface LegalDocument {
  id: string;
  title: string;
  version: string;
  effectiveDate: string;
  category: string;
  summary: string;
  content: string[];
  isMaterialUpdate: boolean;
  requiresExplicitAcceptance: boolean;
}

export interface LegalAcceptanceRecord {
  id?: string;
  userId: string;
  document: string; // document id
  version: string;
  timestamp: string;
  accepted: boolean;
  userIp?: string;
  userAgent?: string;
}

export interface LegalAcceptanceSummary {
  userId: string;
  allAccepted: boolean;
  pendingCount: number;
  acceptedCount: number;
  totalDocuments: number;
  records: LegalAcceptanceRecord[];
}
