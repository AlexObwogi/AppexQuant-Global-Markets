const fs = require('fs');

const code = `/**
 * AppexQuant Markets Global - Master Immersive Landing Experience
 * Safe Motion Engine Refinement - Cinematic, Institutional, Fully Responsive.
 */
import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../../state/GlobalStateContext';
import { useApiFetch } from '../../utils/apiFetch';
import { 
  ArrowRight, LogIn, UserPlus, Orbit,
  TrendingUp, Cpu, GraduationCap, AlertCircle, CheckCircle, Globe, Database, Network
} from 'lucide-react';

const CSS_ANIMATIONS = \`
  @keyframes drawRing {
    0% { stroke-dashoffset: 301.59; }
    100% { stroke-dashoffset: 0; }
  }
  @keyframes spinSlow {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
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
  @keyframes slowPan {
    0% { background-position: 0% 0%; }
    50% { background-position: 100% 100%; }
    100% { background-position: 0% 0%; }
  }
\`;

const MARKETING_CONTENT = [
  {
    id: 'scene-1',
    capability: "MARKET INTELLIGENCE",
    headline: "SEE THE MARKET DIFFERENTLY.",
    sub: "MARKET • STRUCTURE • LIQUIDITY • VOLATILITY",
    icon: <Globe className="w-10 h-10 md:w-14 md:h-14 text-blue-500 drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
  },
  {
    id: 'scene-2',
    capability: "AI ANALYSIS",
    headline: "INTELLIGENCE BEFORE EXECUTION.",
    sub: "STRUCTURE • LIQUIDITY • SENTIMENT • VOLATILITY • RISK",
    icon: <Network className="w-10 h-10 md:w-14 md:h-14 text-indigo-500 drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]" />
  },
  {
    id: 'scene-3',
    capability: "SMC / ICT",
    headline: "LEARN THE EDGE. PRACTICE THE PATTERN.",
    sub: "LIQUIDITY SWEEP • BOS • MSS • FVG • ORDER BLOCK",
    icon: <GraduationCap className="w-10 h-10 md:w-14 md:h-14 text-purple-500 drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]" />
  },
  {
    id: 'scene-4',
    capability: "STRATEGY BUILDER",
    headline: "TURN YOUR RULES INTO A SYSTEM.",
    sub: "LIQUIDITY + STRUCTURE + FVG + SESSION + RISK → STRATEGY",
    icon: <Database className="w-10 h-10 md:w-14 md:h-14 text-teal-500 drop-shadow-[0_0_12px_rgba(20,184,166,0.6)]" />
  },
  {
    id: 'scene-5',
    capability: "AUTOMATION & BOTS",
    headline: "ENGINEERED FOR DISCIPLINED AUTOMATION.",
    sub: "MARKET → ANALYSIS → RULES → RISK → EXECUTION",
    icon: <Cpu className="w-10 h-10 md:w-14 md:h-14 text-cyan-500 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
  },
  {
    id: 'scene-6',
    capability: "ACADEMY",
    headline: "BUILD DISCIPLINE. MASTER YOUR EDGE.",
    sub: "LEARN → PRACTICE → ANALYZE → BUILD → TEST → AUTOMATE",
    icon: <TrendingUp className="w-10 h-10 md:w-14 md:h-14 text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
  },
  {
    id: 'scene-7',
    capability: "COMPLETE ECOSYSTEM",
    headline: "EVERYTHING YOU NEED. ONE ECOSYSTEM.",
    sub: "MARKETS • CHARTS • AI • ACADEMY • STRATEGIES • BOTS",
    icon: <Orbit className="w-10 h-10 md:w-14 md:h-14 text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
  }
];

type LandingPhase = 'init' | 'welcome' | 'carousel';

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, dispatch } = useGlobalState();
  const apiFetch = useApiFetch();
  
  const [authView, setAuthView] = useState<'landing' | 'login' | 'register'>('landing');
  const [phase, setPhase] = useState<LandingPhase>('init');
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailExistsError, setEmailExistsError] = useState(false);

  // Initialize Reduced Motion Safely
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mq.matches);
      const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, []);

  // Master Animation Controller
  useEffect(() => {
    if (authView !== 'landing') return;

    let initTimer: NodeJS.Timeout;
    let carouselTimer: NodeJS.Timeout;
    let carouselInterval: NodeJS.Timeout;
    let isCancelled = false;

    if (reducedMotion) {
      setPhase('carousel');
      carouselInterval = setInterval(() => {
        if (!isCancelled) setActiveSceneIndex(prev => (prev + 1) % MARKETING_CONTENT.length);
      }, 5000);
      return () => clearInterval(carouselInterval);
    }

    setPhase('init');
    setActiveSceneIndex(0);

    initTimer = setTimeout(() => {
      if (!isCancelled) setPhase('welcome');
    }, 4500);

    carouselTimer = setTimeout(() => {
      if (!isCancelled) {
        setPhase('carousel');
        carouselInterval = setInterval(() => {
          if (!isCancelled) setActiveSceneIndex(prev => (prev + 1) % MARKETING_CONTENT.length);
        }, 5000);
      }
    }, 10000);

    return () => {
      isCancelled = true;
      clearTimeout(initTimer);
      clearTimeout(carouselTimer);
      clearInterval(carouselInterval);
    };
  }, [authView, reducedMotion]);

  if (state.session.isAuthenticated) {
    return <>{children}</>;
  }

  const handleStandardLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmailExistsError(false);

    const loginEmail = email.trim() || 'obwogialex728@gmail.com';

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: password || 'password',
          role: loginEmail === 'obwogialex728@gmail.com' ? 'SUPER_ADMIN' : 'USER',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.user) {
          setSuccessMessage('Welcome back! Initializing secure gateway session...');
          setTimeout(() => {
            dispatch({
              type: 'SET_USER_PROFILE',
              payload: {
                id: json.data.user.id,
                email: json.data.user.email,
                displayName: json.data.user.displayName,
                role: json.data.user.role,
                createdAt: json.data.user.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                preferences: { theme: state.theme, currency: 'USD', timezone: 'UTC', notificationsEnabled: true },
              },
            });
            dispatch({ type: 'ADD_NOTIFICATION', payload: { title: 'Session Connected', message: 'Enjoy frictionless execution.', type: 'success' } });
          }, 800);
        } else {
          setErrorMessage(json.error?.message || 'Login failed.');
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        setErrorMessage(errorData.error?.message || 'Invalid credentials or server error.');
      }
    } catch (error: any) {
      setErrorMessage('Network error during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStandardRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmailExistsError(false);

    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          role: 'USER',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.user) {
          setSuccessMessage('Account provisioned successfully. Establishing connection...');
          setTimeout(() => {
            dispatch({
              type: 'SET_USER_PROFILE',
              payload: {
                id: json.data.user.id,
                email: json.data.user.email,
                displayName: json.data.user.displayName,
                role: json.data.user.role,
                createdAt: json.data.user.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                preferences: { theme: state.theme, currency: 'USD', timezone: 'UTC', notificationsEnabled: true },
              },
            });
            dispatch({ type: 'ADD_NOTIFICATION', payload: { title: 'Gateway Provisioned', message: 'Welcome to AppexQuant.', type: 'success' } });
          }, 800);
        } else {
          setErrorMessage(json.error?.message || 'Registration failed.');
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 409 || errorData.error?.code === 'auth/email-already-in-use') {
          setEmailExistsError(true);
          setErrorMessage('Email already in use. Please log in.');
        } else {
          setErrorMessage(errorData.error?.message || 'Registration failed.');
        }
      }
    } catch (error: any) {
      setErrorMessage('Network error during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50 dark:bg-[#0C0E12] text-slate-900 dark:text-white font-sans overflow-x-hidden transition-colors duration-300">
      <style dangerouslySetInnerHTML={{ __html: CSS_ANIMATIONS }} />

      {/* LAYER 1: Core UI - Brand Header */}
      <div className="w-full flex items-center justify-between p-4 md:p-6 border-b border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-[#0C0E12]/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3 select-none">
          <div className="p-1.5 md:p-2 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white font-black text-xs md:text-sm font-mono shadow-md shadow-blue-500/20">AQ</div>
          <span className="text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200">APPEXQUANT GLOBAL</span>
        </div>
        {authView === 'landing' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAuthView('login')}
              className="px-3 py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              Secure Gateway
            </button>
          </div>
        )}
      </div>

      {/* Background Engine */}
      <div className={\`absolute inset-0 z-0 overflow-hidden pointer-events-none transition-opacity duration-1000 \${authView === 'landing' ? 'opacity-100' : 'opacity-30'}\`}>
        <div className="absolute inset-0 bg-slate-50 dark:bg-[#0C0E12]" />
        <div 
          className="absolute inset-[-50%] opacity-40 dark:opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.15) 0%, rgba(6, 182, 212, 0.08) 25%, rgba(245, 158, 11, 0.05) 50%, transparent 70%)',
            backgroundSize: '200% 200%',
            animation: reducedMotion ? 'none' : 'slowPan 25s infinite ease-in-out alternate'
          }}
        />
        {/* Subtle grid pattern for institutional feel */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      </div>

      {/* Main Content Area */}
      {authView === 'landing' ? (
        <div className="flex-1 relative flex flex-col w-full h-full min-h-[70vh]">
          
          {/* PHASE 1: Initialization */}
          {phase === 'init' && !reducedMotion && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-1000 z-10">
              <div className="relative flex items-center justify-center mb-8">
                <svg className="absolute w-40 h-40 md:w-56 md:h-56 opacity-20" viewBox="0 0 100 100" style={{ animation: 'spinSlow 10s linear infinite' }}>
                   <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6" className="text-blue-500" />
                </svg>
                <svg className="w-32 h-32 md:w-48 md:h-48 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-white/10" />
                  <circle 
                    cx="50" cy="50" r="48" fill="none" 
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" 
                    className="text-blue-500 drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]" 
                    style={{ strokeDasharray: 301.59, animation: 'drawRing 4s ease-in-out forwards' }} 
                  />
                </svg>
                <div className="absolute font-black text-2xl md:text-4xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                  AQ
                </div>
              </div>
              <h2 className="text-sm md:text-base font-bold tracking-[0.4em] uppercase text-slate-800 dark:text-slate-300">
                System Initialization
              </h2>
            </div>
          )}

          {/* PHASE 2: Welcome */}
          {phase === 'welcome' && !reducedMotion && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              <div className="absolute w-full px-4" style={{ animation: 'blurDisperse 3.5s ease-in-out forwards' }}>
                <h2 className="text-4xl md:text-6xl lg:text-8xl font-black text-blue-500/90 dark:text-blue-400/90 tracking-[0.3em] uppercase text-center drop-shadow-[0_0_25px_rgba(59,130,246,0.5)]">
                  SUCCESS
                </h2>
              </div>
              <div className="absolute w-full px-4 flex flex-col items-center" style={{ opacity: 0, animation: 'blurConverge 2.5s ease-out 3s forwards' }}>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-4 text-center leading-[1.1]">
                  WELCOME TO SEAMLESS TRADING
                </h1>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-[0.25em] text-center max-w-2xl">
                  Your markets. Your analysis. Your edge. One ecosystem.
                </p>
              </div>
            </div>
          )}

          {/* PHASE 3: Marketing Carousel */}
          {(phase === 'carousel' || reducedMotion) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-in fade-in duration-1000 z-10">
              {MARKETING_CONTENT.map((scene, idx) => (
                <div
                  key={scene.id}
                  className={\`absolute inset-0 flex flex-col items-center justify-center px-4 pt-12 pb-32 text-center transition-all duration-1000 ease-in-out
                    \${activeSceneIndex === idx 
                      ? 'opacity-100 transform translate-y-0 scale-100' 
                      : 'opacity-0 transform translate-y-8 scale-95 pointer-events-none'
                    }\`}
                >
                  <div className="mb-6 md:mb-8">{scene.icon}</div>
                  <div className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-blue-600 dark:text-blue-400 mb-4 md:mb-6 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                    {scene.capability}
                  </div>
                  <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase text-slate-900 dark:text-white font-sans max-w-5xl mx-auto leading-[1.05] mb-4 md:mb-6">
                    {scene.headline}
                  </h1>
                  <p className="text-[11px] md:text-sm lg:text-base text-slate-600 dark:text-slate-400 font-bold tracking-[0.15em] md:tracking-[0.2em] uppercase max-w-3xl mx-auto leading-relaxed px-4">
                    {scene.sub}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* LAYER 1: Core Navigation & CTAs (Fixed interaction area at bottom) */}
          <div className="relative z-20 flex-1 flex flex-col justify-end pb-12 md:pb-16 px-4 shrink-0">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full max-w-lg mx-auto">
              <button
                onClick={() => setAuthView('login')}
                className="w-full sm:w-1/2 px-6 py-4 rounded-xl bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur-sm border border-slate-200 dark:border-white/10 text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white hover:bg-white dark:hover:bg-[#252A34] transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-sm hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Log In
              </button>
              <button
                onClick={() => setAuthView('register')}
                className="w-full sm:w-1/2 px-6 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-bold uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                Create Account
              </button>
            </div>
            
            {/* Safe Fallback Navigation Dots */}
            <div className={\`flex justify-center items-center gap-2 mt-8 transition-opacity duration-500 \${(phase === 'carousel' || reducedMotion) ? 'opacity-100' : 'opacity-0'}\`}>
              {MARKETING_CONTENT.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSceneIndex(idx)}
                  className={\`h-1.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 \${
                    activeSceneIndex === idx 
                      ? 'w-8 bg-blue-500' 
                      : 'w-2 bg-slate-300 dark:bg-white/20 hover:bg-slate-400 dark:hover:bg-white/40'
                  }\`}
                  aria-label={\`Go to scene \${idx + 1}\`}
                />
              ))}
            </div>
          </div>

        </div>
      ) : (
        /* Safe Auth Forms Layer */
        <div className="flex-1 flex items-center justify-center p-4 py-12 relative z-20">
          <div className="w-full max-w-md bg-white/95 dark:bg-[#0C0E12]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 transition-colors duration-300">
            
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-2 border border-blue-100 dark:border-blue-500/20">
                <Orbit className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {authView === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Secure institutional access gateway.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg flex items-start gap-2.5 mb-4 animate-in fade-in zoom-in duration-300">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                <div className="flex flex-col text-xs text-red-700 dark:text-red-400">
                  <span className="font-bold leading-relaxed">{errorMessage}</span>
                  {emailExistsError && (
                    <button 
                      onClick={() => { setAuthView('login'); setErrorMessage(null); setEmailExistsError(false); }}
                      className="text-left mt-1 underline hover:text-red-500 dark:hover:text-red-300 transition-colors font-semibold"
                    >
                      Switch to Log In
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {successMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-[#0ECB81]/10 border border-emerald-200 dark:border-[#0ECB81]/20 rounded-lg flex items-center gap-2 mb-4 animate-in fade-in zoom-in duration-300">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-[#0ECB81] shrink-0" />
                <span className="text-xs text-emerald-700 dark:text-[#0ECB81] font-bold">{successMessage}</span>
              </div>
            )}

            <form onSubmit={authView === 'login' ? handleStandardLogin : handleStandardRegister} className="space-y-4">
              {authView === 'register' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-4 duration-300">
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Full Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex Nyangaresi Obwogi"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Password</label>
                  {authView === 'login' && (
                    <span className="text-[10px] font-bold text-slate-500 hover:text-blue-500 cursor-pointer transition-colors">
                      Forgot Password?
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 mt-2 hover:scale-[1.02]"
              >
                {authView === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Register Account</span>
                  </>
                )}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {authView === 'login' && (
              <div className="pt-2">
                <button 
                  onClick={() => { setEmail('obwogialex728@gmail.com'); setPassword('password'); setTimeout(() => handleStandardLogin(), 100); }}
                  type="button" 
                  className="w-full py-2.5 px-4 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Demo Sign In</span>
                </button>
              </div>
            )}

            <div className="pt-4 flex flex-col gap-4 text-xs font-bold border-t border-slate-200 dark:border-white/10 mt-6">
              <button
                onClick={() => {
                  setAuthView(authView === 'login' ? 'register' : 'login');
                  setErrorMessage(null);
                }}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors mt-4"
              >
                {authView === 'login' ? 'Need an account? Register' : 'Already have an account? Log In'}
              </button>
              <button
                onClick={() => { setAuthView('landing'); setErrorMessage(null); }}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                ← Back to Overview
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
`
fs.writeFileSync('src/components/auth/AuthGate.tsx', code);
