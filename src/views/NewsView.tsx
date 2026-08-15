/**
 * AppexQuant Markets Global - Phase 3 Financial News & Central Alert Engine View
 * Comprehensive alerting architecture, preferences management, and institutional news sentinels.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useGlobalState } from '../state/GlobalStateContext.tsx';
import { useApiFetch } from '../utils/apiFetch.ts';
import { fetchLiveNewsSentinel } from '../services/ai/newsSentinelEngine.ts';
import { getDXYContext } from '../services/ai/dxyEngine.ts';
import { NewsItem, EconomicEvent, DXYContext } from '../types/ai.ts';
import { Alert, AlertType, AlertSeverity, AlertChannel, UserAlertPreferences } from '../types/alerts.ts';
import {
  Newspaper,
  Globe2,
  Calendar,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Bell,
  Settings,
  Activity,
  CheckCircle2,
  Sliders,
  ShieldAlert,
  Search,
  Mail,
  Smartphone,
  Play,
  Check,
  UserCheck,
  Clock,
  X,
  Volume2,
} from 'lucide-react';

export const NewsView: React.FC = () => {
  const { state, dispatch } = useGlobalState();
  const apiFetch = useApiFetch();
  
  const userRole = state.user?.role || 'USER';
  const isAdminOrOwner = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'RISK_MANAGER';
  
  // Tabs State
  const [activeTab, setActiveTab] = useState<'alerts' | 'news'>('alerts');

  // --- TAB 1: ALERTS STATE ---
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [userPrefs, setUserPrefs] = useState<UserAlertPreferences | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Search & Filter state for Alerts
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ACTIVE');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Interactive Trigger Simulator state
  const [simType, setSimType] = useState<AlertType>(AlertType.BROKER_DISCONNECTED);
  const [simSeverity, setSimSeverity] = useState<AlertSeverity>(AlertSeverity.CRITICAL);
  const [simSource, setSimSource] = useState('Execution Gateway FX-01');
  const [simMessage, setSimMessage] = useState('Connection to London exchange lost. Retrying heartbeat...');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationMessage, setSimulationMessage] = useState<string | null>(null);

  // Email Config State
  const [tempEmail, setTempEmail] = useState('trader@appexquant.global');
  const [emailConfigured, setEmailConfigured] = useState(true);
  
  // Push Config State
  const [pushSupported, setPushSupported] = useState(true);

  // --- TAB 2: NEWS SENTINEL STATE ---
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsCalendar, setNewsCalendar] = useState<EconomicEvent[]>([]);
  const [dxy, setDxy] = useState<DXYContext>(getDXYContext());
  const [activeNewsCategory, setActiveNewsCategory] = useState<string>('ALL');
  const [newsLoading, setNewsLoading] = useState(false);

  // Smart Pre-fill presets based on selected AlertType
  useEffect(() => {
    switch (simType) {
      case AlertType.BROKER_DISCONNECTED:
        setSimSource('Broker Connection Manager');
        setSimSeverity(AlertSeverity.CRITICAL);
        setSimMessage('Primary execution bridge disconnected from Deriv-Demo server. Network timeout after 15000ms.');
        break;
      case AlertType.MARKET_DATA_STALE:
        setSimSource('Market Data Streamer');
        setSimSeverity(AlertSeverity.WARNING);
        setSimMessage('EUR/USD tick gap exceeded 5000ms. Defaulting to standby feed.');
        break;
      case AlertType.RISK_THRESHOLD_REACHED:
        setSimSource('Pre-Trade Risk Engine');
        setSimSeverity(AlertSeverity.HIGH);
        setSimMessage('Account margins below 110%. Limit order placement suspended.');
        break;
      case AlertType.DAILY_LOSS_THRESHOLD:
        setSimSource('Post-Trade Guardrails');
        setSimSeverity(AlertSeverity.CRITICAL);
        setSimMessage('Daily loss limit of -$2,500 breached. All open positions liquidated.');
        break;
      case AlertType.DRAWDOWN_THRESHOLD:
        setSimSource('Account Drawdown Sentinel');
        setSimSeverity(AlertSeverity.CRITICAL);
        setSimMessage('Equity drawdown exceeds 8.5% threshold. Automated execution paused.');
        break;
      case AlertType.STRATEGY_FAILURE:
        setSimSource('Alpha Engine v4');
        setSimSeverity(AlertSeverity.WARNING);
        setSimMessage('Grid Strategy executed buy order with negative tick correlation.');
        break;
      case AlertType.EXECUTION_FAILURE:
        setSimSource('Liquidity Provider STP');
        setSimSeverity(AlertSeverity.HIGH);
        setSimMessage('Fill request timed out at host matching server (Error C-991).');
        break;
      case AlertType.ORDER_REJECTED:
        setSimSource('Deriv Bridge API');
        setSimSeverity(AlertSeverity.WARNING);
        setSimMessage('Order #99281 rejected by exchange: Insufficient free margin.');
        break;
      case AlertType.POSITION_MISMATCH:
        setSimSource('Portfolio Reconciler');
        setSimSeverity(AlertSeverity.WARNING);
        setSimMessage('Desync detected: Local state claims 1.2 Lots EUR/USD; Broker claims 1.0 Lots.');
        break;
      case AlertType.AUTOMATION_PAUSED:
        setSimSource('Orchestrator Control');
        setSimSeverity(AlertSeverity.INFO);
        setSimMessage('Semi-automated pipeline paused due to high-impact CPI release.');
        break;
      case AlertType.AUTOMATION_RESUMED:
        setSimSource('Orchestrator Control');
        setSimSeverity(AlertSeverity.INFO);
        setSimMessage('Expert Advisor loop re-engaged after market volatility stabilized.');
        break;
      case AlertType.EMERGENCY_HALT:
        setSimSource('Admin Command');
        setSimSeverity(AlertSeverity.CRITICAL);
        setSimMessage('EMERGENCY POWER CIRCUIT BROKEN. ALL RUNNING EAS FORCIBLY SHUTDOWN.');
        break;
      case AlertType.AUTHENTICATION_EVENT:
        setSimSource('Auth-System Monitor');
        setSimSeverity(AlertSeverity.INFO);
        setSimMessage('User "usr-default-001" logged in from a new Chrome environment (IP: 185.190.140.23).');
        break;
      case AlertType.SECURITY_EVENT:
        setSimSource('Cloudflare Web Firewall');
        setSimSeverity(AlertSeverity.CRITICAL);
        setSimMessage('Rate limiter detected burst IP scans from range 194.20.10.x. High threat.');
        break;
    }
  }, [simType]);

  // Load All Data
  const loadAlertsData = async () => {
    setAlertsLoading(true);
    try {
      const response = await apiFetch('/api/alerts');
      const result = await response.json();
      if (result.success && result.data) {
        setAlerts(result.data);
      }
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setAlertsLoading(false);
    }
  };

  const loadPreferences = async () => {
    setPrefsLoading(true);
    try {
      const response = await apiFetch('/api/alerts/preferences/usr-default-001');
      const result = await response.json();
      if (result.success && result.data) {
        setUserPrefs(result.data);
        setTempEmail(result.data.emailAddress || 'trader@appexquant.global');
        setEmailConfigured(result.data.emailConfigured);
        setPushSupported(result.data.pushSupported);
      }
    } catch (err) {
      console.error('Failed to load preferences', err);
    } finally {
      setPrefsLoading(false);
    }
  };

  const loadSentinelData = async () => {
    setNewsLoading(true);
    try {
      const data = await fetchLiveNewsSentinel();
      setNews(data.news);
      setNewsCalendar(data.calendar);
      setDxy(getDXYContext());
    } catch (err) {
      console.error('Failed to load news sentinel', err);
    } finally {
      setNewsLoading(false);
    }
  };

  useEffect(() => {
    loadAlertsData();
    loadPreferences();
    loadSentinelData();

    // Set polling interval for Alerts for dynamic realism
    const interval = setInterval(() => {
      loadAlertsData();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Handle Preferences Checkbox Updates
  const handlePreferenceCheckboxChange = (type: AlertType, channel: AlertChannel, checked: boolean) => {
    if (!userPrefs) return;

    const updatedList = userPrefs.preferences.map((p) => {
      if (p.type === type) {
        return {
          ...p,
          channels: {
            ...p.channels,
            [channel]: checked,
          },
        };
      }
      return p;
    });

    setUserPrefs({
      ...userPrefs,
      preferences: updatedList,
    });
  };

  // Save Preferences
  const handleSavePreferences = async () => {
    if (!userPrefs) return;
    setIsSavingPrefs(true);
    setPrefsMessage(null);

    const payload: UserAlertPreferences = {
      ...userPrefs,
      emailAddress: tempEmail,
      emailConfigured: emailConfigured,
      pushSupported: pushSupported,
    };

    try {
      const response = await apiFetch('/api/alerts/preferences/usr-default-001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        setPrefsMessage({ text: 'Preferences saved successfully.', type: 'success' });
        setUserPrefs(result.data);
        
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            type: 'success',
            title: 'Preferences Synchronized',
            message: 'Your central alerting matrix has been persisted successfully.',
          },
        });
      } else {
        setPrefsMessage({ text: 'Failed to save preferences on the server.', type: 'error' });
      }
    } catch (err: any) {
      setPrefsMessage({ text: err.message || 'Network error while saving.', type: 'error' });
    } finally {
      setIsSavingPrefs(false);
      setTimeout(() => setPrefsMessage(null), 5000);
    }
  };

  // Trigger Alert Simulation
  const handleTriggerSimulatedAlert = async () => {
    setIsSimulating(true);
    setSimulationMessage(null);
    try {
      const response = await apiFetch('/api/alerts/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: simType,
          severity: simSeverity,
          source: simSource,
          message: simMessage,
        }),
      });
      const result = await response.json();
      if (result.success && result.data) {
        const newAlert = result.data as Alert;
        setAlerts((prev) => [newAlert, ...prev]);
        setSimulationMessage(`Successfully dispatched alert "${newAlert.type}" into stream.`);

        // Dispatch a beautiful global toast notification
        const notifType =
          simSeverity === AlertSeverity.CRITICAL || simSeverity === AlertSeverity.HIGH
            ? 'error'
            : simSeverity === AlertSeverity.WARNING
            ? 'warning'
            : 'info';

        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            type: notifType,
            title: `[${simSeverity}] ${newAlert.type}`,
            message: newAlert.message,
          },
        });

        // Trigger a simple subtle browser notification chime simulation
        if (typeof window !== 'undefined' && 'AudioContext' in window) {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            // Critical warning has a double high beep, standard alert has a single chime
            if (simSeverity === AlertSeverity.CRITICAL) {
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              gain.gain.setValueAtTime(0.1, ctx.currentTime);
              osc.start();
              osc.stop(ctx.currentTime + 0.1);
              
              setTimeout(() => {
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.frequency.setValueAtTime(880, ctx.currentTime);
                gain2.gain.setValueAtTime(0.1, ctx.currentTime);
                osc2.start();
                osc2.stop(ctx.currentTime + 0.15);
              }, 150);
            } else {
              osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 chime
              gain.gain.setValueAtTime(0.08, ctx.currentTime);
              osc.start();
              osc.stop(ctx.currentTime + 0.2);
            }
          } catch (e) {
            // Ignore audio context block rules
          }
        }
      } else {
        setSimulationMessage('Failed to trigger alert.');
      }
    } catch (err: any) {
      setSimulationMessage(err.message || 'Trigger failed.');
    } finally {
      setIsSimulating(false);
      setTimeout(() => setSimulationMessage(null), 4000);
    }
  };

  // Acknowledge a single Alert
  const handleAcknowledgeAlert = async (id: string) => {
    try {
      const response = await apiFetch('/api/alerts/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          userEmail: state.user?.email || 'trader@appexquant.global',
        }),
      });
      const result = await response.json();
      if (result.success) {
        // Update local alerts state instantly
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: 'ACKNOWLEDGED',
                  acknowledgedBy: state.user?.email || 'trader@appexquant.global',
                  acknowledgedAt: new Date().toISOString(),
                }
              : a
          )
        );

        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            type: 'success',
            title: 'Alert Acknowledged',
            message: `Cleared alert item references successfully.`,
          },
        });
      }
    } catch (err) {
      console.error('Failed to acknowledge alert', err);
    }
  };

  // Acknowledge All Alerts
  const handleAcknowledgeAll = async () => {
    try {
      const response = await apiFetch('/api/alerts/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'all',
          userEmail: state.user?.email || 'trader@appexquant.global',
        }),
      });
      const result = await response.json();
      if (result.success && result.data && result.data.alerts) {
        setAlerts(result.data.alerts);

        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            type: 'success',
            title: 'All Cleared',
            message: 'All outstanding active alerts have been batch acknowledged.',
          },
        });
      }
    } catch (err) {
      console.error('Failed to batch acknowledge alerts', err);
    }
  };

  // Filter logic on alerts
  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = selectedSeverity === 'ALL' || alert.severity === selectedSeverity;
    const matchesStatus = selectedStatus === 'ALL' || alert.status === selectedStatus;
    const matchesType = selectedType === 'ALL' || alert.type === selectedType;

    return matchesSearch && matchesSeverity && matchesStatus && matchesType;
  });

  const activeAlertsCount = alerts.filter((a) => a.status === 'ACTIVE').length;
  const criticalActiveCount = alerts.filter((a) => a.status === 'ACTIVE' && a.severity === AlertSeverity.CRITICAL).length;
  const warningActiveCount = alerts.filter((a) => a.status === 'ACTIVE' && a.severity === AlertSeverity.WARNING).length;
  const highActiveCount = alerts.filter((a) => a.status === 'ACTIVE' && a.severity === AlertSeverity.HIGH).length;

  return (
    <div className="space-y-6 pb-12" id="alert-engine-module">
      {/* Top Main Navigation / Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-bg-hover border border-border-color shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight flex items-center gap-2.5">
              <Bell className="w-6 h-6 text-cyan-400" />
              Central System Guard & Sentinel
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-widest font-semibold">
                Core Engine
              </span>
            </h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Realtime security, broker, risk, and strategy event monitors with user-defined notification channels
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-bg-hover rounded-xl border border-border-color self-start md:self-center">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'alerts'
                ? 'bg-cyan-500 text-text-secondary shadow-md font-extrabold'
                : 'text-text-secondary hover:text-text-secondary'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Alerts Console ({activeAlertsCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'news'
                ? 'bg-cyan-500 text-text-secondary shadow-md font-extrabold'
                : 'text-text-secondary hover:text-text-secondary'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>Market Sentinel</span>
          </button>
        </div>
      </div>

      {activeTab === 'alerts' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* LEFT 2 COLS: ALERTS AND FILTERS */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* ALERT STATISTICS / BADGES */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-bg-hover/60 border border-border-color text-center flex flex-col justify-center">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-mono">Active Total</span>
                <span className={`text-2xl font-extrabold mt-1 ${activeAlertsCount > 0 ? 'text-cyan-400' : 'text-text-secondary'}`}>
                  {activeAlertsCount}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-bg-hover/60 border border-border-color text-center flex flex-col justify-center">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-mono">Critical</span>
                <span className={`text-2xl font-extrabold mt-1 ${criticalActiveCount > 0 ? 'text-rose-400' : 'text-text-secondary'}`}>
                  {criticalActiveCount}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-bg-hover/60 border border-border-color text-center flex flex-col justify-center">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-mono">High Risk</span>
                <span className={`text-2xl font-extrabold mt-1 ${highActiveCount > 0 ? 'text-orange-400' : 'text-text-secondary'}`}>
                  {highActiveCount}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-bg-hover/60 border border-border-color text-center flex flex-col justify-center">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-mono">Warnings</span>
                <span className={`text-2xl font-extrabold mt-1 ${warningActiveCount > 0 ? 'text-amber-400' : 'text-text-secondary'}`}>
                  {warningActiveCount}
                </span>
              </div>
            </div>

            {/* SEARCH AND FILTER BAR */}
            <div className="p-5 rounded-2xl bg-bg-hover/90 border border-border-color space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-secondary">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Fuzzy search alerts by message, source or type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-hover border border-border-color rounded-xl text-xs text-text-primary placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={loadAlertsData}
                    disabled={alertsLoading}
                    className="p-2.5 rounded-xl bg-bg-hover hover:bg-bg-hover border border-border-color text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                    title="Refresh Alert Stream"
                  >
                    <RefreshCw className={`w-4 h-4 ${alertsLoading ? 'animate-spin text-cyan-400' : ''}`} />
                  </button>
                  <button
                    onClick={handleAcknowledgeAll}
                    disabled={activeAlertsCount === 0}
                    className="px-4 py-2.5 rounded-xl bg-bg-hover hover:bg-bg-hover border border-border-color text-xs font-bold text-text-secondary hover:text-text-primary disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Acknowledge All</span>
                  </button>
                </div>
              </div>

              {/* Advanced Filter Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="text-[10px] text-text-secondary uppercase tracking-widest font-mono font-semibold block mb-1.5">
                    Severity:
                  </label>
                  <div className="grid grid-cols-5 gap-1 bg-bg-hover p-1 rounded-xl border border-border-color text-[10px] font-bold">
                    {['ALL', 'INFO', 'WARNING', 'HIGH', 'CRITICAL'].map((sev) => (
                      <button
                        key={sev}
                        onClick={() => setSelectedSeverity(sev)}
                        className={`py-1.5 rounded-lg transition-colors cursor-pointer font-bold ${
                          selectedSeverity === sev
                            ? sev === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : sev === 'HIGH'
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                              : sev === 'WARNING'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : sev === 'INFO'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : 'bg-cyan-500 text-text-secondary'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-text-secondary uppercase tracking-widest font-mono font-semibold block mb-1.5">
                    Status:
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-bg-hover p-1 rounded-xl border border-border-color text-[10px] font-bold">
                    {['ALL', 'ACTIVE', 'ACKNOWLEDGED'].map((stat) => (
                      <button
                        key={stat}
                        onClick={() => setSelectedStatus(stat)}
                        className={`py-1.5 rounded-lg transition-colors cursor-pointer font-bold ${
                          selectedStatus === stat
                            ? 'bg-cyan-500 text-text-secondary'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {stat === 'ALL' ? 'ALL' : stat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-text-secondary uppercase tracking-widest font-mono font-semibold block mb-1.5">
                    Category:
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full bg-bg-hover border border-border-color rounded-xl text-xs px-3 py-2 text-text-secondary focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="ALL">ALL TYPES</option>
                    {Object.values(AlertType).map((val) => (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ALERTS STREAM LIST */}
            <div className="space-y-3">
              {alertsLoading && alerts.length === 0 ? (
                <div className="p-12 text-center bg-bg-hover/40 border border-border-color rounded-2xl flex flex-col items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
                  <p className="text-text-secondary text-xs font-semibold">Synchronizing with system alert controllers...</p>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="p-12 text-center bg-bg-hover/40 border border-border-color rounded-2xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                  <p className="text-text-secondary text-sm font-bold">No Alerts Found</p>
                  <p className="text-text-secondary text-xs mt-1">
                    System operations nominal. No active events match selected filter criteria.
                  </p>
                </div>
              ) : (
                filteredAlerts.map((alert) => {
                  const isCritical = alert.severity === AlertSeverity.CRITICAL;
                  const isHigh = alert.severity === AlertSeverity.HIGH;
                  const isWarning = alert.severity === AlertSeverity.WARNING;
                  const isInfo = alert.severity === AlertSeverity.INFO;

                  let borderCol = 'border-l-sky-500';
                  let bgCol = 'bg-sky-500/5';
                  let textCol = 'text-sky-400';
                  let iconBg = 'bg-sky-500/10 border-sky-500/20';

                  if (isCritical) {
                    borderCol = 'border-l-rose-500';
                    bgCol = 'bg-rose-500/5';
                    textCol = 'text-rose-400';
                    iconBg = 'bg-rose-500/10 border-rose-500/20';
                  } else if (isHigh) {
                    borderCol = 'border-l-orange-500';
                    bgCol = 'bg-orange-500/5';
                    textCol = 'text-orange-400';
                    iconBg = 'bg-orange-500/10 border-orange-500/20';
                  } else if (isWarning) {
                    borderCol = 'border-l-amber-500';
                    bgCol = 'bg-amber-500/5';
                    textCol = 'text-amber-400';
                    iconBg = 'bg-amber-500/10 border-amber-500/20';
                  }

                  return (
                    <motion.div
                      layoutId={`alert-card-${alert.id}`}
                      key={alert.id}
                      className={`p-5 rounded-xl border border-border-color bg-bg-hover/60 border-l-4 ${borderCol} flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all hover:bg-bg-hover`}
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-extrabold uppercase border ${iconBg} ${textCol}`}>
                            {alert.severity}
                          </span>
                          <h3 className="text-sm font-extrabold text-text-primary">{alert.type}</h3>
                          <span className="text-[10px] text-text-secondary font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        <p className="text-xs text-text-secondary leading-relaxed font-sans">{alert.message}</p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-text-secondary font-mono">
                          <div>
                            <span className="text-text-secondary uppercase">Source:</span> {alert.source}
                          </div>
                          <div>
                            <span className="text-text-secondary uppercase">ID:</span> {alert.id}
                          </div>
                          <div>
                            <span className="text-text-secondary uppercase">Time:</span>{' '}
                            {new Date(alert.timestamp).toLocaleDateString()} {new Date(alert.timestamp).toLocaleTimeString()}
                          </div>
                        </div>

                        {alert.status === 'ACKNOWLEDGED' && (
                          <div className="pt-2 flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono bg-bg-hover/40 p-2 rounded-lg border border-border-color/40 mt-1 max-w-fit">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>
                              Acknowledged by <strong className="text-emerald-300">{alert.acknowledgedBy}</strong> at{' '}
                              {new Date(alert.acknowledgedAt || '').toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {alert.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          className="self-start md:self-center px-3.5 py-1.5 rounded-lg bg-bg-hover hover:bg-bg-hover border border-border-color text-[10px] font-bold text-text-secondary hover:text-text-primary cursor-pointer transition-colors flex items-center gap-1.5 uppercase tracking-wider shrink-0"
                        >
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Acknowledge</span>
                        </button>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: PREFERENCES MATRIX & LIVE SIMULATOR */}
          <div className="space-y-6">
            
            {/* COMPREHENSIVE NOTIFICATION CONFIGURATOR */}
            <div className="p-5 rounded-2xl bg-bg-hover border border-border-color shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border-color">
                <Settings className="w-5 h-5 text-cyan-400" />
                <div>
                  <h2 className="text-sm font-extrabold text-text-primary">Alert Preferences Per User</h2>
                  <p className="text-[10px] text-text-secondary">Configure delivery channels per alert category</p>
                </div>
              </div>

              {/* Channels toggles */}
              <div className="space-y-3.5 pt-1">
                {/* Email Address details */}
                <div className="p-3 rounded-xl bg-bg-hover border border-border-color space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-text-secondary flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-sky-400" />
                      Email Notification Delivery
                    </label>
                    <input
                      type="checkbox"
                      checked={emailConfigured}
                      onChange={(e) => setEmailConfigured(e.target.checked)}
                      className="rounded border-border-color text-cyan-500 focus:ring-cyan-500 bg-bg-hover w-4 h-4"
                    />
                  </div>
                  {emailConfigured && (
                    <input
                      type="email"
                      value={tempEmail}
                      onChange={(e) => setTempEmail(e.target.value)}
                      placeholder="trader@appexquant.global"
                      className="w-full bg-bg-hover border border-border-color rounded-lg text-xs px-2.5 py-1.5 text-text-secondary placeholder-slate-600 focus:outline-none focus:border-cyan-500/30"
                    />
                  )}
                </div>

                {/* Push notification simulated toggle */}
                <div className="p-3 rounded-xl bg-bg-hover border border-border-color flex items-center justify-between">
                  <span className="text-[11px] font-bold text-text-secondary flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    Simulated Browser Push Status
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                      SUPPORTED
                    </span>
                    <input
                      type="checkbox"
                      checked={pushSupported}
                      onChange={(e) => setPushSupported(e.target.checked)}
                      className="rounded border-border-color text-cyan-500 focus:ring-cyan-500 bg-bg-hover w-4 h-4"
                    />
                  </div>
                </div>
              </div>

              {/* Preference Matrix table */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between text-[10px] text-text-secondary uppercase tracking-wider font-mono font-bold px-1.5">
                  <span>Alert Category</span>
                  <div className="flex gap-4">
                    <span title="In-App">App</span>
                    <span title="Push Notification">Push</span>
                    <span title="Email Address">Mail</span>
                  </div>
                </div>

                {prefsLoading ? (
                  <div className="py-8 text-center text-xs text-text-secondary font-mono">Loading preference matrix...</div>
                ) : userPrefs ? (
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                    {userPrefs.preferences.map((pref) => (
                      <div
                        key={pref.type}
                        className="p-2 rounded-lg bg-bg-hover hover:bg-bg-hover/80 transition-colors flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-text-secondary truncate max-w-[140px]" title={pref.type}>
                          {pref.type}
                        </span>

                        <div className="flex items-center gap-5">
                          {/* In-app */}
                          <input
                            type="checkbox"
                            checked={pref.channels[AlertChannel.IN_APP]}
                            onChange={(e) =>
                              handlePreferenceCheckboxChange(pref.type, AlertChannel.IN_APP, e.target.checked)
                            }
                            className="rounded border-border-color text-cyan-500 focus:ring-cyan-500 bg-bg-hover w-3.5 h-3.5"
                          />
                          {/* Push */}
                          <input
                            type="checkbox"
                            checked={pref.channels[AlertChannel.PUSH]}
                            onChange={(e) =>
                              handlePreferenceCheckboxChange(pref.type, AlertChannel.PUSH, e.target.checked)
                            }
                            className="rounded border-border-color text-cyan-500 focus:ring-cyan-500 bg-bg-hover w-3.5 h-3.5"
                          />
                          {/* Email */}
                          <input
                            type="checkbox"
                            checked={pref.channels[AlertChannel.EMAIL]}
                            onChange={(e) =>
                              handlePreferenceCheckboxChange(pref.type, AlertChannel.EMAIL, e.target.checked)
                            }
                            className="rounded border-border-color text-cyan-500 focus:ring-cyan-500 bg-bg-hover w-3.5 h-3.5"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {prefsMessage && (
                <div
                  className={`p-2.5 rounded-xl text-center text-xs font-mono font-bold ${
                    prefsMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {prefsMessage.text}
                </div>
              )}

              <button
                onClick={handleSavePreferences}
                disabled={isSavingPrefs}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-text-secondary font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/10 cursor-pointer disabled:opacity-50"
              >
                {isSavingPrefs ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Preferences...</span>
                  </>
                ) : (
                  <>
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Save Alert Preferences</span>
                  </>
                )}
              </button>
            </div>

            {/* REALTIME TRIGGER SIMULATOR PANEL */}
            {isAdminOrOwner && (
              <div className="p-5 rounded-2xl bg-bg-hover border border-border-color shadow-xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 pb-3 border-b border-border-color">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  <div>
                    <h2 className="text-sm font-extrabold text-text-primary">Manual Alert Injection</h2>
                    <p className="text-[10px] text-text-secondary">Inject custom simulated events to test the pipeline</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Select Type */}
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase tracking-widest font-mono font-bold block mb-1">
                      Alert Event Type
                    </label>
                    <select
                      value={simType}
                      onChange={(e) => setSimType(e.target.value as AlertType)}
                      className="w-full bg-bg-hover border border-border-color rounded-xl text-xs px-3 py-2 text-text-secondary focus:outline-none focus:border-cyan-500/50"
                    >
                      {Object.values(AlertType).map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Severity */}
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase tracking-widest font-mono font-bold block mb-1">
                      Severity Level
                    </label>
                    <select
                      value={simSeverity}
                      onChange={(e) => setSimSeverity(e.target.value as AlertSeverity)}
                      className="w-full bg-bg-hover border border-border-color rounded-xl text-xs px-3 py-2 text-text-secondary focus:outline-none focus:border-cyan-500/50"
                    >
                      {Object.values(AlertSeverity).map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Input Source */}
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase tracking-widest font-mono font-bold block mb-1">
                      Event Source Controller
                    </label>
                    <input
                      type="text"
                      value={simSource}
                      onChange={(e) => setSimSource(e.target.value)}
                      placeholder="e.g., RiskEngine-01"
                      className="w-full bg-bg-hover border border-border-color rounded-xl text-xs px-3 py-2 text-text-secondary placeholder-slate-700 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {/* Input Message */}
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase tracking-widest font-mono font-bold block mb-1">
                      Event Message Log
                    </label>
                    <textarea
                      value={simMessage}
                      onChange={(e) => setSimMessage(e.target.value)}
                      rows={3}
                      placeholder="Describe the technical context or incident logs..."
                      className="w-full bg-bg-hover border border-border-color rounded-xl text-xs px-3 py-2 text-text-secondary placeholder-slate-700 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {simulationMessage && (
                    <div className="p-2 rounded-lg bg-bg-hover border border-border-color text-[10px] text-cyan-400 font-mono text-center">
                      {simulationMessage}
                    </div>
                  )}

                  <button
                    onClick={handleTriggerSimulatedAlert}
                    disabled={isSimulating}
                    className="w-full py-2.5 rounded-xl bg-bg-hover border border-rose-500/40 hover:bg-rose-950/20 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Trigger Simulated Alert</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      ) : (
        /* TAB 2: FINANCIAL NEWS SENTINEL (EXISTING CODE PRESERVED EXACTLY) */
        <div className="space-y-6">
          
          {/* DXY Index Macro Sentinel Widget */}
          <div className="p-5 rounded-2xl bg-bg-hover/90 border border-border-color shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border-color">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Globe2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">US Dollar Index (DXY) Macro Monitor</h3>
                  <p className="text-xs text-text-secondary">Anchor reference index for global currency pair correlation</p>
                </div>
              </div>

              <div className="text-right font-mono">
                <span className="text-xl font-bold text-text-primary">{dxy.price.toFixed(2)}</span>
                <span
                  className={`text-xs ml-2 font-semibold ${
                    dxy.change24hPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {dxy.change24hPct >= 0 ? '+' : ''}
                  {dxy.change24hPct.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-bg-hover border border-border-color">
                <span className="text-[10px] text-text-secondary block uppercase">Direction</span>
                <span className="font-bold text-indigo-400">{dxy.direction}</span>
              </div>
              <div className="p-3 rounded-xl bg-bg-hover border border-border-color">
                <span className="text-[10px] text-text-secondary block uppercase">Momentum</span>
                <span className="font-bold text-text-secondary">{dxy.momentum}</span>
              </div>
              <div className="p-3 rounded-xl bg-bg-hover border border-border-color">
                <span className="text-[10px] text-text-secondary block uppercase">EUR/USD Correlation</span>
                <span className="font-bold text-rose-400">{dxy.correlations['frxEURUSD']}</span>
              </div>
              <div className="p-3 rounded-xl bg-bg-hover border border-border-color">
                <span className="text-[10px] text-text-secondary block uppercase">XAU/USD Correlation</span>
                <span className="font-bold text-amber-400">{dxy.correlations['frxXAUUSD']}</span>
              </div>
            </div>
          </div>

          {/* Financial News Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-border-color">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-cyan-400" />
                Institutional News & Sentiment Stream
              </h3>

              <div className="flex flex-wrap gap-1 text-xs font-semibold">
                {(['ALL', 'CENTRAL BANKS', 'MONETARY POLICY', 'COMMODITIES', 'SYNTHETICS'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveNewsCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      activeNewsCategory === cat
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-text-secondary hover:text-text-primary bg-bg-hover/60'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {newsLoading && news.length === 0 ? (
              <div className="p-12 text-center bg-bg-hover/40 border border-border-color rounded-2xl">
                <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin mx-auto mb-2" />
                <p className="text-text-secondary text-xs font-mono">Querying central intelligence feeds...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {news
                  .filter((item) => {
                    if (activeNewsCategory === 'ALL') return true;
                    return item.category.toUpperCase() === activeNewsCategory.toUpperCase();
                  })
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl bg-bg-hover/80 border border-border-color hover:border-border-color transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                          <span className="px-2 py-0.5 rounded bg-bg-hover text-text-secondary font-mono">{item.category}</span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                item.sentiment === 'BULLISH'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : item.sentiment === 'BEARISH'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-bg-hover text-text-secondary'
                              }`}
                            >
                              {item.sentiment} ({item.sentimentConfidence}%)
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                item.importance === 'HIGH'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {item.importance} IMPACT
                            </span>
                          </div>
                        </div>

                        <h4 className="text-sm font-bold text-text-primary leading-snug">{item.headline}</h4>
                        <p className="text-xs text-text-secondary mt-2 leading-relaxed">{item.summary}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border-color/80 flex items-center justify-between text-xs text-text-secondary">
                        <span className="font-mono">{item.source}</span>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                        >
                          <span>Source</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Economic Calendar */}
          <div className="p-5 rounded-2xl bg-bg-hover/90 border border-border-color shadow-xl space-y-4">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              High Impact Economic Calendar
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-border-color text-text-secondary">
                    <th className="pb-3 font-semibold">Event</th>
                    <th className="pb-3 font-semibold">Time</th>
                    <th className="pb-3 font-semibold">Currency</th>
                    <th className="pb-3 font-semibold">Impact</th>
                    <th className="pb-3 font-semibold">Forecast</th>
                    <th className="pb-3 font-semibold">Previous</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {newsCalendar.map((event) => (
                    <tr key={event.id} className="hover:bg-bg-hover/30 transition-colors">
                      <td className="py-3 font-bold text-text-primary">{event.title}</td>
                      <td className="py-3 text-text-secondary">{event.time}</td>
                      <td className="py-3 font-bold text-cyan-400">{event.currency}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          {event.impact}
                        </span>
                      </td>
                      <td className="py-3 text-text-secondary">{event.forecast}</td>
                      <td className="py-3 text-text-secondary">{event.previous}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
