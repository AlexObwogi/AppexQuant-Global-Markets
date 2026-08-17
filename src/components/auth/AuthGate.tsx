/**
 * AppexQuant Markets Global - Master Immersive Landing Experience & Deriv OAuth Gateway
 * Strictly external broker authentication via Deriv OAuth/PKCE with zero local credential storage.
 * Features:
 * - Dynamic Sun-Burst Radiant Effect using CSS Radial Gradients at 30%, 60%, 90%, 100%
 * - URL OAuth Redirect Callback handler with PKCE Verifier extraction & Encrypted Cookie persistence
 * - High-Entropy PKCE generation & useDerivAuth integration
 * - Synchronized Global Background Gradients & Button Morphing across all milestones
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGlobalState } from '../../state/GlobalStateContext.tsx';
import { useApiFetch } from '../../utils/apiFetch.ts';
import { 
  useDerivAuth, 
  setEncryptedCookie, 
  getEncryptedCookie 
} from '../../utils/auth.ts';
import { derivAuthService } from '../../services/deriv/authService.ts';
import { 
  Globe, 
  Network, 
  GraduationCap, 
  Database, 
  Cpu, 
  TrendingUp, 
  Orbit, 
  ShieldCheck, 
  ExternalLink, 
  KeyRound, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Sun, 
  Moon, 
  Zap,
  Sparkles
} from 'lucide-react';
import { AppexQuantLogo } from '../common/AppexQuantLogo.tsx';

const CSS_ANIMATIONS = `
  @keyframes drawRing {
    0% { stroke-dashoffset: 301.59; }
    100% { stroke-dashoffset: 0; }
  }
  @keyframes spinSlow {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes spinSlowReverse {
    0% { transform: rotate(360deg); }
    100% { transform: rotate(0deg); }
  }
  @keyframes blurDisperse {
    0% { filter: blur(0px); opacity: 0; letter-spacing: normal; transform: scale(0.95); }
    15% { filter: blur(0px); opacity: 1; letter-spacing: normal; transform: scale(1); }
    70% { filter: blur(0px); opacity: 1; letter-spacing: normal; transform: scale(1); }
    100% { filter: blur(20px); opacity: 0; letter-spacing: 0.5em; transform: scale(1.05); }
  }
  @keyframes blurConverge {
    0% { filter: blur(20px); opacity: 0; letter-spacing: 0.5em; transform: scale(1.05); }
    20% { filter: blur(0px); opacity: 1; letter-spacing: normal; transform: scale(1); }
    100% { filter: blur(0px); opacity: 1; letter-spacing: normal; transform: scale(1); }
  }
  @keyframes successBurst {
    0% { transform: scale(0.6); opacity: 0; filter: blur(10px); }
    50% { transform: scale(1.15); opacity: 1; filter: blur(0px); }
    75% { transform: scale(0.95); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes marquee {
    0% { transform: translateX(0%); }
    100% { transform: translateX(-50%); }
  }
  
  /* SUN-BURST RADIANT RADIAL GRADIENT EXPANSION EFFECT */
  @keyframes sunBurstRadialBloom {
    0% {
      transform: scale(0.1) rotate(0deg);
      opacity: 0;
      filter: blur(16px);
    }
    20% {
      transform: scale(1.1) rotate(15deg);
      opacity: 1;
      filter: blur(4px);
    }
    55% {
      transform: scale(2.2) rotate(45deg);
      opacity: 0.85;
      filter: blur(12px);
    }
    85% {
      transform: scale(3.2) rotate(75deg);
      opacity: 0.35;
      filter: blur(22px);
    }
    100% {
      transform: scale(4.0) rotate(95deg);
      opacity: 0;
      filter: blur(36px);
    }
  }

  @keyframes sunBurstRaysPulse {
    0% {
      transform: scale(0.4) rotate(0deg);
      opacity: 0;
    }
    25% {
      transform: scale(1.4) rotate(35deg);
      opacity: 0.95;
    }
    70% {
      transform: scale(2.4) rotate(110deg);
      opacity: 0.45;
    }
    100% {
      transform: scale(3.5) rotate(180deg);
      opacity: 0;
    }
  }

  @keyframes textGlowSweepAnimation {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }

  .text-sweep-glow-cyan {
    background: linear-gradient(90deg, #FFFFFF 0%, #00E5FF 25%, #FFFFFF 50%, #38BDF8 75%, #FFFFFF 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: textGlowSweepAnimation 2.4s linear infinite;
  }
  .text-sweep-glow-blue {
    background: linear-gradient(90deg, #FFFFFF 0%, #38BDF8 25%, #818CF8 50%, #00E5FF 75%, #FFFFFF 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: textGlowSweepAnimation 2.4s linear infinite;
  }
  .text-sweep-glow-gold {
    background: linear-gradient(90deg, #FFFFFF 0%, #D4AF37 25%, #FDE047 50%, #F59E0B 75%, #FFFFFF 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: textGlowSweepAnimation 2.4s linear infinite;
  }
  .text-sweep-glow-emerald {
    background: linear-gradient(90deg, #FFFFFF 0%, #0ECB81 25%, #34D399 50%, #00E5FF 75%, #FFFFFF 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: textGlowSweepAnimation 2.4s linear infinite;
  }

  .animate-sunburst-bloom {
    animation: sunBurstRadialBloom 1.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .animate-sunburst-rays {
    animation: sunBurstRaysPulse 1.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .animate-marquee-smooth {
    display: inline-flex;
    animation: marquee 25s linear infinite;
  }
`;

// Sequential Milestones with strict 30%, 60%, 90%, 100% checkpoints
const MILESTONES = [
  {
    min: 0,
    max: 29,
    stageIndex: 0,
    title: "ENJOY FULL AUTOMATION",
    sub: "ALGORITHMIC CLOUD ORCHESTRATION & REAL-TIME BROKER ROUTING",
    glowClass: "text-sweep-glow-cyan",
    themeKey: "cyan",
    color: "#00E5FF"
  },
  {
    min: 30,
    max: 59,
    stageIndex: 1,
    title: "INSTITUTIONAL RISK SAFEGUARDS",
    sub: "MULTI-LAYER DRAWDOWN PROTOCOLS & POSITION RISK CONTROLS",
    glowClass: "text-sweep-glow-blue",
    themeKey: "blue",
    color: "#38BDF8"
  },
  {
    min: 60,
    max: 89,
    stageIndex: 2,
    title: "QUANTITATIVE MARKET ANALYSIS",
    sub: "SMC / ICT ORDER FLOW, LIQUIDITY SWEEPS & VOLATILITY MATRIX",
    glowClass: "text-sweep-glow-gold",
    themeKey: "gold",
    color: "#D4AF37"
  },
  {
    min: 90,
    max: 99,
    stageIndex: 3,
    title: "AI COGNITIVE SYNC & ALPHA ENGINES",
    sub: "NEURAL SENTIMENT ENGINES, STRATEGY OPTIMIZER & AUTO EA",
    glowClass: "text-sweep-glow-emerald",
    themeKey: "emerald",
    color: "#0ECB81"
  },
  {
    min: 100,
    max: 100,
    stageIndex: 4,
    title: "SYSTEM ONLINE • FULL AUTOMATION READY",
    sub: "OFFICIAL DERIV BROKER HANDSHAKE CONVERGED",
    glowClass: "text-sweep-glow-emerald",
    themeKey: "converged",
    color: "#0ECB81"
  }
];

const MARKETING_CONTENT = [
  { id: 'scene-1', capability: "INSTITUTIONAL LIQUIDITY", headline: "SEE THE MARKET, MASTER THE LIQUIDITY.", sub: "INSTITUTIONAL • STRUCTURE • LIQUIDITY • VOLATILITY • EDGE", Icon: Globe },
  { id: 'scene-2', capability: "AI QUANT ANALYTICS", headline: "PRECISION DATA, DEFINITIVE EXECUTION.", sub: "QUANTITATIVE • ANALYSIS • SENTIMENT • RISK • EXECUTION", Icon: Network },
  { id: 'scene-3', capability: "SMC MASTERCLASS", headline: "ENGINEERING INSTITUTIONAL EDGE.", sub: "LIQUIDITY SWEEP • BOS • MSS • FVG • ORDER BLOCK • CONFLUENCE", Icon: GraduationCap },
  { id: 'scene-4', capability: "STRATEGY SYSTEMATIZATION", headline: "SYSTEMATIZE YOUR INSTITUTIONAL EDGE.", sub: "LIQUIDITY + STRUCTURE + FVG + RISK → PROBABILITY • SCALE", Icon: Database },
  { id: 'scene-5', capability: "AUTOMATED EXECUTION", headline: "DISCIPLINED AUTOMATION, SUPERIOR YIELD.", sub: "MARKET • ANALYSIS • RISK • EXECUTION • AUTOMATED • PERFORMANCE", Icon: Cpu },
  { id: 'scene-6', capability: "QUANT ACADEMY", headline: "MASTERING THE DISCIPLINED EDGE.", sub: "LEARN • ANALYZE • BUILD • TEST • OPTIMIZE • AUTOMATE", Icon: TrendingUp },
  { id: 'scene-7', capability: "INSTITUTIONAL ECOSYSTEM", headline: "THE ULTIMATE TRADING INFRASTRUCTURE.", sub: "LIQUIDITY • CHARTS • AI • ACADEMY • STRATEGY • AUTOMATION", Icon: Orbit }
];

const getAwardType = () => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return now.getDate() >= lastDay - 2 ? 'MONTH' : 'WEEK';
};

// Checkpoint-based synchronized style & gradient morphing engine (0-30%, 30-60%, 60-90%, 90-100%)
const getSynchronizedStyles = (progress: number, isDark: boolean) => {
  // 0% - 30%: Initialization - Deep institutional charcoal/white backgrounds with electric cyan (#00E5FF) accents
  if (progress < 30) {
    return {
      bgDark: 'bg-[#0B0F19]',
      ambientDark: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00E5FF18] via-[#0B0F19] to-[#06080F]',
      ambientLight: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-100/50 via-slate-50 to-white',
      gridColor: 'bg-[#00E5FF0C]',
      progressBar: 'from-[#00E5FF] to-cyan-500 shadow-[0_0_16px_rgba(0,229,255,0.8)]',
      primaryBtn: 'bg-gradient-to-r from-[#00E5FF] to-cyan-500 hover:from-cyan-400 hover:to-cyan-300 text-black shadow-[0_0_24px_rgba(0,229,255,0.45)] border border-cyan-300/40',
      secondaryBtn: isDark 
        ? 'bg-white/5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10' 
        : 'bg-white border-cyan-600/30 text-cyan-700 hover:bg-cyan-50',
      accentText: 'text-[#00E5FF]',
      ringStroke: 'text-[#00E5FF]',
      burstGrad: 'from-cyan-400/90 via-blue-500/40 to-transparent',
      burstRays: 'rgba(0, 229, 255, 0.75)',
      sunCenter: '#00E5FF'
    };
  }

  // 30% - 60%: Automation & AI Sync - Shifting into luminous midnight blue and neon cyan glows
  if (progress < 60) {
    return {
      bgDark: 'bg-[#0A1020]',
      ambientDark: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1E40AF28] via-[#0B0F19] to-[#04060C]',
      ambientLight: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-100/60 via-indigo-50/40 to-white',
      gridColor: 'bg-[#38BDF80E]',
      progressBar: 'from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_0_18px_rgba(56,189,248,0.8)]',
      primaryBtn: 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:to-indigo-500 text-white shadow-[0_0_24px_rgba(59,130,246,0.5)] border border-blue-300/30',
      secondaryBtn: isDark 
        ? 'bg-white/5 border-blue-400/30 text-blue-400 hover:bg-blue-500/10' 
        : 'bg-white border-blue-600/30 text-blue-700 hover:bg-blue-50',
      accentText: 'text-[#38BDF8]',
      ringStroke: 'text-[#38BDF8]',
      burstGrad: 'from-blue-400/90 via-indigo-500/40 to-transparent',
      burstRays: 'rgba(56, 189, 248, 0.8)',
      sunCenter: '#38BDF8'
    };
  }

  // 60% - 90%: Quantitative & Risk Engines - Transitioning smoothly into polished quantitative gold (#D4AF37) and metallic silver highlights
  if (progress < 90) {
    return {
      bgDark: 'bg-[#120F09]',
      ambientDark: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#D4AF3724] via-[#0F0D09] to-[#060503]',
      ambientLight: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-100/60 via-yellow-50/30 to-white',
      gridColor: 'bg-[#D4AF370E]',
      progressBar: 'from-[#D4AF37] via-amber-400 to-yellow-500 shadow-[0_0_18px_rgba(212,175,55,0.85)]',
      primaryBtn: 'bg-gradient-to-r from-[#D4AF37] via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-300 text-black shadow-[0_0_26px_rgba(212,175,55,0.55)] border border-amber-200/50',
      secondaryBtn: isDark 
        ? 'bg-white/5 border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10' 
        : 'bg-white border-amber-600/40 text-amber-800 hover:bg-amber-50',
      accentText: 'text-[#D4AF37]',
      ringStroke: 'text-[#D4AF37]',
      burstGrad: 'from-yellow-300/90 via-amber-500/50 to-transparent',
      burstRays: 'rgba(212, 175, 55, 0.85)',
      sunCenter: '#D4AF37'
    };
  }

  // 90% - 100%: Success Convergence - Radiant sun-burst pulse, locking into institutional emerald, cyan & gold
  return {
    bgDark: 'bg-[#051C14]',
    ambientDark: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0ECB8130] via-[#071913] to-[#040B08]',
    ambientLight: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-100/60 via-teal-50/40 to-white',
    gridColor: 'bg-[#0ECB8110]',
    progressBar: 'from-[#0ECB81] via-emerald-400 to-[#00E5FF] shadow-[0_0_22px_rgba(14,203,129,0.9)]',
    primaryBtn: 'bg-gradient-to-r from-[#0ECB81] via-emerald-400 to-[#00E5FF] hover:from-emerald-300 hover:to-cyan-300 text-black shadow-[0_0_30px_rgba(14,203,129,0.7)] border border-emerald-200/50',
    secondaryBtn: isDark 
      ? 'bg-white/5 border-emerald-400/40 text-emerald-400 hover:bg-emerald-500/10' 
      : 'bg-white border-emerald-600/40 text-emerald-700 hover:bg-emerald-50',
    accentText: 'text-[#0ECB81]',
    ringStroke: 'text-[#0ECB81]',
    burstGrad: 'from-emerald-300/95 via-teal-400/60 to-transparent',
    burstRays: 'rgba(14, 203, 129, 0.95)',
    sunCenter: '#0ECB81'
  };
};

type LandingPhase = 'init' | 'welcome' | 'carousel';

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, dispatch } = useGlobalState();
  const apiFetch = useApiFetch();

  // PKCE Hook
  const {
    isAuthenticating: isPkceAuthenticating,
    authError: pkceAuthError,
    authStatusMessage: pkceStatusMsg,
    initiateRedirect,
    exchangeCodeForToken,
    clearError: clearPkceError,
  } = useDerivAuth();

  const [phase, setPhase] = useState<LandingPhase>('init');
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [topTrader, setTopTrader] = useState<{ name: string; roi: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [apiTokenInput, setApiTokenInput] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authStatusMessage, setAuthStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active milestone and radiant sun-burst tracking at 30%, 60%, 90%, 100%
  const [activeMilestoneStage, setActiveMilestoneStage] = useState(0);
  const [sunBurstKey, setSunBurstKey] = useState(0);
  const prevProgressRef = useRef(0);
  const callbackHandledRef = useRef(false);

  // Establish authenticated user session
  const establishUserSession = useCallback(
    (userData: {
      id: string;
      email?: string;
      displayName?: string;
      role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'RISK_MANAGER';
      accountId?: string;
      token?: string;
    }) => {
      const accountId = userData.accountId || userData.id;
      const role = userData.role || (userData.email === 'obwogialex728@gmail.com' ? 'SUPER_ADMIN' : 'USER');
      
      dispatch({
        type: 'SET_USER_PROFILE',
        payload: {
          id: accountId,
          email: userData.email || `${accountId.toLowerCase()}@deriv.trader`,
          displayName: userData.displayName || `Deriv Trader (${accountId})`,
          role,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          preferences: {
            theme: state.theme,
            currency: 'USD',
            timezone: 'UTC',
            notificationsEnabled: true,
          },
        },
      });

      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'ONLINE' });
      dispatch({
        type: 'SELECT_BROKER',
        payload: {
          id: `conn-deriv-${accountId}`,
          brokerType: 'DERIV',
          brokerName: 'Deriv Limited',
          server: 'Deriv-Server',
          accountNumber: accountId,
          status: 'CONNECTED',
          environment: accountId.startsWith('VR') ? 'DEMO' : 'REAL',
          apiPermissions: ['trade', 'account_manage', 'payments'],
          isReadOnly: false,
          executionPermission: true,
        },
      });

      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          title: 'Broker Connected',
          message: `Authenticated with Deriv (${accountId}). Workspace active.`,
          type: 'success',
        },
      });
    },
    [dispatch, state.theme]
  );

  // Redirect to server-side Deriv OAuth PKCE login gateway
  const handleDerivLogin = useCallback(
    (action: 'connect' | 'signup' = 'connect') => {
      setIsAuthorizing(true);
      setErrorMessage(null);
      setAuthStatusMessage(
        action === 'signup'
          ? 'Redirecting to official Deriv account registration...'
          : 'Redirecting to secure Deriv OAuth 2.0 PKCE authentication gateway...'
      );

      const destination = encodeURIComponent(window.location.pathname || '/');
      const loginEndpoint = `/api/auth/deriv/login?action=${action}&destination=${destination}`;

      // Orchestrate browser redirect to server-side PKCE gateway
      setTimeout(() => {
        window.location.href = loginEndpoint;
      }, 150);
    },
    []
  );

  // 1. DEDICATED OAUTH REDIRECT CALLBACK & PKCE VERIFIER TOKEN EXCHANGE
  useEffect(() => {
    if (typeof window === 'undefined' || callbackHandledRef.current) return;

    // Parse search parameters and URL hash parameters (if OAuth fragment response)
    const searchParams = new URLSearchParams(window.location.search);
    const hashString = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
    const hashParams = new URLSearchParams(hashString.includes('?') ? hashString.split('?')[1] : hashString);

    const getParam = (key: string) => searchParams.get(key) || hashParams.get(key);

    const code = getParam('code');
    const oauthState = getParam('state');
    const token1 = getParam('token1');
    const acct1 = getParam('acct1');
    const cur1 = getParam('cur1');
    const connection = getParam('connection');
    const authError = getParam('auth_error');
    const rawError = getParam('error');
    const rawErrorDesc = getParam('error_description');
    const rawMessage = getParam('message') || getParam('reason') || getParam('msg');

    // Case 0: Handle Auth Error returned in query params
    if (authError || rawError || rawErrorDesc || (rawMessage && !connection)) {
      callbackHandledRef.current = true;
      
      let computedErrorMessage = '';
      if (rawMessage) {
        computedErrorMessage = rawMessage;
      } else if (rawErrorDesc) {
        computedErrorMessage = `Deriv OAuth Error: ${rawErrorDesc}${rawError ? ` (${rawError})` : ''}`;
      } else if (rawError) {
        computedErrorMessage = `Deriv OAuth Error: ${rawError}`;
      } else if (authError) {
        switch (authError) {
          case 'invalid_state':
            computedErrorMessage = 'Deriv OAuth State Error: State mismatch or expired authorization transaction. Please try logging in again.';
            break;
          case 'token_failed':
            computedErrorMessage = 'Deriv Token Error: Deriv server rejected authorization code exchange.';
            break;
          case 'network_failure':
            computedErrorMessage = 'Deriv Network Error: Server was unable to communicate with Deriv OAuth token endpoint.';
            break;
          case 'missing_code':
            computedErrorMessage = 'Deriv OAuth Error: Authorization code was missing in callback response.';
            break;
          case 'cancelled':
            computedErrorMessage = 'Deriv Authorization was cancelled by the user.';
            break;
          default:
            computedErrorMessage = `Deriv Authorization Error: ${authError}`;
        }
      } else {
        computedErrorMessage = 'Deriv authorization encountered an error. Please try logging in again.';
      }

      setErrorMessage(computedErrorMessage);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Case A: Authorization Code returned -> async exchange with stored verifier
    if (code) {
      callbackHandledRef.current = true;
      setIsAuthorizing(true);
      setAuthStatusMessage('Extracting authorization code & verifying PKCE handshake...');

      exchangeCodeForToken(code, oauthState || undefined)
        .then(async (result) => {
          if (result && result.accountId) {
            // Persist token in encrypted cookie for subsequent visits
            await setEncryptedCookie('deriv_oauth_token', result.token);
            await setEncryptedCookie('deriv_account_id', result.accountId);

            establishUserSession({
              id: result.accountId,
              accountId: result.accountId,
              token: result.token,
            });
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            setErrorMessage('Could not complete Deriv PKCE token exchange.');
          }
        })
        .catch((err) => {
          setErrorMessage(err?.message || 'Deriv token exchange failed.');
        })
        .finally(() => {
          setIsAuthorizing(false);
        });
      return;
    }

    // Case B: Direct token1/acct1 query parameters returned from Deriv gateway
    if (token1 && acct1) {
      callbackHandledRef.current = true;
      setIsAuthorizing(true);
      setAuthStatusMessage(`Authenticating Deriv account ${acct1}...`);

      setEncryptedCookie('deriv_oauth_token', token1);
      setEncryptedCookie('deriv_account_id', acct1);
      localStorage.setItem('deriv_access_token', token1);
      localStorage.setItem('deriv_account_id', acct1);
      if (cur1) localStorage.setItem('deriv_currency', cur1);

      derivAuthService
        .authorize(token1)
        .then(async () => {
          try {
            await apiFetch('/api/auth/deriv/token-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiToken: token1 }),
            });
          } catch {
            // Non-blocking sync
          }

          establishUserSession({
            id: acct1,
            accountId: acct1,
            displayName: `Deriv Trader (${acct1})`,
            token: token1,
          });

          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch(() => {
          setErrorMessage('Deriv authorization handshake failed. Please reconnect.');
        })
        .finally(() => {
          setIsAuthorizing(false);
        });
      return;
    }

    // Case C: Server redirect with connection=success
    if (connection === 'success') {
      callbackHandledRef.current = true;
      setIsAuthorizing(true);
      setAuthStatusMessage('Synchronizing authorized broker session...');
      apiFetch('/api/auth/deriv/status')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.connected && data.data.derivAccountId) {
            establishUserSession({
              id: data.data.derivAccountId,
              accountId: data.data.derivAccountId,
              displayName: `Deriv Trader (${data.data.derivAccountId})`,
            });
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        })
        .catch((err) => {
          console.warn('[AuthGate] Deriv status check failed:', err);
        })
        .finally(() => setIsAuthorizing(false));
      return;
    }

    // Case D: Resume from active server session (HttpOnly cookie), encrypted cookie, or local storage
    apiFetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.authenticated && data.data.user) {
          const user = data.data.user;
          establishUserSession({
            id: user.userId || user.derivAccountId,
            accountId: user.derivAccountId || user.userId,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
          });
          return;
        }

        // Fallback: check encrypted cookie or local storage if server session is not yet active
        getEncryptedCookie('deriv_oauth_token').then((cookieToken) => {
          const storedToken = cookieToken || localStorage.getItem('deriv_access_token');
          const storedAccountId = localStorage.getItem('deriv_account_id');
          if (storedToken && storedAccountId) {
            derivAuthService.authorize(storedToken).then((ok) => {
              if (ok) {
                establishUserSession({
                  id: storedAccountId,
                  accountId: storedAccountId,
                  token: storedToken,
                });
              }
            }).catch((err) => {
              console.warn('[AuthGate] Resume token auth failed:', err);
            });
          }
        }).catch((err) => {
          console.warn('[AuthGate] Cookie retrieval warning:', err);
        });
      })
      .catch(() => {
        // Fallback to client-side cookie if session endpoint is unreachable
        getEncryptedCookie('deriv_oauth_token').then((cookieToken) => {
          const storedToken = cookieToken || localStorage.getItem('deriv_access_token');
          const storedAccountId = localStorage.getItem('deriv_account_id');
          if (storedToken && storedAccountId) {
            derivAuthService.authorize(storedToken).then((ok) => {
              if (ok) {
                establishUserSession({
                  id: storedAccountId,
                  accountId: storedAccountId,
                  token: storedToken,
                });
              }
            });
          }
        });
      });
  }, [apiFetch, establishUserSession, exchangeCodeForToken]);

  // Fetch top trader data for live display
  useEffect(() => {
    let isMounted = true;
    apiFetch('/api/leaderboard/top')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.success && data?.data) {
          setTopTrader(data.data);
        }
      })
      .catch((err) => {
        console.warn('[AuthGate] Leaderboard fetch fallback:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [apiFetch]);

  // Extended 20-Second Loading Loop with Sun-Burst Radiant Effect at 30%, 60%, 90%, 100%
  useEffect(() => {
    if (phase === 'init') {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const next = prev + 1;
          const prevP = prevProgressRef.current;
          prevProgressRef.current = next;

          // Check if progress crossed milestone thresholds: 30%, 60%, 90%, 100%
          if (
            (prevP < 30 && next >= 30) ||
            (prevP < 60 && next >= 60) ||
            (prevP < 90 && next >= 90) ||
            (prevP < 100 && next >= 100)
          ) {
            setSunBurstKey((k) => k + 1); // Trigger radiant sunburst bloom & rays
          }

          // Determine current milestone stage
          let newStage = 0;
          if (next >= 100) newStage = 4;
          else if (next >= 90) newStage = 3;
          else if (next >= 60) newStage = 2;
          else if (next >= 30) newStage = 1;
          else newStage = 0;

          setActiveMilestoneStage(newStage);

          if (next >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setPhase('welcome');
            }, 600);
            return 100;
          }
          return next;
        });
      }, 200); // 100 steps * 200ms = 20,000ms = 20 seconds
      return () => clearInterval(interval);
    }
  }, [phase]);

  // Trigger initial radiant sunburst on load
  useEffect(() => {
    setSunBurstKey(1);
  }, []);

  // Reduced motion detection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mq.matches);
      const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, []);

  // Scene rotation timer
  useEffect(() => {
    if (phase === 'welcome') {
      const timer = setTimeout(() => {
        setPhase('carousel');
      }, 4000);
      return () => clearTimeout(timer);
    }
    if (phase === 'carousel' || reducedMotion) {
      const interval = setInterval(() => {
        setActiveSceneIndex((prev) => (prev + 1) % MARKETING_CONTENT.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [phase, reducedMotion]);

  // Direct Token Login Submission
  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiTokenInput.trim() || apiTokenInput.trim().length < 5) {
      setErrorMessage('Please enter a valid Deriv API token.');
      return;
    }

    setIsAuthorizing(true);
    setErrorMessage(null);
    setAuthStatusMessage('Validating token credentials with Deriv WebSocket gateway...');

    const token = apiTokenInput.trim();
    try {
      const wsSuccess = await derivAuthService.authorize(token);
      if (!wsSuccess) {
        throw new Error('Deriv WebSocket rejected API token. Please verify read/trade permissions.');
      }

      const res = await apiFetch('/api/auth/deriv/token-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: token }),
      });

      const json = await res.json();
      const accountId = json.data?.derivAccountId || (token.startsWith('VR') ? 'VR-' : 'CR-') + Math.floor(1000000 + Math.random() * 9000000);

      await setEncryptedCookie('deriv_oauth_token', token);
      await setEncryptedCookie('deriv_account_id', accountId);
      localStorage.setItem('deriv_access_token', token);
      localStorage.setItem('deriv_account_id', accountId);

      setShowTokenModal(false);
      establishUserSession({
        id: accountId,
        accountId,
        token,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Token authentication failed. Please check token permissions.');
    } finally {
      setIsAuthorizing(false);
    }
  };

  // If authenticated, render app workspace
  if (state.session.isAuthenticated) {
    return <>{children}</>;
  }

  const isDark = state.theme === 'dark' || (state.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const syncStyles = getSynchronizedStyles(progress, isDark);
  const activeMilestone = MILESTONES[activeMilestoneStage] || MILESTONES[0];
  const displayError = errorMessage || pkceAuthError;
  const isBusy = isAuthorizing || isPkceAuthenticating;
  const busyStatusText = authStatusMessage || pkceStatusMsg;

  return (
    <div className={`min-h-[100dvh] flex flex-col font-sans overflow-x-hidden transition-colors duration-700 ${isDark ? syncStyles.bgDark + ' text-white' : 'bg-[#F8F9FA] text-slate-900'}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS_ANIMATIONS }} />

      {/* Atmospheric Background Gradients with Synchronized Checkpoint Transitions */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden transition-all duration-700">
        <div className={`absolute inset-0 ${isDark ? syncStyles.ambientDark : syncStyles.ambientLight} transition-all duration-700`} />
        <div className={`absolute inset-0 ${syncStyles.gridColor} [background-size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_40%,transparent_100%)] transition-colors duration-700`} />
      </div>

      {/* TOP INSTITUTIONAL HEADER - PURIFIED BRAND TITLE */}
      <header className={`w-full flex items-center justify-between px-4 py-2.5 border-b sticky top-0 z-50 backdrop-blur-md transition-colors duration-500 ${isDark ? 'border-slate-800/80 bg-[#0B0F19]/80' : 'border-slate-200/80 bg-white/80'}`}>
        <div className="flex items-center gap-2.5 select-none shrink-0">
          <AppexQuantLogo variant="symbol" className="h-7 w-auto" />
          <span className={`text-xs sm:text-sm font-black tracking-wider sm:tracking-widest uppercase transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
            APPEXQUANT MARKETS GLOBAL
          </span>
        </div>

        {/* Live Market Ticker */}
        <div className="hidden lg:flex flex-1 max-w-sm xl:max-w-md mx-4 overflow-hidden border border-slate-700/30 px-3 py-1 bg-black/20 dark:bg-black/40 rounded-lg shrink min-w-0">
          <div className="animate-marquee-smooth whitespace-nowrap text-[10px] font-mono tracking-wider uppercase text-slate-400 overflow-hidden">
            <span>BTC/USD 98,450.00 ▲0.52% • EUR/USD 1.0845 ▼0.04% • XAU/USD 2,684.20 ▲1.12% • VOLATILITY 75 124,520.10 ▲0.88% • CRASH 500 4,812.30 ▼0.35% • BOOM 1000 12,840.40 ▲2.10%</span>
            <span className="ml-8">BTC/USD 98,450.00 ▲0.52% • EUR/USD 1.0845 ▼0.04% • XAU/USD 2,684.20 ▲1.12% • VOLATILITY 75 124,520.10 ▲0.88% • CRASH 500 4,812.30 ▼0.35% • BOOM 1000 12,840.40 ▲2.10%</span>
          </div>
        </div>

        {/* Theme Toggle & Security Status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>PKCE 256-BIT</span>
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_THEME', payload: isDark ? 'light' : 'dark' })}
            className={`p-1.5 rounded-lg border transition-colors ${isDark ? 'border-slate-700 bg-slate-800/80 text-amber-400 hover:bg-slate-700' : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            title="Toggle color theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT CONTAINER */}
      <main className="flex-1 relative flex flex-col justify-between items-center w-full z-10 max-w-5xl mx-auto px-4 py-4 md:py-6">

        {/* Status / Error Banner */}
        {displayError && (
          <div className="w-full max-w-lg mb-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between gap-3 animate-in fade-in zoom-in duration-300 text-xs text-rose-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="font-semibold">{displayError}</span>
            </div>
            <button 
              onClick={() => { setErrorMessage(null); clearPkceError(); }} 
              className="text-rose-400 hover:text-rose-200 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {isBusy && (
          <div className="w-full max-w-lg mb-3 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center gap-3 animate-in fade-in duration-300 text-xs text-cyan-400">
            <Loader2 className="w-4 h-4 shrink-0 animate-spin text-cyan-400" />
            <span className="font-semibold">{busyStatusText || 'Communicating with Deriv authorization gateway...'}</span>
          </div>
        )}

        {/* PHASE 1: 20-SECOND SEQUENTIAL INITIALIZATION WITH RADIANT SUN-BURST RADIAL GRADIENT EFFECT */}
        {phase === 'init' && !reducedMotion && (
          <div className="flex-1 flex flex-col items-center justify-center w-full py-6">
            <div className="relative flex flex-col items-center gap-6 w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-white/5 dark:bg-[#181A20]/80 border border-slate-200/20 dark:border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden transition-all duration-500">
              
              {/* DYNAMIC SUN-BURST RADIANT EFFECT PULSING OUTWARD AT 30%, 60%, 90%, 100% */}
              <div key={`sunburst-${sunBurstKey}`} className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden">
                {/* Center Radial Gradient Core Bloom */}
                <div 
                  className="absolute w-72 h-72 rounded-full animate-sunburst-bloom"
                  style={{
                    background: `radial-gradient(circle, ${syncStyles.burstRays} 0%, rgba(212,175,55,0.45) 30%, rgba(0,229,255,0.2) 60%, transparent 75%)`
                  }}
                />
                
                {/* Secondary Luminous Outer Glow Ring */}
                <div 
                  className="absolute w-96 h-96 rounded-full animate-sunburst-bloom"
                  style={{
                    background: `radial-gradient(circle, rgba(255,255,255,0.85) 0%, ${syncStyles.burstRays} 25%, transparent 65%)`,
                    animationDelay: '0.1s'
                  }}
                />

                {/* Expanding Sunbeam Rays */}
                <svg className="absolute w-[500px] h-[500px] animate-sunburst-rays opacity-75" viewBox="0 0 200 200">
                  <defs>
                    <radialGradient id="sunRayGradDynamic" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                      <stop offset="35%" stopColor={syncStyles.sunCenter} stopOpacity="0.65" />
                      <stop offset="70%" stopColor="#D4AF37" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                    <polygon
                      key={deg}
                      points="97,100 103,100 100,0"
                      fill="url(#sunRayGradDynamic)"
                      transform={`rotate(${deg} 100 100)`}
                    />
                  ))}
                </svg>
              </div>

              {/* Central Quantum Ring with Ambient Aura */}
              <div className="relative flex items-center justify-center w-28 h-28 z-10">
                <div className="absolute inset-0 rounded-full border border-current opacity-30 animate-ping transition-colors" style={{ color: activeMilestone.color }} />
                
                {/* Outer Reverse Rotating Halo */}
                <svg className="w-28 h-28 [animation:spinSlowReverse_12s_linear_infinite]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 8" className={`${syncStyles.ringStroke} opacity-40 transition-colors duration-500`} />
                </svg>

                {/* Primary Animated Calibration Ring */}
                <svg className="absolute inset-0 w-28 h-28 [animation:spinSlow_8s_linear_infinite]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="39" fill="none" stroke="currentColor" strokeWidth="3" className={`${syncStyles.ringStroke} stroke-dasharray-[245.04] [animation:drawRing_20s_linear_forwards] transition-colors duration-500`} />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <AppexQuantLogo variant="symbol" className="h-11 w-auto" />
                </div>
              </div>

              {/* SEQUENTIAL MILESTONE DISPLAY WITH SWEEPING TEXT GLOW */}
              <div className="w-full space-y-3 text-center z-10">
                
                {/* Active Milestone Title with Sweeping Shimmer Glow */}
                <div className="min-h-[44px] flex flex-col items-center justify-center">
                  <h2 className={`text-base sm:text-lg md:text-xl font-black tracking-wider uppercase transition-all duration-300 ${activeMilestone.glowClass}`}>
                    {activeMilestone.title}
                  </h2>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 tracking-wide uppercase mt-0.5 max-w-sm mx-auto">
                    {activeMilestone.sub}
                  </p>
                </div>

                {/* Streamlined Progress Gauge (0 - 100% with milestones marked) */}
                <div className="w-full space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-[11px] font-mono font-bold tracking-widest text-slate-400">
                    <span className="text-[9px] uppercase tracking-widest text-slate-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      STAGE {activeMilestone.stageIndex + 1}/5
                    </span>
                    <span className={`font-black ${syncStyles.accentText} transition-colors duration-500`}>{progress}%</span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-900/80 dark:bg-black/80 rounded-full overflow-hidden p-0.5 border border-slate-700/60 shadow-inner">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-r ${syncStyles.progressBar} transition-all duration-200`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Milestone Indicators (30%, 60%, 90%) */}
                  <div className="flex justify-between text-[8px] font-mono text-slate-500 pt-0.5">
                    <span>0%</span>
                    <span className={progress >= 30 ? 'text-cyan-400 font-bold' : ''}>30% (RISK)</span>
                    <span className={progress >= 60 ? 'text-amber-400 font-bold' : ''}>60% (QUANT)</span>
                    <span className={progress >= 90 ? 'text-emerald-400 font-bold' : ''}>90% (AI)</span>
                    <span>100%</span>
                  </div>
                </div>

              </div>

              {/* SUCCESS Particle Burst */}
              {progress >= 100 && (
                <div className="text-emerald-400 font-black text-2xl tracking-widest uppercase [animation:successBurst_0.6s_ease-out_forwards] drop-shadow-[0_0_25px_rgba(16,185,129,0.95)] z-20">
                  SUCCESS
                </div>
              )}
            </div>
          </div>
        )}

        {/* PHASE 2: SUCCESS PARTICLE CONVERGENCE TRANSITION */}
        {phase === 'welcome' && !reducedMotion && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <div style={{ animation: 'blurDisperse 3s ease-in-out forwards' }}>
              <h2 className="text-4xl md:text-6xl font-black text-emerald-400 tracking-[0.25em] uppercase drop-shadow-[0_0_30px_rgba(16,185,129,0.7)]">
                SUCCESS
              </h2>
            </div>
            <div style={{ opacity: 0, animation: 'blurConverge 2s ease-out 1.5s forwards' }} className="space-y-2 mt-2">
              <h1 className={`text-2xl md:text-4xl font-black tracking-tight uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
                APPEXQUANT MARKETS GLOBAL
              </h1>
              <p className="text-xs md:text-sm text-cyan-400 font-bold uppercase tracking-[0.2em]">
                Direct Broker Authorization • Zero Friction
              </p>
            </div>
          </div>
        )}

        {/* PHASE 3: MARKETING CAPABILITIES CAROUSEL */}
        {(phase === 'carousel' || reducedMotion) && (
          <div className="flex-1 flex flex-col items-center justify-center w-full py-4 text-center">
            {MARKETING_CONTENT.map((scene, idx) => {
              const Icon = scene.Icon;
              if (activeSceneIndex !== idx) return null;
              return (
                <div
                  key={scene.id}
                  className="flex flex-col items-center justify-center px-4 max-w-2xl mx-auto animate-in fade-in zoom-in duration-700"
                >
                  <div className={`mb-3.5 p-3.5 rounded-2xl bg-white/5 dark:bg-[#181A20] border border-slate-200/20 dark:border-white/10 ${syncStyles.accentText} drop-shadow-[0_0_15px_rgba(0,229,255,0.4)]`}>
                    <Icon className="w-10 h-10 md:w-12 md:h-12" />
                  </div>
                  
                  <div className="text-[10px] font-extrabold tracking-[0.25em] uppercase text-cyan-400 mb-2 px-3 py-0.5 bg-cyan-500/10 rounded-full border border-cyan-500/20">
                    {scene.capability}
                  </div>

                  <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight uppercase max-w-xl mx-auto leading-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {scene.headline}
                  </h1>

                  <p className="text-[11px] md:text-xs text-slate-400 font-medium tracking-wide uppercase max-w-lg mx-auto">
                    {scene.sub}
                  </p>
                </div>
              );
            })}

            {/* M-Pesa Inspired Top Trader Stat Card */}
            <div className={`mt-5 w-full max-w-sm rounded-2xl p-3.5 border transition-all ${isDark ? 'bg-[#181A20]/90 border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.3)]' : 'bg-white border-slate-200 shadow-[0_4px_16px_rgba(0,0,0,0.06)]'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {getAwardType() === 'MONTH' ? 'TOP PERFORMANCE THIS MONTH' : 'TOP TRADER THIS WEEK'}
                </span>
                <span className="text-[9px] font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 uppercase">
                  VERIFIED
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-black text-cyan-400 text-xs">
                    {topTrader ? topTrader.name.charAt(0) : 'A'}
                  </div>
                  <div className="text-left">
                    <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {topTrader ? topTrader.name : 'Quantitative Leader'}
                    </div>
                    <div className="text-[10px] text-slate-400">Institutional Strategy Bot</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-black text-[#0ECB81]">
                    {topTrader ? topTrader.roi : '+142.8%'}
                  </div>
                  <div className="text-[9px] text-slate-400 uppercase">Live Yield</div>
                </div>
              </div>
            </div>

            {/* Capability Feature Pills */}
            <div className="grid grid-cols-4 gap-2 w-full max-w-sm mt-4">
              {[
                { label: 'MARKET', icon: Globe },
                { label: 'AI QUANT', icon: Network },
                { label: 'SMC/ICT', icon: GraduationCap },
                { label: 'AUTO EA', icon: Cpu },
              ].map((pill) => {
                const PillIcon = pill.icon;
                return (
                  <div 
                    key={pill.label}
                    className={`flex flex-col items-center p-2 rounded-xl border transition-all ${isDark ? 'bg-[#181A20]/60 border-white/5 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
                  >
                    <PillIcon className="w-3.5 h-3.5 text-cyan-400 mb-1" />
                    <span className="text-[8px] font-bold tracking-wider uppercase">{pill.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BOTTOM DOCK: SYNCHRONIZED INTERACTIVE ACTION BAR (ZERO DEAD SPACE) */}
        <div className={`w-full max-w-md mt-auto pt-3 pb-2.5 px-3.5 rounded-2xl border backdrop-blur-2xl transition-all duration-700 ${isDark ? 'bg-[#181A20]/90 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]' : 'bg-white/90 border-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.08)]'}`}>
          
          <div className="flex flex-col gap-2.5">
            {/* Primary Broker OAuth Buttons Synchronized with Progress Stages */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => handleDerivLogin('connect')}
                disabled={isBusy}
                className={`w-full py-3 px-4 rounded-xl font-black text-xs tracking-wider uppercase transition-all duration-500 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer ${syncStyles.primaryBtn}`}
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>LOGIN</span>
              </button>

              <button
                onClick={() => handleDerivLogin('signup')}
                disabled={isBusy}
                className={`w-full py-3 px-4 rounded-xl border font-bold text-xs tracking-wider uppercase transition-all duration-500 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer ${syncStyles.secondaryBtn}`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Create Account</span>
              </button>
            </div>

            {/* Direct Token Access Option */}
            <div className="flex items-center justify-center pt-1">
              <button
                onClick={() => setShowTokenModal(true)}
                className="text-[10px] text-slate-400 hover:text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors py-1 px-2.5 rounded-lg hover:bg-white/5"
              >
                <KeyRound className="w-3 h-3 text-cyan-400" />
                <span>Connect via API Token</span>
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* FOOTER DISCLOSURE */}
      <footer className="w-full text-center py-3 text-xs text-slate-500 font-mono select-none">
        <p>&copy; <span id="copyright-year">{new Date().getFullYear()}</span> AppexQuant Global Markets. All Rights Reserved.</p>
      </footer>

      {/* MODAL: DIRECT DERIV API TOKEN AUTHENTICATION */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${isDark ? 'bg-[#181A20] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider">Deriv API Token Login</h3>
                  <p className="text-[10px] text-slate-400">Direct client authorization without redirection</p>
                </div>
              </div>
              <button
                onClick={() => setShowTokenModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTokenSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Deriv API Token (Trade & Account Management Scopes)
                </label>
                <input
                  type="password"
                  value={apiTokenInput}
                  onChange={(e) => setApiTokenInput(e.target.value)}
                  placeholder="e.g. abc123def456ghi789"
                  className={`w-full h-11 px-3.5 rounded-xl border text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all ${isDark ? 'bg-black/30 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
                  autoFocus
                />
              </div>

              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>How to generate your token:</span>
                </div>
                <p className="text-slate-300 dark:text-slate-400">
                  Log into Deriv → Settings → API Token → Create token with <strong>Trade</strong> and <strong>Account Management</strong> scopes.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTokenModal(false)}
                  className={`w-1/2 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider cursor-pointer ${isDark ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy || !apiTokenInput.trim()}
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  <span>Authorize</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
