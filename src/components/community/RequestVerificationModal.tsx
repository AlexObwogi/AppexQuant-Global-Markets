/**
 * AppexQuant Markets Global - Request Verification Upgrade Modal
 * Submit Govt ID, Broker Account, or Deriv Live MT5 proof to advance verification levels
 */

import React, { useState } from 'react';
import { VerificationStatus } from '../../types/community';
import { ShieldCheck, Upload, FileText, CheckCircle2, X } from 'lucide-react';

interface RequestVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitRequest: (payload: {
    requestedLevel: 'IDENTITY_VERIFIED' | 'ACCOUNT_VERIFIED' | 'PERFORMANCE_VERIFIED';
    documentProofType: 'GOVT_ID' | 'BROKER_STATEMENT' | 'CONNECTED_DERIV_ACCOUNT';
    proofDetails: string;
  }) => void;
}

export const RequestVerificationModal: React.FC<RequestVerificationModalProps> = ({
  isOpen,
  onClose,
  onSubmitRequest,
}) => {
  const [requestedLevel, setRequestedLevel] = useState<'IDENTITY_VERIFIED' | 'ACCOUNT_VERIFIED' | 'PERFORMANCE_VERIFIED'>('PERFORMANCE_VERIFIED');
  const [documentProofType, setDocumentProofType] = useState<'GOVT_ID' | 'BROKER_STATEMENT' | 'CONNECTED_DERIV_ACCOUNT'>('CONNECTED_DERIV_ACCOUNT');
  const [proofDetails, setProofDetails] = useState('Deriv Real MT5 #CR882910 (Server: Deriv-Server-01)');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofDetails.trim()) return;

    onSubmitRequest({
      requestedLevel,
      documentProofType,
      proofDetails,
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111622] border border-border-color rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-color pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100 font-mono uppercase">Request Performance Verification</h3>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3 font-mono">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h4 className="text-base font-bold text-slate-100">Verification Request Submitted</h4>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              Your request and account audit records have been queued for administrator review. Status will update automatically upon approval.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block text-text-primary font-mono uppercase text-[11px] mb-1 font-bold">Target Verification Level</label>
              <select
                value={requestedLevel}
                onChange={(e) => setRequestedLevel(e.target.value as any)}
                className="w-full bg-[#131822] border border-border-color rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
              >
                <option value="IDENTITY_VERIFIED">IDENTITY_VERIFIED (KYC Document)</option>
                <option value="ACCOUNT_VERIFIED">ACCOUNT_VERIFIED (Connected Broker Account)</option>
                <option value="PERFORMANCE_VERIFIED">PERFORMANCE_VERIFIED (Audited Live Execution History)</option>
              </select>
            </div>

            <div>
              <label className="block text-text-primary font-mono uppercase text-[11px] mb-1 font-bold">Proof Type</label>
              <select
                value={documentProofType}
                onChange={(e) => setDocumentProofType(e.target.value as any)}
                className="w-full bg-[#131822] border border-border-color rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
              >
                <option value="CONNECTED_DERIV_ACCOUNT">Connected Deriv Live MT5 Account</option>
                <option value="BROKER_STATEMENT">Official Broker PDF Trading Statement</option>
                <option value="GOVT_ID">Government Issued Photo ID</option>
              </select>
            </div>

            <div>
              <label className="block text-text-primary font-mono uppercase text-[11px] mb-1 font-bold">Account / Document Reference Details</label>
              <input
                type="text"
                required
                value={proofDetails}
                onChange={(e) => setProofDetails(e.target.value)}
                placeholder="e.g. Deriv Real Account #CR882910"
                className="w-full bg-[#131822] border border-border-color rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>

            <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-xl text-[11px] text-cyan-300 font-mono space-y-1">
              <strong>Mandatory Compliance Rule:</strong>
              <p className="text-text-secondary">
                To achieve PERFORMANCE_VERIFIED status, trades must be generated directly by an integrated live broker API or verified via official MT5 trading logs. Administrator creation of a profile does NOT grant performance verification.
              </p>
            </div>

            <div className="pt-3 border-t border-border-color flex justify-end gap-3 font-mono">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-bg-hover text-text-primary font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-bg-main font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Submit Verification Request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
