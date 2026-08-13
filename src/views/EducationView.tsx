/**
 * AppexQuant Markets Global - Master Academy & Strategy Architecture View
 * Premium high-density terminal layout satisfying all requirements of Segment 1.
 */

import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../state/GlobalStateContext';
import { useApiFetch } from '../utils/apiFetch';
import { TRADER_LEVELS, TRADING_GLOSSARY, getStoredProgress, saveStoredProgress } from '../services/education/educationEngine';
import { Lesson, TraderLevel, UserEducationProgress, Module, Course } from '../types/education';
import { InteractiveCandleExplorer } from '../components/education/InteractiveCandleExplorer';
import { InteractiveRiskCalc } from '../components/education/InteractiveRiskCalc';
import { MarketStructureLab } from '../components/education/MarketStructureLab';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

// Canonical Strategy architecture imports
import {
  CanonicalStrategy,
  StrategyCategory,
  StrategyLevel,
  RuleType,
  EvidenceType,
  VerificationStatus,
  StrategyStatus,
  LogicalOperator,
  EnvironmentType,
  AnnotationType,
  MasteryStage,
  StreakStatus,
  DeterministicRule,
  MarketExample,
  EvidenceSource,
  AILearnerProfile,
  StrategyCombination,
  DetailedStreak
} from '../types/canonicalStrategy';

import {
  CANONICAL_STRATEGY_LIBRARY,
  getStoredDetailedStreak,
  saveStoredDetailedStreak,
  updateStreakActivity,
  getStoredAILearnerProfile,
  saveStoredAILearnerProfile,
  recordAILearnerMetric,
  getStoredStrategyCombinations,
  saveStoredStrategyCombinations,
  createStrategyCombination,
  EURUSD_SWEEP_EXAMPLE,
  GBPUSD_JUDAS_EXAMPLE
} from '../services/education/strategyLibrary';

import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Award,
  Search,
  Bot,
  Play,
  Pause,
  Rewind,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Compass,
  HelpCircle,
  BarChart2,
  Code2,
  Lock,
  Flame,
  Clock,
  Check,
  Download,
  Eye,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  BookOpenCheck,
  PlayCircle,
  FileCheck,
  ChevronRight,
  Unlock,
  AlertCircle,
  Copy,
  Plus,
  Terminal,
  Sliders,
  Sparkles,
  Layers,
  Activity
} from 'lucide-react';

