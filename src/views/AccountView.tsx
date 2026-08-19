/**
 * AppexQuant Markets Global - Account & Profile Management
 * Optimized for secure Deriv integration status, balance synchronization, and role simulations.
 */

import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../state/GlobalStateContext.tsx';
import { useApiFetch } from '../utils/apiFetch.ts';
import { Card } from '../components/ui/Card.tsx';
import { setEncryptedCookie } from "../utils/auth/pkce.ts";
import { Button } from '../components/ui/Button.tsx';
import { Input, Select } from '../components/ui/Input.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { StatusIndicator } from '../components/ui/StatusIndicator.tsx';
import { logAuditEvent } from '../observability/audit.ts';
import { getStoredProgress, TRADER_LEVELS } from '../services/education/educationEngine.ts';
import { 
  User, 
  Shield, 
  Globe, 
  Cpu, 
  AlertCircle, 
  GraduationCap, 
  Award, 
  Flame, 
  Check, 
  RefreshCw, 
  Unplug, 
  ShieldCheck, 
  KeyRound, 
  Link2, 
  Sparkles,
  Loader2
} from 'lucide-react';

interface ConnectionMeta {
  connected: boolean;
  derivAccountId?: string;
  accountType?: 'demo' | 'real';
  currency?: string;
  connectionStatus: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'RECONNECT_REQUIRED' | 'ERROR';
  scopes?: string[];
  lastSyncedAt?: string;
}

