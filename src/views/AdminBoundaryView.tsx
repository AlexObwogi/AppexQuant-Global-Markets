/**
 * AppexQuant Markets Global - Administrative Portal & Security Playground
 * Implementation of least-privilege role-based access control (RBAC), multi-factor
 * authentication (MFA) elevation, real-time server-side auditing, and user role updates.
 */

import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../state/GlobalStateContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { UserRole, UserPermission, UserProfile } from '../types/user';
import { ROLE_PERMISSIONS, HIGH_RISK_PERMISSIONS, hasPermission } from '../utils/auth';
import { useApiFetch } from '../utils/apiFetch';
import { 
  Lock, 
  ShieldAlert, 
  KeyRound, 
  Check, 
  X, 
  RefreshCw, 
  ShieldCheck, 
  Users, 
  Activity, 
  UserPlus, 
  ArrowRight,
  ShieldAlert as AlertIcon,
  Fingerprint,
  Zap,
  Sliders
} from 'lucide-react';
import { failSafeEngineService } from '../services/failSafeEngineService';

interface AuditLogItem {
  id: string;
  eventType: string;
  userId: string;
  timestamp: string;
  details: Record<string, any>;
}

interface SimulatedUser {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  status: string;
}

export const AdminBoundaryView: React.FC = () => {
  const { state, dispatch } = useGlobalState();
  const apiFetch = useApiFetch();
  const activeUser = state.user;
  const isElevated = state.session?.isElevated;

  // UI state variables
  const [activeMfaCode, setActiveMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState(false);
  const [showMfaPrompt, setShowMfaPrompt] = useState(false);
  
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditError, setAuditError] = useState('');
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  const [usersList, setUsersList] = useState<SimulatedUser[]>([]);
  const [usersError, setUsersError] = useState('');
  const [isUpdatingUserRole, setIsUpdatingUserRole] = useState<string | null>(null);

  const [operationResult, setOperationResult] = useState<{
    action: string;
    success: boolean;
    status: number;
    message: string;
    timestamp: string;
  } | null>(null);

  const [isExecutingOp, setIsExecutingOp] = useState<string | null>(null);

  // Deriv OAuth Gateway Admin Diagnostics
  const [derivAdminData, setDerivAdminData] = useState<any>(null);
  const [derivAdminError, setDerivAdminError] = useState<string | null>(null);
  const [isLoadingDerivDiagnostics, setIsLoadingDerivDiagnostics] = useState(false);

  const fetchDerivAdminDiagnostics = async () => {
    setIsLoadingDerivDiagnostics(true);
    setDerivAdminError(null);
    try {
      const res = await apiFetch('/api/admin/deriv/diagnostics');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setDerivAdminData(json.data);
        } else {
          setDerivAdminError(json.error?.message || 'Failed to fetch Deriv diagnostics.');
        }
      } else {
        setDerivAdminError('Forbidden: Admin rights required to access Deriv Gateway Controls.');
      }
    } catch {
      setDerivAdminError('Failed to communicate with Deriv Admin API.');
    } finally {
      setIsLoadingDerivDiagnostics(false);
    }
  };

  useEffect(() => {
    fetchDerivAdminDiagnostics();
  }, []);

  const handleAdminDisconnectDeriv = async (targetUserId: string) => {
    try {
      const res = await apiFetch('/api/admin/deriv/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        fetchDerivAdminDiagnostics();
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            title: 'Admin Action Executed',
            message: `Deriv account disconnected for user ${targetUserId}`,
            type: 'warning',
          },
        });
      }
    } catch {
      alert('Failed to disconnect user account');
    }
  };

  // Role list with user-friendly descriptions
  const rolesList = [
    { role: 'USER' as UserRole, label: 'Trader (USER)', desc: 'Standard access to personal accounts, strategy builder, and execution.' },
    { role: 'SUPPORT_AGENT' as UserRole, label: 'Support Agent', desc: 'Read-only access to user portfolios, settings, and general system diagnostics.' },
    { role: 'CONTENT_MANAGER' as UserRole, label: 'Content Manager', desc: 'Draft, view, and organize market strategies and educational feeds.' },
    { role: 'TRADING_OPERATOR' as UserRole, label: 'Trading Operator', desc: 'Submit and execute clearing orders; manage paper trading limits.' },
    { role: 'RISK_MANAGER' as UserRole, label: 'Risk Manager', desc: 'Calibrate pre-trade safeguards, reset circuit breakers, and enforce limits.' },
    { role: 'AI_OPERATOR' as UserRole, label: 'AI Operator', desc: 'Trigger model runs, generate predictions, and backtest intelligence pipelines.' },
    { role: 'ADMIN' as UserRole, label: 'System Admin', desc: 'Configure feature flags, inspect audit logs, and manage standard user authorizations.' },
    { role: 'SUPER_ADMIN' as UserRole, label: 'Super Admin', desc: 'Root access to full system configurations, broker gateways, and audit parameters.' },
  ];

  // Switch simulated role
  const handleRoleSwitch = (newRole: UserRole) => {
    const profile: UserProfile = {
      id: 'usr-default-001',
      email: `${newRole.toLowerCase()}@appexquant.global`,
      displayName: `${newRole.charAt(0) + newRole.slice(1).toLowerCase()} Simulator`,
      role: newRole,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {
        theme: 'dark',
        currency: 'USD',
        timezone: 'UTC',
        notificationsEnabled: true,
      }
    };
    
    dispatch({ type: 'SET_USER_PROFILE', payload: profile });
    // Clear elevation when switching roles to respect least privilege
    dispatch({ type: 'SET_SESSION_ELEVATION', payload: { isElevated: false, elevatedUntil: null } });
    setOperationResult(null);
    setMfaSuccess(false);
    setActiveMfaCode('');
  };

  // Simulated TOTP Verification on the Server
  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError('');
    try {
      const res = await apiFetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeMfaCode,
          userId: activeUser?.id,
          email: activeUser?.email,
          role: activeUser?.role,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        dispatch({
          type: 'SET_SESSION_ELEVATION',
          payload: {
            isElevated: true,
            elevatedUntil: data.data.elevatedUntil,
          },
        });
        setMfaSuccess(true);
        setTimeout(() => {
          setShowMfaPrompt(false);
          setMfaSuccess(false);
          setActiveMfaCode('');
        }, 1200);
        // Refresh logs to capture the successful verification
        fetchAuditLogs();
      } else {
        setMfaError(data.error?.message || 'Invalid MFA code. Use "123456" for simulation.');
      }
    } catch (err: any) {
      setMfaError('Network exception during MFA authentication.');
    }
  };

  // End Elevated session
  const handleDeElevate = () => {
    dispatch({ type: 'SET_SESSION_ELEVATION', payload: { isElevated: false, elevatedUntil: null } });
    setOperationResult(null);
    fetchAuditLogs();
  };

  // Fetch audit logs (Requires VIEW_AUDIT_LOG)
  const fetchAuditLogs = async () => {
    if (!activeUser || !hasPermission(activeUser.role, UserPermission.VIEW_AUDIT_LOG)) {
      setAuditLogs([]);
      setAuditError('Permission Denied: Current role lacks VIEW_AUDIT_LOG authorization.');
      return;
    }

    setIsRefreshingLogs(true);
    setAuditError('');
    try {
      const res = await apiFetch('/api/audit-logs');
      const data = await res.json();
      if (res.ok && data.success) {
        setAuditLogs(data.data);
      } else {
        setAuditError(data.error?.message || 'Failed to fetch audit records.');
      }
    } catch (err) {
      setAuditError('Failed to fetch system audit logs due to a server exception.');
    } finally {
      setIsRefreshingLogs(false);
    }
  };

  // Fetch system user listing (Requires MANAGE_USERS)
  const fetchUsersList = async () => {
    if (!activeUser || !hasPermission(activeUser.role, UserPermission.MANAGE_USERS)) {
      setUsersList([]);
      setUsersError('Permission Denied: Current role lacks MANAGE_USERS authorization.');
      return;
    }

    setUsersError('');
    try {
      const res = await apiFetch('/api/users/list');
      const data = await res.json();
      if (res.ok && data.success) {
        setUsersList(data.data);
      } else {
        setUsersError(data.error?.message || 'Failed to fetch users list.');
      }
    } catch (err) {
      setUsersError('Failed to load users database.');
    }
  };

  // Update a user's role (Requires MANAGE_USERS)
  const handleUpdateUserRole = async (targetUserId: string, newRole: UserRole) => {
    setIsUpdatingUserRole(targetUserId);
    try {
      const res = await apiFetch('/api/users/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, newRole }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Refresh local list
        fetchUsersList();
        fetchAuditLogs();
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            type: 'success',
            title: 'User Updated',
            message: `User role successfully set to ${newRole}.`,
          },
        });
      } else {
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            type: 'error',
            title: 'Update Denied',
            message: data.error?.message || 'Failed to update user role.',
          },
        });
      }
    } catch (err) {
      console.error('Failed to change user role', err);
    } finally {
      setIsUpdatingUserRole(null);
    }
  };

  // Test Server-Side Authorized Operations
  const handleExecuteOperation = async (actionName: string, endpoint: string, method: string, payload: any = {}) => {
    setIsExecutingOp(actionName);
    setOperationResult(null);

    try {
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (method !== 'GET') {
        options.body = JSON.stringify(payload);
      }

      const res = await apiFetch(endpoint, options);
      const data = await res.json();

      setOperationResult({
        action: actionName,
        success: res.ok && data.success,
        status: res.status,
        message: res.ok ? 'Operation successful and verified.' : (data.error?.message || 'Access Denied.'),
        timestamp: new Date().toISOString()
      });

      // Automatically refresh logs and users if successful
      if (res.ok) {
        fetchAuditLogs();
        fetchUsersList();
      }
    } catch (err: any) {
      setOperationResult({
        action: actionName,
        success: false,
        status: 500,
        message: 'Network error or server connection refused.',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsExecutingOp(null);
    }
  };

  // Effect triggers when active user shifts
  useEffect(() => {
    fetchAuditLogs();
    fetchUsersList();
  }, [activeUser?.role, isElevated]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* 1. Header Banner */}
      <Card variant="surface" className="p-6 border-border-color bg-bg-hover/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-lg shadow-amber-500/5 shrink-0">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-text-secondary">RBAC & Authorization Console</h1>
                <Badge variant="warning" size="sm" className="font-mono text-[10px]">
                  ENTERPRISE SECURE
                </Badge>
              </div>
              <p className="text-sm text-text-secondary mt-1 max-w-xl">
                Upgrade authorization engine verifying least-privilege role matrix, server-enforced permissions, simulated multi-factor authentication, and strict visual auditing.
              </p>
            </div>
          </div>
          
          {/* Identity Switcher */}
          <div className="p-4 rounded-xl bg-bg-hover border border-border-color shrink-0 md:w-80">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-2">
              Simulate Identity Role:
            </label>
            <select
              value={activeUser?.role || 'USER'}
              onChange={(e) => handleRoleSwitch(e.target.value as UserRole)}
              className="w-full bg-bg-hover border border-border-color rounded-lg py-2 px-3 text-xs text-text-secondary focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
            >
              {rolesList.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.label}
                </option>
              ))}
            </select>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border-color text-[10px] text-text-secondary font-mono">
              <span>Active User: {activeUser?.email}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Simulation Controls & Verification */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* MFA / Elevation Status Panel */}
          <Card variant="surface" className="p-5 border-border-color relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-border-color mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Fingerprint className="w-4 h-4 text-sky-400" />
                Session Verification State
              </h2>
              {isElevated ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  <ShieldCheck className="w-3.5 h-3.5" /> ELEVATED (MFA)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-bg-hover text-text-secondary border border-border-color">
                  <Lock className="w-3.5 h-3.5" /> STANDARD
                </span>
              )}
            </div>

            <p className="text-xs text-text-secondary leading-relaxed mb-4">
              To enforce absolute security, high-risk administrative operations are restricted—even for <span className="font-semibold text-text-secondary">SUPER_ADMIN</span>—unless the active session has been verified using multi-factor authentication.
            </p>

            {isElevated ? (
              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-emerald-400 font-semibold">Elevated Session Verified</span>
                  <span className="text-[10px] text-text-secondary font-mono">Expires in ~15m</span>
                </div>
                <button
                  onClick={handleDeElevate}
                  className="w-full py-1.5 bg-bg-hover hover:bg-bg-hover text-text-secondary hover:text-text-secondary border border-border-color hover:border-border-color rounded-lg text-xs font-semibold transition"
                >
                  Terminate Elevation (Least Privilege)
                </button>
              </div>
            ) : (
              <div>
                {!showMfaPrompt ? (
                  <button
                    onClick={() => { setShowMfaPrompt(true); setMfaError(''); }}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-text-secondary font-bold rounded-lg text-xs transition shadow-lg shadow-amber-500/10 flex items-center justify-center gap-1.5"
                  >
                    <KeyRound className="w-4 h-4" /> Verify Multi-Factor Auth (MFA)
                  </button>
                ) : (
                  <form onSubmit={handleMfaSubmit} className="space-y-3 p-3.5 rounded-xl bg-bg-hover border border-border-color">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">
                        Enter 6-Digit TOTP Code:
                      </label>
                      <span className="text-[9px] px-1.5 py-0.5 font-mono rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Mock Code: 123456
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={activeMfaCode}
                        onChange={(e) => {
                          setActiveMfaCode(e.target.value.replace(/\D/g, ''));
                          setMfaError('');
                        }}
                        className="flex-1 bg-bg-hover border border-border-color rounded-lg text-center text-base tracking-widest font-mono py-1.5 px-3 text-text-secondary focus:outline-none focus:border-amber-500"
                        required
                      />
                      <button
                        type="submit"
                        className="bg-amber-500 hover:bg-amber-600 text-text-secondary px-4 rounded-lg text-xs font-bold transition shrink-0"
                      >
                        Verify
                      </button>
                    </div>

                    {mfaError && (
                      <p className="text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                        <AlertIcon className="w-3.5 h-3.5 shrink-0" />
                        {mfaError}
                      </p>
                    )}

                    {mfaSuccess && (
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        Authentication Succeeded!
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowMfaPrompt(false)}
                      className="w-full text-center text-[10px] text-text-secondary hover:text-text-secondary pt-1 block"
                    >
                      Cancel Verification
                    </button>
                  </form>
                )}
              </div>
            )}
          </Card>

          {/* 5. ADMIN-ONLY DERIV OAUTH GATEWAY CONTROL & DIAGNOSTICS */}
          <Card variant="surface" className="p-5 border-border-color space-y-4">
            <div className="flex items-center justify-between border-b border-border-color pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-400" />
                Deriv OAuth 2.0 Gateway Administration & Connection Diagnostics
              </h2>
              <button
                onClick={fetchDerivAdminDiagnostics}
                disabled={isLoadingDerivDiagnostics}
                className="px-2.5 py-1 text-[11px] font-bold bg-bg-hover hover:bg-bg-elevated border border-border-color rounded-lg text-text-secondary hover:text-text-primary transition flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingDerivDiagnostics ? 'animate-spin' : ''}`} />
                <span>Refresh Diagnostics</span>
              </button>
            </div>

            {derivAdminError ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-xs flex items-center gap-2">
                <AlertIcon className="w-4 h-4 shrink-0" />
                <span>{derivAdminError}</span>
              </div>
            ) : derivAdminData ? (
              <div className="space-y-4 text-xs">
                {/* OAuth Gateway Configuration Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-bg-hover/50 border border-border-color space-y-1">
                    <span className="text-[10px] font-bold text-text-secondary uppercase">App ID / Client ID</span>
                    <p className="font-mono font-bold text-text-primary">{derivAdminData.oauthConfig?.clientId}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-bg-hover/50 border border-border-color space-y-1">
                    <span className="text-[10px] font-bold text-text-secondary uppercase">Redirect URI</span>
                    <p className="font-mono text-[11px] text-text-primary truncate" title={derivAdminData.oauthConfig?.redirectUri}>
                      {derivAdminData.oauthConfig?.redirectUri}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-bg-hover/50 border border-border-color space-y-1">
                    <span className="text-[10px] font-bold text-text-secondary uppercase">Partner Affiliate Token</span>
                    <p className="font-mono text-[11px] text-emerald-400">{derivAdminData.oauthConfig?.partnerAttribution?.affiliateToken}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-bg-hover/50 border border-border-color space-y-1">
                    <span className="text-[10px] font-bold text-text-secondary uppercase">Active Connections</span>
                    <p className="font-mono font-bold text-sky-400">
                      {derivAdminData.activeConnectionsCount} / {derivAdminData.totalRegisteredConnections}
                    </p>
                  </div>
                </div>

                {/* Registered User Connections Table */}
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                    User Connection Directory & Token Status
                  </h3>

                  {derivAdminData.connections?.length === 0 ? (
                    <div className="p-4 rounded-xl bg-bg-hover/30 border border-border-color text-center text-text-secondary text-xs font-mono">
                      No active or historical Deriv OAuth connections stored. All users are strictly DISCONNECTED.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border-color text-text-secondary font-bold text-[10px] uppercase">
                            <th className="pb-2">User ID</th>
                            <th className="pb-2">Deriv Account ID</th>
                            <th className="pb-2">Type</th>
                            <th className="pb-2">Status</th>
                            <th className="pb-2">Token Status</th>
                            <th className="pb-2">Scopes</th>
                            <th className="pb-2 text-right">Admin Controls</th>
                          </tr>
                        </thead>
                        <tbody>
                          {derivAdminData.connections.map((conn: any) => (
                            <tr key={conn.userId} className="border-b border-border-color/50 last:border-0 hover:bg-bg-hover/30 text-[11px]">
                              <td className="py-2.5 font-mono text-text-primary">{conn.userId}</td>
                              <td className="py-2.5 font-mono font-bold text-sky-400">{conn.derivAccountId}</td>
                              <td className="py-2.5 uppercase text-[10px] text-text-secondary">{conn.accountType}</td>
                              <td className="py-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  conn.connectionStatus === 'CONNECTED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                  {conn.connectionStatus}
                                </span>
                              </td>
                              <td className="py-2.5 font-mono text-[10px] text-text-secondary">
                                {conn.hasAccessToken ? 'VALID_TOKEN' : 'NO_TOKEN'}
                              </td>
                              <td className="py-2.5 font-mono text-[10px] text-text-secondary max-w-[120px] truncate">
                                {Array.isArray(conn.scopes) ? conn.scopes.join(',') : conn.scopes}
                              </td>
                              <td className="py-2.5 text-right">
                                {conn.connectionStatus === 'CONNECTED' ? (
                                  <button
                                    onClick={() => handleAdminDisconnectDeriv(conn.userId)}
                                    className="px-2 py-1 text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded transition cursor-pointer"
                                  >
                                    DISCONNECT
                                  </button>
                                ) : (
                                  <a
                                    href={`/api/auth/deriv/login?action=connect&destination=/admin`}
                                    className="px-2 py-1 text-[10px] font-bold bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded transition cursor-pointer inline-block"
                                  >
                                    CONNECT DIFFERENT
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-text-secondary text-xs">Loading Deriv Gateway Diagnostics...</div>
            )}
          </Card>

          {/* Active Permissions Checklist Card */}
          <Card variant="surface" className="p-5 border-border-color">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary pb-3 border-b border-border-color mb-4 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Simulated Role Permissions Checklist
            </h2>
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {Object.keys(UserPermission).map((permKey) => {
                const perm = UserPermission[permKey as keyof typeof UserPermission];
                const hasPerm = activeUser ? hasPermission(activeUser.role, perm) : false;
                const isHighRisk = HIGH_RISK_PERMISSIONS.includes(perm);

                return (
                  <div 
                    key={perm} 
                    className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors duration-150 ${
                      hasPerm 
                        ? 'bg-bg-hover/60 border border-border-color/80' 
                        : 'bg-bg-hover/20 border border-border-color/50 opacity-50'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-[10.5px] font-semibold ${hasPerm ? 'text-text-secondary' : 'text-text-secondary'}`}>
                          {perm}
                        </span>
                        {isHighRisk && (
                          <Badge variant="warning" size="sm" className="px-1 text-[8px] tracking-normal font-sans py-0">
                            HIGH RISK (MFA)
                          </Badge>
                        )}
                      </div>
                    </div>
                    {hasPerm ? (
                      <div className="p-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="p-1 rounded bg-bg-hover border border-border-color text-text-secondary shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

        </div>

        {/* Right Side: Security Matrix & Active Audited Operations */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Admin Fail-Safe & Circuit Breakers Control Panel */}
          <Card variant="surface" className="p-5 border-border-color">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary pb-3 border-b border-border-color mb-4 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Fail-Safe Circuit Breakers & Simulation Tools (Admin Only)
              </span>
              <Badge variant="accent" size="sm">ADMIN PORTAL</Badge>
            </h2>

            <p className="text-xs text-text-secondary leading-relaxed mb-4">
              Simulate fail-safe trigger events or override execution statuses for system reliability testing.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-bg-main border border-border-color rounded-xl">
                <span className="text-[10px] text-text-secondary font-mono uppercase block font-bold">Current Fail-Safe Status</span>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  {failSafeEngineService.getState().status}
                </span>
              </div>
              <div className="p-3 bg-bg-main border border-border-color rounded-xl">
                <span className="text-[10px] text-text-secondary font-mono uppercase block font-bold">Active Circuit Trigger</span>
                <span className="text-sm font-bold font-mono text-text-primary">
                  {failSafeEngineService.getState().activeIncident?.triggerType || 'None (Healthy)'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border-color">
              <button
                onClick={() => {
                  failSafeEngineService.triggerFailSafe('CRITICAL_MARKET_DATA_FAILURE', 'Admin manual feed test');
                  dispatch({ type: 'ADD_NOTIFICATION', payload: { title: 'Fail-Safe Triggered', message: 'Simulated Market Data Failure', type: 'warning' } });
                }}
                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Simulate Market Feed Failure
              </button>
              <button
                onClick={() => {
                  failSafeEngineService.triggerFailSafe('EXCESSIVE_LOSSES', 'Admin manual drawdown breach test');
                  dispatch({ type: 'ADD_NOTIFICATION', payload: { title: 'Fail-Safe Triggered', message: 'Simulated Drawdown Breach', type: 'warning' } });
                }}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Simulate Drawdown Breach
              </button>
              <button
                onClick={() => {
                  failSafeEngineService.resetFailSafe({
                    userSignature: activeUser?.displayName || 'Admin',
                    resolutionNotes: 'Admin Portal Manual Reset',
                    bypassChecksAcknowledged: true,
                  });
                  dispatch({ type: 'ADD_NOTIFICATION', payload: { title: 'Fail-Safes Cleared', message: 'System restored to HEALTHY', type: 'success' } });
                }}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Reset All Fail-Safes
              </button>
            </div>
          </Card>

          {/* 2. Interactive Action Playground */}
          <Card variant="surface" className="p-5 border-border-color">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary pb-3 border-b border-border-color mb-4 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-400" />
              Privileged Server Actions Playground
            </h2>
            
            <p className="text-xs text-text-secondary leading-relaxed mb-4">
              Trigger real-time authenticated server operations to test the least privilege role model. Your current role is <strong className="text-text-secondary">{activeUser?.role}</strong> (Session: <strong className="text-text-secondary">{isElevated ? 'ELEVATED' : 'STANDARD'}</strong>).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              
              {/* Action A */}
              <div className="p-4 rounded-xl bg-bg-hover border border-border-color flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-text-secondary">Submit Manual Trade</span>
                    <Badge variant="info" size="sm" className="font-mono text-[8px]">
                      EXECUTE_MANUAL_ORDER
                    </Badge>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed mb-4">
                    Submit clearing orders. Authorized for: Standard Trader (USER), Trading Operator, Super Admin.
                  </p>
                </div>
                <button
                  disabled={isExecutingOp !== null}
                  onClick={() => handleExecuteOperation(
                    'Execute Manual Order', 
                    '/api/execution/submit', 
                    'POST', 
                    { symbol: 'EUR/USD', side: 'BUY', quantity: 100000, accountId: 'acc-demo-001' }
                  )}
                  className="w-full py-1.5 bg-bg-hover hover:bg-bg-hover text-text-secondary hover:text-text-secondary border border-border-color hover:border-border-color disabled:opacity-50 rounded-lg text-xs font-semibold transition"
                >
                  {isExecutingOp === 'Execute Manual Order' ? 'Sending Request...' : 'Trigger Order Submission'}
                </button>
              </div>

              {/* Action B */}
              <div className="p-4 rounded-xl bg-bg-hover border border-border-color flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-text-secondary">Reset Risk Safeguards</span>
                    <Badge variant="info" size="sm" className="font-mono text-[8px]">
                      MANAGE_RISK
                    </Badge>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed mb-4">
                    Wipes the pre-trade decision logs. Authorized for: Risk Manager, Super Admin.
                  </p>
                </div>
                <button
                  disabled={isExecutingOp !== null}
                  onClick={() => handleExecuteOperation(
                    'Reset Risk safeguard metrics', 
                    '/api/risk/reset', 
                    'POST'
                  )}
                  className="w-full py-1.5 bg-bg-hover hover:bg-bg-hover text-text-secondary hover:text-text-secondary border border-border-color hover:border-border-color disabled:opacity-50 rounded-lg text-xs font-semibold transition"
                >
                  {isExecutingOp === 'Reset Risk safeguard metrics' ? 'Sending Request...' : 'Trigger Decisions Wipe'}
                </button>
              </div>

              {/* Action C */}
              <div className="p-4 rounded-xl bg-bg-hover border border-border-color flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                    <span className="text-xs font-bold text-text-secondary">Reset Active Positions</span>
                    <Badge variant="warning" size="sm" className="font-mono text-[8px]">
                      MANAGE_SYSTEM
                    </Badge>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed mb-4">
                    <strong className="text-amber-500/80 font-bold">HIGH RISK.</strong> Forcefully wipes database positions. Authorized only for Super Admin and strictly requires an elevated MFA session!
                  </p>
                </div>
                <button
                  disabled={isExecutingOp !== null}
                  onClick={() => handleExecuteOperation(
                    'Reset Active Positions Database', 
                    '/api/positions/reset', 
                    'POST'
                  )}
                  className="w-full py-1.5 bg-bg-hover hover:bg-bg-hover text-text-secondary hover:text-text-secondary border border-border-color hover:border-border-color disabled:opacity-50 rounded-lg text-xs font-semibold transition"
                >
                  {isExecutingOp === 'Reset Active Positions Database' ? 'Sending Request...' : 'Trigger Position Wipe'}
                </button>
              </div>

              {/* Action D */}
              <div className="p-4 rounded-xl bg-bg-hover border border-border-color flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                    <span className="text-xs font-bold text-text-secondary">Trigger System Alert</span>
                    <Badge variant="warning" size="sm" className="font-mono text-[8px]">
                      MANAGE_SYSTEM
                    </Badge>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed mb-4">
                    <strong className="text-amber-500/80 font-bold">HIGH RISK.</strong> Push alert message across the network. Authorized for Super Admin and requires elevated MFA session!
                  </p>
                </div>
                <button
                  disabled={isExecutingOp !== null}
                  onClick={() => handleExecuteOperation(
                    'Trigger System Alert', 
                    '/api/alerts/trigger', 
                    'POST',
                    { type: 'RISK_THRESHOLD_REACHED', severity: 'CRITICAL', source: 'Admin Portal', message: 'Simulated high severity circuit breaker triggered.' }
                  )}
                  className="w-full py-1.5 bg-bg-hover hover:bg-bg-hover text-text-secondary hover:text-text-secondary border border-border-color hover:border-border-color disabled:opacity-50 rounded-lg text-xs font-semibold transition"
                >
                  {isExecutingOp === 'Trigger System Alert' ? 'Sending Request...' : 'Push Critical Alert'}
                </button>
              </div>

            </div>

            {/* Playground Server Response Console */}
            {operationResult && (
              <div className="mt-4 p-4 rounded-xl bg-bg-hover border border-border-color space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-border-color">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">Server Response:</span>
                    <span className="text-xs font-mono text-sky-400 font-semibold">{operationResult.action}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-secondary font-mono">{operationResult.timestamp.split('T')[1].slice(0, 8)}</span>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                      operationResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      HTTP {operationResult.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2 pt-1">
                  {operationResult.success ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertIcon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <p className={`text-xs font-mono leading-relaxed ${operationResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {operationResult.message}
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* 3. Real-Time Security Audit Logs */}
          <Card variant="surface" className="p-5 border-border-color">
            <div className="flex items-center justify-between pb-3 border-b border-border-color mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                Live Audited System Activity Trail
              </h2>
              <button
                onClick={fetchAuditLogs}
                disabled={isRefreshingLogs || !activeUser || !hasPermission(activeUser.role, UserPermission.VIEW_AUDIT_LOG)}
                className="p-1 rounded bg-bg-hover hover:bg-bg-hover text-text-secondary hover:text-text-secondary border border-border-color hover:border-border-color disabled:opacity-40 transition"
                title="Refresh logs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {auditError ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-bg-hover/40 border border-border-color rounded-xl">
                <Lock className="w-10 h-10 text-rose-500/40 mb-2.5" />
                <h4 className="text-xs font-bold text-rose-400 mb-1">Access Restrained</h4>
                <p className="text-[11px] text-text-secondary max-w-sm leading-relaxed">
                  {auditError} Enforce strict segregation: only roles with <strong className="text-text-secondary">VIEW_AUDIT_LOG</strong> permissions are allowed backend log diagnostics.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-text-secondary text-center py-6 font-mono">No privileged activities logged in this lifecycle yet.</p>
                ) : (
                  auditLogs.map((log) => {
                    const isAlert = log.details?.event === 'AUTHORIZATION_DENIED' || log.details?.event === 'MFA_CHALLENGE_REQUIRED';
                    return (
                      <div 
                        key={log.id} 
                        className={`p-3 bg-bg-hover rounded-lg border text-xs font-mono space-y-1.5 transition-colors ${
                          isAlert 
                            ? 'border-rose-900/40 bg-rose-950/5' 
                            : 'border-border-color bg-bg-hover/60'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-text-secondary">
                          <span>{new Date(log.timestamp).toISOString().split('T')[1].slice(0, 8)}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                            isAlert ? 'bg-rose-500/10 text-rose-400' : 'bg-bg-hover text-text-secondary'
                          }`}>
                            {log.details?.event || log.eventType}
                          </span>
                        </div>
                        <div className="flex justify-between items-start gap-4">
                          <span className="text-text-secondary font-medium break-all">
                            {log.details?.reason || `Executed: ${log.details?.permission || log.details?.event || 'Privileged Operation'}`}
                          </span>
                          <span className="text-[10px] text-sky-400 bg-sky-950/25 px-1.5 rounded self-center shrink-0">
                            Role: {log.details?.role || 'SYSTEM'}
                          </span>
                        </div>
                        <div className="flex justify-between text-[9px] text-text-secondary pt-1 border-t border-border-color/50">
                          <span>Caller: {log.details?.email || log.userId}</span>
                          {log.details?.isElevated && <span className="text-emerald-500 font-bold">MFA VERIFIED</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </Card>

          {/* 4. User Directory & Role Promotion Card */}
          <Card variant="surface" className="p-5 border-border-color">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary pb-3 border-b border-border-color mb-4 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-sky-400" />
              Live Identity and Authorization Directory
            </h2>

            {usersError ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-bg-hover/40 border border-border-color rounded-xl">
                <Lock className="w-10 h-10 text-text-secondary/40 mb-2.5" />
                <h4 className="text-xs font-bold text-text-secondary mb-1">Authorization Missing</h4>
                <p className="text-[11px] text-text-secondary max-w-sm leading-relaxed">
                  Only administrators with <strong className="text-text-secondary">MANAGE_USERS</strong> are authorized to view and modify user role specifications. Promote simulated role to <strong className="text-text-secondary">ADMIN</strong> or <strong className="text-text-secondary">SUPER_ADMIN</strong>.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-color text-text-secondary font-bold text-[10px] uppercase tracking-wider">
                      <th className="pb-2.5 font-bold">Name</th>
                      <th className="pb-2.5 font-bold">Identity Email</th>
                      <th className="pb-2.5 font-bold">System Role</th>
                      <th className="pb-2.5 font-bold text-right">Authorize Promotion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((usr) => (
                      <tr key={usr.id} className="border-b border-border-color last:border-0 hover:bg-bg-hover/20">
                        <td className="py-3 text-text-secondary font-medium">{usr.displayName}</td>
                        <td className="py-3 text-text-secondary font-mono text-[11px]">{usr.email}</td>
                        <td className="py-3">
                          <span className="font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-bg-hover text-sky-400 border border-border-color">
                            {usr.role}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <select
                            disabled={isUpdatingUserRole !== null}
                            value={usr.role}
                            onChange={(e) => handleUpdateUserRole(usr.id, e.target.value as UserRole)}
                            className="bg-bg-hover border border-border-color rounded px-2 py-1 text-[11px] text-text-secondary focus:outline-none focus:ring-1 focus:ring-sky-500 transition font-medium"
                          >
                            {rolesList.map((r) => (
                              <option key={r.role} value={r.role}>
                                {r.role}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* 5. ADMIN-ONLY DERIV OAUTH GATEWAY CONTROL & DIAGNOSTICS */}
          <Card variant="surface" className="p-5 border-border-color space-y-4">
            <div className="flex items-center justify-between border-b border-border-color pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-400" />
                Deriv OAuth 2.0 Gateway Administration & Connection Diagnostics
              </h2>
              <button
                onClick={fetchDerivAdminDiagnostics}
                disabled={isLoadingDerivDiagnostics}
                className="px-2.5 py-1 text-[11px] font-bold bg-bg-hover hover:bg-bg-elevated border border-border-color rounded-lg text-text-secondary hover:text-text-primary transition flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingDerivDiagnostics ? 'animate-spin' : ''}`} />
                <span>Refresh Diagnostics</span>
              </button>
            </div>

            {derivAdminError ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-xs flex items-center gap-2">
                <AlertIcon className="w-4 h-4 shrink-0" />
                <span>{derivAdminError}</span>
              </div>
            ) : derivAdminData ? (
              <div className="space-y-4 text-xs">
                {/* OAuth Gateway Configuration Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-bg-hover/50 border border-border-color space-y-1">
                    <span className="text-[10px] font-bold text-text-secondary uppercase">App ID / Client ID</span>
                    <p className="font-mono font-bold text-text-primary">{derivAdminData.oauthConfig?.clientId}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-bg-hover/50 border border-border-color space-y-1">
                    <span className="text-[10px] font-bold text-text-secondary uppercase">Redirect URI</span>
                    <p className="font-mono text-[11px] text-text-primary truncate" title={derivAdminData.oauthConfig?.redirectUri}>
                      {derivAdminData.oauthConfig?.redirectUri}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-bg-hover/50 border border-border-color space-y-1">
                    <span className="text-[10px] font-bold text-text-secondary uppercase">Partner Affiliate Token</span>
                    <p className="font-mono text-[11px] text-emerald-400">{derivAdminData.oauthConfig?.partnerAttribution?.affiliateToken}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-bg-hover/50 border border-border-color space-y-1">
                    <span className="text-[10px] font-bold text-text-secondary uppercase">Active Connections</span>
                    <p className="font-mono font-bold text-sky-400">
                      {derivAdminData.activeConnectionsCount} / {derivAdminData.totalRegisteredConnections}
                    </p>
                  </div>
                </div>

                {/* Registered User Connections Table */}
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                    User Connection Directory & Token Status
                  </h3>

                  {derivAdminData.connections?.length === 0 ? (
                    <div className="p-4 rounded-xl bg-bg-hover/30 border border-border-color text-center text-text-secondary text-xs font-mono">
                      No active or historical Deriv OAuth connections stored. All users are strictly DISCONNECTED.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border-color text-text-secondary font-bold text-[10px] uppercase">
                            <th className="pb-2">User ID</th>
                            <th className="pb-2">Deriv Account ID</th>
                            <th className="pb-2">Type</th>
                            <th className="pb-2">Status</th>
                            <th className="pb-2">Token Status</th>
                            <th className="pb-2">Scopes</th>
                            <th className="pb-2 text-right">Admin Controls</th>
                          </tr>
                        </thead>
                        <tbody>
                          {derivAdminData.connections.map((conn: any) => (
                            <tr key={conn.userId} className="border-b border-border-color/50 last:border-0 hover:bg-bg-hover/30 text-[11px]">
                              <td className="py-2.5 font-mono text-text-primary">{conn.userId}</td>
                              <td className="py-2.5 font-mono font-bold text-sky-400">{conn.derivAccountId}</td>
                              <td className="py-2.5 uppercase text-[10px] text-text-secondary">{conn.accountType}</td>
                              <td className="py-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  conn.connectionStatus === 'CONNECTED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                  {conn.connectionStatus}
                                </span>
                              </td>
                              <td className="py-2.5 font-mono text-[10px] text-text-secondary">
                                {conn.hasAccessToken ? 'VALID_TOKEN' : 'NO_TOKEN'}
                              </td>
                              <td className="py-2.5 font-mono text-[10px] text-text-secondary max-w-[120px] truncate">
                                {Array.isArray(conn.scopes) ? conn.scopes.join(',') : conn.scopes}
                              </td>
                              <td className="py-2.5 text-right">
                                {conn.connectionStatus === 'CONNECTED' ? (
                                  <button
                                    onClick={() => handleAdminDisconnectDeriv(conn.userId)}
                                    className="px-2 py-1 text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded transition cursor-pointer"
                                  >
                                    DISCONNECT
                                  </button>
                                ) : (
                                  <a
                                    href={`/api/auth/deriv/login?action=connect&destination=/admin`}
                                    className="px-2 py-1 text-[10px] font-bold bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded transition cursor-pointer inline-block"
                                  >
                                    CONNECT DIFFERENT
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-text-secondary text-xs">Loading Deriv Gateway Diagnostics...</div>
            )}
          </Card>

        </div>

      </div>

    </div>
  );
};
