/**
 * AppexQuant Markets Global - Professional Legal & Disclosure Center
 * Complete 10-Section Regulatory Disclosure Console, Versioning & Acceptance Engine
 */

import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../state/GlobalStateContext';
import { useApiFetch } from '../utils/apiFetch';
import { Card } from '../components/ui/Card';
import { OFFICIAL_LEGAL_DOCUMENTS } from '../data/legalDocuments';
import { LegalDocument, LegalAcceptanceRecord, LegalAcceptanceSummary } from '../types/legal';
import { PerformanceDisclaimerBanner } from '../components/common/PerformanceDisclaimer';
import {
  ShieldCheck,
  AlertTriangle,
  Lock,
  FileText,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Award,
  Layers,
  History,
  Info,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Zap,
} from 'lucide-react';

export const LegalView: React.FC = () => {
  const { state, dispatch } = useGlobalState();
  const apiFetch = useApiFetch();
  const userId = state.user?.id || 'usr-default-001';

  const [documents, setDocuments] = useState<LegalDocument[]>(OFFICIAL_LEGAL_DOCUMENTS);
  const [acceptances, setAcceptances] = useState<LegalAcceptanceRecord[]>([]);
  const [summary, setSummary] = useState<LegalAcceptanceSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'documents' | 'audit' | 'management'>('documents');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedDocId, setExpandedDocId] = useState<string | null>('risk-disclosure');
  const [acceptingDocId, setAcceptingDocId] = useState<string | null>(null);

  // Admin document update simulator state
  const [adminDocId, setAdminDocId] = useState<string>('risk-disclosure');
  const [adminNewVersion, setAdminNewVersion] = useState<string>('v2.5');

  // Load legal documents and acceptance summary
  const fetchLegalData = async () => {
    setLoading(true);
    try {
      // 1. Fetch documents
      const docsRes = await apiFetch('/api/legal/documents');
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        if (docsData.data) {
          setDocuments(docsData.data);
        }
      }

      // 2. Fetch user acceptances
      const accRes = await apiFetch(`/api/legal/acceptances/${userId}`);
      if (accRes.ok) {
        const accData = await accRes.json();
        if (accData.data) {
          setSummary(accData.data);
          setAcceptances(accData.data.records || []);
        }
      }
    } catch (err) {
      console.error('Failed to load legal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLegalData();
  }, [userId]);

  // Handle accepting a single document version
  const handleAcceptDocument = async (docId: string, version: string) => {
    setAcceptingDocId(docId);
    try {
      const res = await apiFetch('/api/legal/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          document: docId,
          version,
          accepted: true,
        }),
      });

      if (res.ok) {
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            type: 'success',
            title: 'Document Accepted',
            message: `You have successfully accepted version ${version} of ${docId}.`,
          },
        });
        await fetchLegalData();
      } else {
        const err = await res.json();
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            type: 'error',
            title: 'Acceptance Failed',
            message: err.error?.message || 'Failed to record acceptance.',
          },
        });
      }
    } catch (err: any) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'error',
          title: 'Network Error',
          message: err.message || 'Error recording acceptance.',
        },
      });
    } finally {
      setAcceptingDocId(null);
    }
  };

  // Handle master "Accept All Updated Terms"
  const handleAcceptAll = async () => {
    setAcceptingDocId('ALL');
    try {
      let successCount = 0;
      for (const doc of documents) {
        const isAccepted = acceptances.some(
          (r) => r.document === doc.id && r.version === doc.version && r.accepted
        );
        if (!isAccepted) {
          await apiFetch('/api/legal/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              document: doc.id,
              version: doc.version,
              accepted: true,
            }),
          });
          successCount++;
        }
      }

      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          title: 'All Legal Terms Accepted',
          message: `Successfully accepted ${successCount} updated legal and regulatory disclosures.`,
        },
      });

      await fetchLegalData();
    } catch (err: any) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'error',
          title: 'Batch Acceptance Error',
          message: err.message || 'Failed to accept all terms.',
        },
      });
    } finally {
      setAcceptingDocId(null);
    }
  };

  // Simulate updating a document version to test material re-acceptance
  const handleSimulateDocumentUpdate = async () => {
    try {
      const targetDoc = documents.find((d) => d.id === adminDocId);
      if (!targetDoc) return;

      const res = await apiFetch('/api/legal/documents/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: adminDocId,
          newVersion: adminNewVersion,
          isMaterialUpdate: true,
        }),
      });

      if (res.ok) {
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            type: 'warning',
            title: 'Material Document Update Published',
            message: `Published ${adminDocId} ${adminNewVersion}. All users are now required to re-accept!`,
          },
        });
        await fetchLegalData();
      } else {
        const err = await res.json();
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            type: 'error',
            title: 'Update Failed',
            message: err.error?.message || 'Failed to publish document update.',
          },
        });
      }
    } catch (err: any) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'error',
          title: 'Update Error',
          message: err.message,
        },
      });
    }
  };

  // Filter categories
  const categories = ['ALL', ...Array.from(new Set(documents.map((d) => d.category)))];

  const filteredDocuments = documents.filter((doc) => {
    const matchesCategory = selectedCategory === 'ALL' || doc.category === selectedCategory;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const isDocAccepted = (docId: string, version: string) => {
    return acceptances.some((r) => r.document === docId && r.version === version && r.accepted);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="p-6 bg-bg-surface border border-border-color rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-6 h-6 text-sky-500 dark:text-sky-400" />
            <h2 className="text-2xl font-bold text-text-primary">Legal & Regulatory Disclosure Center</h2>
          </div>
          <p className="text-xs text-text-secondary">
            Binding terms of service, regulatory disclaimers, AI disclosures, and automated acceptance verification console.
          </p>
        </div>

        {/* Master Acceptance Status Counter */}
        {summary && (
          <div className="flex items-center gap-3 bg-bg-secondary p-3 rounded-xl border border-border-color">
            <div className="text-right">
              <div className="text-xs text-text-secondary uppercase font-mono tracking-wider">Acceptance Status</div>
              <div className="text-sm font-bold flex items-center gap-1.5 justify-end">
                {summary.allAccepted ? (
                  <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> ALL TERMS ACCEPTED
                  </span>
                ) : (
                  <span className="text-amber-500 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> RE-ACCEPTANCE REQUIRED
                  </span>
                )}
              </div>
            </div>
            <div className="px-3 py-1.5 bg-bg-hover rounded-lg text-xs font-mono font-bold text-text-secondary">
              {summary.acceptedCount} / {summary.totalDocuments}
            </div>
          </div>
        )}
      </div>

      {/* Mandatory Performance Disclaimer Banner */}
      <PerformanceDisclaimerBanner environment="PAPER" title="Regulatory Performance Notice" />

      {/* Pending Re-acceptance Notice (If any document requires re-acceptance) */}
      {summary && !summary.allAccepted && (
        <Card variant="surface" className="p-5 border-amber-500/30 bg-amber-500/5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-300 text-sm">Action Required: Material Terms Updated</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  You have <strong>{summary.pendingCount}</strong> updated legal disclosures requiring explicit re-acceptance before live trading feature activation.
                </p>
              </div>
            </div>
            <button
              onClick={handleAcceptAll}
              disabled={acceptingDocId === 'ALL'}
              className="bg-amber-500 hover:bg-amber-400 text-text-secondary px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              {acceptingDocId === 'ALL' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
              <span>Accept All {summary.pendingCount} Updated Disclosures</span>
            </button>
          </div>
        </Card>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-border-color text-xs font-mono">
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-5 py-3 border-b-2 font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'documents'
              ? 'border-sky-400 text-sky-400 bg-sky-500/5'
              : 'border-transparent text-text-secondary hover:text-text-secondary'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>10 Disclosure Sections</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-3 border-b-2 font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'audit'
              ? 'border-sky-400 text-sky-400 bg-sky-500/5'
              : 'border-transparent text-text-secondary hover:text-text-secondary'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Acceptance Audit Log ({acceptances.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('management')}
          className={`px-5 py-3 border-b-2 font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'management'
              ? 'border-sky-400 text-sky-400 bg-sky-500/5'
              : 'border-transparent text-text-secondary hover:text-text-secondary'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Version Simulator (Re-acceptance Test)</span>
        </button>
      </div>

      {/* TAB 1: 10 DISCLOSURE SECTIONS */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-bg-surface p-4 rounded-xl border border-border-color">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search legal clauses, terms, or disclosures..."
                className="w-full bg-bg-secondary border border-border-color rounded-lg pl-9 pr-4 py-2 text-xs text-text-secondary focus:outline-none focus:border-sky-500/50"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Filter className="w-3.5 h-3.5 text-text-secondary shrink-0" />
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono whitespace-nowrap cursor-pointer transition-colors ${
                    selectedCategory === cat
                      ? 'bg-sky-500 text-text-secondary font-bold'
                      : 'bg-bg-hover/60 text-text-secondary hover:bg-bg-hover hover:text-text-secondary'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* List of Legal Documents */}
          <div className="space-y-4">
            {filteredDocuments.map((doc, idx) => {
              const accepted = isDocAccepted(doc.id, doc.version);
              const isExpanded = expandedDocId === doc.id;

              return (
                <Card
                  key={doc.id}
                  variant="surface"
                  className={`border transition-all ${
                    !accepted
                      ? 'border-amber-500/30 bg-amber-500/[0.02]'
                      : 'border-border-color/80 hover:border-border-color'
                  }`}
                >
                  {/* Document Header Bar */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-color/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-text-secondary text-xs font-mono font-bold">0{idx + 1}.</span>
                        <h3 className="text-base font-bold text-text-secondary">{doc.title}</h3>
                        <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-mono font-bold">
                          {doc.version}
                        </span>
                        <span className="text-[10px] text-text-secondary font-mono">
                          Effective: {doc.effectiveDate}
                        </span>
                        {doc.isMaterialUpdate && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold">
                            Material Update
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary">{doc.summary}</p>
                    </div>

                    {/* Right Action: Acceptance Tag & Expand Toggle */}
                    <div className="flex items-center gap-3 shrink-0">
                      {accepted ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>ACCEPTED ({doc.version})</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAcceptDocument(doc.id, doc.version)}
                          disabled={acceptingDocId === doc.id}
                          className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-text-secondary font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {acceptingDocId === doc.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                          <span>Accept Version {doc.version}</span>
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                        className="p-1.5 rounded-lg bg-bg-hover text-text-secondary hover:text-text-secondary transition-colors cursor-pointer"
                        title={isExpanded ? 'Collapse clauses' : 'Expand full clauses'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Document Content Clauses */}
                  {isExpanded && (
                    <div className="p-6 bg-bg-secondary space-y-4 text-xs sm:text-sm text-text-secondary leading-relaxed border-t border-border-color/80">
                      <div className="text-text-secondary font-mono uppercase text-[11px] tracking-wider mb-2">
                        Official Legal Clauses & Regulatory Terms
                      </div>
                      <div className="space-y-3">
                        {doc.content.map((clause, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-3 bg-bg-surface rounded-lg border border-border-color/60 leading-relaxed"
                          >
                            {clause}
                          </div>
                        ))}
                      </div>

                      {!accepted && (
                        <div className="pt-3 border-t border-border-color flex justify-end">
                          <button
                            onClick={() => handleAcceptDocument(doc.id, doc.version)}
                            disabled={acceptingDocId === doc.id}
                            className="px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-text-secondary font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Sign & Accept Clause {doc.version}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ACCEPTANCE AUDIT LOG */}
      {activeTab === 'audit' && (
        <Card variant="surface" className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border-color pb-3">
            <div>
              <h3 className="text-base font-bold text-text-secondary flex items-center gap-2">
                <History className="w-5 h-5 text-sky-400" />
                Immutable User Legal Acceptance Log
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Audit record storing <code className="text-sky-300">userId</code>, <code className="text-sky-300">document</code>, <code className="text-sky-300">version</code>, <code className="text-sky-300">timestamp</code>, and acceptance confirmation.
              </p>
            </div>
            <button
              onClick={fetchLegalData}
              className="p-2 rounded-lg bg-bg-hover text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {acceptances.length === 0 ? (
            <div className="py-12 text-center text-text-secondary text-xs">
              No acceptance records found for user {userId}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-text-secondary border-b border-border-color uppercase text-[10px]">
                    <th className="pb-2">User ID</th>
                    <th className="pb-2">Document ID</th>
                    <th className="pb-2">Version</th>
                    <th className="pb-2">Timestamp (UTC)</th>
                    <th className="pb-2">Accepted</th>
                    <th className="pb-2">IP Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {acceptances.map((rec, i) => (
                    <tr key={rec.id || i} className="hover:bg-bg-hover/20">
                      <td className="py-3 font-bold text-text-secondary">{rec.userId}</td>
                      <td className="py-3 text-sky-400 font-bold">{rec.document}</td>
                      <td className="py-3 text-amber-300">{rec.version}</td>
                      <td className="py-3 text-text-secondary">{rec.timestamp}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" /> TRUE
                        </span>
                      </td>
                      <td className="py-3 text-text-secondary">{rec.userIp || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: MATERIAL UPDATE VERSION SIMULATOR */}
      {activeTab === 'management' && (
        <Card variant="surface" className="p-6 space-y-6">
          <div className="border-b border-border-color pb-3">
            <h3 className="text-base font-bold text-text-secondary flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              Material Document Version Simulator
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Simulate publishing a material update to a legal document. When a new version is published, all connected users are automatically flagged as pending re-acceptance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-bg-secondary p-5 rounded-xl border border-border-color">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-text-secondary mb-1">Target Legal Document</label>
                <select
                  value={adminDocId}
                  onChange={(e) => setAdminDocId(e.target.value)}
                  className="w-full bg-bg-surface border border-border-color rounded-lg p-2.5 text-xs text-text-secondary focus:outline-none focus:border-sky-500"
                >
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} (Current: {d.version})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-text-secondary mb-1">New Material Version Number</label>
                <input
                  type="text"
                  value={adminNewVersion}
                  onChange={(e) => setAdminNewVersion(e.target.value)}
                  placeholder="e.g. v2.5, v3.0"
                  className="w-full bg-bg-surface border border-border-color rounded-lg p-2.5 text-xs text-text-secondary focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                onClick={handleSimulateDocumentUpdate}
                className="w-full bg-amber-500 hover:bg-amber-400 text-text-secondary font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Publish Material Update & Force Re-acceptance</span>
              </button>
            </div>

            <div className="p-4 bg-bg-surface rounded-xl border border-border-color space-y-2 text-xs text-text-secondary">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <Info className="w-4 h-4" /> How Re-acceptance Works:
              </div>
              <ul className="list-disc list-inside space-y-1 text-text-secondary text-[11px] leading-relaxed">
                <li>Every document version is tracked deterministically on the server.</li>
                <li>When a document version increases, recorded user acceptances for prior versions become obsolete.</li>
                <li>The server evaluates acceptance by matching <code className="text-sky-300">documentId + version</code>.</li>
                <li>If any active document version is unaccepted, the system triggers the <strong>Re-acceptance Required</strong> warning status.</li>
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
