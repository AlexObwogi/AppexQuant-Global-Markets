import React, { useState, useEffect, useRef } from 'react';
import { derivWs } from '../../services/deriv/DerivWebSocketManager.ts';
import { useGlobalState } from '../../state/GlobalStateContext.tsx';
import { DerivConnectionModal } from '../auth/DerivConnectionModal.tsx';
import { Flame, ShieldCheck, Unplug, RefreshCw } from 'lucide-react';

export const ConnectionStatus: React.FC = () => {
  const { state, dispatch } = useGlobalState();
  const [wsState, setWsState] = useState<string>(derivWs.getConnectionState());
  const [showAdminModal, setShowAdminModal] = useState(false);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsub = derivWs.onStatusChange((s) => setWsState(s));
    return unsub;
  }, []);

  const isWsConnected = wsState === 'CONNECTED' || derivWs.getConnectionState() === 'CONNECTED';
  const isAuthenticated = state.session.isAuthenticated;
  const isLiveConnected = isWsConnected && isAuthenticated;

  const accountType = state.user?.accountType || (state.user?.derivAccountId?.startsWith('VR') ? 'demo' : 'real');
  const env = state.executionEnvironment;
  const isAdmin = state.user?.role === 'ADMIN' || state.user?.role === 'SUPER_ADMIN';

  // Dynamic Flame Color States Definition
  // Green = Active Live Real | Orange/Yellow = Active Demo | Blue/Purple = Paper Mode | Red = Offline / Failure
  const getFlameState = () => {
    if (!isLiveConnected) {
      return {
        mode: 'OFFLINE',
        iconColor: 'text-rose-500',
        dotClass: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]',
        badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        label: 'OFFLINE',
      };
    }

    if (env === 'PAPER') {
      return {
        mode: 'PAPER',
        iconColor: 'text-purple-400',
        dotClass: 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.7)] animate-pulse',
        badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        label: 'PAPER',
      };
    }

    if (accountType === 'demo' || env === 'DEMO') {
      return {
        mode: 'DEMO',
        iconColor: 'text-amber-400',
        dotClass: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)] animate-pulse',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        label: 'LIVE DEMO',
      };
    }

    return {
      mode: 'REAL',
      iconColor: 'text-emerald-400',
      dotClass: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)] animate-pulse',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      label: 'LIVE REAL',
    };
  };

  const flameState = getFlameState();

  // Admin-Only Secret Click Trigger (Multi-click or Shift-Click)
  const handleBadgeClick = (e: React.MouseEvent) => {
    // If Shift key is held, or if already logged in as Admin, open modal immediately
    if (e.shiftKey || isAdmin) {
      setShowAdminModal(true);
      return;
    }

    // Secret double/triple-click trigger detection
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    if (clickCountRef.current >= 2) {
      clickCountRef.current = 0;
      setShowAdminModal(true);
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 400);
    }
  };

  return (
    <>
      <div
        onClick={handleBadgeClick}
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-2xl backdrop-blur-md transition-all duration-300 cursor-pointer select-none hover:scale-105 active:scale-95 ${flameState.badgeClass}`}
        title="Status Indicator Badge (Admin: Shift-click or double-click to configure broker gateway)"
      >
        <Flame className={`w-4 h-4 ${flameState.iconColor}`} />
        <span className={`w-2 h-2 rounded-full ${flameState.dotClass}`} />
        <span className="text-[10px] font-mono font-bold tracking-wider uppercase hidden xs:inline">
          {flameState.label}
        </span>
      </div>

      {/* Admin Interactive Broker Gateway Connection Modal */}
      {showAdminModal && (
        <DerivConnectionModal onClose={() => setShowAdminModal(false)} />
      )}
    </>
  );
};
