/**
 * AppexQuant Markets Global - Automation Control Center View
 * Unified command and control hub containing:
 * 1. Algorithmic Execution Loops (Active Algos & Real-Time Decision Stream)
 * 2. Omni-Channel Social Distribution (Credential Vault, 90-Day Drag & Drop Calendar, Observability Dashboard, Sync Override, and Audit Table)
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { automationControlService } from '../services/automationControlService.ts';
import { socialAutomationService } from '../services/socialAutomationService.ts';
import {
  SystemAutomationStatus,
  ActiveStrategy,
  AutomationStreamEvent,
  TradeDecisionChain,
} from '../types/automationControl.ts';
import {
  ConnectedChannelDTO,
  CalendarViewResponseDTO,
  SocialAnalyticsSummaryDTO,
  PostExecutionLogDTO,
  ChannelCredentialInput,
  ScheduledPostInput,
} from '../types/socialAutomation.ts';

// Automation Components
import { ActiveStrategiesTable } from '../components/automation/ActiveStrategiesTable.tsx';
import { AutomationEventStream } from '../components/automation/AutomationEventStream.tsx';
import { DecisionChainModal } from '../components/automation/DecisionChainModal.tsx';
import { CredentialVault } from '../components/automation/CredentialVault.tsx';
import { SchedulingCalendar } from '../components/automation/SchedulingCalendar.tsx';
import { SocialObservabilityDashboard } from '../components/automation/SocialObservabilityDashboard.tsx';
import { SyncPublishOverride } from '../components/automation/SyncPublishOverride.tsx';
import { ExecutionLogsAuditTable } from '../components/automation/ExecutionLogsAuditTable.tsx';

import { CollapsibleText } from '../components/common/CollapsibleText.tsx';
import { StatusPill } from '../components/ui/StatusPill.tsx';
import {
  Bot,
  Play,
  Pause,
  RotateCcw,
  AlertOctagon,
  KeyRound,
  Calendar,
  BarChart3,
  FileText,
  Radio,
  Sparkles,
  Share2,
} from 'lucide-react';

export const AutomationControlCenterView: React.FC = () => {
  // Navigation Tabs: Algos vs Social Distribution
  const [activeDomain, setActiveDomain] = useState<'SOCIAL_DISTRIBUTION' | 'ALGO_EXECUTION'>('SOCIAL_DISTRIBUTION');
  const [socialTab, setSocialTab] = useState<'CALENDAR' | 'VAULT' | 'ANALYTICS' | 'LOGS'>('CALENDAR');

  // Algo Trading Engine State
  const [systemStatus, setSystemStatus] = useState<SystemAutomationStatus>(
    automationControlService.getStatus()
  );
  const [strategies, setStrategies] = useState<ActiveStrategy[]>(
    automationControlService.getStrategies()
  );
  const [events, setEvents] = useState<AutomationStreamEvent[]>(
    automationControlService.getEvents()
  );
  const [selectedTradeChain, setSelectedTradeChain] = useState<TradeDecisionChain | null>(null);

  // Social Automation State
  const [channels, setChannels] = useState<ConnectedChannelDTO[]>([]);
  const [calendarData, setCalendarData] = useState<CalendarViewResponseDTO | null>(null);
  const [analytics, setAnalytics] = useState<SocialAnalyticsSummaryDTO | null>(null);
  const [logs, setLogs] = useState<PostExecutionLogDTO[]>([]);
  const [logFilterStatus, setLogFilterStatus] = useState<string>('ALL');
  const [loadingSocial, setLoadingSocial] = useState(false);

  // Load Algo state
  useEffect(() => {
    const refreshEngineData = () => {
      setSystemStatus(automationControlService.getStatus());
      setStrategies(automationControlService.getStrategies());
      setEvents(automationControlService.getEvents());
    };
    refreshEngineData();
    const unsub = automationControlService.subscribe(refreshEngineData);
    return () => unsub();
  }, []);

  // Load Social Distribution Data
  const loadSocialData = async () => {
    try {
      setLoadingSocial(true);
      const [chData, calData, anaData, logData] = await Promise.all([
        socialAutomationService.getConnectedChannels(),
        socialAutomationService.getCalendarView(90),
        socialAutomationService.getAnalyticsSummary(),
        socialAutomationService.getExecutionLogs(logFilterStatus),
      ]);
      setChannels(chData);
      setCalendarData(calData);
      setAnalytics(anaData);
      setLogs(logData.logs);
    } catch (err) {
      console.error('[AutomationControlCenter] Failed loading social data:', err);
    } finally {
      setLoadingSocial(false);
    }
  };

  useEffect(() => {
    loadSocialData();
  }, [logFilterStatus]);

  // Social Handlers
  const handleSaveChannel = async (payload: ChannelCredentialInput) => {
    await socialAutomationService.saveChannelCredentials(payload);
    await loadSocialData();
  };

  const handleDeleteChannel = async (channelId: number) => {
    await socialAutomationService.deleteChannel(channelId);
    await loadSocialData();
  };

  const handleTestChannel = async (channelId: number) => {
    return await socialAutomationService.testChannelConnection(channelId);
  };

  const handleCreatePost = async (payload: ScheduledPostInput) => {
    await socialAutomationService.createScheduledPost(payload);
    await loadSocialData();
  };

  const handleReschedulePost = async (postId: number, newTimeIso: string) => {
    // Optimistic UI state update
    if (calendarData) {
      const updatedDays = calendarData.days.map((day) => ({
        ...day,
        posts: day.posts.map((p) =>
          p.id === postId ? { ...p, scheduledTime: newTimeIso } : p
        ),
      }));
      setCalendarData({ ...calendarData, days: updatedDays });
    }
    await socialAutomationService.updatePostSchedule(postId, newTimeIso);
    await loadSocialData();
  };

  const handleImmediateDispatch = async (postId: number) => {
    await socialAutomationService.forceDispatchPost(postId);
    await loadSocialData();
  };

  const handleSyncAndPublishNow = async () => {
    const res = await socialAutomationService.triggerSyncAndPublishNow();
    await loadSocialData();
    return res;
  };

  const handleRetryLog = async (logId: number) => {
    await socialAutomationService.retryFailedLog(logId);
    const updated = await socialAutomationService.getExecutionLogs(logFilterStatus);
    setLogs(updated.logs);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* EMERGENCY HALT BANNER */}
      {systemStatus === 'EMERGENCY_HALTED' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0 animate-pulse" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-rose-200">Emergency safety lock active</h4>
              <p className="text-[11px] text-rose-300/80">
                All strategy execution loops and social broadcast auto-queues are currently locked.
              </p>
            </div>
          </div>
          <button
            onClick={() => automationControlService.setStatus('RUNNING')}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
          >
            Clear Lock & Resume
          </button>
        </motion.div>
      )}

      {/* TOP HEADER */}
      <div className="p-5 sm:p-6 rounded-2xl bg-bg-surface border border-border-color shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border-color pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-semibold">System Orchestrator</span>
              <StatusPill label="All Systems Operational" type="success" pulse size="sm" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2">
              <Bot className="w-6 h-6 text-cyan-400" />
              AppexQuant Automation Control Center
            </h1>
            <CollapsibleText
              text="Unified mission control managing institutional algorithmic trading loops and autonomous omni-channel social distribution pipelines."
              maxChars={90}
              className="text-xs text-text-secondary font-sans"
            />
          </div>

          {/* DOMAIN SWITCHER TABS */}
          <div className="flex items-center p-1 rounded-xl bg-bg-main border border-border-color text-xs w-full md:w-auto">
            <button
              onClick={() => setActiveDomain('SOCIAL_DISTRIBUTION')}
              className={`flex-1 md:flex-initial px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeDomain === 'SOCIAL_DISTRIBUTION'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>Omni-Channel Distribution</span>
            </button>
            <button
              onClick={() => setActiveDomain('ALGO_EXECUTION')}
              className={`flex-1 md:flex-initial px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeDomain === 'ALGO_EXECUTION'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Algo Execution Loops</span>
            </button>
          </div>
        </div>

        {/* DOMAIN 1: SOCIAL DISTRIBUTION INNER SUB-NAVIGATION */}
        {activeDomain === 'SOCIAL_DISTRIBUTION' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'CALENDAR', label: '90-Day Scheduler', icon: Calendar },
              { id: 'VAULT', label: 'Credential Vault', icon: KeyRound },
              { id: 'ANALYTICS', label: 'Real-Time Observability', icon: BarChart3 },
              { id: 'LOGS', label: 'Audit Trail & Retry', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = socialTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSocialTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                      : 'bg-bg-main text-text-secondary border-border-color hover:border-border-color/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* RENDER CONTENT BASED ON ACTIVE DOMAIN */}
      {activeDomain === 'SOCIAL_DISTRIBUTION' ? (
        <div className="space-y-6">
          {/* SECTION 4: INSTANT SYNC & PUBLISH NOW OVERRIDE (ALWAYS VISIBLE ABOVE SUB-VIEWS) */}
          <SyncPublishOverride
            onTriggerSyncAndPublish={handleSyncAndPublishNow}
            pendingCount={analytics?.totalPending || 0}
          />

          {/* SUB-VIEW 1: 90-DAY CALENDAR */}
          {socialTab === 'CALENDAR' && calendarData && (
            <SchedulingCalendar
              calendarData={calendarData}
              channels={channels}
              onCreatePost={handleCreatePost}
              onReschedulePost={handleReschedulePost}
              onImmediateDispatch={handleImmediateDispatch}
            />
          )}

          {/* SUB-VIEW 2: CREDENTIAL VAULT */}
          {socialTab === 'VAULT' && (
            <CredentialVault
              channels={channels}
              onSaveChannel={handleSaveChannel}
              onDeleteChannel={handleDeleteChannel}
              onTestConnection={handleTestChannel}
            />
          )}

          {/* SUB-VIEW 3: OBSERVABILITY DASHBOARD */}
          {socialTab === 'ANALYTICS' && analytics && (
            <SocialObservabilityDashboard analytics={analytics} />
          )}

          {/* SUB-VIEW 4: AUDIT TABLE & RETRY PIPELINE */}
          {socialTab === 'LOGS' && (
            <ExecutionLogsAuditTable
              logs={logs}
              onRetryLog={handleRetryLog}
              onFilterStatusChange={setLogFilterStatus}
              selectedStatus={logFilterStatus}
            />
          )}
        </div>
      ) : (
        /* DOMAIN 2: ALGORITHMIC TRADING EXECUTION LOOPS */
        <div className="space-y-6">
          <ActiveStrategiesTable
            strategies={strategies}
            onToggleStrategy={(id) => automationControlService.toggleStrategyStatus(id)}
            onTriggerStrategy={(id) => automationControlService.triggerSimulatedTrade(id)}
          />

          <AutomationEventStream
            events={events}
            onSelectTradeChain={(chain) => setSelectedTradeChain(chain)}
            onTriggerTestTrade={() => automationControlService.triggerSimulatedTrade()}
            onClearEvents={() => automationControlService.clearEvents()}
            isSystemRunning={systemStatus === 'RUNNING'}
          />

          <DecisionChainModal
            tradeChain={selectedTradeChain}
            onClose={() => setSelectedTradeChain(null)}
          />
        </div>
      )}
    </div>
  );
};
