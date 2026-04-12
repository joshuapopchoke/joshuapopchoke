import type { PlayDifficulty } from "../types/gameState";

export type TrainingModuleWorkspace =
  | "exam-foundations"
  | "suitability-client-fit"
  | "retirement-planning"
  | "mortgage-debt-planning"
  | "bank-lending"
  | "client-meeting-readiness"
  | "full-access";

export interface TrainingModuleDefinition {
  id: string;
  title: string;
  audience: "college" | "ria" | "shared";
  description: string;
  focus: string;
  workspace: TrainingModuleWorkspace;
  requiredDifficulty: PlayDifficulty | null;
  minimumAccuracy: number;
  completionScoreTarget: number | null;
  minimumAnsweredQuestions: number;
  completionLabel: string;
  coachingSignals: string[];
  endsWhenCompleted: boolean;
}

export const TRAINING_MODULES: TrainingModuleDefinition[] = [
  {
    id: "foundations-sie",
    title: "Exam Foundations",
    audience: "shared",
    description: "Build a reliable base in licensing concepts before moving into more advanced client work.",
    focus: "SIE and early Series readiness",
    workspace: "exam-foundations",
    requiredDifficulty: "learner",
    minimumAccuracy: 70,
    completionScoreTarget: 76,
    minimumAnsweredQuestions: 12,
    completionLabel: "Reach a 76 readiness score with 70% accuracy across the assigned exam bank.",
    coachingSignals: ["Exam readiness", "Accuracy discipline", "Knowledge breadth"],
    endsWhenCompleted: true
  },
  {
    id: "suitability-practice",
    title: "Suitability and Client Fit",
    audience: "shared",
    description: "Apply knowledge inside client accounts without drifting outside mandate, tax, and risk boundaries.",
    focus: "Suitability and product fit",
    workspace: "suitability-client-fit",
    requiredDifficulty: "associate",
    minimumAccuracy: 0,
    completionScoreTarget: 80,
    minimumAnsweredQuestions: 0,
    completionLabel: "Reach an 80 suitability score while keeping compliance and client-fit decisions in lane.",
    coachingSignals: ["Suitability", "Compliance", "Rational trade discipline"],
    endsWhenCompleted: true
  },
  {
    id: "retirement-planning-lab",
    title: "Retirement Planning",
    audience: "ria",
    description: "Practice tax-aware retirement planning, account sleeves, distributions, and planning judgment.",
    focus: "Retirement, tax, and sleeve planning",
    workspace: "retirement-planning",
    requiredDifficulty: "advisor",
    minimumAccuracy: 0,
    completionScoreTarget: 84,
    minimumAnsweredQuestions: 0,
    completionLabel: "Reach an 84 retirement-planning score by protecting income, reserves, and long-term wealth.",
    coachingSignals: ["Retirement judgment", "Wealth protection", "Tax-aware planning"],
    endsWhenCompleted: true
  },
  {
    id: "mortgage-debt-planning",
    title: "Mortgage and Debt Planning",
    audience: "shared",
    description: "Work through refinance, debt-service, and housing-cash-flow tradeoffs without unrelated market clutter.",
    focus: "Mortgage guidance and debt planning",
    workspace: "mortgage-debt-planning",
    requiredDifficulty: "associate",
    minimumAccuracy: 0,
    completionScoreTarget: 82,
    minimumAnsweredQuestions: 0,
    completionLabel: "Reach an 82 planning score by balancing debt logic, affordability, reserves, and client fit.",
    coachingSignals: ["Debt analysis", "Affordability judgment", "Client-fit reasoning"],
    endsWhenCompleted: true
  },
  {
    id: "bank-lending",
    title: "Bank Lending",
    audience: "shared",
    description: "Practice basic underwriting logic, reserve review, and lending judgment using client cash-flow and debt context.",
    focus: "Credit and lending decisions",
    workspace: "bank-lending",
    requiredDifficulty: "associate",
    minimumAccuracy: 0,
    completionScoreTarget: 83,
    minimumAnsweredQuestions: 0,
    completionLabel: "Reach an 83 lending score by weighing repayment strength, liquidity, and risk discipline.",
    coachingSignals: ["Underwriting logic", "Risk control", "Decision consistency"],
    endsWhenCompleted: true
  },
  {
    id: "client-meeting-readiness",
    title: "Client Meeting Readiness",
    audience: "shared",
    description: "Respond in your own words to client prompts and get coached on compliance, rationale, empathy, and practical judgment.",
    focus: "Free-response client communication",
    workspace: "client-meeting-readiness",
    requiredDifficulty: "advisor",
    minimumAccuracy: 0,
    completionScoreTarget: 85,
    minimumAnsweredQuestions: 3,
    completionLabel: "Reach an 85 readiness score across compliance, suitability, empathy, and rationale in live written responses.",
    coachingSignals: ["Communication", "Compliance", "Rational thinking"],
    endsWhenCompleted: true
  },
  {
    id: "full-access",
    title: "Full Access",
    audience: "shared",
    description: "Run the full workstation with every planning, market, and advisory system active at once.",
    focus: "Capstone full-sim access",
    workspace: "full-access",
    requiredDifficulty: null,
    minimumAccuracy: 0,
    completionScoreTarget: null,
    minimumAnsweredQuestions: 0,
    completionLabel: "No fixed endpoint. Use this as the advanced sandbox and capstone practice mode.",
    coachingSignals: ["Knowledge", "Judgment", "Compliance", "Client outcomes"],
    endsWhenCompleted: false
  }
];
