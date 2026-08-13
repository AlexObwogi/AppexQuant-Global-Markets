/**
 * AppexQuant Markets Global - Canonical Strategy & Algotrading Architecture Foundation
 * Definitive schemas for trading models, deterministic rules, research evidence, and mastery parameters.
 */

export enum StrategyCategory {
  SMC = 'SMC',
  ICT = 'ICT',
  CLASSIC_FOREX = 'CLASSIC_FOREX',
  PRICE_ACTION = 'PRICE_ACTION',
  BREAKOUT = 'BREAKOUT',
  TREND_FOLLOWING = 'TREND_FOLLOWING',
  LIQUIDITY_BASED = 'LIQUIDITY_BASED',
  MOMENTUM = 'MOMENTUM',
  MEAN_REVERSION = 'MEAN_REVERSION',
  USER_CREATED = 'USER_CREATED',
  COMBINATION = 'COMBINATION'
}

export enum StrategyLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  ELITE = 'ELITE'
}

export enum RuleType {
  ENTRY_CONDITION = 'ENTRY_CONDITION',
  CONFIRMATION = 'CONFIRMATION',
  INVALIDATION = 'INVALIDATION',
  RISK_RULE = 'RISK_RULE',
  CONTEXT_FILTER = 'CONTEXT_FILTER',
  LIQUIDITY_CONDITION = 'LIQUIDITY_CONDITION'
}

export enum EvidenceType {
  EDUCATIONAL_EXPLANATION = 'EDUCATIONAL_EXPLANATION',
  HISTORICAL_EXAMPLE = 'HISTORICAL_EXAMPLE',
  ACADEMIC_RESEARCH = 'ACADEMIC_RESEARCH',
  INSTITUTIONAL_RESEARCH = 'INSTITUTIONAL_RESEARCH',
  VERIFIED_BACKTEST = 'VERIFIED_BACKTEST',
  INTERNAL_PLATFORM_TEST = 'INTERNAL_PLATFORM_TEST'
}

export enum VerificationStatus {
  VERIFIED = 'VERIFIED',
  PENDING = 'PENDING',
  UNVERIFIED = 'UNVERIFIED'
}

export enum StrategyStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export enum LogicalOperator {
  AND = 'AND',
  OR = 'OR',
  SEQUENTIAL = 'SEQUENTIAL',
  CONDITIONAL = 'CONDITIONAL'
}

export enum EnvironmentType {
  DEMO = 'DEMO',
  PAPER = 'PAPER',
  LIVE = 'LIVE'
}

export enum AnnotationType {
  BOS = 'BOS',
  CHoCH = 'CHoCH',
  FVG = 'FVG',
  OrderBlock = 'OrderBlock',
  LiquiditySweep = 'LiquiditySweep',
  Displacement = 'Displacement',
  Mitigation = 'Mitigation',
  Premium = 'Premium',
  Discount = 'Discount',
  Target = 'Target',
  StopLoss = 'StopLoss'
}

export enum MasteryStage {
  Foundation = 'Foundation',
  Recognition = 'Recognition',
  Application = 'Application',
  Discrimination = 'Discrimination',
  Replay = 'Replay',
  Confluence = 'Confluence',
  IndependentAnalysis = 'IndependentAnalysis',
  AdvancedMastery = 'AdvancedMastery',
  Certification = 'Certification'
}

export enum StreakStatus {
  ACTIVE = 'ACTIVE',
  WARNING = 'WARNING',
  GRACE = 'GRACE',
  BROKEN = 'BROKEN'
}

/**
 * Deterministic Rules representing executable mathematical pricing conditions.
 */
export interface DeterministicRule {
  id: string;
  name: string;
  description: string;
  humanText: string;
  expression: string; // e.g. "CLOSE(5m) > PREVIOUS_SWING_HIGH(5m)"
  ruleType: RuleType;
  parameters: Record<string, string | number | boolean>;
}

