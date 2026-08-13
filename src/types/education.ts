/**
 * AppexQuant Markets Global - Education & Trader Development System Types
 */

export type TraderLevel = 1 | 2 | 3 | 4;

export interface PracticeExercise {
  title: string;
  instructions: string;
  promptHint?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  levelId: TraderLevel;
  courseId: string;
  moduleId: string;
  title: string;
  description: string; // Short summary description
  objectives: string[];
  prerequisites: string[]; // List of required lessons or concepts
  explanation: string; // The rich lesson content
  examples: string[]; // Step-by-step practical walk-throughs
  practice: PracticeExercise; // Practice lab tasks
  quiz?: QuizQuestion[];
  interactiveType?: 'candlestick' | 'risk_calculator' | 'market_structure' | 'leverage_sim';
  estimatedMinutes: number;
  difficulty: 'Beginner' | 'Foundational' | 'Intermediate' | 'Advanced' | 'Elite';
}

export interface ModuleMissionBriefing {
  objective: string;
  recognitionTarget: string;
  marketConditions: string;
  prerequisites: string;
  practiceRequirement: string;
  masteryStandard: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description: string;
  missionBriefing: ModuleMissionBriefing;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  levelId: TraderLevel;
  title: string;
  description: string;
  modules: Module[];
}

export interface TraderLevelCategory {
  level: TraderLevel;
  title: string;
  subtitle: string;
  description: string;
  badgeName: string;
  courses: Course[];
}

export interface GlossaryTerm {
  term: string;
  category: string;
  simpleDefinition: string;
  technicalExplanation: string;
  example: string;
}

export interface UserEducationProgress {
  completedLessons: string[];
  quizScores: Record<string, number>; // lessonId -> percentage
  currentLevel: TraderLevel;
  lastLessonId?: string;
  notes: Record<string, string>;
  streak?: {
    current: number;
    longest: number;
    lastActiveDate?: string;
  };
  practiceHours?: number;
  theoryHours?: number;
  certificates?: string[]; // Level identifiers representing automatically earned certificates
  lessonTimeSpent?: Record<string, number>; // lessonId -> minutes spent
  lessonLastAccessed?: Record<string, string>; // lessonId -> ISO string date
  startedModules?: string[]; // list of moduleIds where "Begin Training" has been clicked
}
