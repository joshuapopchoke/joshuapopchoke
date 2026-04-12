import { TRAINING_MODULES, type TrainingModuleDefinition } from "../data/trainingModules";
import type { TrainingPerformanceSummary } from "./trainingScoreEngine";
import type { TrainingAssignment, TrainingSessionReport } from "../types/gameState";

export interface AssignmentProgressSnapshot {
  assignmentId: string;
  module: TrainingModuleDefinition;
  assignedDifficulty: TrainingSessionReport["difficulty"] | null;
  jurisdictionCode: string | null;
  status: TrainingAssignment["status"];
  completionPercent: number;
  bestMatchingReport: TrainingSessionReport | null;
  dueAt: number | null;
  assignedAt: number;
}

export interface ModuleScoreCard {
  label: string;
  score: number;
}

export interface ModuleLiveMetrics {
  difficulty: TrainingSessionReport["difficulty"];
  studyAccuracy: number;
  answeredQuestions: number;
  summary: TrainingPerformanceSummary;
  workspaceScoreOverride?: number | null;
  workspaceScoreCards?: ModuleScoreCard[] | null;
}

function difficultyRank(difficulty: TrainingSessionReport["difficulty"]) {
  switch (difficulty) {
    case "learner":
      return 0;
    case "trainee":
      return 1;
    case "associate":
      return 2;
    case "advisor":
      return 3;
    case "senior":
      return 4;
    default:
      return 0;
  }
}

function moduleDifficultyRank(difficulty: TrainingModuleDefinition["requiredDifficulty"]) {
  return difficulty ? difficultyRank(difficulty) : 0;
}

function effectiveModuleDifficulty(
  module: TrainingModuleDefinition,
  assignment: Pick<TrainingAssignment, "assignedDifficulty">
) {
  return assignment.assignedDifficulty ?? module.requiredDifficulty;
}

function moduleScoreFromReport(module: TrainingModuleDefinition, report: Pick<
  TrainingSessionReport,
  "examReadiness" | "advisorPerformance" | "clientOutcome" | "compliance" | "portfolioOutcome" | "overall"
>) {
  switch (module.workspace) {
    case "exam-foundations":
      return Math.round(
        report.examReadiness.score * 0.75 +
        report.compliance.score * 0.15 +
        report.advisorPerformance.score * 0.1
      );
    case "suitability-client-fit":
      return Math.round(
        report.advisorPerformance.score * 0.45 +
        report.compliance.score * 0.3 +
        report.clientOutcome.score * 0.25
      );
    case "retirement-planning":
      return Math.round(
        report.advisorPerformance.score * 0.3 +
        report.clientOutcome.score * 0.25 +
        report.portfolioOutcome.score * 0.25 +
        report.compliance.score * 0.2
      );
    case "mortgage-debt-planning":
      return Math.round(
        report.advisorPerformance.score * 0.35 +
        report.clientOutcome.score * 0.3 +
        report.compliance.score * 0.2 +
        report.examReadiness.score * 0.15
      );
    case "bank-lending":
      return Math.round(
        report.compliance.score * 0.35 +
        report.advisorPerformance.score * 0.35 +
        report.clientOutcome.score * 0.2 +
        report.examReadiness.score * 0.1
      );
    case "client-meeting-readiness":
      return Math.round(
        report.advisorPerformance.score * 0.4 +
        report.compliance.score * 0.3 +
        report.clientOutcome.score * 0.2 +
        report.examReadiness.score * 0.1
      );
    case "full-access":
    default:
      return report.overall.score;
  }
}

export function buildModuleScoreCards(module: TrainingModuleDefinition, metrics: ModuleLiveMetrics): ModuleScoreCard[] {
  switch (module.workspace) {
    case "exam-foundations":
      return [
        { label: "Exam readiness", score: metrics.summary.examReadiness.score },
        { label: "Accuracy discipline", score: Math.round(metrics.studyAccuracy) },
        { label: "Knowledge breadth", score: metrics.summary.compliance.score }
      ];
    case "suitability-client-fit":
      return [
        { label: "Suitability", score: metrics.summary.advisorPerformance.score },
        { label: "Compliance", score: metrics.summary.compliance.score },
        { label: "Client fit", score: metrics.summary.clientOutcome.score }
      ];
    case "retirement-planning":
      return [
        { label: "Retirement judgment", score: metrics.summary.advisorPerformance.score },
        { label: "Wealth protection", score: Math.round((metrics.summary.clientOutcome.score + metrics.summary.portfolioOutcome.score) / 2) },
        { label: "Tax and compliance", score: metrics.summary.compliance.score }
      ];
    case "mortgage-debt-planning":
      return [
        { label: "Debt analysis", score: metrics.summary.advisorPerformance.score },
        { label: "Affordability fit", score: metrics.summary.clientOutcome.score },
        { label: "Compliance discipline", score: metrics.summary.compliance.score }
      ];
    case "bank-lending":
      return [
        { label: "Underwriting logic", score: metrics.summary.advisorPerformance.score },
        { label: "Risk control", score: metrics.summary.compliance.score },
        { label: "Decision consistency", score: metrics.summary.clientOutcome.score }
      ];
    case "client-meeting-readiness":
      return metrics.workspaceScoreCards ?? [
        { label: "Communication", score: metrics.summary.advisorPerformance.score },
        { label: "Compliance", score: metrics.summary.compliance.score },
        { label: "Rational thinking", score: metrics.summary.clientOutcome.score }
      ];
    case "full-access":
    default:
      return [
        { label: "Exam readiness", score: metrics.summary.examReadiness.score },
        { label: "Advisor judgment", score: metrics.summary.advisorPerformance.score },
        { label: "Compliance", score: metrics.summary.compliance.score }
      ];
  }
}