/**
 * Verified market historical candles with professional coordinate charting tags.
 */
export interface MarketOHLC {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartAnnotation {
  type: AnnotationType;
  startIndex: number;
  endIndex: number;
  priceStart: number;
  priceEnd: number;
  label: string;
}

export interface MarketExample {
  id: string;
  title: string;
  direction: 'BULLISH' | 'BEARISH';
  timeframe: string;
  ohlcData: MarketOHLC[];
  annotations: ChartAnnotation[];
  source: string;
}

/**
 * Evidence metrics for backing up strategic expectancy claims.
 */
export interface EvidenceSource {
  id: string;
  type: EvidenceType;
  title: string;
  author: string;
  date: string;
  methodology: string;
  sampleSize?: number;
  limitations: string;
  verificationStatus: VerificationStatus;
  winRatePct?: number;
  profitFactor?: number;
  sourceUrl?: string;
}

/**
 * Core Educational Requirements for Academy-Practice-Mastery integration.
 */
export interface PracticeRequirements {
  minimumPracticeHours: number;
  requiredExercisesCount: number;
  accuracyThresholdPct: number;
}

export interface MasteryRequirements {
  practiceHoursRequirement: number;
  replaysCountRequirement: number;
  minimumQuizScorePct: number;
  assessmentsCountRequirement: number;
}

export interface QuizRequirements {
  questionsCount: number;
  passingScorePct: number;
}

export interface CertificationRequirements {
  requiresAssessment: boolean;
  requiresMasteryStage: MasteryStage;
  credentialCode: string;
}

/**
 * Multi-Language Code Translation Template for automated trading strategy generation.
 */
export interface AlgorithmicRepresentation {
  mql5: string;
  pineScript: string;
  python: string;
  typescript: string;
}

/**
 * THE CANONICAL STRATEGY MODEL
 */
export interface CanonicalStrategy {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: StrategyCategory;
  level: StrategyLevel;
  prerequisites: string[]; // List of strategyIds or lessonIds
  theory: string;
  rules: DeterministicRule[];
  examples: MarketExample[];
  practiceRequirements: PracticeRequirements;
  masteryRequirements: MasteryRequirements;
  quizRequirements: QuizRequirements;
  certificationRequirements: CertificationRequirements;
  algorithmicRepresentation: AlgorithmicRepresentation;
  evidence: EvidenceSource[];
  status: StrategyStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * AI Personalized Learner Profile Model
 */
export interface AILearnerProfile {
  completedLessons: string[];
  completedStrategies: string[];
  level: StrategyLevel;
  masteryPercentagePerStrategy: Record<string, number>; // strategyId -> percentage
  strengths: string[];
  weaknesses: string[];
  recurringMistakes: string[];
  practiceHours: number;
  recognitionAccuracy: number; // 0-100
  quizAverage: number; // 0-100
  streak: number;
  recommendedNextLessons: string[];
  revisionSchedule: Record<string, string>; // lessonId -> ISO Date String for next spacing interval
}

/**
 * Combined trading setups modeling complex conjunction filters
 */
export interface StrategyCombination {
  id: string;
  name: string;
  description: string;
  baseStrategyId: string;
  contextFilters: string[]; // List of Rule ids or custom expressions
  liquidityCondition: string; // Dynamic liquidity condition rule text
  confirmationId?: string; // Optional confirmation rule trigger
  entryConditionId: string; // Precise rule trigger
  invalidationId: string; // Invalidation rule trigger
  riskRules: string[]; // Risk limitation rules
  logicalOperator: LogicalOperator;
  environment: EnvironmentType;
}

/**
 * Detailed streak tracking interface
 */
export interface DetailedStreak {
  current: number;
  longest: number;
  learningDays: string[]; // Array of 'YYYY-MM-DD' dates
  lastActivityDate: string; // ISO string
  graceDaysRemaining: number;
  status: StreakStatus;
}
