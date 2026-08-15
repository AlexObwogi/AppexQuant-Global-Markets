/**
 * AppexQuant Markets Global - Administrator Moderation & Verification Console
 */

import React, { useState } from 'react';
import { CommunityReport, VerificationRequest } from '../../types/community.ts';
import { VerificationBadge } from './VerificationBadge.tsx';
import {
  ShieldAlert,
  ShieldCheck,
  Check,
  X,
  Trash2,
  Ban,
  FileText,
  AlertTriangle,
  UserCheck,
  RefreshCw,
} from 'lucide-react';

interface AdminCommunityConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: CommunityReport[];
  verificationRequests: VerificationRequest[];
  onResolveReport: (reportId: string, actionTaken: string) => void;
  onReviewVerificationRequest: (requestId: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) => void;
}

export const AdminCommunityConsoleModal: React.FC<AdminCommunityConsoleModalProps> = ({
  isOpen,
  onClose,
  reports,
  verificationRequests,
  onResolveReport,
  onReviewVerificationRequest,
}) => {
  const [activeTab, setActiveTab] = useState<'VERIFICATIONS' | 'REPORTS'>('VERIFICATIONS');
  const [rejectionReasonMap, setRejectionReasonMap] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const pendingRequests = verificationRequests.filter((r) => r.status === 'PENDING');
  const pendingReports = reports.filter((r) => r.status === 'PENDING');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111622] border border-border-color rounded-2xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-color pb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-slate-100 font-mono uppercase">Admin Moderation & Verification Console</h3>
              <p className="text-xs text-text-secondary font-mono">Enforce compliance, review connected broker records, and moderate content</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 font-mono text-xs border-b border-border-color pb-2">
          <button
            onClick={() => setActiveTab('VERIFICATIONS')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'VERIFICATIONS'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-bg-surface text-text-secondary border border-border-color hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verification Queue ({pendingRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('REPORTS')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'REPORTS'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-bg-surface text-text-secondary border border-border-color hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Report Queue ({pendingReports.length})</span>
          </button>
        </div>

        {/* TAB 1: VERIFICATION REQUESTS */}
        {activeTab === 'VERIFICATIONS' && (
          <div className="space-y-4">
            {pendingRequests.length === 0 ? (
              <div className="py-12 text-center text-text-secondary font-mono text-xs border border-dashed border-border-color rounded-xl">
                No pending verification requests in the review queue.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="p-4 rounded-xl bg-[#0B0E14] border border-border-color space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-border-color/80 pb-2">
                      <div>
                        <span className="font-bold text-slate-100 text-sm">{req.userName}</span>
                        <span className="text-text-secondary text-xs ml-2">(@{req.userUsername})</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-bold">
                        REQUESTED LEVEL: {req.requestedLevel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-text-primary">
                      <div>
                        <span className="text-text-secondary uppercase block text-[10px]">Proof Document Type</span>
                        <span className="font-bold text-slate-200">{req.documentProofType}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary uppercase block text-[10px]">Submitted At</span>
                        <span className="text-text-secondary">{new Date(req.submittedAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-[#131822] border border-border-color text-[11px] text-cyan-300">
                      <strong>Broker / Ref Proof:</strong> {req.proofDetails}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border-color/80">
                      <input
                        type="text"
                        placeholder="Rejection reason (if rejecting)..."
                        value={rejectionReasonMap[req.id] || ''}
                        onChange={(e) => setRejectionReasonMap({ ...rejectionReasonMap, [req.id]: e.target.value })}
                        className="w-full sm:w-auto flex-1 bg-[#131822] border border-border-color rounded px-2.5 py-1 text-[11px] text-slate-200"
                      />

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => onReviewVerificationRequest(req.id, 'REJECTED', rejectionReasonMap[req.id] || 'Insufficient proof')}
                          className="px-3 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-[11px] cursor-pointer flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>

                        <button
                          onClick={() => onReviewVerificationRequest(req.id, 'APPROVED')}
                          className="px-3.5 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-bg-main font-bold text-[11px] uppercase tracking-wider cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve & Elevate Status
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REPORTS */}
        {activeTab === 'REPORTS' && (
          <div className="space-y-4">
            {pendingReports.length === 0 ? (
              <div className="py-12 text-center text-text-secondary font-mono text-xs border border-dashed border-border-color rounded-xl">
                No active user reports requiring moderation attention.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingReports.map((report) => (
                  <div key={report.id} className="p-4 rounded-xl bg-[#0B0E14] border border-border-color space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-border-color/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase">
                          {report.reason}
                        </span>
                        <span className="text-text-primary font-bold">{report.targetTitleOrName}</span>
                      </div>
                      <span className="text-text-secondary text-[10px]">{new Date(report.createdAt).toLocaleTimeString()}</span>
                    </div>

                    <p className="text-text-primary text-xs font-sans leading-relaxed">{report.details}</p>

                    <div className="text-[11px] text-text-secondary">
                      Reported by: <span className="text-text-primary">{report.reporterName}</span> (Target Type: {report.targetType})
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-color/80">
                      <button
                        onClick={() => onResolveReport(report.id, 'DISMISSED')}
                        className="px-3 py-1.5 rounded bg-bg-hover hover:bg-bg-hover text-text-primary font-bold text-[11px] cursor-pointer"
                      >
                        Dismiss Report
                      </button>

                      <button
                        onClick={() => onResolveReport(report.id, 'DELETE_POST')}
                        className="px-3.5 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-[11px] cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Content
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
