/**
 * AppexQuant Markets Global - Webhook Payload Inspector Component
 * Real-time logging of incoming and outgoing raw JSON payloads for all third-party social integrations,
 * featuring interactive schema diffing, unknown/deprecated field detection, and live payload replay debugging.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  WebhookPayloadRecord,
  WebhookFilterOptions,
  WebhookReplayRequest,
  ExtendedIntegrationPlatform,
  WebhookSchemaStatus,
} from '../../types/webhookInspector.ts';
import {
  webhookInspectorService,
  INTEGRATION_SCHEMAS,
} from '../../services/webhookInspectorService.ts';
import { Button } from '../ui/Button.tsx';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Trash2,
  Download,
  Filter,
  Code,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  Globe,
  Layers,
  Sparkles,
  ExternalLink,
  FileJson,
  Cpu,
  Clock,
  Send,
  Zap,
} from 'lucide-react';

export const WebhookPayloadInspector: React.FC = () => {
  const [payloads, setPayloads] = useState<WebhookPayloadRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'payload' | 'diff' | 'headers' | 'response'>('payload');
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters State
  const [filterPlatform, setFilterPlatform] = useState<string>('ALL');
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'INCOMING' | 'OUTGOING'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SUCCESS' | 'ERROR' | 'SCHEMA_WARNING'>('ALL');
  const [filterSchemaStatus, setFilterSchemaStatus] = useState<'ALL' | WebhookSchemaStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Replay Simulator Modal State
  const [isReplayModalOpen, setIsReplayModalOpen] = useState<boolean>(false);
  const [replayPlatform, setReplayPlatform] = useState<ExtendedIntegrationPlatform>('TELEGRAM_BOT');
  const [replayDirection, setReplayDirection] = useState<'INCOMING' | 'OUTGOING'>('INCOMING');
  const [replayUrl, setReplayUrl] = useState<string>('/api/v1/automation/webhooks/incoming/telegram');
  const [replayHeadersJson, setReplayHeadersJson] = useState<string>(
    JSON.stringify({ 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'sec_tg_78192847a98b' }, null, 2)
  );
  const [replayPayloadJson, setReplayPayloadJson] = useState<string>(
    JSON.stringify(
      {
        update_id: 849201999,
        message: {
          message_id: 4001,
          chat: { id: -100192847192, title: 'AppexQuant Global Signals VIP', type: 'channel' },
          date: Math.floor(Date.now() / 1000),
          text: '📊 [AI Setup] Gold XAUUSD Long limit at 2,514.80 confirmed with 1:3.5 RR.',
        },
      },
      null,
      2
    )
  );
  const [replayJsonError, setReplayJsonError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Webhook URLs Endpoint Modal
  const [isUrlsModalOpen, setIsUrlsModalOpen] = useState<boolean>(false);

  // Subscribe to Live Updates
  useEffect(() => {
    const fetchCurrent = async () => {
      const records = await webhookInspectorService.getPayloads();
      setPayloads(records);
      if (records.length > 0 && !selectedId) {
        setSelectedId(records[0].id);
      }
    };

    fetchCurrent();
    const unsub = webhookInspectorService.subscribe(fetchCurrent);
    return () => unsub();
  }, []);

  // Filtered payloads
  const filteredPayloads = useMemo(() => {
    return payloads.filter((item) => {
      if (filterPlatform !== 'ALL' && item.platform !== filterPlatform) return false;
      if (filterDirection !== 'ALL' && item.direction !== filterDirection) return false;
      if (filterSchemaStatus !== 'ALL' && item.schemaValidation.status !== filterSchemaStatus) return false;
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'SUCCESS' && (item.httpStatus < 200 || item.httpStatus >= 300)) return false;
        if (filterStatus === 'ERROR' && item.httpStatus < 400) return false;
        if (filterStatus === 'SCHEMA_WARNING' && item.schemaValidation.status === 'VALID') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullString = (
          item.id +
          item.platform +
          item.endpointUrl +
          item.eventType +
          JSON.stringify(item.rawPayload) +
          JSON.stringify(item.headers) +
          JSON.stringify(item.responseBody || {})
        ).toLowerCase();
        if (!fullString.includes(q)) return false;
      }
      return true;
    });
  }, [payloads, filterPlatform, filterDirection, filterStatus, filterSchemaStatus, searchQuery]);

  const selectedRecord = useMemo(() => {
    return payloads.find((p) => p.id === selectedId) || filteredPayloads[0] || null;
  }, [payloads, filteredPayloads, selectedId]);

  const handleCopy = (text: string, idKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJsonDump = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredPayloads, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `appexquant-webhooks-dump-${new Date().toISOString().slice(0, 19)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleClearBuffer = () => {
    if (confirm('Are you sure you want to clear all logged webhook payloads?')) {
      webhookInspectorService.clearBuffer();
      setSelectedId(null);
    }
  };

  const handleOpenSimulatorWithRecord = (record: WebhookPayloadRecord) => {
    setReplayPlatform(record.platform);
    setReplayDirection(record.direction);
    setReplayUrl(record.endpointUrl);
    setReplayHeadersJson(JSON.stringify(record.headers, null, 2));
    setReplayPayloadJson(JSON.stringify(record.rawPayload, null, 2));
    setReplayJsonError(null);
    setIsReplayModalOpen(true);
  };

  const handleExecuteReplay = async () => {
    try {
      setReplayJsonError(null);
      const parsedPayload = JSON.parse(replayPayloadJson);
      const parsedHeaders = JSON.parse(replayHeadersJson);

      setIsSimulating(true);
      const request: WebhookReplayRequest = {
        platform: replayPlatform,
        direction: replayDirection,
        endpointUrl: replayUrl,
        httpMethod: 'POST',
        headers: parsedHeaders,
        payload: parsedPayload,
      };

      const result = await webhookInspectorService.simulateReplay(request);
      setIsSimulating(false);
      setIsReplayModalOpen(false);
      setSelectedId(result.executedRecord.id);
    } catch (err: any) {
      setIsSimulating(false);
      setReplayJsonError(`JSON Syntax Error: ${err.message}`);
    }
  };

  const loadPresetTemplate = (platformPreset: ExtendedIntegrationPlatform) => {
    setReplayPlatform(platformPreset);
    if (platformPreset === 'TELEGRAM_BOT') {
      setReplayUrl('/api/v1/automation/webhooks/incoming/telegram');
      setReplayHeadersJson(JSON.stringify({ 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'sec_tg_test' }, null, 2));
      setReplayPayloadJson(
        JSON.stringify(
          {
            update_id: Math.floor(800000000 + Math.random() * 90000000),
            channel_post: {
              message_id: Math.floor(1000 + Math.random() * 9000),
              chat: { id: -100192847192, title: 'AppexQuant Signals VIP', type: 'channel' },
              date: Math.floor(Date.now() / 1000),
              text: '⚡ [AI Signal] Volatility 75 Index BUY setup triggered at 482,100.',
            },
          },
          null,
          2
        )
      );
    } else if (platformPreset === 'META_INSTAGRAM') {
      setReplayUrl('/api/v1/automation/webhooks/incoming/meta');
      setReplayHeadersJson(JSON.stringify({ 'content-type': 'application/json', 'x-hub-signature-256': 'sha256=test_signature' }, null, 2));
      setReplayPayloadJson(
        JSON.stringify(
          {
            object: 'instagram',
            entry: [
              {
                id: '17841400123456789',
                time: Math.floor(Date.now() / 1000),
                changes: [
                  {
                    field: 'comments',
                    value: { id: 'cmt_998124', text: 'Does this bot execute automatically on MT5?' },
                  },
                ],
                // Test Schema Diff: Simulated new field in v20.0
                ai_sentiment_score: 0.94,
              },
            ],
          },
          null,
          2
        )
      );
    } else if (platformPreset === 'DISCORD_WEBHOOK') {
      setReplayDirection('OUTGOING');
      setReplayUrl('https://discord.com/api/v10/webhooks/1209384/xyz-token');
      setReplayHeadersJson(JSON.stringify({ 'Content-Type': 'application/json' }, null, 2));
      setReplayPayloadJson(
        JSON.stringify(
          {
            content: '🚀 **Live Execution Alert**',
            username: 'AppexQuant Dispatcher',
            embeds: [
              {
                title: 'BTC/USDT 4H Trend Continuation',
                description: 'Momentum breakout confirmed above $68,400.',
                color: 65280,
                fields: [{ name: 'Status', value: 'FILLED', inline: true }],
              },
            ],
          },
          null,
          2
        )
      );
    } else if (platformPreset === 'TRADINGVIEW') {
      setReplayDirection('INCOMING');
      setReplayUrl('/api/v1/automation/webhooks/incoming/tradingview');
      setReplayHeadersJson(JSON.stringify({ 'content-type': 'application/json' }, null, 2));
      setReplayPayloadJson(
        JSON.stringify(
          {
            ticker: 'NAS100',
            action: 'BUY',
            contracts: 1.0,
            price: 19850.5,
            time: new Date().toISOString(),
            strategy: 'ICT Fair Value Gap v3',
            stop_loss: 19780.0,
            take_profit: 20050.0,
          },
          null,
          2
        )
      );
    }
  };

  // Schema Status Helper Badge
  const renderSchemaStatusBadge = (status: WebhookSchemaStatus) => {
    switch (status) {
      case 'VALID':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Valid Schema
          </span>
        );
      case 'UNKNOWN_FIELDS':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> New API Fields
          </span>
        );
      case 'DEPRECATED_FIELDS':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Deprecated Field
          </span>
        );
      case 'MISSING_REQUIRED':
      case 'SCHEMA_ERROR':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Schema Error
          </span>
        );
    }
  };

  const getCurlCommand = (rec: WebhookPayloadRecord): string => {
    const headersStr = Object.entries(rec.headers)
      .map(([k, v]) => `-H "${k}: ${v}"`)
      .join(' ');
    const bodyStr = JSON.stringify(rec.rawPayload).replace(/"/g, '\\"');
    return `curl -X ${rec.httpMethod} "${rec.endpointUrl}" ${headersStr} -d "${bodyStr}"`;
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP STATS & CONTROL BAR */}
      <div className="p-4 sm:p-5 bg-bg-surface border border-border-color rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Code className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
                Webhook Payload Inspector & Schema Diffing
                {isLiveStreaming && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                )}
              </h3>
            </div>
            <p className="text-xs text-text-secondary">
              Inspect raw incoming and outgoing JSON payloads across all social platforms (Telegram, Discord, Meta, TikTok, WhatsApp) with instant schema regression detection.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUrlsModalOpen(true)}
              className="text-xs border-border-color hover:border-cyan-500/40 text-text-secondary hover:text-text-primary gap-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              Webhook Ingest URLs
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setReplayJsonError(null);
                setIsReplayModalOpen(true);
              }}
              className="text-xs bg-cyan-500 hover:bg-cyan-400 text-black font-bold gap-1.5 shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              Simulate & Replay
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJsonDump}
              className="text-xs border-border-color hover:border-border-color/80 text-text-secondary gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </Button>

            <button
              onClick={handleClearBuffer}
              title="Clear logged payload buffer"
              className="p-2 rounded-xl border border-border-color hover:border-rose-500/40 text-text-secondary hover:text-rose-400 bg-bg-main transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-2 border-t border-border-color text-xs">
          {/* Search Box */}
          <div className="lg:col-span-4 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search keys, values, IDs, paths..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-bg-main border border-border-color text-text-primary placeholder:text-text-secondary/60 text-xs focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Platform Filter */}
          <div className="lg:col-span-2">
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded-xl bg-bg-main border border-border-color text-text-primary text-xs focus:outline-none focus:border-cyan-500/50"
            >
              <option value="ALL">All Platforms</option>
              <option value="TELEGRAM_BOT">Telegram Bot</option>
              <option value="DISCORD_WEBHOOK">Discord Webhook</option>
              <option value="META_INSTAGRAM">Instagram Graph</option>
              <option value="META_FACEBOOK">Facebook Graph</option>
              <option value="TIKTOK">TikTok API</option>
              <option value="WHATSAPP_BUSINESS">WhatsApp Cloud</option>
              <option value="TRADINGVIEW">TradingView Webhook</option>
            </select>
          </div>

          {/* Direction Filter */}
          <div className="lg:col-span-2">
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value as any)}
              className="w-full py-1.5 px-2.5 rounded-xl bg-bg-main border border-border-color text-text-primary text-xs focus:outline-none focus:border-cyan-500/50"
            >
              <option value="ALL">All Directions</option>
              <option value="INCOMING">Incoming (Ingress)</option>
              <option value="OUTGOING">Outgoing (Egress)</option>
            </select>
          </div>

          {/* Schema Health Filter */}
          <div className="lg:col-span-2">
            <select
              value={filterSchemaStatus}
              onChange={(e) => setFilterSchemaStatus(e.target.value as any)}
              className="w-full py-1.5 px-2.5 rounded-xl bg-bg-main border border-border-color text-text-primary text-xs focus:outline-none focus:border-cyan-500/50"
            >
              <option value="ALL">All Schema Health</option>
              <option value="VALID">Valid Schema</option>
              <option value="UNKNOWN_FIELDS">New / Unknown Fields</option>
              <option value="DEPRECATED_FIELDS">Deprecated Fields</option>
              <option value="MISSING_REQUIRED">Missing Required</option>
              <option value="SCHEMA_ERROR">Schema Errors</option>
            </select>
          </div>

          {/* Status Code Filter */}
          <div className="lg:col-span-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full py-1.5 px-2.5 rounded-xl bg-bg-main border border-border-color text-text-primary text-xs focus:outline-none focus:border-cyan-500/50"
            >
              <option value="ALL">All HTTP Status</option>
              <option value="SUCCESS">2xx Success</option>
              <option value="ERROR">4xx / 5xx Errors</option>
              <option value="SCHEMA_WARNING">Schema Warnings</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. MASTER-DETAIL INSPECTION WORKBENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: PAYLOAD STREAM LIST (5 COLS) */}
        <div className="lg:col-span-5 space-y-2">
          <div className="flex items-center justify-between px-1 text-xs text-text-secondary font-mono">
            <span>Payload Stream ({filteredPayloads.length} recorded)</span>
            <span className="text-[11px] text-text-secondary/70">Click entry to inspect</span>
          </div>

          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filteredPayloads.length === 0 ? (
              <div className="p-8 text-center bg-bg-surface border border-border-color rounded-2xl space-y-2">
                <Layers className="w-8 h-8 text-text-secondary/40 mx-auto" />
                <p className="text-xs font-semibold text-text-primary">No payloads match your filter</p>
                <p className="text-[11px] text-text-secondary">
                  Try broadening search terms or trigger a simulated webhook payload.
                </p>
              </div>
            ) : (
              filteredPayloads.map((record) => {
                const isSelected = selectedRecord?.id === record.id;
                const isIncoming = record.direction === 'INCOMING';

                return (
                  <motion.div
                    key={record.id}
                    layout
                    onClick={() => setSelectedId(record.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none space-y-2 ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/50 shadow-sm'
                        : 'bg-bg-surface border-border-color hover:border-border-color/80'
                    }`}
                  >
                    {/* Header line: Direction + Platform + HTTP status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`p-1 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 ${
                            isIncoming
                              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                              : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                          }`}
                        >
                          {isIncoming ? (
                            <>
                              <ArrowDownLeft className="w-3 h-3" /> IN
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3 h-3" /> OUT
                            </>
                          )}
                        </span>

                        <span className="text-xs font-bold text-text-primary truncate">
                          {record.platform.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${
                            record.httpStatus >= 200 && record.httpStatus < 300
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {record.httpStatus}
                        </span>
                        <span className="text-[10px] font-mono text-text-secondary">
                          {record.latencyMs}ms
                        </span>
                      </div>
                    </div>

                    {/* Endpoint / Path & Event Type */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-text-secondary">
                      <span className="truncate max-w-[200px]" title={record.endpointUrl}>
                        {record.endpointUrl}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-main border border-border-color text-text-secondary shrink-0">
                        {record.eventType}
                      </span>
                    </div>

                    {/* Footer: Schema Status + Time */}
                    <div className="flex items-center justify-between pt-1 border-t border-border-color/60 text-[10px]">
                      {renderSchemaStatusBadge(record.schemaValidation.status)}
                      <span className="text-text-secondary font-mono">
                        {new Date(record.timestamp).toLocaleTimeString([], { hour12: false })}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAIL & DIFF CONSOLE (7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedRecord ? (
            <div className="p-4 sm:p-5 bg-bg-surface border border-border-color rounded-2xl shadow-sm space-y-4">
              {/* Header: Overview of Selected Payload */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border-color pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-text-primary px-2 py-0.5 rounded bg-bg-main border border-border-color">
                      {selectedRecord.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-black ${
                        selectedRecord.direction === 'INCOMING'
                          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                          : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                      }`}
                    >
                      {selectedRecord.direction}
                    </span>
                    <span className="text-xs font-bold text-text-primary">
                      {selectedRecord.httpMethod} {selectedRecord.httpStatus}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-text-secondary break-all">
                    {selectedRecord.endpointUrl}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenSimulatorWithRecord(selectedRecord)}
                    className="text-xs bg-bg-main border-border-color hover:border-cyan-500/50 text-cyan-300 gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Replay in Sandbox
                  </Button>
                  <button
                    onClick={() => handleCopy(getCurlCommand(selectedRecord), 'curl')}
                    title="Copy as cURL command"
                    className="p-1.5 rounded-lg border border-border-color hover:border-border-color/80 text-text-secondary hover:text-text-primary bg-bg-main transition-colors cursor-pointer text-xs flex items-center gap-1"
                  >
                    {copiedId === 'curl' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">cURL</span>
                  </button>
                </div>
              </div>

              {/* Security & Verification Mini Bar */}
              <div className="p-2.5 rounded-xl bg-bg-main border border-border-color flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  {selectedRecord.signatureVerified ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" /> HMAC SHA-256 Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-text-secondary font-mono text-[11px]">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Unsigned or Token Header
                    </span>
                  )}
                  {selectedRecord.ipAddress && (
                    <span className="text-text-secondary font-mono text-[11px]">
                      IP: {selectedRecord.ipAddress}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-text-secondary font-mono">
                  <span>Schema: {selectedRecord.schemaValidation.detectedSchemaVersion}</span>
                </div>
              </div>

              {/* Sub-Tabs: Raw Payload vs Schema Diff vs Headers vs Response */}
              <div className="flex items-center gap-1 border-b border-border-color pb-2 overflow-x-auto text-xs">
                <button
                  onClick={() => setActiveSubTab('payload')}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeSubTab === 'payload'
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <FileJson className="w-3.5 h-3.5" /> Raw JSON Payload
                </button>

                <button
                  onClick={() => setActiveSubTab('diff')}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeSubTab === 'diff'
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Schema Diff & Health
                  {selectedRecord.schemaValidation.status !== 'VALID' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </button>

                <button
                  onClick={() => setActiveSubTab('headers')}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeSubTab === 'headers'
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> HTTP Headers ({Object.keys(selectedRecord.headers).length})
                </button>

                {selectedRecord.responseBody && (
                  <button
                    onClick={() => setActiveSubTab('response')}
                    className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeSubTab === 'response'
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" /> Response Body
                  </button>
                )}
              </div>

              {/* SUB-VIEW 1: RAW JSON PAYLOAD */}
              {activeSubTab === 'payload' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span className="font-mono text-[11px]">Formatted JSON</span>
                    <button
                      onClick={() =>
                        handleCopy(JSON.stringify(selectedRecord.rawPayload, null, 2), 'raw-json')
                      }
                      className="text-cyan-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                    >
                      {copiedId === 'raw-json' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      Copy Payload
                    </button>
                  </div>

                  <pre className="p-4 rounded-xl bg-black/60 border border-border-color font-mono text-xs text-emerald-400 overflow-x-auto max-h-[420px] whitespace-pre-wrap leading-relaxed select-all">
                    {JSON.stringify(selectedRecord.rawPayload, null, 2)}
                  </pre>
                </div>
              )}

              {/* SUB-VIEW 2: SCHEMA DIFF & HEALTH ANALYSIS */}
              {activeSubTab === 'diff' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-bg-main border border-border-color space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                        Baseline Contract: {selectedRecord.schemaValidation.detectedSchemaVersion}
                      </h4>
                      {renderSchemaStatusBadge(selectedRecord.schemaValidation.status)}
                    </div>

                    <div className="space-y-1">
                      {selectedRecord.schemaValidation.details.map((msg, idx) => (
                        <p key={idx} className="text-xs text-text-secondary flex items-start gap-1.5">
                          <span className="text-cyan-400 font-bold">•</span>
                          <span>{msg}</span>
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Visual Diff Breakdown */}
                  {selectedRecord.schemaValidation.diff && (
                    <div className="space-y-2.5">
                      {/* Added / Unrecognized fields */}
                      {selectedRecord.schemaValidation.diff.addedFields.length > 0 && (
                        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                            <Sparkles className="w-3.5 h-3.5" /> Newly Detected / Unmapped Fields (API Schema Evolution)
                          </div>
                          <p className="text-[11px] text-text-secondary">
                            The third-party provider included new keys not present in standard baseline contract:
                          </p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {selectedRecord.schemaValidation.diff.addedFields.map((f) => (
                              <span
                                key={f}
                                className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                              >
                                + {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missing required fields */}
                      {selectedRecord.schemaValidation.diff.removedFields.length > 0 && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                            <XCircle className="w-3.5 h-3.5" /> Missing Mandatory Schema Fields
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {selectedRecord.schemaValidation.diff.removedFields.map((f) => (
                              <span
                                key={f}
                                className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              >
                                - {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Deprecated field notices */}
                      {selectedRecord.schemaValidation.diff.notes &&
                        selectedRecord.schemaValidation.diff.notes.length > 0 && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                              <AlertTriangle className="w-3.5 h-3.5" /> Deprecation Advisory
                            </div>
                            {selectedRecord.schemaValidation.diff.notes.map((n, idx) => (
                              <p key={idx} className="text-xs text-amber-200/90 font-mono">
                                {n}
                              </p>
                            ))}
                          </div>
                        )}
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-bg-main border border-border-color space-y-1 text-xs">
                    <span className="font-bold text-text-primary">Schema Debugging Recommendation:</span>
                    <p className="text-text-secondary leading-relaxed">
                      If unexpected fields appear due to third-party API changes, update your webhook parser in{' '}
                      <code className="text-cyan-400">/src/services/webhookInspectorService.ts</code> to maintain backward compatibility.
                    </p>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 3: HTTP HEADERS */}
              {activeSubTab === 'headers' && (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-black/40 border border-border-color overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="text-text-secondary border-b border-border-color/60">
                          <th className="pb-2 font-bold uppercase text-[10px]">Header Name</th>
                          <th className="pb-2 font-bold uppercase text-[10px]">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-color/30">
                        {Object.entries(selectedRecord.headers).map(([key, value]) => (
                          <tr key={key} className="hover:bg-bg-main/50">
                            <td className="py-2 pr-4 text-cyan-300 font-bold whitespace-nowrap">{key}</td>
                            <td className="py-2 text-text-primary break-all">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 4: RESPONSE BODY */}
              {activeSubTab === 'response' && selectedRecord.responseBody && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span className="font-mono text-[11px]">Server / Ingress Response</span>
                    <button
                      onClick={() =>
                        handleCopy(JSON.stringify(selectedRecord.responseBody, null, 2), 'resp-json')
                      }
                      className="text-cyan-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                    >
                      {copiedId === 'resp-json' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      Copy Response
                    </button>
                  </div>

                  <pre className="p-4 rounded-xl bg-black/60 border border-border-color font-mono text-xs text-cyan-300 overflow-x-auto max-h-[300px] whitespace-pre-wrap leading-relaxed select-all">
                    {JSON.stringify(selectedRecord.responseBody, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-bg-surface border border-border-color rounded-2xl">
              <Code className="w-10 h-10 text-text-secondary/40 mx-auto mb-2" />
              <p className="text-sm font-bold text-text-primary">Select a payload from the stream</p>
              <p className="text-xs text-text-secondary mt-1">
                Choose any incoming or outgoing record to inspect headers, raw JSON, and schema diff analysis.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. SIMULATE / REPLAY MODAL */}
      <AnimatePresence>
        {isReplayModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-bg-surface border border-border-color rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border-color pb-3">
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-text-primary">
                    Simulate & Replay Webhook Payload
                  </h3>
                </div>
                <button
                  onClick={() => setIsReplayModalOpen(false)}
                  className="p-1 text-text-secondary hover:text-text-primary rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Template Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-text-secondary uppercase">
                  Quick Load Platform Preset:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => loadPresetTemplate('TELEGRAM_BOT')}
                    className="px-2.5 py-1 rounded-lg text-xs bg-bg-main border border-border-color hover:border-cyan-500 text-text-secondary hover:text-text-primary cursor-pointer"
                  >
                    Telegram Bot Message
                  </button>
                  <button
                    onClick={() => loadPresetTemplate('META_INSTAGRAM')}
                    className="px-2.5 py-1 rounded-lg text-xs bg-bg-main border border-border-color hover:border-cyan-500 text-text-secondary hover:text-text-primary cursor-pointer"
                  >
                    Meta Graph v20.0 (Diff Test)
                  </button>
                  <button
                    onClick={() => loadPresetTemplate('DISCORD_WEBHOOK')}
                    className="px-2.5 py-1 rounded-lg text-xs bg-bg-main border border-border-color hover:border-cyan-500 text-text-secondary hover:text-text-primary cursor-pointer"
                  >
                    Discord Rich Embed
                  </button>
                  <button
                    onClick={() => loadPresetTemplate('TRADINGVIEW')}
                    className="px-2.5 py-1 rounded-lg text-xs bg-bg-main border border-border-color hover:border-cyan-500 text-text-secondary hover:text-text-primary cursor-pointer"
                  >
                    TradingView Alert
                  </button>
                </div>
              </div>

              {/* Config Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-text-secondary font-semibold uppercase text-[10px]">Platform</label>
                  <select
                    value={replayPlatform}
                    onChange={(e) => setReplayPlatform(e.target.value as any)}
                    className="w-full mt-1 p-2 rounded-xl bg-bg-main border border-border-color text-text-primary text-xs"
                  >
                    <option value="TELEGRAM_BOT">Telegram Bot</option>
                    <option value="DISCORD_WEBHOOK">Discord Webhook</option>
                    <option value="META_INSTAGRAM">Instagram Graph</option>
                    <option value="META_FACEBOOK">Facebook Graph</option>
                    <option value="TIKTOK">TikTok API</option>
                    <option value="WHATSAPP_BUSINESS">WhatsApp Cloud</option>
                    <option value="TRADINGVIEW">TradingView</option>
                    <option value="CUSTOM_WEBHOOK">Custom Webhook</option>
                  </select>
                </div>

                <div>
                  <label className="text-text-secondary font-semibold uppercase text-[10px]">Direction</label>
                  <select
                    value={replayDirection}
                    onChange={(e) => setReplayDirection(e.target.value as any)}
                    className="w-full mt-1 p-2 rounded-xl bg-bg-main border border-border-color text-text-primary text-xs"
                  >
                    <option value="INCOMING">INCOMING (Simulate Ingress)</option>
                    <option value="OUTGOING">OUTGOING (Simulate Dispatch)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-text-secondary font-semibold uppercase text-[10px]">Target Endpoint URL</label>
                  <input
                    type="text"
                    value={replayUrl}
                    onChange={(e) => setReplayUrl(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl bg-bg-main border border-border-color text-text-primary font-mono text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-text-secondary font-semibold uppercase text-[10px]">HTTP Headers (JSON)</label>
                  <textarea
                    rows={2}
                    value={replayHeadersJson}
                    onChange={(e) => setReplayHeadersJson(e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-xl bg-black/60 border border-border-color font-mono text-xs text-cyan-300"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-text-secondary font-semibold uppercase text-[10px]">Raw Payload (JSON)</label>
                  <textarea
                    rows={7}
                    value={replayPayloadJson}
                    onChange={(e) => setReplayPayloadJson(e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-xl bg-black/60 border border-border-color font-mono text-xs text-emerald-400 leading-relaxed"
                  />
                </div>
              </div>

              {replayJsonError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{replayJsonError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-color">
                <Button variant="outline" size="sm" onClick={() => setIsReplayModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExecuteReplay}
                  disabled={isSimulating}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSimulating ? 'Executing...' : 'Dispatch & Inspect Diff'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. WEBHOOK INGEST URLS GUIDE MODAL */}
      <AnimatePresence>
        {isUrlsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-bg-surface border border-border-color rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border-color pb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-text-primary">
                    Production Webhook Ingest Endpoints
                  </h3>
                </div>
                <button
                  onClick={() => setIsUrlsModalOpen(false)}
                  className="p-1 text-text-secondary hover:text-text-primary rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                Configure these public webhook callback endpoints in your third-party provider dashboards (Telegram BotFather, Meta Developer App, TikTok Portal, TradingView alerts). Incoming requests will be verified and captured in this Inspector in real time.
              </p>

              <div className="space-y-3 font-mono text-xs">
                {[
                  {
                    platform: 'Telegram BotFather Webhook',
                    url: 'https://api.appexquant.markets/v1/automation/webhooks/incoming/telegram',
                    secretHeader: 'X-Telegram-Bot-Api-Secret-Token',
                  },
                  {
                    platform: 'Meta Instagram / Facebook Webhooks',
                    url: 'https://api.appexquant.markets/v1/automation/webhooks/incoming/meta',
                    secretHeader: 'X-Hub-Signature-256 (HMAC SHA-256)',
                  },
                  {
                    platform: 'TikTok Video Callback Ingress',
                    url: 'https://api.appexquant.markets/v1/automation/webhooks/incoming/tiktok',
                    secretHeader: 'TikTok-Signature-V2',
                  },
                  {
                    platform: 'TradingView Alert Webhook Dispatcher',
                    url: 'https://api.appexquant.markets/v1/automation/webhooks/incoming/tradingview',
                    secretHeader: 'Passcode in JSON Body',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-bg-main border border-border-color space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text-primary text-[11px] font-sans">
                        {item.platform}
                      </span>
                      <button
                        onClick={() => handleCopy(item.url, `url-${idx}`)}
                        className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        {copiedId === `url-${idx}` ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        Copy URL
                      </button>
                    </div>
                    <code className="block p-2 rounded bg-black/60 text-cyan-300 break-all select-all text-[11px]">
                      {item.url}
                    </code>
                    <div className="text-[10px] text-text-secondary">
                      Security Verification: <span className="text-text-primary">{item.secretHeader}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2 border-t border-border-color">
                <Button variant="primary" size="sm" onClick={() => setIsUrlsModalOpen(false)} className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold">
                  Done
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
