const fs = require('fs');

const code = `/**
 * AppexQuant Markets Global - AuthGate Component
 * Recovery Patch - Safe, Static, Responsive Layout without complex animations.
 */

import React, { useState } from 'react';
import { useGlobalState } from '../../state/GlobalStateContext';
import { useApiFetch } from '../../utils/apiFetch';
import { 
  ArrowRight, LogIn, UserPlus, Orbit,
  TrendingUp, Cpu, GraduationCap, AlertCircle, CheckCircle, Globe, Database, Network
} from 'lucide-react';

const MARKETING_CONTENT = [
  {
    headline: "SEE THE MARKET DIFFERENTLY.",
    sub: "MARKET • STRUCTURE • LIQUIDITY • VOLATILITY",
    icon: <Globe className="w-8 h-8 text-blue-400" />
  },
  {
    headline: "INTELLIGENCE BEFORE EXECUTION.",
    sub: "STRUCTURE • LIQUIDITY • SENTIMENT • VOLATILITY • CORRELATION • RISK",
    icon: <Network className="w-8 h-8 text-indigo-400" />
  },
  {
    headline: "LEARN THE EDGE. PRACTICE THE PATTERN.",
    sub: "LIQUIDITY SWEEP • BOS • MSS • FVG • ORDER BLOCK • DISPLACEMENT",
    icon: <GraduationCap className="w-8 h-8 text-purple-400" />
  },
  {
    headline: "TURN YOUR RULES INTO A SYSTEM.",
    sub: "LIQUIDITY + STRUCTURE + FVG + SESSION + RISK → STRATEGY",
    icon: <Database className="w-8 h-8 text-teal-400" />
  },
  {
    headline: "ENGINEERED FOR AUTOMATION.",
    sub: "Algorithmic Precision. Disciplined Execution.",
    icon: <Cpu className="w-8 h-8 text-cyan-400" />
  },
  {
    headline: "EVERYTHING YOU NEED. ONE ECOSYSTEM.",
    sub: "MARKETS • CHARTS • AI • SMC/ICT • ACADEMY • STRATEGIES • BOTS • RISK • ANALYTICS",
    icon: <Orbit className="w-8 h-8 text-amber-400" />
  },
  {
    headline: "BUILD DISCIPLINE. MASTER YOUR EDGE.",
    sub: "LEARN → PRACTICE → ANALYZE → BUILD → TEST → AUTOMATE → IMPROVE",
    icon: <TrendingUp className="w-8 h-8 text-[#0ECB81]" />
  }
];

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, dispatch } = useGlobalState();
  const apiFetch = useApiFetch();
  
  const [authView, setAuthView] = useState<'landing' | 'login' | 'register'>('landing');

  // Form States
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailExistsError, setEmailExistsError] = useState<boolean>(false);

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
          setSuccessMessage(\`Welcome back! Initializing secure gateway session...\`);
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
                preferences: {
                  theme: state.theme,
                  currency: 'USD',
                  timezone: 'UTC',
                  notificationsEnabled: true,
                },
              },
            });
            dispatch({ type: 'SET_AUTHENTICATED', payload: true });
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
                preferences: {
                  theme: state.theme,
                  currency: 'USD',
                  timezone: 'UTC',
                  notificationsEnabled: true,
                },
              },
            });
            dispatch({ type: 'SET_AUTHENTICATED', payload: true });
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

  const handleDemoLogin = () => {
    setEmail('obwogialex728@gmail.com');
    setPassword('password');
    setTimeout(() => {
      handleStandardLogin();
    }, 100);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0C0E12] text-white font-sans overflow-x-hidden">
      
      {/* Brand Header */}
      <div className="w-full flex items-center justify-between p-6 border-b border-white/5 bg-[#0C0E12]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 select-none">
          <div className="p-1.5 rounded-lg bg-slate-800 text-white font-black text-xs font-mono">AQ</div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">APPEXQUANT GLOBAL</span>
        </div>
        {authView === 'landing' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAuthView('login')}
              className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Log In
            </button>
            <button
              onClick={() => setAuthView('register')}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-blue-500/20"
            >
              Create Account
            </button>
          </div>
        )}
      </div>

      {authView === 'landing' ? (
        <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto py-12 px-4 gap-12">
          
          <div className="text-center space-y-4 pt-8 pb-4">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 font-mono">
              The Complete Trading Ecosystem
            </h1>
            <p className="text-lg text-slate-400 font-medium max-w-2xl mx-auto">
              By traders, for traders — from ambitious beginners to systematic professionals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {MARKETING_CONTENT.map((item, idx) => (
              <div 
                key={idx} 
                className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 hover:bg-white/10 transition-colors"
              >
                <div className="p-3 bg-[#0C0E12] rounded-xl self-start border border-white/5">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-wide text-white mb-2">
                    {item.headline}
                  </h3>
                  <p className="text-sm font-bold text-slate-400 leading-relaxed uppercase">
                    {item.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 py-12">
             <button
              onClick={() => setAuthView('login')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-sm font-bold uppercase tracking-wider hover:bg-white/10 transition-colors text-white"
            >
              Log In
            </button>
            <button
              onClick={() => setAuthView('register')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-blue-600 text-white text-sm font-bold uppercase tracking-wider hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
            >
              Create Account
            </button>
          </div>

        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4 py-12">
          <div className="w-full max-w-md bg-[#0C0E12] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-xl bg-blue-500/10 text-blue-400 mb-2 border border-blue-500/20">
                <Orbit className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {authView === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-sm text-slate-400 font-medium">
                Secure institutional access gateway.
              </p>
            </div>

            {/* Error / Success Messages */}
            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2.5 mb-4">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div className="flex flex-col text-xs text-red-400">
                  <span className="font-bold leading-relaxed">{errorMessage}</span>
                  {emailExistsError && (
                    <button 
                      onClick={() => { setAuthView('login'); setErrorMessage(null); setEmailExistsError(false); }}
                      className="text-left mt-1 underline hover:text-red-300 transition-colors font-semibold"
                    >
                      Switch to Log In
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {successMessage && (
              <div className="p-3 bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-lg flex items-center gap-2 mb-4">
                <CheckCircle className="w-4 h-4 text-[#0ECB81] shrink-0" />
                <span className="text-xs text-[#0ECB81] font-bold">{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={authView === 'login' ? handleStandardLogin : handleStandardRegister} className="space-y-4">
              {authView === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-400">Full Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex Nyangaresi Obwogi"
                    className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-bold placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-bold placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase text-slate-400">Password</label>
                  {authView === 'login' && (
                    <span className="text-[10px] font-bold text-slate-500 cursor-pointer hover:text-slate-300 transition-colors">
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
                  className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-bold placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 mt-2"
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
                  onClick={handleDemoLogin}
                  type="button" 
                  className="w-full py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Demo Sign In</span>
                </button>
              </div>
            )}

            <div className="pt-4 flex flex-col gap-4 text-xs font-bold border-t border-white/10 mt-6">
              <button
                onClick={() => {
                  setAuthView(authView === 'login' ? 'register' : 'login');
                  setErrorMessage(null);
                }}
                className="text-blue-400 hover:text-blue-300 transition-colors mt-4"
              >
                {authView === 'login' ? 'Need an account? Register' : 'Already have an account? Log In'}
              </button>
              <button
                onClick={() => { setAuthView('landing'); setErrorMessage(null); }}
                className="text-slate-400 hover:text-white transition-colors"
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
