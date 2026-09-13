/**
 * AppexQuant Markets Global - Cryptographic Audit Trail Explorer
 * Interactive ledger of all verifiable trade executions, challenge phase certificates, and signals.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Hash,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  FileCode,
  TrendingUp,
  Award,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { ProofOfExecutionCertificate } from '../../types/cryptoAudit.ts';
import { getAllCertificates, verifyCertificate } from '../../services/cryptographicAuditService.ts';
import { ProofOfExecutionModal } from './ProofOfExecutionModal.tsx';
import { Button } from '../ui/Button.tsx';

export const AuditTrailViewer: React.FC = () => {
  const [certificates, setCertificates] = useState<ProofOfExecutionCertificate[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<ProofOfExecutionCertificate | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = () => {
    setCertificates(getAllCertificates());
  };

  const filtered = certificates.filter((c) => {
    if (filterType !== 'ALL' && c.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.certificateId.toLowerCase().includes(q) ||
        c.payloadHash.toLowerCase().includes(q) ||
        c.recordId.toLowerCase().includes(q) ||
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

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-6 bg-surface-primary border border-border-subtle rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">Cryptographic Trade Audit Ledger</h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed max-w-2xl">
            Every trade execution, prop evaluation milestone, and AI signal outcome is stamped with an immutable SHA-256 state hash and chained in real time. Anyone can publicly verify proof of execution without exposing proprietary account credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadCertificates} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Ledger
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search by Certificate ID, Hash, Symbol, or Trade Ticket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-primary border border-border-subtle rounded-xl text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Audits' },
            { id: 'TRADE_EXECUTION', label: 'Trades', icon: TrendingUp },
            { id: 'CHALLENGE_PHASE_PASS', label: 'Prop Firm Passes', icon: Award },
            { id: 'AI_SIGNAL_OUTCOME', label: 'AI Signals', icon: Cpu },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${filterType === tab.id ? 'bg-primary text-black font-bold shadow-md shadow-primary/20' : 'bg-surface-primary border border-border-subtle text-text-secondary hover:text-text-primary'}`}
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
            <p className="text-xs text-text-secondary">Try adjusting your search criteria or execute a trade/evaluation test.</p>
          </div>
        ) : (
          filtered.map((cert) => (
            <div
              key={cert.certificateId}
              className="p-4 bg-surface-primary border border-border-subtle hover:border-border-medium rounded-xl transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="p-2 rounded-lg bg-surface-secondary text-primary border border-border-subtle mt-0.5">
                  {cert.type === 'TRADE_EXECUTION' && <TrendingUp className="w-4 h-4" />}
                  {cert.type === 'CHALLENGE_PHASE_PASS' && <Award className="w-4 h-4 text-amber-400" />}
                  {cert.type === 'AI_SIGNAL_OUTCOME' && <Cpu className="w-4 h-4 text-cyan-400" />}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-text-primary">{cert.certificateId}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> VERIFIED
                    </span>
                    {cert.metadata?.symbol && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-surface-secondary text-text-secondary">
                        {cert.metadata.symbol}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px] text-text-secondary">
                    <span className="truncate max-w-[280px] sm:max-w-md">SHA-256: {cert.payloadHash}</span>
                  </div>

                  <div className="text-[10px] text-text-secondary">
                    {new Date(cert.timestamp).toLocaleString()} • {cert.issuer}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center w-full md:w-auto justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVerifyDirect(cert)}
                  className="text-xs h-8 gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
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
