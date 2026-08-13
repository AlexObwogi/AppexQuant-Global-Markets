const fs = require('fs');
const oldContent = fs.readFileSync('src/components/auth/AuthGate.tsx', 'utf8');

const generateNewAuthGate = () => {
return `/**
 * AppexQuant Markets Global - AuthGate Component
 * Refactored for 7-scene cinematic marketing sequence and fluid institutional auth portal.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGlobalState } from '../../state/GlobalStateContext';
import { useApiFetch } from '../../utils/apiFetch';
import { 
  ArrowRight, LogIn, UserPlus, Orbit, Sparkles, 
  TrendingUp, Cpu, Award, DollarSign, BarChart2, ShieldAlert, Users,
  GraduationCap, AlertCircle, CheckCircle, Activity, Globe, Database, Network
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CINEMATIC_SCENES = [
  {
    id: 0,
    headline: "SEE THE MARKET DIFFERENTLY.",
    tags: ["MARKET", "STRUCTURE", "LIQUIDITY", "VOLATILITY"],
    bg: 'from-slate-900 to-[#0C0E12]',
    glowBg: 'from-blue-600/30 to-cyan-500/30',
    primary: 'from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400',
    border: 'border-blue-500/50 hover:bg-blue-500/10 text-blue-400',
    glow: 'shadow-[0_0_20px_rgba(37,99,235,0.4)]',
    icon: <Globe className="w-12 h-12 text-blue-400" />
  },
  {
    id: 1,
    headline: "INTELLIGENCE BEFORE EXECUTION.",
    tags: ["STRUCTURE", "LIQUIDITY", "SENTIMENT", "VOLATILITY", "CORRELATION", "RISK"],
    bg: 'from-[#0C0E12] to-slate-900',
    glowBg: 'from-indigo-600/30 to-purple-500/30',
    primary: 'from-indigo-600 to-purple-500 hover:from-indigo-500 hover:to-purple-400',
    border: 'border-indigo-500/50 hover:bg-indigo-500/10 text-indigo-400',
    glow: 'shadow-[0_0_20px_rgba(79,70,229,0.4)]',
    icon: <Network className="w-12 h-12 text-indigo-400" />
  },
  {
    id: 2,
    headline: "LEARN THE EDGE. PRACTICE THE PATTERN.",
    tags: ["LIQUIDITY SWEEP", "BOS", "MSS", "FVG", "ORDER BLOCK", "DISPLACEMENT", "BEGINNER → INTERMEDIATE → ADVANCED → ELITE"],
    bg: 'from-slate-900 to-[#0C0E12]',
    glowBg: 'from-purple-600/30 to-fuchsia-500/30',
    primary: 'from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400',
    border: 'border-purple-500/50 hover:bg-purple-500/10 text-purple-400',
    glow: 'shadow-[0_0_20px_rgba(147,51,234,0.4)]',
    icon: <GraduationCap className="w-12 h-12 text-purple-400" />
  },
  {
    id: 3,
    headline: "TURN YOUR RULES INTO A SYSTEM.",
    tags: ["LIQUIDITY + STRUCTURE + FVG + SESSION + RISK → STRATEGY"],
    bg: 'from-[#0C0E12] to-slate-900',
    glowBg: 'from-teal-600/30 to-emerald-500/30',
    primary: 'from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400',
    border: 'border-teal-500/50 hover:bg-teal-500/10 text-teal-400',
    glow: 'shadow-[0_0_20px_rgba(20,184,166,0.4)]',
    icon: <Database className="w-12 h-12 text-teal-400" />
  },
  {
    id: 4,
    headline: "ENGINEERED FOR AUTOMATION.",
    subHeadline: "Algorithmic Precision. Disciplined Execution.",
    tags: ["MARKET → ANALYSIS → RULES → RISK → EXECUTION"],
    bg: 'from-slate-900 to-[#0C0E12]',
    glowBg: 'from-cyan-600/30 to-blue-500/30',
    primary: 'from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400',
    border: 'border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.4)]',
    icon: <Cpu className="w-12 h-12 text-cyan-400" />
  },
  {
    id: 5,
    headline: "EVERYTHING YOU NEED. ONE ECOSYSTEM.",
    tags: ["MARKETS", "CHARTS", "AI", "SMC/ICT", "ACADEMY", "STRATEGIES", "BOTS", "RISK", "ANALYTICS"],
    bg: 'from-[#0C0E12] to-slate-900',
    glowBg: 'from-amber-600/30 to-orange-500/30',
    primary: 'from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400',
    border: 'border-amber-500/50 hover:bg-amber-500/10 text-amber-400',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)]',
    icon: <Layers className="w-12 h-12 text-amber-400" />
  },
  {
    id: 6,
    headline: "BUILD DISCIPLINE. MASTER YOUR EDGE.",
    tags: ["LEARN", "PRACTICE", "ANALYZE", "BUILD", "TEST", "AUTOMATE", "IMPROVE"],
    bg: 'from-slate-900 to-[#0C0E12]',
    glowBg: 'from-[#0ECB81]/30 to-emerald-600/30',
    primary: 'from-[#0ECB81] to-emerald-600 hover:from-[#0ECB81] hover:to-emerald-500',
    border: 'border-[#0ECB81]/50 hover:bg-[#0ECB81]/10 text-[#0ECB81]',
    glow: 'shadow-[0_0_20px_rgba(14,203,129,0.4)]',
    icon: <TrendingUp className="w-12 h-12 text-[#0ECB81]" />
  }
];

// Re-using a dummy icon for Layers since it's not imported directly above if it fails, I'll just use Orbit
const Layers = Orbit;

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, dispatch } = useGlobalState();
  const apiFetch = useApiFetch();
  
  const [authView, setAuthView] = useState<'landing' | 'login' | 'register'>('landing');
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);

  // Form States
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailExistsError, setEmailExistsError] = useState<boolean>(false);

  useEffect(() => {
    if (authView !== 'landing') return;
    const interval = setInterval(() => {
      setActiveSceneIndex((prev) => (prev + 1) % CINEMATIC_SCENES.length);
    }, 8000); // 8 seconds per scene
    return () => clearInterval(interval);
  }, [authView]);

  if (state.session.isAuthenticated) {
    return <>{children}</>;
  }

  // Same Auth logic as before
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

  const activeScene = CINEMATIC_SCENES[activeSceneIndex];

  return (
    <div className={\`relative overflow-hidden min-h-screen flex flex-col items-center justify-center bg-gradient-to-b \${activeScene.bg} text-white px-4 py-8 transition-colors duration-1000 font-sans\`}>
      
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik02MCAwaC0xdjYwaDFWMHoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPgo8cGF0aCBkPSJNMCA1OWg2MHYxaC02MHoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPgo8L3N2Zz4=')] opacity-30" />
        
        {/* Ambient radial glows */}
        <div 
          className={\`absolute -top-[10%] -left-[10%] w-[120vw] md:w-[60vw] h-[120vw] md:h-[60vw] max-w-[1200px] max-h-[1200px] rounded-full bg-gradient-to-br \${activeScene.glowBg} blur-[120px] md:blur-[200px] opacity-40 transition-all duration-1000\`} 
        />
        <div 
          className={\`absolute -bottom-[10%] -right-[10%] w-[120vw] md:w-[60vw] h-[120vw] md:h-[60vw] max-w-[1200px] max-h-[1200px] rounded-full bg-gradient-to-tl \${activeScene.glowBg} blur-[120px] md:blur-[200px] opacity-40 transition-all duration-1000\`} 
        />
      </div>

      {/* Brand Header */}
      <div className="absolute top-6 left-6 flex items-center gap-2 select-none z-20">
        <div className="p-1.5 rounded-lg bg-slate-800 text-white font-black text-xs font-mono">AQ</div>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">APPEXQUANT GLOBAL</span>
      </div>

      {authView === 'landing' ? (
        <div className="relative z-10 w-full max-w-5xl flex flex-col items-center justify-center h-full flex-grow">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScene.id}
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center space-y-8"
            >
              <div className="p-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm shadow-xl">
                {activeScene.icon}
              </div>
              
              <div className="space-y-4">
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-2xl font-mono uppercase">
                  {activeScene.headline}
                </h1>
                {activeScene.subHeadline && (
                  <p className="text-lg md:text-xl text-slate-300 font-medium tracking-wide">
                    {activeScene.subHeadline}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-3 max-w-3xl">
                {activeScene.tags.map((tag, idx) => (
                  <span 
                    key={idx}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs md:text-sm font-bold tracking-wider text-slate-300 backdrop-blur-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dynamic CTAs mapped to active scene theme */}
          <div className="absolute bottom-12 left-0 right-0 flex flex-col sm:flex-row justify-center items-center gap-4 px-6 z-50">
            <button
              onClick={() => setAuthView('login')}
              className={\`px-8 py-4 rounded-full bg-white/5 border \${activeScene.border} text-sm font-bold uppercase tracking-wider transition-all duration-300 backdrop-blur-md hover:scale-[1.02] active:scale-[0.98]\`}
            >
              Log In
            </button>
            <button
              onClick={() => setAuthView('register')}
              className={\`px-8 py-4 rounded-full bg-gradient-to-r \${activeScene.primary} text-white text-sm font-bold uppercase tracking-wider transition-all duration-300 \${activeScene.glow} hover:scale-[1.02] active:scale-[0.98]\`}
            >
              Create Account
            </button>
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 w-full max-w-md bg-[#0C0E12]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-xl bg-blue-500/10 text-blue-400 mb-2 border border-blue-500/20">
              <Orbit className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {authView === 'login' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-sm text-slate-400 font-medium">
              Secure institutional access gateway.
            </p>
          </div>

          {/* Error / Success Messages */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
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
              </motion.div>
            )}
            
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-lg flex items-center gap-2 mb-4">
                  <CheckCircle className="w-4 h-4 text-[#0ECB81] shrink-0" />
                  <span className="text-xs text-[#0ECB81] font-bold">{successMessage}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
              className={\`w-full h-12 rounded-xl bg-gradient-to-r \${activeScene.primary} text-white font-bold text-xs tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 mt-2\`}
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

          <div className="pt-4 flex justify-between items-center text-xs font-bold">
            <button
              onClick={() => { setAuthView('landing'); setErrorMessage(null); }}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              ← Back to Overview
            </button>
            <button
              onClick={() => {
                setAuthView(authView === 'login' ? 'register' : 'login');
                setErrorMessage(null);
              }}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              {authView === 'login' ? 'Need an account?' : 'Already have an account?'}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
`;
};

fs.writeFileSync('src/components/auth/AuthGate.tsx', generateNewAuthGate());
console.log('AuthGate.tsx replaced successfully');
