/**
 * AppexQuant Markets Global - Proof of Execution Certificate Modal
 * Verifiable cryptographic trade and performance certificate viewer.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Hash,
  Copy,
  CheckCircle2,
  ExternalLink,
  Lock,
  FileCheck2,
  RefreshCw,
  QrCode,
  Share2,
  X,
} from 'lucide-react';
import { ProofOfExecutionCertificate, CertificateVerificationResult } from '../../types/cryptoAudit.ts';
import { verifyCertificate, canonicalJsonStringify } from '../../services/cryptographicAuditService.ts';
import { Button } from '../ui/Button.tsx';

interface ProofOfExecutionModalProps {
  certificate: ProofOfExecutionCertificate | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProofOfExecutionModal: React.FC<ProofOfExecutionModalProps> = ({
  certificate,
  isOpen,
  onClose,
}) => {
  const [verificationResult, setVerificationResult] = useState<CertificateVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'certificate' | 'raw_payload' | 'merkle_proof'>('certificate');

  useEffect(() => {
    if (certificate && isOpen) {
      runVerification();
    }
  }, [certificate, isOpen]);

  if (!isOpen || !certificate) return null;

  const runVerification = async () => {
    setIsVerifying(true);
    try {
      const result = await verifyCertificate(certificate.certificateId);
      setVerificationResult(result);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isSuccess = verificationResult?.valid ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-surface-primary border border-border-subtle rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-border-subtle flex items-center justify-between bg-surface-secondary/40">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${isSuccess ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-text-primary">Proof of Execution Certificate</h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
                  {certificate.type}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Cryptographically signed by {certificate.issuer}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verification Status Banner */}
        <div className={`px-5 py-3 border-b flex items-center justify-between text-xs ${isSuccess ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400'}`}>
          <div className="flex items-center gap-2 font-mono">
            {isVerifying ? (
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <ShieldAlert className="w-4 h-4" />
            )}
            <span>
              {isVerifying
                ? 'Verifying cryptographic state hashes against SHA-256 ledger...'
                : isSuccess
                ? 'Immutable SHA-256 Ledger State Validated (0 Tampering Detected)'
                : 'Verification Warning: Hash mismatch or untrusted signature'}
            </span>
          </div>
          <button
            onClick={runVerification}
            className="text-[11px] font-medium underline hover:text-text-primary flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Re-audit
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-subtle px-5 pt-3 gap-4 bg-surface-secondary/20">
          <button
            onClick={() => setActiveTab('certificate')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'certificate' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
          >
            Certificate Details
          </button>
          <button
            onClick={() => setActiveTab('merkle_proof')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'merkle_proof' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
          >
            Merkle Proof & Hash Chain
          </button>
          <button
            onClick={() => setActiveTab('raw_payload')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'raw_payload' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
          >
            Canonical JSON
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'certificate' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface-secondary/50 rounded-xl border border-border-subtle">
                  <span className="text-[10px] text-text-secondary uppercase font-semibold tracking-wider">Certificate ID</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-mono font-medium text-text-primary truncate">{certificate.certificateId}</span>
                    <button onClick={() => handleCopy(certificate.certificateId, 'certId')} className="text-text-secondary hover:text-primary">
                      {copiedKey === 'certId' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-surface-secondary/50 rounded-xl border border-border-subtle">
                  <span className="text-[10px] text-text-secondary uppercase font-semibold tracking-wider">Timestamp (UTC)</span>
                  <p className="text-xs font-mono font-medium text-text-primary mt-1">
                    {new Date(certificate.timestamp).toUTCString()}
                  </p>
                </div>
              </div>

              {/* SHA-256 State Hash */}
              <div className="p-3.5 bg-surface-secondary/40 rounded-xl border border-border-subtle space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-text-secondary text-xs">
                    <Hash className="w-3.5 h-3.5 text-primary" />
                    <span className="font-semibold text-text-primary">SHA-256 State Hash (Payload)</span>
                  </div>
                  <button
                    onClick={() => handleCopy(certificate.payloadHash, 'payloadHash')}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'payloadHash' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Hash</span>
                  </button>
                </div>
                <div className="p-2.5 bg-black/40 rounded-lg font-mono text-[11px] text-emerald-400 break-all select-all border border-emerald-500/10">
                  {certificate.payloadHash}
                </div>
              </div>

              {/* Cryptographic Signature */}
              <div className="p-3.5 bg-surface-secondary/40 rounded-xl border border-border-subtle space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-text-secondary text-xs">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold text-text-primary">Ed25519 Authority Signature</span>
                  </div>
                  <button
                    onClick={() => handleCopy(certificate.signature, 'sig')}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'sig' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="p-2.5 bg-black/40 rounded-lg font-mono text-[11px] text-text-secondary break-all select-all border border-border-subtle">
                  {certificate.signature}
                </div>
              </div>

              {/* Authority Public Fingerprint */}
              <div className="p-3 bg-surface-secondary/30 rounded-xl border border-border-subtle flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[10px] text-text-secondary uppercase font-semibold">Ledger Authority Fingerprint</div>
                  <div className="font-mono text-xs text-text-primary">{certificate.publicKeyFingerprint}</div>
                </div>
                <div className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-mono font-bold border border-emerald-500/20">
                  VALIDATED
                </div>
              </div>
            </div>
          )}

          {activeTab === 'merkle_proof' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-surface-secondary/40 rounded-xl border border-border-subtle space-y-1.5">
                <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Previous Chain Hash (Parent Block)</span>
                <div className="p-2 bg-black/40 rounded font-mono text-xs text-text-secondary break-all">
                  {certificate.previousRecordHash}
                </div>
              </div>

              <div className="p-3.5 bg-surface-secondary/40 rounded-xl border border-border-subtle space-y-1.5">
                <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Merkle Leaf Digest</span>
                <div className="p-2 bg-black/40 rounded font-mono text-xs text-primary break-all">
                  {certificate.merkleLeafHash}
                </div>
              </div>

              <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-xs text-text-secondary leading-relaxed">
                Every trade and event is cryptographically hashed with its preceding block digest to guarantee that historic records cannot be altered, omitted, or reordered without invalidating the cryptographic Merkle chain.
              </div>
            </div>
          )}

          {activeTab === 'raw_payload' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">Deterministic Canonical Payload (JSON):</span>
                <button
                  onClick={() => handleCopy(certificate.canonicalJson, 'rawJson')}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  {copiedKey === 'rawJson' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy JSON</span>
                </button>
              </div>
              <pre className="p-3.5 bg-black/60 rounded-xl font-mono text-[11px] text-text-primary overflow-x-auto max-h-60 border border-border-subtle">
                {JSON.stringify(JSON.parse(certificate.canonicalJson), null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border-subtle bg-surface-secondary/40 flex items-center justify-between gap-3">
          <div className="text-xs text-text-secondary font-mono flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Public Endpoint: /api/v1/audit/{certificate.certificateId}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(`${window.location.origin}/api/v1/audit/${certificate.certificateId}`, 'url')}
            >
              <Share2 className="w-3.5 h-3.5 mr-1" />
              {copiedKey === 'url' ? 'URL Copied!' : 'Share Proof'}
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