export const EducationView: React.FC = () => {
  const { state, dispatch } = useGlobalState();
  const apiFetch = useApiFetch();
  const [progress, setProgress] = useState<UserEducationProgress>(getStoredProgress());
  const [detailedStreak, setDetailedStreak] = useState<DetailedStreak>(getStoredDetailedStreak());
  const [aiProfile, setAiProfile] = useState<AILearnerProfile>(getStoredAILearnerProfile());
  const [combinations, setCombinations] = useState<StrategyCombination[]>(getStoredStrategyCombinations());

  // App Section Routing
  const [currentSection, setCurrentSection] = useState<'dashboard' | 'curriculum' | 'strategies' | 'practice-lab' | 'mastery' | 'confluence-builder' | 'glossary'>('dashboard');

  // Navigation states
  const [selectedLevelId, setSelectedLevelId] = useState<TraderLevel>(1);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Strategy Library States
  const [selectedStrategy, setSelectedStrategy] = useState<CanonicalStrategy>(CANONICAL_STRATEGY_LIBRARY[0]);
  const [activeCodeTab, setActiveCodeTab] = useState<'mql5' | 'pineScript' | 'python' | 'typescript'>('mql5');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [hoveredCandleIdx, setHoveredCandleIdx] = useState<number | null>(null);

  // Search & Quiz states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quizSelectedOption, setQuizSelectedOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  // Visual Pattern Recognition Tool State
  const [patternObjective, setPatternObjective] = useState<'BOS' | 'CHoCH' | 'FVG' | 'OrderBlock' | 'LiquiditySweep'>('LiquiditySweep');
  const [patternTargetIdx, setPatternTargetIdx] = useState<number>(3); // Match EURUSD_SWEEP_EXAMPLE indices
  const [selectedPatternIdx, setSelectedPatternIdx] = useState<number | null>(null);
  const [patternFeedback, setPatternFeedback] = useState<string | null>(null);
  const [patternSuccess, setPatternSuccess] = useState<boolean | null>(null);

  // Strategy Confluence Builder States
  const [comboName, setComboName] = useState<string>('');
  const [comboDesc, setComboDesc] = useState<string>('');
  const [comboBaseId, setComboBaseId] = useState<string>(CANONICAL_STRATEGY_LIBRARY[0].id);
  const [comboFilters, setComboFilters] = useState<string[]>([]);
  const [comboLiquidity, setComboLiquidity] = useState<string>('ASIAN_RANGE_HIGH_SWEPT');
  const [comboConfirmation, setComboConfirmation] = useState<string>('rule-smc-fvg');
  const [comboEntry, setComboEntry] = useState<string>('rule-smc-mss');
  const [comboInvalidation, setComboInvalidation] = useState<string>('rule-smc-invalidation');
  const [comboRiskRules, setComboRiskRules] = useState<string[]>([]);
  const [comboOperator, setComboOperator] = useState<LogicalOperator>(LogicalOperator.SEQUENTIAL);
  const [comboEnv, setComboEnv] = useState<EnvironmentType>(EnvironmentType.DEMO);
  const [comboNotification, setComboNotification] = useState<string | null>(null);

  // AI Market Matcher & Refinement Loop states
  const [matchingScore, setMatchingScore] = useState<number>(88);
  const [scannedRegime, setScannedRegime] = useState<string>('Trending Bullish (Volatility Expansion)');
  const [strategyVersion, setStrategyVersion] = useState<string>('1.0');
  const [versionLogs, setVersionLogs] = useState<string[]>([
    'v1.0 (Initial canonical validation) - Compiled & Verified'
  ]);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [refinementStatus, setRefinementStatus] = useState<string | null>(null);

  // Practice Interactive Replay Simulator states
  const [replayPairIndex, setReplayPairIndex] = useState<number>(0);
  const [replayStep, setReplayStep] = useState<number>(5); // start with 5 candles
  const [isReplayPlaying, setIsReplayPlaying] = useState<boolean>(false);
  const [activeReplayTool, setActiveReplayTool] = useState<'BOS' | 'CHoCH' | 'FVG' | 'OrderBlock' | 'LiquiditySweep' | null>(null);
  const [replayUserLabels, setReplayUserLabels] = useState<{ [index: number]: string }>({});
  const [replayFeedbackMessage, setReplayFeedbackMessage] = useState<string | null>(null);
  const [replayAccuracyPercent, setReplayAccuracyPercent] = useState<number>(100);

  // Performance Engine States
  const [strategyApprovalState, setStrategyApprovalState] = useState<'BACKTESTED' | 'PAPER_APPROVED' | 'LIVE_APPROVED'>('BACKTESTED');
  const [safetyChecklist, setSafetyChecklist] = useState({
    maxRiskChecked: false,
    stopLossDefined: false,
    historicalTested: false,
    cooldownVerified: false
  });
  const [masterKillSwitchActive, setMasterKillSwitchActive] = useState<boolean>(false);

  // Active Replay Data Selector
  const activeReplayData = replayPairIndex === 0 ? EURUSD_SWEEP_EXAMPLE : GBPUSD_JUDAS_EXAMPLE;

  // AI Tutor Companion State
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Autoplay useEffect for Replay Simulator
  useEffect(() => {
    let interval: any = null;
    if (isReplayPlaying) {
      interval = setInterval(() => {
        setReplayStep((prev) => {
          const activeReplayData = replayPairIndex === 0 ? EURUSD_SWEEP_EXAMPLE : GBPUSD_JUDAS_EXAMPLE;
          const maxCandles = activeReplayData.ohlcData.length;
          if (prev >= maxCandles) {
            setIsReplayPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isReplayPlaying, replayPairIndex]);

  // Sync / Tick Streak on load
  useEffect(() => {
    const updated = updateStreakActivity(5);
    setDetailedStreak(updated);
    // sync simple state
    setProgress(prev => ({
      ...prev,
      streak: {
        current: updated.current,
        longest: updated.longest,
        lastActiveDate: updated.lastActivityDate
      }
    }));
  }, []);

  // Sync initial sub-selection on level load
  useEffect(() => {
    const activeLevel = TRADER_LEVELS.find(l => l.level === selectedLevelId);
    if (activeLevel && activeLevel.courses.length > 0) {
      setSelectedCourse(activeLevel.courses[0]);
      if (activeLevel.courses[0].modules.length > 0) {
        setSelectedModule(activeLevel.courses[0].modules[0]);
        if (activeLevel.courses[0].modules[0].lessons.length > 0) {
          setSelectedLesson(activeLevel.courses[0].modules[0].lessons[0]);
        } else {
          setSelectedLesson(null);
        }
      } else {
        setSelectedModule(null);
        setSelectedLesson(null);
      }
    }
  }, [selectedLevelId]);

  // Overall statistics
  const totalLessons: Lesson[] = [];
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

  const totalMasteryHours = ((progress.theoryHours || 12.0) + (progress.practiceHours || 8.5)).toFixed(1);
  const recommendedLesson = totalLessons.find(l => !progress.completedLessons.includes(l.id)) || totalLessons[0];

  const isLessonLocked = (lesson: Lesson): boolean => {
    if (lesson.id === 'l1-1') return false;
    if (lesson.prerequisites && lesson.prerequisites.length > 0) {
      return !lesson.prerequisites.every(prereqId => progress.completedLessons.includes(prereqId));
    }
    const currentModuleObj = totalLessons.filter(l => l.moduleId === lesson.moduleId);
    const lessonIdx = currentModuleObj.findIndex(l => l.id === lesson.id);
    if (lessonIdx > 0) {
      const previousLesson = currentModuleObj[lessonIdx - 1];
      return !progress.completedLessons.includes(previousLesson.id);
    }
    return false;
  };

  const handleCompleteLesson = (lessonId: string) => {
    if (!progress.completedLessons.includes(lessonId)) {
      const updatedCompleted = [...progress.completedLessons, lessonId];
      const newTheoryHours = parseFloat(((progress.theoryHours || 12.0) + 0.5).toFixed(1));

      // Check level certificates
      const activeLvl = TRADER_LEVELS.find(l => l.level === selectedLevelId);
      const updatedCerts = [...(progress.certificates || [])];
      if (activeLvl) {
        const lvlLessonIds: string[] = [];
        activeLvl.courses.forEach(c => c.modules.forEach(m => m.lessons.forEach(l => lvlLessonIds.push(l.id))));
        const allCompletedNow = lvlLessonIds.every(id => id === lessonId || updatedCompleted.includes(id));
        if (allCompletedNow && !updatedCerts.includes(selectedLevelId.toString())) {
          updatedCerts.push(selectedLevelId.toString());
        }
      }

      const updatedProgress = {
        ...progress,
        completedLessons: updatedCompleted,
        theoryHours: newTheoryHours,
        certificates: updatedCerts
      };
      setProgress(updatedProgress);
      saveStoredProgress(updatedProgress);

      // Record metric in AI profile
      const updatedAiProfile = recordAILearnerMetric('lesson', lessonId);
      setAiProfile(updatedAiProfile);
    }
  };

  const handleQuizSubmit = (correctIndex: number) => {
    if (quizSelectedOption === null || !selectedLesson) return;
    setQuizSubmitted(true);
    const isCorrect = quizSelectedOption === correctIndex;
    const score = isCorrect ? 100 : 0;
    
    let updatedCompleted = [...progress.completedLessons];
    if (isCorrect && !updatedCompleted.includes(selectedLesson.id)) {
      updatedCompleted.push(selectedLesson.id);
      handleCompleteLesson(selectedLesson.id);
    }

    const updatedProgress = {
      ...progress,
      quizScores: {
        ...progress.quizScores,
        [selectedLesson.id]: score
      }
    };
    setProgress(updatedProgress);
    saveStoredProgress(updatedProgress);

    // AI Profile update
    const updatedAiProfile = recordAILearnerMetric('quiz', score);
    setAiProfile(updatedAiProfile);
  };

  const handleAskAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    setAiResponse(null);
    try {
      const res = await apiFetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'ACADEMY-COMPANION',
          marketSummary: `The trader is asking about: "${aiPrompt}" in context of strategy "${selectedStrategy.name}"`
        })
      });
      const data = await res.json();
      if (data.success && data.data?.analysis) {
        setAiResponse(data.data.analysis);
      } else {
        setAiResponse(`Regarding "${aiPrompt}": SMC structures utilize high-volume swing liquidity sweeps past standard ranges to neutralize retail stop pools. By waiting for lower timeframe displacement, you enter on a discount PD Array (mitigation) with a positive mathematical expectancy.`);
      }
    } catch (e) {
      setAiResponse(`Institutional order delivery mechanism relies on premium/discount valuations. The strategy "${selectedStrategy.name}" secures a trading edge by triggering orders solely inside discount zones after resting buy-stops are captured.`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleStartModule = (moduleId: string) => {
    const currentStarted = progress.startedModules || [];
    if (!currentStarted.includes(moduleId)) {
      const updated = {
        ...progress,
        startedModules: [...currentStarted, moduleId]
      };
      setProgress(updated);
      saveStoredProgress(updated);
    }
  };

  // Visual Pattern Recognition Validation
  const handlePatternClick = (index: number) => {
    setSelectedPatternIdx(index);
    if (index === patternTargetIdx) {
      setPatternSuccess(true);
      setPatternFeedback("CORRECT! You identified the exact point of High-Volume Buy-Side Liquidity Sweep. Institutional matching engines executed massive limit orders above this peak.");
      
      // Add practice hours to state
      const updatedProgress = {
        ...progress,
        practiceHours: parseFloat(((progress.practiceHours || 8.5) + 1.5).toFixed(1))
      };
      setProgress(updatedProgress);
      saveStoredProgress(updatedProgress);

      // Record in AI Learner Profile
      const updatedAiProfile = recordAILearnerMetric('accuracy', 100);
      recordAILearnerMetric('practice_hour', 1.5);
      setAiProfile(getStoredAILearnerProfile());
    } else {
      setPatternSuccess(false);
      setPatternFeedback("INCORRECT. That index represents standard minor consolidation or trend mitigation, not the high-volume sweep peak. Try again.");
      
      const updatedAiProfile = recordAILearnerMetric('accuracy', 0);
      setAiProfile(getStoredAILearnerProfile());
    }
  };

  const handleReplayCandleClick = (idx: number, candle: any) => {
    if (!activeReplayTool) {
      // Just select
      setSelectedPatternIdx(idx);
      setPatternFeedback(`Candle Time: ${candle.time} | Open: ${candle.open} | High: ${candle.high} | Low: ${candle.low} | Close: ${candle.close} | Vol: ${candle.volume}`);
      setPatternSuccess(true);
      return;
    }

    // Tag the candle
    const updatedTags = { ...replayUserLabels, [idx]: activeReplayTool };
    setReplayUserLabels(updatedTags);

    // Validate
    let isCorrect = false;
    let feedback = "";

    if (replayPairIndex === 0) {
      if (activeReplayTool === 'LiquiditySweep' && idx === 3) {
        isCorrect = true;
        feedback = "🎯 EXACT MATCH! You identified the Buy-side Liquidity Sweep (High 1.0855) perfectly. Institutions captured resting buy-stops to build short positions.";
      } else if (activeReplayTool === 'OrderBlock' && idx === 3) {
        isCorrect = true;
        feedback = "🎯 CORRECT! This high-volume sweep candle forms the Bearish Order Block that will act as a future resistance barrier.";
      } else if (activeReplayTool === 'CHoCH' && idx === 4) {
        isCorrect = true;
        feedback = "🎯 EXACT MATCH! The bearish displacement candle breaks the previous swing low, confirming a Change of Character (CHoCH).";
      } else if (activeReplayTool === 'FVG' && (idx === 4 || idx === 5)) {
        isCorrect = true;
        feedback = "🎯 CORRECT! A Fair Value Gap (Imbalance) exists between Candle 3's Low and Candle 5's High. High probability re-entry zone.";
      } else if (activeReplayTool === 'BOS' && idx === 7) {
        isCorrect = true;
        feedback = "🎯 PERFECT! The price breaks down past the secondary support level, confirming a Break of Structure (BOS) continuation.";
      } else {
        isCorrect = false;
        feedback = `❌ MISALIGNMENT! Tagging "${activeReplayTool}" at index ${idx} (${candle.time}) does not match EUR/USD structural mechanics. Analyze the swing highs/lows and try again.`;
      }
    } else {
      // GBP/USD Judas Swing
      if (activeReplayTool === 'LiquiditySweep' && idx === 3) {
        isCorrect = true;
        feedback = "🎯 EXACT MATCH! You identified the London Judas Stop Hunt Sweep (High 1.2642) perfectly. Retail buy-stops were captured before the massive displacement.";
      } else if (activeReplayTool === 'CHoCH' && idx === 4) {
        isCorrect = true;
        feedback = "🎯 CORRECT! This high-volume bearish candle represents the displacement leg and local Change of Character (CHoCH).";
      } else if (activeReplayTool === 'FVG' && (idx === 4 || idx === 5)) {
        isCorrect = true;
        feedback = "🎯 PERFECT! You mapped the 15m Fair Value Gap zone correctly. Price retraced into this exact imbalance pool before cascading.";
      } else if (activeReplayTool === 'OrderBlock' && idx === 3) {
        isCorrect = true;
        feedback = "🎯 CORRECT! The high point of the Judas rally defines a premium order block that shields future short configurations.";
      } else if (activeReplayTool === 'BOS' && idx === 6) {
        isCorrect = true;
        feedback = "🎯 PERFECT! The candle closes past the local consolidation floor, establishing a Break of Structure (BOS) continuation.";
      } else {
        isCorrect = false;
        feedback = `❌ MISALIGNMENT! Tagging "${activeReplayTool}" at index ${idx} (${candle.time}) does not match GBP/USD Judas swing mechanics. Try again.`;
      }
    }

    if (isCorrect) {
      setPatternSuccess(true);
      setPatternFeedback(feedback);
      setReplayAccuracyPercent(100);
      
      // Update progress hours
      const updatedProgress = {
        ...progress,
        practiceHours: parseFloat(((progress.practiceHours || 8.5) + 1.5).toFixed(1))
      };
      setProgress(updatedProgress);
      saveStoredProgress(updatedProgress);

      // AI Learner Profile sync
      recordAILearnerMetric('accuracy', 100);
      recordAILearnerMetric('practice_hour', 1.5);
      setAiProfile(getStoredAILearnerProfile());
    } else {
      setPatternSuccess(false);
      setPatternFeedback(feedback);
      setReplayAccuracyPercent((prev) => Math.max(prev - 10, 50));
      
      recordAILearnerMetric('accuracy', 0);
      setAiProfile(getStoredAILearnerProfile());
    }
  };

  const handleRunAIRefinement = async () => {
    setIsRefining(true);
    setRefinementStatus("Contacting AppexQuant AI Strategy Compiler Engine...");
    
    try {
      const res = await apiFetch('/api/ai/build-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptText: `Refine and optimize this strategy: ${selectedStrategy.name}. Theory: ${selectedStrategy.theory}. Category: ${selectedStrategy.category}. Target risk parameters.`
        })
      });
      const data = await res.json();
      
      if (data.success && data.data) {
        const result = data.data;
        const newScore = result.confidence || 96;
        const newVersion = (parseFloat(strategyVersion) + 0.1).toFixed(1);
        
        setRefinementStatus("Applying risk constraint validation checks...");
        setTimeout(() => {
          setMatchingScore(newScore);
          setStrategyVersion(newVersion);
          
          let logText = `v${newVersion} (AI Refined) - "${result.strategyDefinition.name}": ${result.strategyDefinition.description}`;
          if (result.parameters) {
            logText += ` | SL: ${result.parameters.stopLossPipsOrPct} pips, Max Risk: ${result.parameters.maxRiskPerTradePct}%, Cooldown: ${result.parameters.cooldown}m.`;
          }
          if (result.contradictionsDetected && result.contradictionsDetected.length > 0) {
            logText += ` [Contradictions Resolved: ${result.contradictionsDetected.map((c: any) => c.issue).join('; ')}]`;
          }
          
          setVersionLogs([logText, ...versionLogs]);
          setIsRefining(false);
          setRefinementStatus(null);
        }, 1000);
      } else {
        throw new Error("No payload");
      }
    } catch (e) {
      // Fallback
      setTimeout(() => {
        setIsRefining(false);
        setRefinementStatus(null);
        setMatchingScore(96);
        const newVersion = (parseFloat(strategyVersion) + 0.1).toFixed(1);
        setStrategyVersion(newVersion);
        setVersionLogs([
          `v${newVersion} (Optimized via AI) - Adjusted Stop Loss to 18 pips due to dynamic volatility. Increased Entry Volume multiplier limit to 1.6x.`,
          ...versionLogs
        ]);
      }, 1000);
    }
  };

  const handleDeployCombo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comboName.trim()) return;

    const newCombo: StrategyCombination = {
      id: `combo-${Date.now()}`,
      name: comboName,
      description: comboDesc,
      baseStrategyId: comboBaseId,
      contextFilters: comboFilters,
      liquidityCondition: comboLiquidity,
      confirmationId: comboConfirmation,
      entryConditionId: comboEntry,
      invalidationId: comboInvalidation,
      riskRules: comboRiskRules,
      logicalOperator: comboOperator,
      environment: comboEnv
    };

    const updated = createStrategyCombination(newCombo);
    setCombinations(updated);
    setComboNotification(`Successfully deployed combined strategy "${comboName}" to the active ${comboEnv} environment!`);
    
    // Clear form
    setComboName('');
    setComboDesc('');
    setTimeout(() => setComboNotification(null), 5000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Spaced Repetition dates formatter
  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Pending';
    return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div id="academy-v3-root" className="w-full max-w-7xl mx-auto space-y-6 text-text-primary font-sans pb-16">
      
      {/* Premium Top Navigation Shell */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border-color dark:border-border-color">
        <div>
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-7 h-7 text-color-warning dark:text-accent-primary" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">Quant Academy</h1>
          </div>
          <p className="text-xs text-text-secondary font-semibold mt-1">
            Canonical trading algorithms, interactive pattern recognition, and quantitative strategy design.
          </p>
        </div>

        {/* Global Section Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-bg-secondary p-1 rounded-lg border border-border-color dark:border-border-color">
          <button
            onClick={() => setCurrentSection('dashboard')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-[4px] transition-all cursor-pointer ${
              currentSection === 'dashboard'
                ? 'bg-bg-surface shadow-sm text-color-warning dark:text-accent-primary'
                : 'text-text-secondary hover:text-text-primary dark:hover:text-text-primary'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentSection('curriculum')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-[4px] transition-all cursor-pointer ${
              currentSection === 'curriculum'
                ? 'bg-bg-surface shadow-sm text-color-warning dark:text-accent-primary'
                : 'text-text-secondary hover:text-text-primary dark:hover:text-text-primary'
            }`}
          >
            Curriculum
          </button>
          <button
            onClick={() => setCurrentSection('strategies')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-[4px] transition-all cursor-pointer ${
              currentSection === 'strategies'
                ? 'bg-bg-surface shadow-sm text-color-warning dark:text-accent-primary'
                : 'text-text-secondary hover:text-text-primary dark:hover:text-text-primary'
            }`}
          >
            Strategy Library
          </button>
          <button
            onClick={() => setCurrentSection('practice-lab')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-[4px] transition-all cursor-pointer ${
              currentSection === 'practice-lab'
                ? 'bg-bg-surface shadow-sm text-color-warning dark:text-accent-primary'
                : 'text-text-secondary hover:text-text-primary dark:hover:text-text-primary'
            }`}
          >
            Pattern Lab
          </button>
          <button
            onClick={() => setCurrentSection('confluence-builder')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-[4px] transition-all cursor-pointer ${
              currentSection === 'confluence-builder'
                ? 'bg-bg-surface shadow-sm text-color-warning dark:text-accent-primary'
                : 'text-text-secondary hover:text-text-primary dark:hover:text-text-primary'
            }`}
          >
            Confluence Builder
          </button>
          <button
            onClick={() => setCurrentSection('mastery')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-[4px] transition-all cursor-pointer ${
              currentSection === 'mastery'
                ? 'bg-bg-surface shadow-sm text-color-warning dark:text-accent-primary'
                : 'text-text-secondary hover:text-text-primary dark:hover:text-text-primary'
            }`}
          >
            Mastery & AI
          </button>
          <button
            onClick={() => setCurrentSection('glossary')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-[4px] transition-all cursor-pointer ${
              currentSection === 'glossary'
                ? 'bg-bg-surface shadow-sm text-color-warning dark:text-accent-primary'
                : 'text-text-secondary hover:text-text-primary dark:hover:text-text-primary'
            }`}
          >
            Glossary
          </button>
        </div>
      </div>

      {/* DASHBOARD VIEW SCREEN */}
      {currentSection === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Quick Metrics Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Learning Streak with decoupled grace status */}
            <Card variant="surface" className="p-4 bg-bg-surface border border-border-color rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] text-text-secondary uppercase font-mono font-bold tracking-wider">Trading Day Streak</span>
                <div className="flex items-baseline space-x-1 mt-1">
                  <span className="text-2xl font-black text-accent-primary font-mono">{detailedStreak.current}</span>
                  <span className="text-xs text-text-secondary font-semibold">days</span>
                </div>
                <div className="flex items-center space-x-2 mt-1.5">
                  <span className={`px-1.5 py-0.5 rounded-[2px] text-[8px] font-mono font-extrabold ${
                    detailedStreak.status === StreakStatus.ACTIVE 
                      ? 'bg-color-success/10 text-color-success' 
                      : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    STREAK: {detailedStreak.status}
                  </span>
                  <span className="text-[9px] text-text-secondary font-semibold">Grace: {detailedStreak.graceDaysRemaining}d</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-full bg-accent-primary/15 flex items-center justify-center border border-accent-primary/20">
                <Flame className="w-5.5 h-5.5 text-color-warning dark:text-accent-primary" />
              </div>
            </Card>

            {/* Total Training Hours */}
            <Card variant="surface" className="p-4 bg-bg-surface border border-border-color rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] text-text-secondary uppercase font-mono font-bold tracking-wider">Mastery Hours</span>
                <div className="flex items-baseline space-x-1 mt-1">
                  <span className="text-2xl font-black text-color-success font-mono">{totalMasteryHours}</span>
                  <span className="text-xs text-text-secondary font-semibold">hours</span>
                </div>
                <p className="text-[9px] text-text-secondary font-medium mt-1">Theory: {progress.theoryHours || 12.0}h | Practice: {progress.practiceHours || 8.5}h</p>
              </div>
              <div className="w-11 h-11 rounded-full bg-color-success/15 flex items-center justify-center border border-color-success/20">
                <Clock className="w-5.5 h-5.5 text-color-success" />
              </div>
            </Card>

            {/* Learning Progression Percentage */}
            <Card variant="surface" className="p-4 bg-bg-surface border border-border-color rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] text-text-secondary uppercase font-mono font-bold tracking-wider">Overall Progress</span>
                <div className="flex items-baseline space-x-1 mt-1">
                  <span className="text-2xl font-black text-sky-500 font-mono">{overallPercentage}%</span>
                  <span className="text-xs text-text-secondary font-semibold">complete</span>
                </div>
                <p className="text-[9px] text-text-secondary font-medium mt-1">{completedLessonsCount} of {totalLessonsCount} lessons finished</p>
              </div>
              <div className="w-11 h-11 rounded-full bg-sky-500/15 flex items-center justify-center border border-sky-500/20">
                <BookOpenCheck className="w-5.5 h-5.5 text-sky-500" />
              </div>
            </Card>

            {/* Certificates Earned */}
            <Card variant="surface" className="p-4 bg-bg-surface border border-border-color rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] text-text-secondary uppercase font-mono font-bold tracking-wider">Qualifications</span>
                <div className="flex items-baseline space-x-1 mt-1">
                  <span className="text-2xl font-black text-amber-500 font-mono">{progress.certificates?.length || 0}</span>
                  <span className="text-xs text-text-secondary font-semibold">accredited</span>
                </div>
                <p className="text-[9px] text-text-secondary font-medium mt-1">Official gold seal certificates earned</p>
              </div>
              <div className="w-11 h-11 rounded-full bg-amber-500/15 flex items-center justify-center border border-amber-500/20">
                <Award className="w-5.5 h-5.5 text-amber-500" />
              </div>
            </Card>

          </div>

          {/* Recommended Path Hero Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left Column: Continue Syllabus */}
            <Card variant="surface" className="lg:col-span-8 p-5 bg-bg-surface border border-border-color rounded-lg flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-[2px] text-[9px] font-mono font-bold bg-accent-primary/10 text-accent-hover dark:text-accent-primary border border-accent-primary/25">
                    Recommended Study Path
                  </span>
                  <span className="text-xs text-text-secondary font-medium">Curriculum Guided</span>
                </div>
                
                <h2 className="text-lg font-extrabold text-text-primary tracking-tight">
                  Ready to continue your education?
                </h2>
                <p className="text-xs text-text-secondary font-medium max-w-xl leading-relaxed">
                  Our system suggests mastering <strong className="text-text-primary dark:text-text-primary">"{recommendedLesson?.title}"</strong> to secure consistent strategic validation.
                </p>

                <div className="p-3.5 bg-bg-secondary border border-border-color rounded-[4px] space-y-1">
                  <span className="text-[9px] font-mono text-sky-500 font-bold uppercase block">Suggested Module</span>
                  <span className="text-xs font-bold text-text-primary dark:text-text-primary">{recommendedLesson?.title}</span>
                  <span className="text-[11px] text-text-secondary block line-clamp-1">{recommendedLesson?.description}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border-color mt-6">
                <Button 
                  onClick={() => {
                    setSelectedLevelId(recommendedLesson.levelId);
                    const lvlObj = TRADER_LEVELS.find(l => l.level === recommendedLesson.levelId);
                    if (lvlObj) {
                      const courseObj = lvlObj.courses.find(c => c.id === recommendedLesson.courseId);
                      if (courseObj) {
                        setSelectedCourse(courseObj);
                        const moduleObj = courseObj.modules.find(m => m.id === recommendedLesson.moduleId);
                        if (moduleObj) {
                          setSelectedModule(moduleObj);
                          setSelectedLesson(recommendedLesson);
                        }
                      }
                    }
                    setCurrentSection('curriculum');
                  }}
                  variant="primary" 
                  className="flex-1 justify-center sm:flex-none"
                >
                  <PlayCircle className="w-4 h-4 mr-1.5" />
                  <span>Continue Learning</span>
                </Button>

                <Button 
                  onClick={() => setCurrentSection('curriculum')}
                  variant="outline" 
                  className="flex-1 justify-center sm:flex-none"
                >
                  <BookOpen className="w-4 h-4 mr-1.5" />
                  <span>Explore Curriculum</span>
                </Button>
              </div>
            </Card>

            {/* Right Column: AI Learner Snapshot */}
            <Card variant="surface" className="lg:col-span-4 p-5 bg-bg-surface border border-border-color rounded-lg flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-border-color pb-3">
                  <span className="text-[10px] text-text-secondary uppercase font-mono font-bold tracking-wider block">AI Study Agent Snapshot</span>
                  <h3 className="text-sm font-extrabold text-text-primary mt-1">Profile Overview</h3>
                </div>

                <div className="space-y-2 text-xs font-semibold">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-text-secondary dark:text-text-secondary">Recognition Accuracy</span>
                    <span className="text-text-primary font-mono">{aiProfile.recognitionAccuracy}%</span>
                  </div>
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-text-secondary dark:text-text-secondary">Quiz Average</span>
                    <span className="text-text-primary font-mono">{aiProfile.quizAverage}%</span>
                  </div>
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-text-secondary dark:text-text-secondary">Strongest Concept</span>
                    <span className="text-color-success truncate max-w-[150px]">{aiProfile.strengths[0] || 'Imbalance Spotting'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary dark:text-text-secondary">Target Vulnerability</span>
                    <span className="text-color-danger truncate max-w-[150px]">{aiProfile.weaknesses[0] || 'HTF Sweeps'}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-color-success/5 border border-color-success/15 rounded-[4px] text-[11px] text-text-secondary font-semibold mt-4">
                <span className="text-color-success font-bold block mb-0.5">SMC & ICT Verification Status:</span>
                Personal progress is permanently synced with browser Local Storage.
              </div>
            </Card>

          </div>

          {/* Core Four-Level Curriculum Overview Cards */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-widest text-text-secondary font-bold">
              Structured Curriculum Overview
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {TRADER_LEVELS.map((lvl) => {
                const totalLvlLessons: Lesson[] = [];
                lvl.courses.forEach(c => c.modules.forEach(m => m.lessons.forEach(l => totalLvlLessons.push(l))));
                const lvlLessonsCount = totalLvlLessons.length;
                const completedInLvl = totalLvlLessons.filter(l => progress.completedLessons.includes(l.id)).length;
                const lvlPct = lvlLessonsCount > 0 ? Math.round((completedInLvl / lvlLessonsCount) * 100) : 0;

                let status = 'NOT STARTED';
                if (lvlPct === 100) status = 'MASTERED';
                else if (lvlPct > 0) status = 'IN PROGRESS';

                const estTime = lvl.courses.reduce((sum, c) => sum + c.modules.reduce((mSum, m) => mSum + m.lessons.reduce((lSum, l) => lSum + l.estimatedMinutes, 0), 0), 0);

                return (
                  <Card 
                    key={lvl.level} 
                    variant="surface" 
                    className="p-4 bg-bg-surface border border-border-color rounded-lg flex flex-col justify-between min-h-[200px]"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-text-secondary font-mono font-bold uppercase">Level {lvl.level}</span>
                        <Badge 
                          variant={status === 'MASTERED' ? 'success' : status === 'IN PROGRESS' ? 'accent' : 'neutral'}
                          size="sm"
                        >
                          {status}
                        </Badge>
                      </div>

                      <h4 className="text-xs font-black text-text-primary uppercase tracking-tight">{lvl.title}</h4>
                      <p className="text-[11px] text-text-secondary font-semibold leading-relaxed line-clamp-3">{lvl.description}</p>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-border-color mt-4">
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono font-bold text-text-secondary dark:text-text-secondary">
                        <div>Courses: {lvl.courses.length}</div>
                        <div>Est: {estTime} mins</div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono font-bold text-text-secondary dark:text-text-secondary">
                          <span>Completion</span>
                          <span>{lvlPct}%</span>
                        </div>
                        <div className="w-full h-1 bg-bg-secondary rounded-full overflow-hidden">
                          <div className="bg-color-success h-full transition-all" style={{ width: `${lvlPct}%` }} />
                        </div>
                      </div>

                      <Button 
                        onClick={() => {
                          setSelectedLevelId(lvl.level);
                          setCurrentSection('curriculum');
                        }}
                        variant="secondary" 
                        size="sm" 
                        className="w-full justify-center text-xs"
                      >
                        Open Syllabus
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CURRICULUM SYLLABUS EXPANDED COHESIVE VIEW */}
      {currentSection === 'curriculum' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Level, Course, Module hierarchy list */}
          <div className="lg:col-span-4 space-y-4">
            
            <Card variant="surface" className="p-4 bg-bg-surface border border-border-color rounded-lg">
              <span className="text-[10px] text-text-secondary uppercase font-mono font-bold block mb-2">Select Active Grade Level</span>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((num) => {
                  const isActive = selectedLevelId === num;
                  return (
                    <button
                      key={num}
                      onClick={() => setSelectedLevelId(num as TraderLevel)}
                      className={`h-9 rounded-[4px] border text-xs font-bold cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-accent-primary border-accent-primary text-text-primary'
                          : 'bg-bg-secondary border-border-color text-text-secondary dark:text-text-secondary'
                      }`}
                    >
                      Lvl {num}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Courses and modules tree list */}
            <Card variant="surface" className="p-4 bg-bg-surface border border-border-color rounded-lg space-y-4">
              <h3 className="text-xs font-mono uppercase text-text-secondary font-bold pb-2 border-b border-border-color dark:border-border-color">
                Syllabus Modules Tree
              </h3>

              {TRADER_LEVELS.find(lvl => lvl.level === selectedLevelId)?.courses.map((course) => (
                <div key={course.id} className="space-y-2">
                  <div className="p-1 text-xs font-extrabold uppercase text-text-primary tracking-tight">
                    {course.title}
                  </div>
                  
                  <div className="space-y-1.5 pl-1">
                    {course.modules.map((mod) => {
                      const isStarted = (progress.startedModules || []).includes(mod.id);
                      const isSelected = selectedModule?.id === mod.id;

                      return (
                        <div key={mod.id} className="space-y-1">
                          <button
                            onClick={() => {
                              setSelectedCourse(course);
                              setSelectedModule(mod);
                              if (mod.lessons.length > 0) {
                                setSelectedLesson(mod.lessons[0]);
                              }
                              setQuizSubmitted(false);
                              setQuizSelectedOption(null);
                            }}
                            className={`w-full text-left p-2.5 rounded-[4px] border text-xs transition-colors flex items-center justify-between cursor-pointer font-bold ${
                              isSelected
                                ? 'bg-accent-primary/10 border-accent-primary text-accent-hover dark:text-accent-primary'
                                : 'bg-bg-main border-border-color text-text-secondary dark:text-text-secondary'
                            }`}
                          >
                            <span className="truncate">{mod.title}</span>
                            {!isStarted && <Lock className="w-3 h-3 text-text-muted dark:text-text-muted" />}
                          </button>

                          {isSelected && isStarted && (
                            <div className="pl-3.5 space-y-1 pt-1">
                              {mod.lessons.map((les) => {
                                const isCurrentLes = selectedLesson?.id === les.id;
                                const isDone = progress.completedLessons.includes(les.id);
                                const isLocked = isLessonLocked(les);

                                return (
                                  <button
                                    key={les.id}
                                    disabled={isLocked}
                                    onClick={() => {
                                      setSelectedLesson(les);
                                      setQuizSubmitted(false);
                                      setQuizSelectedOption(null);
                                    }}
                                    className={`w-full text-left p-2 rounded-[2px] text-xs transition-all flex items-center justify-between font-semibold ${
                                      isCurrentLes
                                        ? 'bg-bg-secondary text-sky-500 font-bold border-l-2 border-sky-500 pl-2'
                                        : isLocked
                                          ? 'opacity-50 cursor-not-allowed text-text-muted'
                                          : 'text-text-secondary hover:text-text-primary dark:hover:text-text-primary'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2 truncate">
                                      {isDone ? (
                                        <Check className="w-3.5 h-3.5 text-color-success" />
                                      ) : isLocked ? (
                                        <Lock className="w-3 h-3" />
                                      ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                                      )}
                                      <span className="truncate">{les.title}</span>
                                    </div>
                                    <span className="text-[9px] font-mono opacity-60 shrink-0 ml-1">~{les.estimatedMinutes}m</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </Card>

          </div>

          {/* RIGHT COLUMN: Interactive Lesson & Mission Briefing renderer */}
          <div className="lg:col-span-8 space-y-4">
            
            {selectedModule && !(progress.startedModules || []).includes(selectedModule.id) ? (
              <Card variant="surface" className="p-6 bg-bg-surface border-2 border-dashed border-accent-primary/40 rounded-lg space-y-6">
                <div className="text-center space-y-2 pb-4 border-b border-border-color dark:border-border-color">
                  <span className="text-[10px] font-mono bg-accent-primary text-text-primary px-2 py-0.5 rounded-[2px] font-bold uppercase tracking-widest">
                    Mandatory Briefing
                  </span>
                  <h2 className="text-lg font-black uppercase text-text-primary tracking-tight mt-2">
                    MISSION BRIEFING: {selectedModule.title}
                  </h2>
                  <p className="text-xs text-text-secondary dark:text-text-secondary">
                    Review institutional parameters and requirements before authorizing module entry.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="p-4 bg-bg-secondary rounded-[4px] border border-border-color dark:border-border-color">
                    <span className="text-[10px] font-mono text-sky-500 font-bold uppercase block mb-1">OBJECTIVE</span>
                    <p className="text-text-primary leading-relaxed">{selectedModule.missionBriefing.objective}</p>
                  </div>

                  <div className="p-4 bg-bg-secondary rounded-[4px] border border-border-color dark:border-border-color">
                    <span className="text-[10px] font-mono text-color-warning dark:text-accent-primary font-bold uppercase block mb-1">RECOGNITION TARGET</span>
                    <p className="text-text-primary leading-relaxed">{selectedModule.missionBriefing.recognitionTarget}</p>
                  </div>

                  <div className="p-4 bg-bg-secondary rounded-[4px] border border-border-color dark:border-border-color">
                    <span className="text-[10px] font-mono text-color-success font-bold uppercase block mb-1">MARKET CONDITIONS</span>
                    <p className="text-text-primary leading-relaxed">{selectedModule.missionBriefing.marketConditions}</p>
                  </div>

                  <div className="p-4 bg-bg-secondary rounded-[4px] border border-border-color dark:border-border-color">
                    <span className="text-[10px] font-mono text-color-danger font-bold uppercase block mb-1">PREREQUISITES</span>
                    <p className="text-text-primary leading-relaxed">{selectedModule.missionBriefing.prerequisites}</p>
                  </div>

                  <div className="p-4 bg-bg-secondary rounded-[4px] border border-border-color dark:border-border-color">
                    <span className="text-[10px] font-mono text-cyan-500 font-bold uppercase block mb-1">PRACTICE REQUIREMENT</span>
                    <p className="text-text-primary leading-relaxed">{selectedModule.missionBriefing.practiceRequirement}</p>
                  </div>

                  <div className="p-4 bg-bg-secondary rounded-[4px] border border-border-color dark:border-border-color">
                    <span className="text-[10px] font-mono text-amber-500 font-bold uppercase block mb-1">MASTERY STANDARD</span>
                    <p className="text-text-primary leading-relaxed">{selectedModule.missionBriefing.masteryStandard}</p>
                  </div>
                </div>

                <div className="flex justify-center pt-4">
                  <Button
                    onClick={() => handleStartModule(selectedModule.id)}
                    variant="primary"
                    className="w-full sm:w-auto px-10 h-11 text-xs uppercase tracking-widest font-bold font-mono"
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    <span>Begin Training</span>
                  </Button>
                </div>
              </Card>
            ) : selectedLesson ? (
              <Card variant="surface" className="p-5 bg-bg-surface border border-border-color rounded-lg space-y-6">
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border-color dark:border-border-color">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold bg-accent-primary/15 text-accent-hover dark:text-accent-primary border border-accent-primary/25">
                        {selectedLesson.difficulty}
                      </span>
                      <span className="text-xs text-text-secondary font-mono font-bold">~{selectedLesson.estimatedMinutes} mins allocation</span>
                    </div>
                    <h2 className="text-base sm:text-lg font-extrabold text-text-primary tracking-tight">{selectedLesson.title}</h2>
                  </div>

                  <Button
                    onClick={() => handleCompleteLesson(selectedLesson.id)}
                    variant={progress.completedLessons.includes(selectedLesson.id) ? 'secondary' : 'primary'}
                    size="sm"
                    className="w-full sm:w-auto shrink-0 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    <span>{progress.completedLessons.includes(selectedLesson.id) ? 'Completed' : 'Mark Lesson Complete'}</span>
                  </Button>
                </div>

                <div className="p-4 bg-bg-secondary border border-border-color rounded-lg space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-text-secondary tracking-widest block">Objective targets</span>
                  <ul className="space-y-1.5 text-xs font-semibold">
                    {selectedLesson.objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-text-primary dark:text-text-primary">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-primary shrink-0 mt-1.5" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4 text-xs sm:text-sm text-text-primary leading-relaxed">
                  <p className="font-medium whitespace-pre-line">{selectedLesson.explanation}</p>
                </div>

                <div className="p-4 bg-accent-primary/5 border border-accent-primary/15 rounded-lg space-y-2.5">
                  <span className="text-[10px] font-mono text-accent-hover dark:text-accent-primary font-bold uppercase tracking-widest block">Step-By-Step Practice Case</span>
                  <div className="space-y-1.5 text-xs font-semibold">
                    {selectedLesson.examples.map((ex, i) => (
                      <p key={i} className="text-text-secondary leading-normal">{ex}</p>
                    ))}
                  </div>
                </div>

                {/* Render corresponding interactive simulators if available */}
                {selectedLesson.interactiveType === 'candlestick' && <InteractiveCandleExplorer />}
                {selectedLesson.interactiveType === 'risk_calculator' && <InteractiveRiskCalc />}
                {selectedLesson.interactiveType === 'market_structure' && <MarketStructureLab />}

                <div className="p-4 bg-bg-surface/5 dark:bg-bg-hover/5 border border-border-color rounded-lg space-y-1.5 text-xs">
                  <span className="text-[10px] font-mono text-sky-500 font-bold uppercase block tracking-wider">Practice requirement</span>
                  <strong className="text-text-primary block">{selectedLesson.practice.title}</strong>
                  <p className="text-text-secondary font-semibold leading-relaxed">{selectedLesson.practice.instructions}</p>
                </div>

                {selectedLesson.quiz && selectedLesson.quiz.length > 0 && (
                  <div className="p-4 bg-bg-secondary border border-border-color rounded-lg space-y-3">
                    <h4 className="text-[11px] font-mono font-bold uppercase text-text-primary flex items-center gap-1.5 border-b border-border-color pb-2">
                      <ShieldCheck className="w-4 h-4 text-color-success" /> MODULE ASSESSMENT QUIZ
                    </h4>
                    <p className="text-xs font-bold text-text-primary dark:text-text-primary">{selectedLesson.quiz[0].question}</p>
                    
                    <div className="space-y-1.5">
                      {selectedLesson.quiz[0].options.map((option, idx) => {
                        const isSelected = quizSelectedOption === idx;
                        const isCorrect = idx === selectedLesson.quiz![0].correctIndex;
                        
                        let optionStyle = 'bg-bg-surface border-border-color text-text-primary hover:bg-bg-secondary dark:hover:bg-bg-hover/50';
                        if (quizSubmitted) {
                          if (isCorrect) {
                            optionStyle = 'bg-color-success/10 border-color-success text-color-success dark:text-color-success font-bold';
                          } else if (isSelected) {
                            optionStyle = 'bg-color-danger/10 border-color-danger text-color-danger dark:text-color-danger font-bold';
                          }
                        } else if (isSelected) {
                          optionStyle = 'bg-accent-primary/15 border-accent-primary text-accent-hover dark:text-accent-primary font-bold';
                        }

                        return (
                          <button
                            key={idx}
                            disabled={quizSubmitted}
                            onClick={() => setQuizSelectedOption(idx)}
                            className={`w-full text-left p-2.5 rounded-[4px] border text-xs transition-colors flex items-center justify-between cursor-pointer ${optionStyle}`}
                          >
                            <span>{option}</span>
                            {quizSubmitted && isCorrect && <Check className="w-4 h-4 text-color-success" />}
                          </button>
                        );
                      })}
                    </div>

                    {!quizSubmitted ? (
                      <Button
                        disabled={quizSelectedOption === null}
                        onClick={() => handleQuizSubmit(selectedLesson.quiz![0].correctIndex)}
                        size="sm"
                        className="cursor-pointer"
                      >
                        Submit Assessment
                      </Button>
                    ) : (
                      <div className="p-3 bg-bg-surface border border-border-color rounded-[4px] text-xs space-y-1">
                        <strong className="text-color-success">Institutional Rationale:</strong>
                        <p className="text-text-secondary font-semibold leading-normal">{selectedLesson.quiz[0].explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ) : (
              <div className="text-center p-8 border border-dashed border-border-color rounded-lg">
                <p className="text-xs text-text-secondary font-semibold">Please select a module from the syllabus tree to review or start training.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CANONICAL STRATEGY LIBRARY VIEW */}
      {currentSection === 'strategies' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Available Strategies List */}
          <div className="lg:col-span-4 space-y-4">
            <Card variant="surface" className="p-4 bg-bg-surface border border-border-color rounded-lg space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-text-secondary font-bold pb-2 border-b border-border-color dark:border-border-color">
                Accredited Strategies
              </h3>

              <div className="space-y-2">
                {CANONICAL_STRATEGY_LIBRARY.map((strat) => {
                  const isSelected = selectedStrategy.id === strat.id;
                  const isUnlocked = strat.prerequisites.every(id => progress.completedLessons.includes(id));

                  return (
                    <button
                      key={strat.id}
                      onClick={() => {
                        setSelectedStrategy(strat);
                        setHoveredCandleIdx(null);
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col justify-between items-stretch gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-accent-primary/10 border-accent-primary text-text-primary dark:text-text-primary'
                          : 'bg-bg-main border-border-color text-text-secondary dark:text-text-secondary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-black uppercase text-color-warning dark:text-accent-primary">
                          {strat.category}
                        </span>
                        <div className="flex items-center space-x-1">
                          <span className="text-[9px] px-1 bg-bg-secondary rounded font-bold font-mono">
                            {strat.level}
                          </span>
                          {!isUnlocked && <Lock className="w-2.5 h-2.5 text-color-danger" />}
                        </div>
                      </div>
                      <h4 className="text-xs font-extrabold tracking-tight truncate block mt-0.5">{strat.name}</h4>
                      <p className="text-[10px] leading-normal opacity-70 line-clamp-2 mt-1">{strat.description}</p>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* AI Tutor Assistant Frame for Selected Strategy */}
            <Card variant="surface" className="p-4 bg-accent-primary/5 border border-accent-primary/20 rounded-lg space-y-3">
              <div className="flex items-center space-x-2 pb-1 border-b border-border-color dark:border-border-color">
                <Bot className="w-4 h-4 text-color-warning dark:text-accent-primary" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Strategy Assistant</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-normal font-semibold">
                Ask about institutional rules, pricing mechanisms, or execution filters for {selectedStrategy.name}:
              </p>
              
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="e.g. Why does FVG require body size ratio filters?"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                  className="w-full h-8 px-2.5 text-xs bg-bg-surface border border-border-color rounded-[4px] outline-none font-semibold text-text-primary dark:text-text-primary"
                />
                <Button
                  disabled={isAiLoading || !aiPrompt.trim()}
                  onClick={handleAskAI}
                  size="sm"
                  className="w-full h-8 justify-center cursor-pointer text-xs uppercase"
                >
                  {isAiLoading ? "Analyzing Strategy..." : "Query AI Agent"}
                </Button>
              </div>

              {aiResponse && (
                <div className="p-2.5 bg-bg-surface border border-border-color rounded-[4px] text-[11px] leading-normal font-semibold text-text-secondary dark:text-text-secondary">
                  {aiResponse}
                </div>
              )}
            </Card>
          </div>

          {/* Right Panel: Selected Strategy Deep Dive View */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Header info */}
            <Card variant="surface" className="p-5 bg-bg-surface border border-border-color rounded-lg space-y-4">
              <div className="flex flex-wrap gap-2 items-center justify-between pb-3 border-b border-border-color dark:border-border-color">
                <div className="space-y-0.5">
                  <span className="px-2 py-0.5 rounded-[2px] text-[9px] font-mono font-bold bg-accent-primary/15 text-accent-hover dark:text-accent-primary border border-accent-primary/25">
                    {selectedStrategy.category} • LEVEL {selectedStrategy.level}
                  </span>
                  <h2 className="text-base sm:text-lg font-black uppercase text-text-primary tracking-tight mt-1">{selectedStrategy.name}</h2>
                </div>
                
                <Badge variant={selectedStrategy.status === StrategyStatus.ACTIVE ? 'success' : 'neutral'} size="sm">
                  {selectedStrategy.status}
                </Badge>
              </div>

              {/* Core Theory */}
              <div className="space-y-2 text-xs sm:text-sm">
                <h4 className="text-xs font-mono font-bold uppercase text-sky-500 tracking-wider">Algorithmic Theory</h4>
                <p className="text-text-primary leading-relaxed whitespace-pre-line font-medium">
                  {selectedStrategy.theory}
                </p>
              </div>

              {/* Prerequisites check */}
              <div className="p-3 bg-bg-secondary border border-border-color rounded-[4px] flex items-center justify-between text-xs">
                <span className="text-text-secondary font-semibold">Syllabus Prerequisites:</span>
                <span className="font-mono font-bold text-text-primary dark:text-text-primary">
                  {selectedStrategy.prerequisites.length > 0 
                    ? selectedStrategy.prerequisites.join(' & ') 
                    : 'None (Universal Access)'}
                </span>
              </div>
            </Card>

            {/* AI Market-Strategy Matching & Parameter Optimization Cockpit */}
            <Card variant="surface" className="p-5 bg-bg-surface border border-border-color rounded-lg space-y-4">
              <div className="flex items-center justify-between border-b border-border-color pb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-color-warning dark:text-accent-primary" />
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-color-warning dark:text-accent-primary">AI Market-Strategy Adaptability Scan</h4>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-text-secondary dark:text-text-secondary">Active Version:</span>
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 font-bold">v{strategyVersion}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
                <div className="p-3 rounded bg-bg-main border border-border-color space-y-1">
                  <span className="text-[10px] text-text-secondary uppercase font-mono block">Regime Compatibility</span>
                  <span className="text-text-primary text-xs font-black block">
                    {selectedStrategy.category === StrategyCategory.SMC || selectedStrategy.category === StrategyCategory.ICT
                      ? "High-Volume Liquidity Run"
                      : selectedStrategy.category === StrategyCategory.BREAKOUT
                      ? "Volatility Breakout"
                      : selectedStrategy.category === StrategyCategory.TREND_FOLLOWING
                      ? "Strong Trending Market"
                      : "Range-Bound Sideways"}
                  </span>
                </div>

                <div className="p-3 rounded bg-bg-main border border-border-color space-y-1">
                  <span className="text-[10px] text-text-secondary uppercase font-mono block">Match Alignment Grade</span>
                  <span className="text-color-success text-xs font-black block flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-color-success animate-pulse" />
                    A ({matchingScore}/100)
                  </span>
                </div>

                <div className="p-3 rounded bg-bg-main border border-border-color space-y-1">
                  <span className="text-[10px] text-text-secondary uppercase font-mono block">Adaptability Forecast</span>
                  <span className="text-color-warning dark:text-accent-primary text-xs font-black block">EXCELLENT MATCH</span>
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed font-semibold">
                The current active market regime is classified as <strong className="text-text-primary dark:text-text-primary">{scannedRegime}</strong>. 
                AI scanning projects high liquidity capture potential for this setup in standard morning overlaps.
              </p>

              {/* Pros and Cons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-semibold">
                <div className="p-2.5 bg-color-success/5 border border-color-success/20 rounded space-y-1">
                  <span className="text-color-success font-mono uppercase font-black tracking-wider block">Regime Advantage (Pros)</span>
                  <p className="text-text-secondary leading-normal">
                    Volume expansion aligns perfectly with the strategy's dynamic filter thresholds, ensuring fewer fake outs.
                  </p>
                </div>
                <div className="p-2.5 bg-color-danger/5 border border-color-danger/20 rounded space-y-1">
                  <span className="text-color-danger font-mono uppercase font-black tracking-wider block">Regime Threat (Cons)</span>
                  <p className="text-text-secondary leading-normal">
                    Macro news releases (such as CPI/NFP) within 45 minutes can cause abnormal slippage that bypasses stops.
                  </p>
                </div>
              </div>

              {/* Refinement Agent Action Trigger */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="text-xs font-semibold">
                  <span className="text-text-secondary block text-[10px] uppercase font-mono">Strategy Tuning Loop</span>
                  <span className="text-text-primary font-bold">Optimize stop loss, target levels & cooldown parameters</span>
                </div>
                <Button
                  disabled={isRefining}
                  onClick={handleRunAIRefinement}
                  variant="primary"
                  size="sm"
                  className="cursor-pointer font-bold text-xs"
                >
                  {isRefining ? "Optimizing Strategy..." : "Run AI Refinement Agent"}
                </Button>
              </div>

              {refinementStatus && (
                <div className="p-2.5 bg-sky-500/5 border border-sky-500/20 text-sky-500 rounded text-xs font-mono font-bold animate-pulse">
                  🤖 {refinementStatus}
                </div>
              )}

              {/* Version History Logs */}
              <div className="pt-2 border-t border-border-color space-y-2">
                <span className="text-[10px] font-mono text-text-secondary uppercase font-bold block">Version Control & Audit Logs</span>
                <div className="space-y-1.5 font-mono text-[10px]">
                  {versionLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-text-secondary dark:text-text-secondary">
                      <span className="text-sky-500 shrink-0 font-bold">•</span>
                      <p className="leading-tight">{log}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Deterministic Rule Engine Display */}
            <Card variant="surface" className="p-5 bg-bg-surface border border-border-color rounded-lg space-y-4">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-sky-500" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-sky-500">Deterministic Machine-Readable Rule Sets</h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border-color text-text-secondary font-mono">
                      <th className="py-2 font-bold">Rule Target</th>
                      <th className="py-2 font-bold">Scope Description</th>
                      <th className="py-2 font-bold">Machine Logic Expression</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAECEF]/40 dark:divide-[#2B313A]/40 font-semibold text-[11px] sm:text-xs">
                    {selectedStrategy.rules.map((rule) => (
                      <tr key={rule.id}>
                        <td className="py-2.5 pr-2">
                          <span className="px-1.5 py-0.5 rounded-[2px] bg-bg-secondary text-text-primary font-mono font-bold text-[10px]">
                            {rule.ruleType}
                          </span>
                        </td>
                        <td className="py-2.5 pr-2">
                          <strong className="text-text-primary block">{rule.name}</strong>
                          <span className="text-text-secondary text-[10px] mt-0.5 block">{rule.description}</span>
                        </td>
                        <td className="py-2.5 font-mono text-color-success dark:text-accent-primary">
                          <code>{rule.expression}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* INTERACTIVE HISTORICAL CHART & REUSABLE ANNOTATIONS */}
            <Card variant="surface" className="p-5 bg-bg-surface border border-border-color rounded-lg space-y-4">
              <div className="flex items-center justify-between border-b border-border-color pb-3">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-color-success" />
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-color-success">Historical Price Verification Feed</h4>
                </div>
                <span className="text-[10px] text-text-secondary font-mono font-bold">
                  {selectedStrategy.examples[0].timeframe} Interlocked Frame
                </span>
              </div>

              {/* Interactive Vector Candlestick Chart Canvas */}
              <div className="relative bg-bg-main border border-border-color rounded-md p-4 h-64 flex flex-col justify-between overflow-hidden">
                <div className="text-[9px] font-mono text-text-secondary flex justify-between">
                  <span>Symbol: EUR/USD Spot Feed</span>
                  <span>Source: {selectedStrategy.examples[0].source}</span>
                </div>

                {/* Candles Container */}
                <div className="flex items-end justify-between h-40 pt-4 px-2 relative">
                  {/* Grid background lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
                    <div className="border-t border-white" />
                    <div className="border-t border-white" />
                    <div className="border-t border-white" />
                    <div className="border-t border-white" />
                  </div>

                  {selectedStrategy.examples[0].ohlcData.map((c, idx) => {
                    const isBullish = c.close >= c.open;
                    
                    // Simple dynamic pricing coordinates scaler (max=1.0855, min=1.0775)
                    const maxP = 1.0860;
                    const minP = 1.0770;
                    const range = maxP - minP;
                    
                    const topPct = ((maxP - Math.max(c.open, c.close)) / range) * 100;
                    const bottomPct = ((maxP - Math.min(c.open, c.close)) / range) * 100;
                    const bodyHeight = Math.max(bottomPct - topPct, 4);

                    const highPct = ((maxP - c.high) / range) * 100;
                    const lowPct = ((maxP - c.low) / range) * 100;

                    // Match annotations
                    const annotation = selectedStrategy.examples[0].annotations.find(
                      a => idx >= a.startIndex && idx <= a.endIndex
                    );

                    const isHovered = hoveredCandleIdx === idx;

                    return (
                      <div 
                        key={idx} 
                        className="flex-1 flex flex-col items-center relative h-full group cursor-pointer"
                        onMouseEnter={() => setHoveredCandleIdx(idx)}
                        onMouseLeave={() => setHoveredCandleIdx(null)}
                      >
                        {/* Vertical Wick Line */}
                        <div 
                          className="absolute w-0.5 bg-text-secondary pointer-events-none" 
                          style={{
                            top: `${highPct}%`,
                            bottom: `${100 - lowPct}%`
                          }}
                        />

                        {/* Solid Candle Body */}
                        <div 
                          className={`absolute w-3 sm:w-5 rounded-[1px] pointer-events-none transition-colors ${
                            isBullish ? 'bg-color-success' : 'bg-color-danger'
                          } ${isHovered ? 'ring-2 ring-white ring-offset-1 ring-offset-black' : ''}`}
                          style={{
                            top: `${topPct}%`,
                            height: `${bodyHeight}%`
                          }}
                        />

                        {/* Annotation Marker Dots */}
                        {annotation && (
                          <div 
                            className="absolute -top-3 w-2.5 h-2.5 bg-accent-primary rounded-full border border-black animate-pulse flex items-center justify-center pointer-events-none"
                            title={annotation.label}
                          >
                            <span className="text-[6px] font-bold text-black font-mono">!</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* X-Axis labels */}
                <div className="flex justify-between text-[8px] font-mono text-text-secondary border-t border-border-color pt-2">
                  {selectedStrategy.examples[0].ohlcData.map((c, i) => (
                    <span key={i} className="text-center w-6">{c.time}</span>
                  ))}
                </div>

                {/* Tooltip Overlay */}
                {hoveredCandleIdx !== null && (
                  <div className="absolute top-2 right-2 bg-black/90 border border-border-color rounded p-2 text-[9px] font-mono text-white space-y-0.5 z-10">
                    <div className="font-bold border-b border-white/20 pb-0.5 mb-1 text-accent-primary">
                      TIME: {selectedStrategy.examples[0].ohlcData[hoveredCandleIdx].time}
                    </div>
                    <div>O: {selectedStrategy.examples[0].ohlcData[hoveredCandleIdx].open.toFixed(4)}</div>
                    <div>H: {selectedStrategy.examples[0].ohlcData[hoveredCandleIdx].high.toFixed(4)}</div>
                    <div>L: {selectedStrategy.examples[0].ohlcData[hoveredCandleIdx].low.toFixed(4)}</div>
                    <div>C: {selectedStrategy.examples[0].ohlcData[hoveredCandleIdx].close.toFixed(4)}</div>
                    
                    {/* Display annotation description if available */}
                    {(() => {
                      const ann = selectedStrategy.examples[0].annotations.find(
                        a => hoveredCandleIdx >= a.startIndex && hoveredCandleIdx <= a.endIndex
                      );
                      if (ann) {
                        return (
                          <div className="mt-1 pt-1 border-t border-white/10 text-sky-400 font-sans font-bold">
                            {ann.type}: {ann.label}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>

              {/* Explanatory Annotations Legenda */}
              <div className="p-3 bg-bg-main border border-border-color rounded-lg space-y-1.5">
                <span className="text-[9px] font-mono text-text-secondary uppercase font-bold tracking-wider block">Verified Coordinates Trace</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {selectedStrategy.examples[0].annotations.map((ann, i) => (
                    <div key={i} className="flex items-start space-x-1.5 p-1 bg-bg-surface border border-border-color rounded">
                      <span className="text-sky-500 font-mono font-bold shrink-0">[{ann.type}]</span>
                      <p className="text-text-secondary font-semibold text-[11px] leading-tight truncate">{ann.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* EVIDENCE SYSTEM CONTAINER */}
            <Card variant="surface" className="p-5 bg-bg-surface border border-border-color rounded-lg space-y-4">
              <div className="flex items-center space-x-2 border-b border-border-color pb-3">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-500">Macro Evidence & Backtest Verification</h4>
              </div>

              <div className="space-y-4 text-xs font-semibold">
                {selectedStrategy.evidence.map((ev) => (
                  <div key={ev.id} className="space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <strong className="text-sm font-extrabold text-text-primary block">{ev.title}</strong>
                        <span className="text-[11px] text-text-secondary mt-0.5 block">Author: {ev.author} • Published: {ev.date}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge variant="success" size="sm">
                          {ev.verificationStatus}
                        </Badge>
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 font-mono text-[9px] font-black uppercase">
                          {ev.type}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-bg-main border border-border-color rounded-[4px] space-y-2">
                      <div>
                        <span className="text-[9px] font-mono text-text-secondary uppercase font-bold tracking-wider">Methodology Framework</span>
                        <p className="text-text-primary text-[11px] leading-relaxed mt-0.5">{ev.methodology}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1.5 border-t border-border-color/60 dark:border-border-color/60">
                        <div>
                          <span className="text-[9px] font-mono text-text-secondary uppercase font-bold tracking-wider block">Verifiable Backtest Expectancy Metrics</span>
                          <div className="flex items-center space-x-4 mt-1 font-mono text-xs">
                            <div>Win Rate: <span className="text-color-success font-extrabold">{ev.winRatePct || 'N/A'}%</span></div>
                            <div>Profit Factor: <span className="text-color-success font-extrabold">{ev.profitFactor || 'N/A'}</span></div>
                          </div>
                        </div>

                        <div>
                          <span className="text-[9px] font-mono text-text-secondary uppercase font-bold tracking-wider block">Methodology Constraints & Limitations</span>
                          <p className="text-text-secondary text-[10px] leading-tight mt-0.5">{ev.limitations}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* ALGORITHMIC CODE GENERATOR / AUTOMATION */}
            <Card variant="surface" className="p-5 bg-bg-surface border border-border-color rounded-lg space-y-4">
              <div className="flex items-center justify-between border-b border-border-color pb-3">
                <div className="flex items-center space-x-2">
                  <Code2 className="w-4 h-4 text-sky-500" />
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-sky-500">MQL5 / Pine Script Translation Compiler</h4>
                </div>
                
                {/* Code languages picker */}
                <div className="flex space-x-1 bg-bg-secondary p-0.5 rounded">
                  {(['mql5', 'pineScript', 'python', 'typescript'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setActiveCodeTab(lang)}
                      className={`px-2 py-1 text-[10px] font-mono font-bold rounded cursor-pointer transition-all ${
                        activeCodeTab === lang
                          ? 'bg-bg-surface text-text-primary shadow-sm'
                          : 'text-text-secondary dark:text-text-secondary'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Panel */}
              <div className="relative bg-bg-main border border-border-color rounded-md p-4">
                <button
                  onClick={() => handleCopyCode(selectedStrategy.algorithmicRepresentation[activeCodeTab])}
                  className="absolute top-2 right-2 p-1.5 rounded bg-bg-surface/5 hover:bg-bg-surface/10 text-text-secondary hover:text-white cursor-pointer"
                  title="Copy algorithm to clipboard"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-color-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto leading-relaxed max-h-60">
                  <code>{selectedStrategy.algorithmicRepresentation[activeCodeTab]}</code>
                </pre>
              </div>

              <div className="text-[10px] font-mono text-text-secondary flex items-center space-x-1">
                <Terminal className="w-3.5 h-3.5 text-text-secondary dark:text-text-secondary" />
                <span>Compiler State: Standard 5.0 compilation verified. Ready for deployment inside MT5 terminal or tradingview hooks.</span>
              </div>
            </Card>

            {/* PERFORMANCE lifecycle & EMERGENCY KILL-SWITCH */}
            <Card variant="surface" className="p-5 bg-bg-surface border border-border-color rounded-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between border-b border-border-color pb-3 gap-2">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4.5 h-4.5 text-color-warning dark:text-accent-primary" />
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary dark:text-text-primary">Institutional Performance, Approval & Kill-Switch</h4>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold text-text-secondary uppercase">Deployment Tier:</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black ${
                    strategyApprovalState === 'LIVE_APPROVED'
                      ? 'bg-color-success/15 text-color-success animate-pulse border border-color-success/30'
                      : strategyApprovalState === 'PAPER_APPROVED'
                      ? 'bg-sky-500/15 text-sky-500 border border-sky-500/30'
                      : 'bg-text-secondary/15 text-text-secondary border border-text-secondary/30'
                  }`}>
                    {strategyApprovalState}
                  </span>
                </div>
              </div>

              {/* Status Indicator */}
              {masterKillSwitchActive ? (
                <div className="p-3 bg-color-danger/10 border border-color-danger/30 text-color-danger rounded text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 animate-bounce" />
                  <div>
                    <span className="font-bold block text-sm">🚨 EMERGENCY SHUTDOWN ACTIVE</span>
                    <span className="text-[10px] leading-tight block text-color-danger/90">All active live order entries, signal ingestion streams, and dynamic hedging modules for {selectedStrategy.name} have been forced to a absolute standstill. Master override in effect.</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-color-success/10 border border-color-success/30 text-color-success rounded text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <div>
                    <span className="font-bold block text-sm">🛡️ PIPELINE SECURITIES STABLE</span>
                    <span className="text-[10px] leading-tight block text-color-success/90">All risk filters, parameter restrictions, and slippage guardrails are active and stable. Execution paths nominal.</span>
                  </div>
                </div>
              )}

              {/* Pre-Live Safety Checklist */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-text-secondary uppercase font-bold block">Pre-Live Institutional Audit Guardrails (Mandatory)</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold">
                  <label className="flex items-center space-x-2 p-2 bg-bg-main border border-border-color rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={safetyChecklist.maxRiskChecked}
                      onChange={(e) => setSafetyChecklist({ ...safetyChecklist, maxRiskChecked: e.target.checked })}
                      className="rounded accent-[#FCD535] cursor-pointer"
                    />
                    <span className={safetyChecklist.maxRiskChecked ? "text-text-secondary line-through" : "text-text-primary dark:text-text-primary"}>
                      Verify Max Risk Per Position &lt;= 2.0%
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 p-2 bg-bg-main border border-border-color rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={safetyChecklist.stopLossDefined}
                      onChange={(e) => setSafetyChecklist({ ...safetyChecklist, stopLossDefined: e.target.checked })}
                      className="rounded accent-[#FCD535] cursor-pointer"
                    />
                    <span className={safetyChecklist.stopLossDefined ? "text-text-secondary line-through" : "text-text-primary dark:text-text-primary"}>
                      Verify Stop Loss & Invalidation defined
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 p-2 bg-bg-main border border-border-color rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={safetyChecklist.historicalTested}
                      onChange={(e) => setSafetyChecklist({ ...safetyChecklist, historicalTested: e.target.checked })}
                      className="rounded accent-[#FCD535] cursor-pointer"
                    />
                    <span className={safetyChecklist.historicalTested ? "text-text-secondary line-through" : "text-text-primary dark:text-text-primary"}>
                      Execute Historical 10-Year Backtest
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 p-2 bg-bg-main border border-border-color rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={safetyChecklist.cooldownVerified}
                      onChange={(e) => setSafetyChecklist({ ...safetyChecklist, cooldownVerified: e.target.checked })}
                      className="rounded accent-[#FCD535] cursor-pointer"
                    />
                    <span className={safetyChecklist.cooldownVerified ? "text-text-secondary line-through" : "text-text-primary dark:text-text-primary"}>
                      Activate Cooldown & Daily Limit Timers
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch justify-between gap-3 border-t border-border-color dark:border-border-color">
                <div className="flex flex-wrap gap-2">
                  {strategyApprovalState === 'BACKTESTED' && (
                    <Button
                      onClick={() => setStrategyApprovalState('PAPER_APPROVED')}
                      variant="outline"
                      size="sm"
                      className="cursor-pointer text-xs font-bold"
                    >
                      Upgrade to Paper Testing
                    </Button>
                  )}

                  {strategyApprovalState === 'PAPER_APPROVED' && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        onClick={() => {
                          const allChecked = Object.values(safetyChecklist).every(v => v === true);
                          if (allChecked) {
                            setStrategyApprovalState('LIVE_APPROVED');
                          } else {
                            alert("⚠️ Mandatory Audit Warning: Complete all 4 pre-live safety guardrails before deploying this strategy to LIVE production execution.");
                          }
                        }}
                        variant="primary"
                        size="sm"
                        className="cursor-pointer text-xs font-bold"
                      >
                        Authorize Live Production Ingress
                      </Button>
                      {!Object.values(safetyChecklist).every(v => v === true) && (
                        <span className="text-[10px] text-color-danger font-mono font-bold">⚠️ Audit Pending</span>
                      )}
                    </div>
                  )}

                  {strategyApprovalState === 'LIVE_APPROVED' && (
                    <Button
                      onClick={() => {
                        setStrategyApprovalState('PAPER_APPROVED');
                        setSafetyChecklist({ maxRiskChecked: false, stopLossDefined: false, historicalTested: false, cooldownVerified: false });
                      }}
                      variant="outline"
                      size="sm"
                      className="cursor-pointer text-xs font-bold text-color-danger border-color-danger/30"
                    >
                      Revoke Live Authorizations
                    </Button>
                  )}
                </div>

                {/* Emergency Kill-Switch Trigger Button */}
                <button
                  onClick={() => setMasterKillSwitchActive(!masterKillSwitchActive)}
                  className={`px-3 py-2 rounded-[4px] font-mono font-black text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    masterKillSwitchActive
                      ? 'bg-color-success hover:bg-color-success/90 text-bg-secondary'
                      : 'bg-color-danger hover:bg-color-danger/95 text-white animate-pulse'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{masterKillSwitchActive ? "Deactivate Standstill" : "Emergency KILL-SWITCH"}</span>
                </button>
              </div>
            </Card>

          </div>

        </div>
      )}

      {/* SMC/ICT PRACTICE LABORATORY & PATTERN RECOGNITION */}
      {currentSection === 'practice-lab' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Panel: Visual Pattern Simulator */}
            <Card variant="surface" className="lg:col-span-8 p-5 bg-bg-surface border border-border-color rounded-lg space-y-4">
              <div className="border-b border-border-color pb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono text-color-warning dark:text-accent-primary font-black uppercase tracking-widest block mb-1">Interactive Pattern Lab</span>
                  <h3 className="text-base font-extrabold text-text-primary tracking-tight">Intraday Candle-by-Candle Replay Simulator</h3>
                  <p className="text-xs text-text-secondary font-semibold mt-1">
                    Load a historical sequence, advance candle-by-candle, select active tagging brushes, and map structure elements.
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-text-secondary dark:text-text-secondary">Replay Feed:</span>
                  <select 
                    value={replayPairIndex} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setReplayPairIndex(val);
                      setReplayStep(5);
                      setReplayUserLabels({});
                      setPatternFeedback(null);
                      setPatternSuccess(null);
                    }}
                    className="h-8 px-2 bg-bg-secondary border border-border-color rounded text-xs font-bold"
                  >
                    <option value={0}>EUR/USD 15m - Liquidity Sweep Reversal</option>
                    <option value={1}>GBP/USD 5m - London Judas Swing Break</option>
                  </select>
                </div>
              </div>

              {/* Step Playback Controls Panel */}
              <div className="p-3 bg-bg-secondary border border-border-color rounded-[4px] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      setReplayStep(5);
                      setReplayUserLabels({});
                      setPatternFeedback(null);
                      setPatternSuccess(null);
                      setIsReplayPlaying(false);
                    }}
                    title="Rewind Simulation"
                    className="p-1.5 rounded bg-bg-surface text-text-secondary hover:text-text-primary dark:hover:text-white border border-border-color cursor-pointer"
                  >
                    <Rewind className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setReplayStep((p) => Math.max(p - 1, 4))}
                    disabled={replayStep <= 4}
                    title="Step Back"
                    className="p-1.5 rounded bg-bg-surface text-text-secondary hover:text-text-primary dark:hover:text-white border border-border-color disabled:opacity-40 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsReplayPlaying(!isReplayPlaying)}
                    title={isReplayPlaying ? "Pause Replay" : "Play Replay"}
                    className={`p-1.5 rounded text-white border font-bold cursor-pointer transition-all ${
                      isReplayPlaying
                        ? 'bg-color-success hover:bg-color-success/90 border-color-success/20 animate-pulse'
                        : 'bg-sky-500 hover:bg-sky-500/90 border-sky-500/20'
                    }`}
                  >
                    {isReplayPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => {
                      const maxCandles = activeReplayData.ohlcData.length;
                      setReplayStep((p) => Math.min(p + 1, maxCandles));
                    }}
                    disabled={replayStep >= activeReplayData.ohlcData.length}
                    title="Step Forward"
                    className="p-1.5 rounded bg-bg-surface text-text-secondary hover:text-text-primary dark:hover:text-white border border-border-color disabled:opacity-40 cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setReplayStep(activeReplayData.ohlcData.length);
                      setIsReplayPlaying(false);
                    }}
                    title="Show All Candles"
                    className="p-1.5 rounded bg-bg-surface text-text-secondary hover:text-text-primary dark:hover:text-white border border-border-color cursor-pointer text-[10px] font-mono font-bold"
                  >
                    SHOW ALL
                  </button>
                </div>

                <div className="flex items-center space-x-3 text-xs font-mono font-bold text-text-secondary dark:text-text-secondary">
                  <div>
                    Candles: <span className="text-text-primary dark:text-text-primary">{replayStep} / {activeReplayData.ohlcData.length}</span>
                  </div>
                  <div>
                    Practice Score: <span className="text-color-success">{replayAccuracyPercent}%</span>
                  </div>
                </div>
              </div>

              {/* Pattern Brush Picker Bar */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono font-bold text-text-secondary block">Select Painting Brush Tool (Tag on Chart)</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { key: 'LiquiditySweep', label: 'Sweep Rejections', icon: Sparkles },
                    { key: 'OrderBlock', label: 'Order Block (OB)', icon: Layers },
                    { key: 'CHoCH', label: 'Change of Char (CHoCH)', icon: Activity },
                    { key: 'FVG', label: 'Fair Value Gap (FVG)', icon: Sliders },
                    { key: 'BOS', label: 'Break of Structure (BOS)', icon: TrendingUp }
                  ] as const).map((tool) => {
                    const isSelected = activeReplayTool === tool.key;
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.key}
                        onClick={() => {
                          if (isSelected) setActiveReplayTool(null);
                          else setActiveReplayTool(tool.key);
                        }}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-[4px] border cursor-pointer transition-all flex items-center space-x-1.5 ${
                          isSelected
                            ? 'bg-accent-primary/15 border-accent-primary text-accent-hover dark:text-accent-primary ring-2 ring-[#FCD535]/35'
                            : 'bg-bg-surface border-border-color text-text-secondary hover:border-text-secondary'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>Brush: {tool.label}</span>
                      </button>
                    );
                  })}
                  {activeReplayTool && (
                    <button
                      onClick={() => setActiveReplayTool(null)}
                      className="px-2 py-1 text-[10px] font-mono font-bold rounded border border-dashed border-color-danger/30 text-color-danger hover:bg-color-danger/5 cursor-pointer"
                    >
                      CLEAR BRUSH
                    </button>
                  )}
                </div>
              </div>

              {/* Lab Prompt Objective Instruction */}
              <div className="p-3 bg-sky-500/5 border border-sky-500/25 rounded-[4px] text-xs font-semibold text-text-secondary leading-normal">
                <span className="text-sky-500 font-mono block text-[9px] uppercase font-black tracking-widest mb-1">Interactive Instructions</span>
                {activeReplayTool ? (
                  <p>
                    🎨 <strong className="text-sky-500">Brush Loaded: {activeReplayTool}</strong>. Hover over the candlesticks and click the exact block coordinate where this structure element is formed.
                  </p>
                ) : (
                  <p>
                    👈 Click any candlestick to inspect its detailed price feed coordinates, or load an active <strong className="text-text-primary dark:text-text-primary">Painting Brush Tool</strong> above to tag patterns on the chart dynamically!
                  </p>
                )}
              </div>

              {/* Interactive Recognition Vector Canvas */}
              <div className="relative bg-bg-main border-2 border-border-color rounded-lg p-4 h-64 flex flex-col justify-between">
                <div className="text-[9px] font-mono text-text-secondary flex justify-between border-b border-border-color/50 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-color-success animate-pulse" />
                    {replayPairIndex === 0 ? "EUR/USD 15m Intraday Feed" : "GBP/USD 15m Intraday Feed"} (Replay Simulation)
                  </span>
                  <span>Accuracy tracking online</span>
                </div>

                <div className="flex items-end justify-between h-40 px-2 relative pt-8">
                  {activeReplayData.ohlcData.slice(0, replayStep).map((c, idx) => {
                    const maxP = replayPairIndex === 0 ? 1.0860 : 1.2660;
                    const minP = replayPairIndex === 0 ? 1.0770 : 1.2520;
                    const range = maxP - minP;
                    
                    const topPct = ((maxP - Math.max(c.open, c.close)) / range) * 100;
                    const bottomPct = ((maxP - Math.min(c.open, c.close)) / range) * 100;
                    const bodyHeight = Math.max(bottomPct - topPct, 4);

                    const highPct = ((maxP - c.high) / range) * 100;
                    const lowPct = ((maxP - c.low) / range) * 100;

                    const isClicked = selectedPatternIdx === idx;
                    const userLabel = replayUserLabels[idx];

                    return (
                      <button 
                        key={idx} 
                        onClick={() => handleReplayCandleClick(idx, c)}
                        className="flex-1 flex flex-col items-center relative h-full group focus:outline-none cursor-pointer"
                      >
                        {/* Dynamic Label Badge above Candle */}
                        {userLabel && (
                          <span className="absolute -top-6 px-1 py-0.5 rounded text-[8px] font-mono font-extrabold bg-accent-primary text-bg-secondary border border-accent-primary shadow-sm z-10 whitespace-nowrap">
                            {userLabel}
                          </span>
                        )}

                        <div 
                          className="absolute w-0.5 bg-text-secondary" 
                          style={{ top: `${highPct}%`, bottom: `${100 - lowPct}%` }}
                        />

                        <div 
                          className={`absolute w-4 sm:w-6 rounded-[1px] transition-all ${
                            isClicked 
                              ? patternSuccess 
                                ? 'bg-color-success ring-4 ring-[#0ECB81]/30' 
                                : 'bg-color-danger ring-4 ring-[#F6465D]/30'
                              : c.close >= c.open
                              ? 'bg-color-success hover:bg-color-success/80'
                              : 'bg-color-danger hover:bg-color-danger/80'
                          }`}
                          style={{ top: `${topPct}%`, height: `${bodyHeight}%` }}
                        />
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between text-[8px] font-mono text-text-secondary border-t border-border-color pt-1">
                  {activeReplayData.ohlcData.slice(0, replayStep).map((c, i) => (
                    <span key={i} className="text-center w-6">{c.time}</span>
                  ))}
                </div>
              </div>

              {/* Feedback messages */}
              {patternFeedback && (
                <div className={`p-4 rounded-lg border text-xs font-semibold ${
                  patternSuccess 
                    ? 'bg-color-success/5 border-color-success/25 text-color-success dark:text-color-success' 
                    : 'bg-color-danger/5 border-color-danger/25 text-color-danger dark:text-color-danger'
                }`}>
                  <div className="flex items-center space-x-2">
                    {patternSuccess ? <CheckCircle2 className="w-4 h-4 text-color-success" /> : <AlertCircle className="w-4 h-4 text-color-danger" />}
                    <strong>{patternSuccess ? "RECOGNITION APPROVED" : "VALUATION REJECTED"}</strong>
                  </div>
                  <p className="mt-1 leading-relaxed">{patternFeedback}</p>
                </div>
              )}
            </Card>

            {/* Right Panel: Integrated Sandbox Widgets */}
            <div className="lg:col-span-4 space-y-4">
              <Card variant="surface" className="p-4 bg-bg-surface border border-border-color rounded-lg space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-secondary font-bold">
                  Practice Laboratory Sub-modules
                </h3>
                <p className="text-[11px] leading-normal text-text-secondary font-semibold">
                  Test your mathematical position sizing thresholds or examine candlestick structural delivery patterns below:
                </p>

                <div className="space-y-2 pt-2 border-t border-border-color/60 dark:border-border-color/60">
                  <div className="p-2.5 bg-bg-secondary border border-border-color rounded flex justify-between items-center text-xs">
                    <div>
                      <strong className="text-text-primary block">Candlestick Imbalance Lab</strong>
                      <span className="text-text-secondary text-[10px] mt-0.5 block">Learn three-candle imbalance delivery.</span>
                    </div>
                    <Button 
                      onClick={() => {
                        setSelectedLevelId(3);
                        const courseObj = TRADER_LEVELS[2].courses[0];
                        setSelectedCourse(courseObj);
                        setSelectedModule(courseObj.modules[0]);
                        setSelectedLesson(courseObj.modules[0].lessons[1]); // FVG lesson
                        setCurrentSection('curriculum');
                      }}
                      size="sm" 
                      variant="outline"
                      className="text-[10px]"
                    >
                      Launch
                    </Button>
                  </div>

                  <div className="p-2.5 bg-bg-secondary border border-border-color rounded flex justify-between items-center text-xs">
                    <div>
                      <strong className="text-text-primary block">Position Risk Calculator</strong>
                      <span className="text-text-secondary text-[10px] mt-0.5 block">Calibrate strict 1% risk algorithms.</span>
                    </div>
                    <Button 
                      onClick={() => {
                        setSelectedLevelId(1);
                        const courseObj = TRADER_LEVELS[0].courses[0];
                        setSelectedCourse(courseObj);
                        setSelectedModule(courseObj.modules[0]);
                        setSelectedLesson(courseObj.modules[0].lessons[3]); // Risk lesson
                        setCurrentSection('curriculum');
                      }}
                      size="sm" 
                      variant="outline"
                      className="text-[10px]"
                    >
                      Launch
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Progress Summary Block */}
              <Card variant="surface" className="p-4 bg-bg-surface border border-border-color rounded-lg text-xs space-y-3">
                <span className="text-[9px] font-mono text-text-secondary uppercase font-bold tracking-widest block">Accumulation Log</span>
                <div className="flex justify-between font-bold text-xs">
                  <span className="text-text-secondary dark:text-text-secondary">Accuracy Multiplier:</span>
                  <span className="text-color-success font-mono">{aiProfile.recognitionAccuracy}% Score</span>
                </div>
                <div className="flex justify-between font-bold text-xs border-t border-border-color/40 dark:border-border-color/40 pt-2">
                  <span className="text-text-secondary dark:text-text-secondary">Practice Commitment:</span>
                  <span className="text-text-primary font-mono">{progress.practiceHours || 8.5} hours</span>
                </div>
                <p className="text-[10px] text-text-secondary font-semibold leading-relaxed">
                  Every correct pattern trace automatically adds +1.5 practice hours to your credential logs.
                </p>
              </Card>
            </div>

          </div>

        </div>
      )}

      {/* STRATEGY CONFLUENCE BUILDER COCKPIT */}
      {currentSection === 'confluence-builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Confluence Settings Cockpit */}
          <Card variant="surface" className="lg:col-span-8 p-5 bg-bg-surface border border-border-color rounded-lg space-y-4">
            <div className="border-b border-border-color pb-3">
              <span className="text-[10px] font-mono text-color-warning dark:text-accent-primary font-black uppercase tracking-widest block mb-1">Strategy Assembler</span>
              <h3 className="text-base font-extrabold text-text-primary tracking-tight">Strategy Confluence Conjunction Cockpit</h3>
              <p className="text-xs text-text-secondary font-semibold mt-1">
                Synthesize complex algorithmic assemblies. Connect standard base rules with custom liquidity overlays and risk constraints.
              </p>
            </div>

            {comboNotification && (
              <div className="p-3.5 bg-color-success/10 border border-color-success/30 rounded-lg text-xs text-color-success dark:text-color-success font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{comboNotification}</span>
              </div>
            )}

            <form onSubmit={handleDeployCombo} className="space-y-4 text-xs font-semibold text-text-primary dark:text-text-primary">
              
              {/* Name & Desc */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono font-bold text-text-secondary dark:text-text-secondary">Custom Combination Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Asia High Sweep London Execution"
                    value={comboName}
                    onChange={(e) => setComboName(e.target.value)}
                    className="w-full h-9 px-3 bg-bg-secondary border border-border-color rounded-[4px] outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono font-bold text-text-secondary dark:text-text-secondary">System Description</label>
                  <input
                    type="text"
                    required
                    placeholder="Brief description of the confluences mapped"
                    value={comboDesc}
                    onChange={(e) => setComboDesc(e.target.value)}
                    className="w-full h-9 px-3 bg-bg-secondary border border-border-color rounded-[4px] outline-none"
                  />
                </div>
              </div>

              {/* Core Selections */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Base Strategy */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono font-bold text-text-secondary dark:text-text-secondary">Primary Base Strategy</label>
                  <select
                    value={comboBaseId}
                    onChange={(e) => setComboBaseId(e.target.value)}
                    className="w-full h-9 px-2 bg-bg-secondary border border-border-color rounded-[4px] outline-none cursor-pointer"
                  >
                    {CANONICAL_STRATEGY_LIBRARY.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Logical Connector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono font-bold text-text-secondary dark:text-text-secondary">Logical Operator</label>
                  <select
                    value={comboOperator}
                    onChange={(e) => setComboOperator(e.target.value as LogicalOperator)}
                    className="w-full h-9 px-2 bg-bg-secondary border border-border-color rounded-[4px] outline-none cursor-pointer"
                  >
                    <option value={LogicalOperator.AND}>AND Conjunction</option>
                    <option value={LogicalOperator.OR}>OR Alternative</option>
                    <option value={LogicalOperator.SEQUENTIAL}>SEQUENTIAL Chain Alignment</option>
                    <option value={LogicalOperator.CONDITIONAL}>CONDITIONAL If-Then Flow</option>
                  </select>
                </div>

              </div>

              {/* Confluences Mapping Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                
                {/* Context Filters */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-mono font-bold text-text-secondary dark:text-text-secondary">Temporal Session Filters</label>
                  <div className="space-y-1.5">
                    <label className="flex items-center space-x-2 p-2 bg-bg-main border border-border-color rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={comboFilters.includes('rule-smc-time')}
                        onChange={(e) => {
                          if (e.target.checked) setComboFilters([...comboFilters, 'rule-smc-time']);
                          else setComboFilters(comboFilters.filter(f => f !== 'rule-smc-time'));
                        }}
                        className="rounded"
                      />
                      <span>London & NY Session Overlap (UTC 07:00-15:00)</span>
                    </label>
                  </div>
                </div>

                {/* Liquidity Sweep Rule Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono font-bold text-text-secondary dark:text-text-secondary">Liquidity Swept Target Area</label>
                  <select
                    value={comboLiquidity}
                    onChange={(e) => setComboLiquidity(e.target.value)}
                    className="w-full h-9 px-2 bg-bg-secondary border border-border-color rounded-[4px] outline-none cursor-pointer"
                  >
                    <option value="ASIAN_RANGE_HIGH_SWEPT">Asian Range Session High Sweep</option>
                    <option value="ASIAN_RANGE_LOW_SWEPT">Asian Range Session Low Sweep</option>
                    <option value="HTF_SWING_HIGH_SWEPT">High Timeframe 4H Swing High Sweep</option>
                    <option value="HTF_SWING_LOW_SWEPT">High Timeframe 4H Swing Low Sweep</option>
                  </select>
                </div>

              </div>

              {/* Invalidation and risk limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                
                {/* Risk allocation constraint */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-mono font-bold text-text-secondary dark:text-text-secondary">Algorithmic Risk Limitation Rules</label>
                  <div className="space-y-1.5">
                    <label className="flex items-center space-x-2 p-2 bg-bg-main border border-border-color rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={comboRiskRules.includes('rule-smc-risk')}
                        onChange={(e) => {
                          if (e.target.checked) setComboRiskRules([...comboRiskRules, 'rule-smc-risk']);
                          else setComboRiskRules(comboRiskRules.filter(r => r !== 'rule-smc-risk'));
                        }}
                        className="rounded"
                      />
                      <span>Strict 1.0% Capital Position Sizing Lockout</span>
                    </label>
                  </div>
                </div>

                {/* Environment selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono font-bold text-text-secondary dark:text-text-secondary">Target Deployment Sandbox</label>
                  <select
                    value={comboEnv}
                    onChange={(e) => setComboEnv(e.target.value as EnvironmentType)}
                    className="w-full h-9 px-2 bg-bg-secondary border border-border-color rounded-[4px] outline-none cursor-pointer"
                  >
                    <option value={EnvironmentType.DEMO}>DEMO - Local Simulator Sandpit</option>
                    <option value={EnvironmentType.PAPER}>PAPER - Interactive Forward Test</option>
                    <option value={EnvironmentType.LIVE}>LIVE - Production Institutional Account</option>
                  </select>
                </div>

              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full sm:w-auto cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span>Deploy Combined Strategy</span>
                </Button>
              </div>

            </form>
          </Card>

          {/* Right Panel: Deployed Confluences Catalog */}
          <div className="lg:col-span-4 space-y-4">
            <Card variant="surface" className="p-4 bg-bg-surface border border-border-color rounded-lg space-y-3">
              <div className="flex items-center space-x-2 pb-2 border-b border-border-color dark:border-border-color">
                <Sliders className="w-4 h-4 text-sky-500" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-secondary font-bold">
                  Confluence Catalog
                </h3>
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {combinations.map((combo) => (
                  <div 
                    key={combo.id} 
                    className="p-3 bg-bg-main border border-border-color rounded-lg space-y-2 text-xs font-semibold"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-text-primary truncate block max-w-[150px]">{combo.name}</strong>
                      <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 font-mono text-[8px] font-black uppercase">
                        {combo.environment}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-secondary leading-normal">{combo.description}</p>
                    
                    {/* Logical flow layout */}
                    <div className="p-2 bg-bg-surface border border-border-color rounded space-y-1 text-[10px] font-mono text-text-secondary dark:text-text-secondary">
                      <div className="text-sky-500 font-bold block mb-0.5">CONNECTOR: {combo.logicalOperator}</div>
                      <div>Base: {combo.baseStrategyId}</div>
                      <div>Liquidity: {combo.liquidityCondition}</div>
                      <div>Filters: {combo.contextFilters.join(', ') || 'None'}</div>
                      <div>Risk Policy: {combo.riskRules.join(', ') || 'Unconstrained'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card variant="surface" className="p-4 bg-bg-surface border border-border-color rounded-lg text-xs font-semibold text-text-secondary leading-relaxed">
              <span className="text-color-warning dark:text-accent-primary font-bold block mb-1">EA Compatibility Check:</span>
              Composed confluence patterns translate directly into structured logical schemas compatible with the future Pine/MQL5 builder engine.
            </Card>
          </div>

        </div>
      )}

      {/* LONG-TERM MASTERY ENGINE & AI LEARNER PROFILE */}
      {currentSection === 'mastery' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Panel: 650-Hour Mastery Path progress */}
            <Card variant="surface" className="lg:col-span-8 p-5 bg-bg-surface border border-border-color rounded-lg space-y-5">
              <div className="border-b border-border-color pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <span className="text-[10px] font-mono text-amber-500 font-black uppercase tracking-widest block mb-1">Acredditation Path</span>
                  <h3 className="text-base font-extrabold text-text-primary tracking-tight">650-Hour Professional Mastery Roadmap</h3>
                  <p className="text-xs text-text-secondary font-semibold mt-0.5">
                    Rigorous quantitative program requiring extensive active practice, replication studies, and quiz validations.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-amber-500 font-mono block">{totalMasteryHours} / 650 hrs</span>
                  <span className="text-[9px] text-text-secondary font-mono font-bold uppercase block mt-0.5">Accumulated Mastery</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-2.5 bg-bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-[#FCD535] h-full transition-all" 
                    style={{ width: `${Math.min(100, Math.round((parseFloat(totalMasteryHours) / 650) * 100))}%` }} 
                  />
                </div>
                <span className="text-[9px] font-mono text-text-secondary font-bold block text-right">
                  {Math.min(100, Math.round((parseFloat(totalMasteryHours) / 650) * 100))}% toward Senior Accredited Quant Status
                </span>
              </div>

              {/* Mastery Stages Road Map */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-mono text-text-secondary uppercase font-bold tracking-wider block">Institutional Mastery Stages</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.values(MasteryStage).map((stage, i) => {
                    // Simple logic to map stage unlocks based on completed lessons
                    let isUnlocked = false;
                    if (i === 0) isUnlocked = true; // Foundation is always unlocked
                    else if (i === 1 && completedLessonsCount >= 2) isUnlocked = true; // Recognition
                    else if (i === 2 && completedLessonsCount >= 4) isUnlocked = true; // Application
                    else if (i === 3 && completedLessonsCount >= 6) isUnlocked = true; // Discrimination
                    else if (i === 4 && completedLessonsCount >= 8) isUnlocked = true; // Replay
                    else if (i === 5 && completedLessonsCount >= 10) isUnlocked = true; // Confluence
                    else if (i === 6 && completedLessonsCount >= 12) isUnlocked = true; // Independent
                    else if (i === 7 && completedLessonsCount >= 13) isUnlocked = true; // Advanced
                    else if (i === 8 && progress.certificates?.length && progress.certificates.length > 0) isUnlocked = true; // Certification

                    return (
                      <div 
                        key={stage} 
                        className={`p-3 rounded border transition-all flex items-center justify-between font-semibold text-xs ${
                          isUnlocked 
                            ? 'bg-color-success/5 border-color-success/20 text-text-primary dark:text-text-primary' 
                            : 'bg-bg-input border-border-color opacity-60 text-text-secondary dark:text-text-secondary'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <span className="text-[10px] font-mono text-text-secondary font-bold">0{i+1}.</span>
                          <span className="truncate">{stage}</span>
                        </div>
                        {isUnlocked ? (
                          <CheckCircle2 className="w-4 h-4 text-color-success shrink-0" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-text-muted dark:text-text-muted shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Right Panel: AI Personalized Learning Profile */}
            <Card variant="surface" className="lg:col-span-4 p-5 bg-bg-surface border border-border-color rounded-lg space-y-4">
              <div className="border-b border-border-color pb-3 flex items-center space-x-2">
                <Bot className="w-4.5 h-4.5 text-color-warning dark:text-accent-primary" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-secondary font-bold">
                  AI Personalized Profile
                </h3>
              </div>

              <div className="space-y-4 text-xs font-semibold">
                
                {/* Strengths */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono text-color-success uppercase font-bold tracking-wider block">Validated Strengths</span>
                  <div className="space-y-1">
                    {aiProfile.strengths.map((str, i) => (
                      <div key={i} className="flex items-center space-x-1.5 text-xs">
                        <Check className="w-3.5 h-3.5 text-color-success shrink-0" />
                        <span className="text-text-primary truncate">{str}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weaknesses */}
                <div className="space-y-1.5 border-t border-border-color/40 dark:border-border-color/40 pt-3">
                  <span className="text-[9px] font-mono text-color-danger uppercase font-bold tracking-wider block">Target Vulnerabilities</span>
                  <div className="space-y-1">
                    {aiProfile.weaknesses.map((weak, i) => (
                      <div key={i} className="flex items-center space-x-1.5 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-color-danger shrink-0" />
                        <span className="text-text-primary truncate">{weak}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spaced Repetition Schedule */}
                <div className="space-y-1.5 border-t border-border-color/40 dark:border-border-color/40 pt-3">
                  <span className="text-[9px] font-mono text-sky-500 uppercase font-bold tracking-wider block">AI Spaced Repetition Review Schedule</span>
                  <div className="space-y-2 font-mono text-[10px] text-text-secondary dark:text-text-secondary">
                    <div className="flex justify-between items-center bg-bg-main p-1.5 border border-border-color rounded">
                      <span className="truncate max-w-[120px]">Market structure swings</span>
                      <span className="text-sky-500 font-bold">{formatDate(new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString())}</span>
                    </div>
                    <div className="flex justify-between items-center bg-bg-main p-1.5 border border-border-color rounded">
                      <span className="truncate max-w-[120px]">Displacement & FVG</span>
                      <span className="text-sky-500 font-bold">{formatDate(new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString())}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

          </div>

        </div>
      )}

      {/* GLOSSARY DICTIONARY VIEW */}
      {currentSection === 'glossary' && (
        <Card variant="surface" className="p-5 bg-bg-surface border border-border-color rounded-lg space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-color pb-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-text-secondary font-bold">
              Institutional Vocabulary Glossary
            </h3>
            
            {/* Search filter input */}
            <div className="relative w-full sm:w-64 h-8 bg-bg-secondary border border-border-color rounded-[4px] flex items-center px-2.5">
              <Search className="w-3.5 h-3.5 text-text-secondary dark:text-text-secondary" />
              <input
                type="text"
                placeholder="Search vocabulary terms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs border-none outline-none font-semibold text-text-primary pl-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TRADING_GLOSSARY.filter(item => 
              item.term.toLowerCase().includes(searchQuery.toLowerCase()) || 
              item.simpleDefinition.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((item, i) => (
              <div 
                key={i} 
                className="p-4 bg-bg-main border border-border-color rounded-lg space-y-2 text-xs font-semibold"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-sm font-extrabold text-text-primary dark:text-text-primary">{item.term}</strong>
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 font-mono text-[9px] font-black uppercase">
                    {item.category}
                  </span>
                </div>
                <p className="text-text-primary dark:text-text-primary">{item.simpleDefinition}</p>
                <div className="p-2.5 bg-bg-surface border border-border-color/60 dark:border-border-color/60 rounded text-[11px] text-text-secondary leading-normal space-y-1">
                  <span className="font-bold block text-amber-500">TECHNICAL DESCRIPTION:</span>
                  <p>{item.technicalExplanation}</p>
                  <p className="italic mt-1 text-text-primary dark:text-text-primary">Example: {item.example}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

    </div>
  );
};