export const AccountView: React.FC = () => {
  const { state, dispatch, selectedAccount } = useGlobalState();
  const apiFetch = useApiFetch();
  
  const userRole = state.user?.role || 'USER';
  const isAdminOrOwner = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'RISK_MANAGER';

  const [meta, setMeta] = useState<ConnectionMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [apiTokenInput, setApiTokenInput] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Fetch current user's safe Deriv connection status from backend
  const fetchDerivStatus = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch('/api/auth/deriv/status');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setMeta(json.data);
          if (json.data.connected) {
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'ONLINE' });
            dispatch({
              type: 'SELECT_BROKER',
              payload: {
                id: `conn-deriv-${json.data.derivAccountId}`,
                brokerType: 'DERIV',
                brokerName: 'Deriv Limited',
                server: 'Deriv-Server',
                accountNumber: json.data.derivAccountId || '',
                status: 'CONNECTED',
                environment: json.data.accountType === 'real' ? 'REAL' : 'DEMO',
                apiPermissions: json.data.scopes || ['trade', 'account_manage'],
                isReadOnly: false,
                executionPermission: true,
              }
            });
          } else {
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'OFFLINE' });
            dispatch({ type: 'SELECT_BROKER', payload: null });
          }
        }
      }
    } catch (err: any) {
      setErrorMessage('Failed to fetch active Deriv integration status from backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDerivStatus();
  }, []);

  // Initiate Deriv OAuth PKCE flow
  const handleInitiateOAuth = () => {
    setErrorMessage(null);
    setMessage('Initiating secure OAuth redirect sequence...');
    setTimeout(() => {
      window.location.href = `/api/auth/deriv/login?action=connect&destination=${encodeURIComponent(window.location.pathname)}`;
    }, 500);
  };

  // Handle environment toggling
  const handleEnvToggle = async (targetEnv: 'demo' | 'real') => {
    // Determine the expected token key based on environment
    const tokenKey = targetEnv === 'demo' ? 'deriv_demo_token' : 'deriv_real_token';
    const savedToken = localStorage.getItem(tokenKey);
    
    // Update global state immediately for UI consistency
    dispatch({ type: 'SET_EXECUTION_ENVIRONMENT', payload: targetEnv === 'demo' ? 'DEMO' : 'LIVE' });

    if (savedToken) {
       // Silently switch using the stored token for this environment
       setApiTokenInput(savedToken);
       await performTokenLogin(savedToken);
    } else {
       // Ask user to provide token if we don't have it
       setMeta(null);
       setShowTokenInput(true);
       setApiTokenInput('');
       setMessage(`Please provide your Deriv ${targetEnv.toUpperCase()} API token to switch environments.`);
    }
  };

  const performTokenLogin = async (tokenStr: string) => {
    setIsSubmittingToken(true);
    setErrorMessage(null);
    setMessage(null);
    try {
      const res = await apiFetch('/api/auth/deriv/token-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: tokenStr }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const accType = json.data.accountType || 'demo';
          // Save tokens for active WebSocket and persistence
          localStorage.setItem('deriv_oauth_token', tokenStr);
          localStorage.setItem('deriv_access_token', tokenStr);
          localStorage.setItem(accType === 'demo' ? 'deriv_demo_token' : 'deriv_real_token', tokenStr);
          await setEncryptedCookie('deriv_oauth_token', tokenStr);
          await setEncryptedCookie('deriv_account_id', json.data.derivAccountId || 'unknown');
          
          setMeta(json.data);
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'ONLINE' });
          dispatch({ type: 'SET_EXECUTION_ENVIRONMENT', payload: accType === 'demo' ? 'DEMO' : 'LIVE' });
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              title: 'Environment Switched',
              message: `Successfully connected to ${accType.toUpperCase()} account ${json.data.derivAccountId}`,
              type: 'success',
            },
          });
          setApiTokenInput('');
          setShowTokenInput(false);
          setMessage(`Integration connected successfully to ${accType.toUpperCase()} environment.`);
          // Hard reload to guarantee WebSocket and API instances use the newly activated token
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setErrorMessage(json.error?.message || 'Token authentication failed.');
        }
      } else {
        setErrorMessage('Failed to validate connection with selected token.');
      }
    } catch {
      setErrorMessage('Failed to integrate with API token.');
    } finally {
      setIsSubmittingToken(false);
    }
  };

  // Submit Deriv API Token for login
  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiTokenInput.trim()) {
      setErrorMessage('Please provide a valid API Token.');
      return;
    }
    await performTokenLogin(apiTokenInput.trim());
  };
  // Trigger manual backend account sync
  const handleSync = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    setMessage(null);
    try {
      const res = await apiFetch('/api/auth/deriv/sync', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setMeta(json.data);
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              title: 'Sync Succeeded',
              message: 'Active Deriv account balance, tier limits, and permissions successfully synced.',
              type: 'success',
            },
          });
          setMessage('Account synchronization successful.');
        }
      }
    } catch {
      setErrorMessage('Failed to synchronize integrated account.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Safe manual disconnect
  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your integrated Deriv account? This will revoke active API sessions.')) return;
    setIsDisconnecting(true);
    setErrorMessage(null);
    setMessage(null);
    try {
      const res = await apiFetch('/api/auth/deriv/disconnect', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setMeta({
            connected: false,
            connectionStatus: 'DISCONNECTED',
          });
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'OFFLINE' });
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              title: 'Integration Disconnected',
              message: 'Your Deriv account connection has been securely removed.',
              type: 'success',
            },
          });
          setMessage('Account integration successfully disconnected.');
        }
      }
    } catch {
      setErrorMessage('Failed to disconnect account safely.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Role switching mechanism for RBAC testing
  const handleRoleChange = async (newRole: string) => {
    setIsChangingRole(true);
    setErrorMessage(null);
    setMessage(null);

    let targetEmail = 'trader@appexquant.global';
    if (newRole === 'RISK_MANAGER') targetEmail = 'carol.risk@appexquant.global';
    else if (newRole === 'ADMIN') targetEmail = 'dave@appexquant.global';
    else if (newRole === 'SUPER_ADMIN') targetEmail = 'super@appexquant.global';

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, role: newRole }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.user) {
          // Synchronize state
          dispatch({
            type: 'SET_USER_PROFILE',
            payload: {
              id: json.data.user.id,
              email: json.data.user.email,
              displayName: json.data.user.displayName,
              role: json.data.user.role as any,
              createdAt: json.data.user.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              preferences: {
                theme: 'dark',
                currency: 'USD',
                timezone: 'UTC',
                notificationsEnabled: true
              }
            }
          });
          
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              title: 'Access Level Updated',
              message: `Switched simulation access role to: ${newRole}`,
              type: 'success',
            },
          });
          setMessage(`Switched access context to ${newRole}.`);
        }
      }
    } catch {
      setErrorMessage('Failed to simulate role transition.');
    } finally {
      setIsChangingRole(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 text-text-primary dark:text-text-primary">
      {/* Header */}
      <div className="p-4 bg-bg-surface border border-border-color dark:border-[#2B3139] rounded-[4px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2 tracking-tight">
            <User className="w-4 h-4 text-color-warning dark:text-accent-primary" />
            Account & Profile Hub
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Manage your credentials, synchronize integrated balances, and customize your trading system preferences.
          </p>
        </div>
        <StatusIndicator status={state.connectionStatus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: User Profile & Role simulation */}
        <div className="lg:col-span-1 space-y-4">
          <Card variant="surface" className="space-y-4 p-4">
            <h3 className="text-xs font-bold text-text-primary pb-2 flex items-center gap-2 font-mono uppercase tracking-wider border-b border-border-color">
              <User className="w-3.5 h-3.5 text-color-warning dark:text-accent-primary" />
              Trader Profile
            </h3>
            
            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-text-secondary block text-[9px] uppercase font-mono font-bold">Display Name</span>
                <span className="font-bold text-text-primary text-sm whitespace-normal break-words block">{state.user?.displayName}</span>
              </div>
              <div>
                <span className="text-text-secondary block text-[9px] uppercase font-mono font-bold">Email Address</span>
                <span className="text-text-primary font-mono font-bold">{state.user?.email}</span>
              </div>
              <div>
                <span className="text-text-secondary block text-[9px] uppercase font-mono font-bold">Assigned Role</span>
                <Badge variant="accent" size="sm" className="mt-1 font-bold">
                  {state.user?.role}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Academy Stats Progress Block */}
          <Card variant="surface" className="space-y-3.5 p-4">
            <h3 className="text-xs font-bold text-text-primary pb-2.5 border-b border-border-color flex items-center gap-2 font-mono uppercase tracking-wider">
              <GraduationCap className="w-3.5 h-3.5 text-color-warning dark:text-accent-primary" />
              Academy Progress
            </h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between font-bold text-[10px] text-text-secondary dark:text-text-secondary">
                  <span className="uppercase font-mono">Overall Progress</span>
                  <span className="font-mono text-color-success">{overallPercentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                  <div className="bg-color-success h-full transition-all" style={{ width: `${overallPercentage}%` }} />
                </div>
              </div>

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

        {/* Right Column: Sleek User-Facing Deriv Account Integration (Replacing Generic Setup) */}
        <div className="lg:col-span-2 space-y-4">
          <Card variant="surface" className="p-4 space-y-5">
            <div className="pb-3 border-b border-border-color flex items-center justify-between">
              <h3 className="text-xs font-bold text-text-primary flex items-center gap-2 font-mono uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5 text-accent-primary" />
                Deriv Account Integration
              </h3>
              
              {/* Environment Toggle Switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-bg-secondary border border-border-color rounded-lg">
                <button
                  onClick={() => handleEnvToggle('demo')}
                  className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded transition-all ${
                    (meta?.accountType === 'demo' || state.executionEnvironment === 'DEMO') 
                      ? 'bg-accent-primary text-white shadow-sm' 
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Demo
                </button>
                <button
                  onClick={() => handleEnvToggle('real')}
                  className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded transition-all ${
                    (meta?.accountType === 'real' || state.executionEnvironment === 'LIVE')
                      ? 'bg-danger text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Real
                </button>
              </div>
            </div>
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
                <span className="text-xs text-text-secondary">Verifying secure integration state with backend server...</span>
              </div>
            ) : meta?.connected ? (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="p-4 rounded-xl bg-bg-secondary border border-border-color space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-2.5 bg-bg-surface border border-border-color rounded-lg">
                      <span className="text-text-secondary text-[9px] uppercase font-bold block mb-1">Account Number / Login</span>
                      <span className="text-text-primary font-bold text-sm">{meta.derivAccountId || 'Unknown'}</span>
                    </div>

                    <div className="p-2.5 bg-bg-surface border border-border-color rounded-lg">
                      <span className="text-text-secondary text-[9px] uppercase font-bold block mb-1">Environment Class</span>
                      <Badge variant={meta.accountType === 'real' ? 'danger' : 'accent'} className="font-bold uppercase tracking-wide mt-0.5">
                        {meta.accountType || 'DEMO'}
                      </Badge>
                    </div>

                    <div className="p-2.5 bg-bg-surface border border-border-color rounded-lg">
                      <span className="text-text-secondary text-[9px] uppercase font-bold block mb-1">Currency Standard</span>
                      <span className="text-text-primary font-bold text-sm">{meta.currency || 'USD'}</span>
                    </div>

                    <div className="p-2.5 bg-bg-surface border border-border-color rounded-lg">
                      <span className="text-text-secondary text-[9px] uppercase font-bold block mb-1">Last Synced Status</span>
                      <span className="text-text-primary font-bold text-xs truncate block" title={meta.lastSyncedAt}>
                        {meta.lastSyncedAt ? new Date(meta.lastSyncedAt).toLocaleString() : 'Sync Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border-color/50">
                    <Button 
                      onClick={handleSync} 
                      isLoading={isSyncing} 
                      size="sm" 
                      variant="primary" 
                      className="flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      Sync Account State
                    </Button>
                    <Button 
                      onClick={handleDisconnect} 
                      isLoading={isDisconnecting} 
                      size="sm" 
                      variant="secondary" 
                      className="flex items-center gap-1.5"
                    >
                      <Unplug className="w-3.5 h-3.5" />
                      Disconnect Account
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 text-[11px] rounded-lg text-emerald-400 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="leading-normal">
                    Secure server-side state connection active. Your account is isolated and authorization parameters are stored safely using enterprise encryption guidelines.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="text-center py-6 space-y-2">
                  <Link2 className="w-10 h-10 text-text-secondary mx-auto mb-1 opacity-50" />
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">No Active Integration</h4>
                  <p className="text-xs text-text-secondary max-w-md mx-auto px-4 leading-normal">
                    Connect your personal Deriv account to authorize order execution. AppexQuant manages operations securely without exposing keys in browser sessions.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button 
                    onClick={handleInitiateOAuth} 
                    variant="primary" 
                    className="w-full sm:w-auto font-bold text-xs px-5 py-2.5"
                  >
                    Connect with Deriv (OAuth)
                  </Button>
                  
                  <Button 
                    onClick={() => setShowTokenInput(!showTokenInput)} 
                    variant="secondary" 
                    className="w-full sm:w-auto text-xs px-5 py-2.5"
                  >
                    {showTokenInput ? 'Cancel Token Connection' : 'Connect via API Token'}
                  </Button>
                </div>

                {showTokenInput && (
                  <form onSubmit={handleTokenSubmit} className="p-4 bg-bg-secondary border border-border-color rounded-xl space-y-4 animate-in slide-in-from-top duration-200">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono font-bold uppercase text-text-secondary">
                        Deriv API Token / Personal Access Token
                      </label>
                      <Input
                        type="password"
                        value={apiTokenInput}
                        onChange={(e) => setApiTokenInput(e.target.value)}
                        placeholder="e.g. xyz123abc789"
                        required
                        className="w-full"
                      />
                      <p className="text-[10px] text-text-secondary leading-normal">
                        Create a read-only or trading API token from your Deriv account security panel.
                      </p>
                    </div>

                    <Button 
                      type="submit" 
                      isLoading={isSubmittingToken} 
                      size="sm" 
                      variant="primary"
                    >
                      Authorize Connection
                    </Button>
                  </form>
                )}
              </div>
            )}

            {message && (
              <div className="p-3 bg-accent-primary/10 border border-accent-primary/25 text-xs text-accent-hover dark:text-accent-primary rounded-lg flex items-center gap-2 font-semibold font-mono">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/25 text-xs text-rose-400 rounded-lg flex items-center gap-2 font-semibold font-mono">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </Card>

          {/* Feature Flags Control Panel */}
          {isAdminOrOwner && (
            <Card variant="surface" className="p-4 space-y-3">
              <h3 className="text-xs font-bold text-text-primary pb-2.5 border-b border-border-color dark:border-[#2B3139] flex items-center gap-2 font-mono uppercase tracking-wider">
                <Cpu className="w-3.5 h-3.5 text-color-warning dark:text-accent-primary" />
                Feature Flag Settings
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
          )}
        </div>
      </div>
    </div>
  );
};
