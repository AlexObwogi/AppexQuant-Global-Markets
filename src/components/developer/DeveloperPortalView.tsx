/**
 * AppexQuant Markets Global - Developer Portal & OpenAPI Documentation Viewer
 * Interactive API keys management, endpoint tester, and HMAC verification reference.
 */

import React, { useState } from 'react';
import {
  Code,
  Key,
  Shield,
  BookOpen,
  Terminal,
  Play,
  Copy,
  CheckCircle2,
  Lock,
  Plus,
  Trash2,
  Send,
  Zap,
} from 'lucide-react';
import {
  DeveloperApiKey,
  ApiScope,
  ApiEndpointDoc,
} from '../../types/developerApi.ts';
import {
  getDeveloperApiKeys,
  generateNewApiKey,
  revokeApiKey,
  API_DOCS_REGISTRY,
} from '../../services/developerApiService.ts';
import { Button } from '../ui/Button.tsx';

export const DeveloperPortalView: React.FC = () => {
  const [keys, setKeys] = useState<DeveloperApiKey[]>(getDeveloperApiKeys());
  const [activeTab, setActiveTab] = useState<'docs' | 'keys' | 'sandbox'>('docs');
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<ApiScope[]>([
    'read:market_data',
    'read:accounts',
    'read:audit_ledger',
  ]);
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Sandbox State
  const [sandboxEndpoint, setSandboxEndpoint] = useState(API_DOCS_REGISTRY[0]);
  const [sandboxResponse, setSandboxResponse] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;
    const { key, rawSecret } = generateNewApiKey(newKeyName, selectedScopes);
    setKeys(getDeveloperApiKeys());
    setGeneratedSecret(rawSecret);
    setNewKeyName('');
  };

  const handleRevokeKey = (apiKey: string) => {
    revokeApiKey(apiKey);
    setKeys(getDeveloperApiKeys());
  };

  const handleRunSandbox = () => {
    setIsSending(true);
    setTimeout(() => {
      setSandboxResponse(JSON.stringify(sandboxEndpoint.sampleResponse, null, 2));
      setIsSending(false);
    }, 400);
  };

  const allAvailableScopes: ApiScope[] = [
    'read:market_data',
    'read:accounts',
    'write:orders',
    'read:audit_ledger',
    'manage:webhooks',
    'read:signals',
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 bg-surface-primary border border-border-subtle rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Code className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">Developer API & Gateway Portal</h2>
          </div>
          <p className="text-xs text-text-secondary max-w-2xl leading-relaxed">
            Integrate quantitative trading algorithms, MT5 EA bridges, risk mirrors, and custom prop-firm client dashboards via high-frequency REST & WebSockets.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-surface-secondary/60 p-1 rounded-xl border border-border-subtle">
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'docs' ? 'bg-primary text-black font-bold' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <BookOpen className="w-3.5 h-3.5" /> OpenAPI Docs
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'sandbox' ? 'bg-primary text-black font-bold' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <Terminal className="w-3.5 h-3.5" /> API Sandbox
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'keys' ? 'bg-primary text-black font-bold' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <Key className="w-3.5 h-3.5" /> API Keys ({keys.filter((k) => k.status === 'ACTIVE').length})
          </button>
        </div>
      </div>

      {/* TAB 1: OpenAPI Docs */}
      {activeTab === 'docs' && (
        <div className="space-y-4">
          <div className="p-4 bg-surface-primary border border-border-subtle rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="font-bold text-text-primary">Base REST URL:</span>
              <code className="px-2 py-0.5 bg-black/40 rounded text-primary border border-primary/20">
                https://api.appexquant.markets/v1
              </code>
            </div>
            <span className="text-text-secondary">Auth Header: <code>X-API-KEY: apx_live_...</code></span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {API_DOCS_REGISTRY.map((doc, idx) => (
              <div key={idx} className="p-5 bg-surface-primary border border-border-subtle hover:border-border-medium rounded-2xl transition-all space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-black ${doc.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : doc.method === 'POST' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {doc.method}
                    </span>
                    <span className="font-mono text-sm font-bold text-text-primary">{doc.path}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-secondary text-text-secondary border border-border-subtle">
                      Scope: {doc.requiredScope}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-secondary text-text-secondary border border-border-subtle">
                      {doc.rateLimit}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-text-secondary">{doc.description}</p>

                {doc.parameters && (
                  <div className="p-3 bg-surface-secondary/40 rounded-xl space-y-1.5 border border-border-subtle">
                    <span className="text-[10px] font-semibold text-text-secondary uppercase">Parameters</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                      {doc.parameters.map((p, pIdx) => (
                        <div key={pIdx} className="text-text-secondary">
                          <span className="text-text-primary font-bold">{p.name}</span> ({p.type}) - {p.description}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-black/40 rounded-xl border border-border-subtle space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-text-secondary uppercase">
                    <span>Response Schema (200 OK)</span>
                    <button
                      onClick={() => handleCopy(JSON.stringify(doc.sampleResponse, null, 2), `doc-${idx}`)}
                      className="text-primary hover:underline flex items-center gap-1 text-[11px]"
                    >
                      {copiedText === `doc-${idx}` ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-36">
                    {JSON.stringify(doc.sampleResponse, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Sandbox Console */}
      {activeTab === 'sandbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 bg-surface-primary border border-border-subtle rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Select Test Endpoint</h3>
              <div className="space-y-2">
                {API_DOCS_REGISTRY.map((doc, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSandboxEndpoint(doc);
                      setSandboxResponse(null);
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${sandboxEndpoint.path === doc.path ? 'bg-primary/10 border-primary text-text-primary' : 'bg-surface-secondary/40 border-border-subtle text-text-secondary hover:text-text-primary'}`}
                  >
                    <div className="flex items-center gap-2 font-mono text-xs font-bold">
                      <span className={doc.method === 'GET' ? 'text-emerald-400' : 'text-primary'}>{doc.method}</span>
                      <span>{doc.path}</span>
                    </div>
                    <div className="text-[11px] text-text-secondary mt-1">{doc.summary}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 bg-surface-primary border border-border-subtle rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs font-bold">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">{sandboxEndpoint.method}</span>
                  <span className="text-text-primary">{sandboxEndpoint.path}</span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRunSandbox}
                  disabled={isSending}
                  className="text-xs bg-primary text-black font-bold gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSending ? 'Executing...' : 'Send Request'}
                </Button>
              </div>

              <div className="p-4 bg-black/60 rounded-xl border border-border-subtle min-h-[220px] font-mono text-xs">
                {sandboxResponse ? (
                  <pre className="text-emerald-400 overflow-x-auto whitespace-pre-wrap">{sandboxResponse}</pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-text-secondary text-xs">
                    Click "Send Request" to simulate real-time API execution with HMAC authentication.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: API Keys Management */}
      {activeTab === 'keys' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-text-primary">Production & Sandbox API Keys</h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsGenerateOpen(true)}
              className="text-xs bg-primary text-black font-bold gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Create New Key
            </Button>
          </div>

          {generatedSecret && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <Lock className="w-4 h-4" /> Save Your API Secret Now
              </div>
              <p className="text-xs text-text-secondary">
                This secret is only shown ONCE. Store it securely for HMAC request signatures.
              </p>
              <div className="p-2.5 bg-black/60 rounded-lg font-mono text-xs text-amber-300 break-all select-all flex items-center justify-between">
                <span>{generatedSecret}</span>
                <button
                  onClick={() => handleCopy(generatedSecret, 'secret')}
                  className="text-text-secondary hover:text-amber-300 ml-2"
                >
                  {copiedText === 'secret' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {keys.map((k) => (
              <div
                key={k.id}
                className={`p-4 bg-surface-primary border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${k.status === 'REVOKED' ? 'opacity-50 border-border-subtle' : 'border-border-subtle hover:border-border-medium'}`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-primary">{k.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${k.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {k.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs text-text-secondary">
                    <span>Key: {k.apiKey}</span>
                    <button onClick={() => handleCopy(k.apiKey, k.id)} className="hover:text-primary">
                      {copiedText === k.id ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {k.scopes.map((s) => (
                      <span key={s} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-secondary text-text-secondary">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {k.status === 'ACTIVE' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevokeKey(k.apiKey)}
                    className="text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10 self-end sm:self-center"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate Key Modal */}
      {isGenerateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-surface-primary border border-border-subtle rounded-2xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-text-primary">Generate Developer API Key</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-text-secondary font-semibold uppercase">Key Name</label>
                <input
                  type="text"
                  placeholder="e.g. My Arbitrage Bot Server"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-surface-secondary border border-border-subtle rounded-xl text-xs text-text-primary"
                />
              </div>

              <div>
                <label className="text-[10px] text-text-secondary font-semibold uppercase">Authorized Scopes</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {allAvailableScopes.map((scope) => {
                    const isChecked = selectedScopes.includes(scope);
                    return (
                      <label key={scope} className="flex items-center gap-2 p-2 bg-surface-secondary/40 rounded-lg text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedScopes([...selectedScopes, scope]);
                            } else {
                              setSelectedScopes(selectedScopes.filter((s) => s !== scope));
                            }
                          }}
                          className="rounded accent-primary"
                        />
                        <span className="font-mono text-[11px] text-text-primary">{scope}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsGenerateOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleCreateKey} className="bg-primary text-black font-bold">
                Generate Key
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
