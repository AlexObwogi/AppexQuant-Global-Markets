import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../../state/GlobalStateContext.js';
import { useApiFetch } from '../../utils/apiFetch.js';
import { SystemHealthView } from '../../views/SystemHealthView.js';
import { DerivIntegrationsView } from '../../views/admin/DerivIntegrationsView.js';
import { 
  ShieldAlert, 
  Activity, 
  Globe, 
  Lock, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Server, 
  KeyRound, 
  Users, 
  Zap,
  Sliders,
  Database,
  Wifi,
  ShieldCheck
} from 'lucide-react';
import { Button } from '../../components/ui/Button.js';

export const AdminPortal: React.FC = () => {
  const { state, dispatch } = useGlobalState();
  const apiFetch = useApiFetch();
  const userRole = state.user?.role || 'USER';
  const isAdminOrOwner = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'RISK_MANAGER';

  const [activeSubTab, setActiveSubTab] = useState<'OVERVIEW' | 'INTEGRATIONS' | 'HEALTH' | 'AUDIT'>('INTEGRATIONS');

  if (!isAdminOrOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center max-w-md mx-auto space-y-4">
        <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <Lock className="w-10 h-10" />
        </div>
        <h2 className="text-lg font-bold text-text-primary">Administrative Access Required</h2>
        <p className="text-xs text-text-secondary leading-relaxed">
          Access to the AppexQuant AdminPortal requires verified server-side administrative privileges.
        </p>
        <Button
          onClick={() => dispatch({ type: 'SET_ROUTE', payload: 'dashboard' })}
          variant="primary"
          size="sm"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-slate-900 via-[#131822] to-slate-900 border border-border-color p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase">
              Protected Admin Portal
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
              Role: {userRole}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-text-primary tracking-tight">
            AppexQuant Enterprise Administration
          </h1>
          <p className="text-xs text-text-secondary">
            Server-verified administrative control center for broker integrations, API health diagnostics, and session security.
          </p>
        </div>

        {/* Sub-Route Tab Navigation */}
        <div className="flex items-center gap-1.5 bg-bg-main p-1.5 rounded-xl border border-border-color">
          <button
            onClick={() => setActiveSubTab('INTEGRATIONS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'INTEGRATIONS'
                ? 'bg-accent-primary text-bg-main shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Integrations
          </button>
          <button
            onClick={() => setActiveSubTab('HEALTH')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'HEALTH'
                ? 'bg-accent-primary text-bg-main shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            System Health
          </button>
        </div>
      </div>

      {/* SUB-ROUTE 1: INTEGRATIONS (Deriv OAuth & Connection States) */}
      {activeSubTab === 'INTEGRATIONS' && <DerivIntegrationsView />}

      {/* SUB-ROUTE 2: SYSTEM HEALTH (API Health Diagnostics & Telemetry) */}
      {activeSubTab === 'HEALTH' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-bg-surface border border-border-color p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">API Health & Telemetry Probes</h3>
                <p className="text-xs text-text-secondary">Server-side health heartbeat verified across database, execution engine, and cache tiers.</p>
              </div>
            </div>
          </div>

          {/* Embedded System Health View */}
          <div className="bg-bg-surface border border-border-color rounded-2xl p-4 shadow-sm">
            <SystemHealthView />
          </div>
        </div>
      )}
    </div>
  );
};