export function computeModuleScore(module: TrainingModuleDefinition, metrics: ModuleLiveMetrics) {
  if (module.workspace === "client-meeting-readiness" && typeof metrics.workspaceScoreOverride === "number") {
    return metrics.workspaceScoreOverride;
  }

  return moduleScoreFromReport(module, {
    examReadiness: metrics.summary.examReadiness,
    advisorPerformance: metrics.summary.advisorPerformance,
    clientOutcome: metrics.summary.clientOutcome,
    compliance: metrics.summary.compliance,
    portfolioOutcome: metrics.summary.portfolioOutcome,
    overall: metrics.summary.overall
  });
}

export function moduleReachedCompletion(module: TrainingModuleDefinition, metrics: ModuleLiveMetrics) {
  const difficultyMet = module.requiredDifficulty === null || difficultyRank(metrics.difficulty) >= moduleDifficultyRank(module.requiredDifficulty);
  const accuracyMet = metrics.studyAccuracy >= module.minimumAccuracy;
  const answeredMet = metrics.answeredQuestions >= module.minimumAnsweredQuestions;
  const moduleScore = computeModuleScore(module, metrics);
  const scoreMet = module.completionScoreTarget === null || moduleScore >= module.completionScoreTarget;

  return difficultyMet && accuracyMet && answeredMet && scoreMet;
}

function computeCompletionPercent(module: TrainingModuleDefinition, report: TrainingSessionReport | null) {
  if (!report) {
    return 0;
  }

  const difficultyScore = module.requiredDifficulty === null
    ? 1
    : difficultyRank(report.difficulty) >= moduleDifficultyRank(module.requiredDifficulty) ? 1 : 0.45;
  const accuracyScore = module.minimumAccuracy <= 0 ? 1 : Math.min(report.studyAccuracy / module.minimumAccuracy, 1);
  const moduleScore = module.completionScoreTarget === null ? 1 : Math.min(moduleScoreFromReport(module, report) / module.completionScoreTarget, 1);
  const answerVolumeScore = module.minimumAnsweredQuestions <= 0 ? 1 : Math.min(report.answeredQuestions / module.minimumAnsweredQuestions, 1);

  return Math.round((difficultyScore * 0.2 + accuracyScore * 0.25 + moduleScore * 0.4 + answerVolumeScore * 0.15) * 100);
}

function reportMatchesModule(module: TrainingModuleDefinition, report: TrainingSessionReport) {
  return (
    (module.requiredDifficulty === null || difficultyRank(report.difficulty) >= moduleDifficultyRank(module.requiredDifficulty)) &&
    report.studyAccuracy >= module.minimumAccuracy &&
    (module.completionScoreTarget === null || moduleScoreFromReport(module, report) >= module.completionScoreTarget) &&
    report.answeredQuestions >= module.minimumAnsweredQuestions
  );
}

export function buildAssignmentSnapshots(assignments: TrainingAssignment[], reports: TrainingSessionReport[]) {
  return assignments.map<AssignmentProgressSnapshot>((assignment) => {
    const module = TRAINING_MODULES.find((entry) => entry.id === assignment.moduleId);
    if (!module) {
      throw new Error(`Unknown training module: ${assignment.moduleId}`);
    }

    const traineeReports = reports
      .filter((report) => report.traineeId === assignment.traineeId)
      .sort((left, right) => right.endedAt - left.endedAt);
    const moduleWithAssignedDifficulty: TrainingModuleDefinition = {
      ...module,
      requiredDifficulty: effectiveModuleDifficulty(module, assignment)
    };
    const bestMatchingReport = traineeReports.find((report) => reportMatchesModule(moduleWithAssignedDifficulty, report)) ?? traineeReports[0] ?? null;

    return {
      assignmentId: assignment.id,
      module: moduleWithAssignedDifficulty,
      assignedDifficulty: assignment.assignedDifficulty,
      jurisdictionCode: assignment.jurisdictionCode ?? null,
      status: assignment.status,
      completionPercent: computeCompletionPercent(moduleWithAssignedDifficulty, bestMatchingReport),
      bestMatchingReport,
      dueAt: assignment.dueAt,
      assignedAt: assignment.assignedAt
    };
  });
}

export function updateAssignmentsFromReport(assignments: TrainingAssignment[], report: TrainingSessionReport) {
  return assignments.map<TrainingAssignment>((assignment) => {
    if (assignment.traineeId !== report.traineeId || assignment.status === "completed") {
      return assignment;
    }

    const module = TRAINING_MODULES.find((entry) => entry.id === assignment.moduleId);
    if (!module) {
      return assignment;
    }

    const moduleWithAssignedDifficulty: TrainingModuleDefinition = {
      ...module,
      requiredDifficulty: effectiveModuleDifficulty(module, assignment)
    };

    if (reportMatchesModule(moduleWithAssignedDifficulty, report)) {
      return {
        ...assignment,
        status: "completed",
        completedAt: report.endedAt
      };
    }

    if (assignment.status === "pending") {
      return {
        ...assignment,
        status: "in-progress"
      };
    }

    return assignment;
  });
}
