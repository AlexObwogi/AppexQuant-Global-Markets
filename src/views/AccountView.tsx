/**
 * AppexQuant Markets Global - Account & Broker Connection Management
 */

import React, { useState } from 'react';
import { useGlobalState } from '../state/GlobalStateContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { DerivAdapter, ExnessAdapter, JustMarketsAdapter } from '../services/brokerAdapter';
import { logAuditEvent } from '../observability/audit';
import { getStoredProgress, TRADER_LEVELS } from '../services/education/educationEngine';
import { User, Shield, Globe, Key, Cpu, AlertCircle, GraduationCap, Award, Flame, Clock, Check, BookOpen } from 'lucide-react';

export const AccountView: React.FC = () => {
  const { state, dispatch, selectedAccount } = useGlobalState();

  const [brokerType, setBrokerType] = useState<'DERIV' | 'EXNESS' | 'JUSTMARKETS'>('DERIV');
  const [accountNumber, setAccountNumber] = useState('');
  const [server, setServer] = useState('Deriv-Server');
  const [token, setToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Retrieve learning academy progress parameters
  const progress = getStoredProgress();

  const totalLessons: any[] = [];
  TRADER_LEVELS.forEach(lvl => {
    lvl.courses.forEach(c => {
      c.modules.forEach(m => {
        m.lessons.forEach(l => {
          totalLessons.push(l);
        });
      });
    });
  });

  const totalLessonsCount = totalLessons.length;
  const completedLessonsCount = progress.completedLessons.length;
  const overallPercentage = totalLessonsCount > 0 
    ? Math.round((completedLessonsCount / totalLessonsCount) * 100) 
    : 0;

  const currentLevelTitle = TRADER_LEVELS.find(l => l.level === progress.currentLevel)?.title || 'Beginner';
  const masteryHours = ((progress.theoryHours || 12.0) + (progress.practiceHours || 8.5)).toFixed(1);
  const learningStreak = progress.streak?.current || 3;
  const certificatesCount = progress.certificates?.length || 0;

  let coursesCompleted = 0;
  TRADER_LEVELS.forEach(lvl => {
    lvl.courses.forEach(course => {
      const courseLessons: string[] = [];
      course.modules.forEach(m => m.lessons.forEach(l => courseLessons.push(l.id)));
      if (courseLessons.length > 0 && courseLessons.every(id => progress.completedLessons.includes(id))) {
        coursesCompleted++;
      }
    });
  });

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber) {
      setMessage('Please provide an account number.');
      return;
    }

    setIsConnecting(true);
    setMessage(null);

    let adapter;
    if (brokerType === 'DERIV') adapter = new DerivAdapter();
    else if (brokerType === 'EXNESS') adapter = new ExnessAdapter();
    else adapter = new JustMarketsAdapter();

    const success = await adapter.connect({ accountNumber, server, token });

    if (success) {
      const conn = adapter.getConnectionStatus();
      dispatch({ type: 'SELECT_BROKER', payload: conn });
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'ONLINE' });
      logAuditEvent('ACCOUNT_CONNECTED', state.user?.id || 'usr-01', { brokerType, accountNumber });
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          title: 'Broker Configuration Saved',
          message: `${brokerType} account ${accountNumber} saved and connected.`,
        },
      });
      setMessage(`Configuration active for ${brokerType} (${accountNumber}). Credentials validated.`);
    } else {
      setMessage('Failed to connect broker.');
    }
    setIsConnecting(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 text-text-primary dark:text-text-primary">
      {/* Header */}
      <div className="p-4 bg-bg-surface border border-border-color dark:border-[#2B3139] rounded-[4px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2 tracking-tight">
            <User className="w-4 h-4 text-color-warning dark:text-accent-primary" />
            Account & Broker Integration Setup
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Manage your profile, configure multi-broker adapters, and review risk engine boundaries.
          </p>
        </div>
        <StatusIndicator status={state.connectionStatus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Col: User Profile Info & Academy Progress */}
        <div className="lg:col-span-1 space-y-4">
          <Card variant="surface" className="space-y-3 p-4">
            <h3 className="text-xs font-bold text-text-primary pb-2.5 border-b border-border-color flex items-center gap-2 font-mono uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-color-warning dark:text-accent-primary" />
              Trader Profile
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-text-secondary block text-[9px] uppercase font-mono font-bold">Display Name</span>
                <span className="font-bold text-text-primary text-sm">{state.user?.displayName}</span>
              </div>
              <div>
                <span className="text-text-secondary block text-[9px] uppercase font-mono font-bold">Email Address</span>
                <span className="text-text-primary font-mono font-bold">{state.user?.email}</span>
              </div>
              <div>
                <span className="text-text-secondary block text-[9px] uppercase font-mono font-bold">Assigned Role</span>
                <Badge variant="accent" size="sm" className="mt-1">
                  {state.user?.role}
                </Badge>
              </div>
              <div>
                <span className="text-text-secondary block text-[9px] uppercase font-mono font-bold">Primary Active Account</span>
                <span className="text-text-primary font-mono font-bold">{selectedAccount?.accountNumber} ({selectedAccount?.type})</span>
              </div>
            </div>
          </Card>

          {/* Institutional Academy Stats Progress Block */}
          <Card variant="surface" className="space-y-3.5 p-4">
            <h3 className="text-xs font-bold text-text-primary pb-2.5 border-b border-border-color flex items-center gap-2 font-mono uppercase tracking-wider">
              <GraduationCap className="w-3.5 h-3.5 text-color-warning dark:text-accent-primary" />
              Academy Progress
            </h3>

            <div className="space-y-3 text-xs">
              {/* Overall Progress Meter */}
              <div className="space-y-1">
                <div className="flex items-center justify-between font-bold text-[10px] text-text-secondary dark:text-text-secondary">
                  <span className="uppercase font-mono">Overall Progress</span>
                  <span className="font-mono text-color-success">{overallPercentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                  <div className="bg-color-success h-full transition-all" style={{ width: `${overallPercentage}%` }} />
                </div>
              </div>

              {/* Individual Metrics Grid */}
              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <div className="p-2 bg-bg-secondary border border-border-color rounded-[4px] space-y-0.5">
                  <span className="text-[9px] font-mono text-text-secondary uppercase font-bold">Current Level</span>
                  <span className="font-extrabold text-text-primary block truncate">{currentLevelTitle}</span>
                </div>

                <div className="p-2 bg-bg-secondary border border-border-color rounded-[4px] space-y-0.5">
                  <span className="text-[9px] font-mono text-text-secondary uppercase font-bold">Mastery Hours</span>
                  <span className="font-extrabold text-text-primary block font-mono">{masteryHours}h</span>
                </div>

                <div className="p-2 bg-bg-secondary border border-border-color rounded-[4px] space-y-0.5">
                  <span className="text-[9px] font-mono text-text-secondary uppercase font-bold">Learning Streak</span>
                  <span className="font-extrabold text-text-primary block font-mono flex items-center gap-1">
                    <Flame className="w-3 h-3 text-color-warning dark:text-accent-primary inline shrink-0" />
                    {learningStreak} days
                  </span>
                </div>

                <div className="p-2 bg-bg-secondary border border-border-color rounded-[4px] space-y-0.5">
                  <span className="text-[9px] font-mono text-text-secondary uppercase font-bold">Certs Earned</span>
                  <span className="font-extrabold text-text-primary block font-mono flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500 inline shrink-0" />
                    {certificatesCount}
                  </span>
                </div>
              </div>

              {/* Secondary details */}
              <div className="space-y-2 pt-2 border-t border-border-color/60 dark:border-border-color/60 text-[11px] font-semibold text-text-secondary dark:text-text-secondary">
                <div className="flex items-center justify-between">
                  <span>Courses Completed:</span>
                  <span className="font-mono text-text-primary font-bold">{coursesCompleted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Strategies Mastered:</span>
                  <span className="font-mono text-text-primary font-bold">
                    {progress.completedLessons.filter(id => id.startsWith('l2-') || id.startsWith('l3-') || id.startsWith('l4-')).length}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Col: Broker Adapter Setup Form */}
        <Card variant="surface" className="lg:col-span-2 space-y-4 p-4">
          <h3 className="text-xs font-bold text-text-primary pb-2.5 border-b border-border-color dark:border-[#2B3139] flex items-center gap-2 font-mono uppercase tracking-wider">
            <Globe className="w-3.5 h-3.5 text-color-warning dark:text-accent-primary" />
            Broker Connection Adapter Config
          </h3>

          <form onSubmit={handleConnect} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Broker Provider"
                value={brokerType}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setBrokerType(val);
                  setServer(val === 'DERIV' ? 'Deriv-Server' : val === 'EXNESS' ? 'Exness-Real' : 'JustMarkets-Server');
                }}
                options={[
                  { label: 'Deriv Limited', value: 'DERIV' },
                  { label: 'Exness Global', value: 'EXNESS' },
                  { label: 'JustMarkets Ltd', value: 'JUSTMARKETS' },
                ]}
              />

              <Input
                label="Server Name"
                value={server}
                onChange={(e) => setServer(e.target.value)}
                placeholder="e.g. Deriv-Server"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Account Number / Login"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. CR7849201"
                required
              />

              <Input
                label="API Token / OAuth Secret (Optional)"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="••••••••••••••••"
              />
            </div>

            {message && (
              <div className="p-2 bg-accent-primary/10 border border-accent-primary/25 text-xs text-accent-hover dark:text-accent-primary rounded-[2px] flex items-center gap-1.5 font-bold font-mono">
                <AlertCircle className="w-4 h-4 text-color-warning shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <p className="text-[10px] text-text-secondary dark:text-text-secondary">
                Encrypted credential storage with multi-broker API adapter validation.
              </p>
              <Button type="submit" isLoading={isConnecting} size="sm" variant="primary">
                Save Connection
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Feature Flags Control Panel */}
      <Card variant="surface" className="p-4 space-y-3">
        <h3 className="text-xs font-bold text-text-primary pb-2.5 border-b border-border-color dark:border-[#2B3139] flex items-center gap-2 font-mono uppercase tracking-wider">
          <Cpu className="w-3.5 h-3.5 text-color-warning dark:text-accent-primary" />
          Feature Flag Architecture Settings
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {Object.entries(state.featureFlags).map(([flag, isEnabled]) => (
            <div key={flag} className="p-2.5 bg-bg-main border border-border-color dark:bg-[#0B0E11] dark:border-[#2B3139] rounded-[2px] flex items-center justify-between">
              <div>
                <div className="font-mono font-bold text-text-primary dark:text-text-primary">{flag}</div>
                <div className="text-[10px] text-text-secondary font-semibold">{isEnabled ? 'Activated' : 'Inactive'}</div>
              </div>
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) =>
                  dispatch({
                    type: 'SET_FEATURE_FLAG',
                    payload: { flag: flag as any, value: e.target.checked },
                  })
                }
                className="w-4 h-4 accent-[#FCD535] rounded cursor-pointer"
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
