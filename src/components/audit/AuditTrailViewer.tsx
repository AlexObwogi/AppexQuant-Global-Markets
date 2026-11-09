/**
 * AppexQuant Markets Global - Cryptographic Audit Trail Explorer
 * Interactive ledger of all verifiable trade executions, challenge phase certificates, and signals.
 * Enhanced with color-coded transaction status indicators (Completed, Pending, Failed).
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Hash,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Lock,
  FileCode,
  TrendingUp,
  Award,
  Cpu,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { ProofOfExecutionCertificate } from '../../types/cryptoAudit.ts';
import { getAllCertificates, verifyCertificate, fetchDerivHistory } from '../../services/cryptographicAuditService.ts';
import { ProofOfExecutionModal } from './ProofOfExecutionModal.tsx';
import { Button } from '../ui/Button.tsx';

export const AuditTrailViewer: React.FC = () => {
  const [certificates, setCertificates] = useState<ProofOfExecutionCertificate[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<ProofOfExecutionCertificate | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    setIsLoading(true);
    try {
      await fetchDerivHistory();
    } catch (err) {
      console.warn('[AuditTrailViewer] fetchDerivHistory sync notice:', err);
    } finally {
      setCertificates(getAllCertificates());
      setIsLoading(false);
    }
  };

  const getCertStatus = (c: ProofOfExecutionCertificate): 'COMPLETED' | 'PENDING' | 'FAILED' => {
    if (c.status) return c.status;
    if (c.tamperDetected || c.isVerified === false) return 'FAILED';
    return 'COMPLETED';
  };

  const filtered = certificates.filter((c) => {
    if (filterType !== 'ALL' && c.type !== filterType) return false;
    const certStatus = getCertStatus(c);
    if (statusFilter !== 'ALL' && certStatus !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.certificateId.toLowerCase().includes(q) ||
        c.payloadHash.toLowerCase().includes(q) ||
        c.recordId.toLowerCase().includes(q) ||
        certStatus.toLowerCase().includes(q) ||
        (c.metadata?.symbol && c.metadata.symbol.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleVerifyDirect = async (cert: ProofOfExecutionCertificate) => {
    setVerifyingId(cert.certificateId);
    try {
      await verifyCertificate(cert.certificateId);
      setSelectedCertificate(cert);
    } finally {
      setVerifyingId(null);
    }
  };

  const renderStatusBadge = (c: ProofOfExecutionCertificate) => {
    const status = getCertStatus(c);
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 shadow-xs">
            <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>Pending</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#ff444f]/15 text-[#ff444f] border border-[#ff444f]/30 flex items-center gap-1 shadow-xs">
            <XCircle className="w-3 h-3 text-[#ff444f]" />
            <span>Failed</span>
          </span>
        );
      case 'COMPLETED':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#00a86b]/15 text-[#00a86b] border border-[#00a86b]/30 flex items-center gap-1 shadow-xs">
            <CheckCircle2 className="w-3 h-3 text-[#00a86b]" />
            <span>Completed</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-6 bg-surface-primary border border-border-subtle rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#00a86b]/10 text-[#00a86b] border border-[#00a86b]/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">Cryptographic Trade Audit Ledger</h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed max-w-2xl">
            Every trade execution, prop evaluation milestone, and AI signal outcome is stamped with an immutable SHA-256 state hash and chained in real time. Anyone can publicly verify proof of execution without exposing proprietary account credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadCertificates} disabled={isLoading} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Refresh Ledger'}</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (filtered.length === 0) return;
              const headers = ['Certificate ID', 'Timestamp', 'Status', 'Type', 'Record ID', 'SHA-256 Hash', 'Previous Hash', 'Issuer', 'Symbol', 'Details'];
              const rows = filtered.map((c) => [
                `"${c.certificateId}"`,
                `"${new Date(c.timestamp).toISOString()}"`,
                `"${getCertStatus(c)}"`,
                `"${c.type}"`,
                `"${c.recordId}"`,
                `"${c.payloadHash}"`,
                `"${(c as any).prevHash || c.previousRecordHash || ''}"`,
                `"${c.issuer}"`,
                `"${c.metadata?.symbol || ''}"`,
                `"${JSON.stringify(c.metadata || {}).replace(/"/g, '""')}"`,
              ]);
              const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.setAttribute('href', url);
              link.setAttribute('download', `trade_audit_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="gap-1.5 font-bold"
          >
            <FileCode className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search by Certificate ID, Hash, Symbol, Status, or Ticket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-primary border border-border-subtle rounded-xl text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Status Filter Selector */}
        <div className="flex items-center gap-1.5 bg-surface-primary p-1 border border-border-subtle rounded-xl shrink-0">
          <span className="text-[10px] font-mono font-bold text-text-secondary uppercase px-1.5">Status:</span>
          {['ALL', 'COMPLETED', 'PENDING', 'FAILED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                statusFilter === st
                  ? st === 'COMPLETED'
                    ? 'bg-[#00a86b] text-white shadow-xs'
                    : st === 'PENDING'
                    ? 'bg-amber-500 text-black shadow-xs'
                    : st === 'FAILED'
                    ? 'bg-[#ff444f] text-white shadow-xs'
                    : 'bg-primary text-black shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {st === 'ALL' ? 'All' : st}
            </button>
          ))}
        </div>

        {/* Type Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 shrink-0">
          {[
            { id: 'ALL', label: 'All Audits' },
            { id: 'TRADE_EXECUTION', label: 'Trades', icon: TrendingUp },
            { id: 'LEDGER_SETTLEMENT', label: 'Cashier & Funding', icon: Wallet },
            { id: 'CHALLENGE_PHASE_PASS', label: 'Prop Passes', icon: Award },
            { id: 'AI_SIGNAL_OUTCOME', label: 'AI Signals', icon: Cpu },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${filterType === tab.id ? 'bg-primary text-black font-bold shadow-md shadow-primary/20' : 'bg-surface-primary border border-border-subtle text-text-secondary hover:text-text-primary'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Certificates Table / Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-surface-primary border border-border-subtle rounded-2xl space-y-3">
            <Lock className="w-8 h-8 text-text-secondary mx-auto" />
            <p className="text-sm font-semibold text-text-primary">No audit records found</p>
            <p className="text-xs text-text-secondary">Try adjusting your status or category search filters.</p>
          </div>
        ) : (
          filtered.map((cert) => (
            <div
              key={cert.certificateId}
              className="p-4 bg-surface-primary border border-border-subtle hover:border-border-medium rounded-xl transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="p-2 rounded-lg bg-surface-secondary text-primary border border-border-subtle mt-0.5 shrink-0">
                  {cert.type === 'TRADE_EXECUTION' && <TrendingUp className="w-4 h-4" />}
                  {cert.type === 'LEDGER_SETTLEMENT' && <Wallet className="w-4 h-4 text-emerald-400" />}
                  {cert.type === 'CHALLENGE_PHASE_PASS' && <Award className="w-4 h-4 text-amber-400" />}
                  {cert.type === 'AI_SIGNAL_OUTCOME' && <Cpu className="w-4 h-4 text-cyan-400" />}
                </div>

                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-text-primary">{cert.certificateId}</span>
                    
                    {/* Visual Status Indicator Badge */}
                    {renderStatusBadge(cert)}

                    {/* Verification Integrity Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium flex items-center gap-1 ${
                      cert.isVerified && !cert.tamperDetected
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      <CheckCircle2 className="w-3 h-3" /> {cert.isVerified && !cert.tamperDetected ? 'VERIFIED' : 'TAMPER DETECTED'}
                    </span>

                    {cert.metadata?.symbol && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-surface-secondary text-text-secondary border border-border-subtle">
                        {cert.metadata.symbol}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px] text-text-secondary">
                    <span className="truncate max-w-[280px] sm:max-w-md">SHA-256: {cert.payloadHash}</span>
                  </div>

                  <div className="text-[10px] text-text-secondary font-mono">
                    {new Date(cert.timestamp).toLocaleString()} • {cert.issuer}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center w-full md:w-auto justify-end shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVerifyDirect(cert)}
                  className="text-xs h-8 gap-1.5 font-bold"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00a86b]" />
                  Audit Proof
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <ProofOfExecutionModal
        certificate={selectedCertificate}
        isOpen={Boolean(selectedCertificate)}
        onClose={() => setSelectedCertificate(null)}
      />
    </div>
  );
};
