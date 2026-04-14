import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { CLIENTS } from "../data/clients";
import {
  buildAssignmentSnapshots,
  buildModuleScoreCards,
  computeModuleScore,
  moduleReachedCompletion
} from "../engine/trainingCurriculumEngine";
import { buildTrainingPerformanceSummary } from "../engine/trainingScoreEngine";
import { EmployeeModuleWorkspace } from "./EmployeeModuleWorkspace";
import { ModuleCompletionOverlay } from "./ModuleCompletionOverlay";
import { ModuleSelectionScreen } from "./ModuleSelectionScreen";
import { ModuleUnassignedScreen } from "./ModuleUnassignedScreen";
import { TopBar } from "./TopBar";
import { useGameStore } from "../store/gameStore";

const AuditOverlay = lazy(() => import("./AuditOverlay").then((module) => ({ default: module.AuditOverlay })));
const AccountTransferOverlay = lazy(() => import("./AccountTransferOverlay").then((module) => ({ default: module.AccountTransferOverlay })));
const BehaviorEventOverlay = lazy(() => import("./BehaviorEventOverlay").then((module) => ({ default: module.BehaviorEventOverlay })));
const ClientMeetingOverlay = lazy(() => import("./ClientMeetingOverlay").then((module) => ({ default: module.ClientMeetingOverlay })));
const CycleRecapOverlay = lazy(() => import("./CycleRecapOverlay").then((module) => ({ default: module.CycleRecapOverlay })));
const DocumentationOverlay = lazy(() => import("./DocumentationOverlay").then((module) => ({ default: module.DocumentationOverlay })));
const InsuranceDialogueOverlay = lazy(() => import("./InsuranceDialogueOverlay").then((module) => ({ default: module.InsuranceDialogueOverlay })));
const OnboardingOverlay = lazy(() => import("./OnboardingOverlay").then((module) => ({ default: module.OnboardingOverlay })));
const OperationsRequestOverlay = lazy(() => import("./OperationsRequestOverlay").then((module) => ({ default: module.OperationsRequestOverlay })));
const PlayerComplianceOverlay = lazy(() => import("./PlayerComplianceOverlay").then((module) => ({ default: module.PlayerComplianceOverlay })));
const RecommendationDialogueOverlay = lazy(() => import("./RecommendationDialogueOverlay").then((module) => ({ default: module.RecommendationDialogueOverlay })));
const SessionEndScreen = lazy(() => import("./SessionEndScreen").then((module) => ({ default: module.SessionEndScreen })));
const SupervisionRequestOverlay = lazy(() => import("./SupervisionRequestOverlay").then((module) => ({ default: module.SupervisionRequestOverlay })));

interface EmployeeAppViewProps {
  onLogout: () => void;
}

function formatAssignmentScenarioTitle(value: string | null) {
  if (!value) {
    return null;
  }

  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mortgageScenarioClientId(scenarioId: string | null) {
  switch (scenarioId) {
    case "first-time-buyer":
    case "fha-vs-conventional":
      return "first_home_family";
    case "investor-property":
      return "entrepreneur";
    case "rate-lock":
      return "young_pro";
    default:
      return null;
  }
}

export function EmployeeAppView({ onLogout }: EmployeeAppViewProps) {
  const activeDifficulty = useGameStore((state) => state.activeDifficulty);
  const activeTraineeId = useGameStore((state) => state.activeTraineeId);
  const trainingAssignments = useGameStore((state) => state.trainingAssignments);
  const trainingReports = useGameStore((state) => state.trainingReports);
  const tickTimer = useGameStore((state) => state.tickTimer);
  const initializeQuestionBank = useGameStore((state) => state.initializeQuestionBank);
  const setDifficulty = useGameStore((state) => state.setDifficulty);
  const togglePause = useGameStore((state) => state.togglePause);
  const isPaused = useGameStore((state) => state.isPaused);
  const selectClient = useGameStore((state) => state.selectClient);
  const clients = useGameStore((state) => state.clients);
  const activeClientId = useGameStore((state) => state.activeClientId);
  const activeQuestion = useGameStore((state) => state.activeQuestion);
  const questionOutcomes = useGameStore((state) => state.questionOutcomes);
  const removedClientIds = useGameStore((state) => state.removedClientIds);
  const secMeterLevel = useGameStore((state) => state.secMeterLevel);
  const auditHistory = useGameStore((state) => state.auditHistory);
  const complianceStats = useGameStore((state) => state.complianceStats);
  const playerComplianceLevel = useGameStore((state) => state.playerComplianceLevel);
  const totalAum = useGameStore((state) => state.totalAum);
  const personalPortfolioUsd = useGameStore((state) => state.personalPortfolioUsd);
  const recordTrainingReport = useGameStore((state) => state.recordTrainingReport);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [launchedAssignmentId, setLaunchedAssignmentId] = useState<string | null>(null);
  const [completedAssignmentId, setCompletedAssignmentId] = useState<string | null>(null);
  const [autoBoundMortgageAssignmentId, setAutoBoundMortgageAssignmentId] = useState<string | null>(null);
  const [workspaceTelemetry, setWorkspaceTelemetry] = useState<{
    score: number;
    scoreCards: { label: string; score: number }[];
    answeredCount: number;
  }>({
    score: 0,
    scoreCards: [],
    answeredCount: 0
  });
  const [launchBaseline, setLaunchBaseline] = useState<{
    assignmentId: string;
    moduleScore: number;
    answeredQuestions: number;
  } | null>(null);

  const assignmentSnapshots = useMemo(
    () => buildAssignmentSnapshots(
      trainingAssignments.filter((assignment) => assignment.traineeId === activeTraineeId),
      trainingReports
    ),
    [activeTraineeId, trainingAssignments, trainingReports]
  );
  const activeAssignments = useMemo(
    () => assignmentSnapshots.filter((entry) => entry.status !== "completed"),
    [assignmentSnapshots]
  );

  const selectedAssignment = useMemo(
    () => activeAssignments.find((entry) => entry.assignmentId === selectedAssignmentId) ?? activeAssignments[0] ?? null,
    [activeAssignments, selectedAssignmentId]
  );
  const launchedAssignment = useMemo(
    () => activeAssignments.find((entry) => entry.assignmentId === launchedAssignmentId) ?? null,
    [activeAssignments, launchedAssignmentId]
  );

  const startingBook = useMemo(() => CLIENTS.reduce((total, client) => total + client.startingAum, 0), []);
  const answeredQuestions = questionOutcomes.length;
  const correctAnswers = questionOutcomes.filter((outcome) => outcome.correct).length;
  const studyAccuracy = answeredQuestions === 0 ? 0 : (correctAnswers / answeredQuestions) * 100;
  const trainingSummary = useMemo(() => buildTrainingPerformanceSummary({
    questionOutcomes,
    clients,
    removedClientIds,
    secMeterLevel,
    auditHistory,
    complianceStats,
    playerComplianceLevel,
    totalAum,
    startingBook,
    personalEquity: personalPortfolioUsd,
    startingPersonalEquity: 100000
  }), [
    auditHistory,
    clients,
    complianceStats,
    personalPortfolioUsd,
    playerComplianceLevel,
    questionOutcomes,
    removedClientIds,
    secMeterLevel,
    startingBook,
    totalAum
  ]);

  const moduleMetrics = useMemo(() => ({
    difficulty: activeDifficulty,
    studyAccuracy,
    answeredQuestions: launchedAssignment?.module.workspace === "client-meeting-readiness" ? workspaceTelemetry.answeredCount : answeredQuestions,
    summary: trainingSummary,
    workspaceScoreOverride: launchedAssignment?.module.workspace === "client-meeting-readiness" ? workspaceTelemetry.score : null,
    workspaceScoreCards: launchedAssignment?.module.workspace === "client-meeting-readiness" ? workspaceTelemetry.scoreCards : null
  }), [activeDifficulty, answeredQuestions, launchedAssignment, studyAccuracy, trainingSummary, workspaceTelemetry]);

  const moduleScore = launchedAssignment ? computeModuleScore(launchedAssignment.module, moduleMetrics) : 0;
  const moduleScoreCards = launchedAssignment ? buildModuleScoreCards(launchedAssignment.module, moduleMetrics) : [];
  const moduleShowsLaunchProgress = useMemo(() => {
    if (!launchedAssignment || !launchBaseline || launchBaseline.assignmentId !== launchedAssignment.assignmentId) {
      return false;
    }

    return (
      moduleScore > launchBaseline.moduleScore ||
      moduleMetrics.answeredQuestions > launchBaseline.answeredQuestions
    );
  }, [launchedAssignment, launchBaseline, moduleMetrics.answeredQuestions, moduleScore]);

  useEffect(() => {
    if (!selectedAssignmentId && selectedAssignment) {
      setSelectedAssignmentId(selectedAssignment.assignmentId);
    }
  }, [selectedAssignment, selectedAssignmentId]);

  useEffect(() => {
    if (launchedAssignmentId && !activeAssignments.some((entry) => entry.assignmentId === launchedAssignmentId)) {
      setLaunchedAssignmentId(null);
      setLaunchBaseline(null);
      setAutoBoundMortgageAssignmentId(null);
    }
  }, [activeAssignments, launchedAssignmentId]);

  useEffect(() => {
    if (launchedAssignment?.module.requiredDifficulty && launchedAssignment.module.requiredDifficulty !== activeDifficulty) {
      setDifficulty(launchedAssignment.module.requiredDifficulty);
    }
  }, [activeDifficulty, launchedAssignment, setDifficulty]);

  useEffect(() => {
    if (!launchedAssignment) {
      return;
    }

    const requiresClientContext =
      launchedAssignment.module.workspace === "exam-foundations" ||
      launchedAssignment.module.workspace === "suitability-client-fit" ||
      launchedAssignment.module.workspace === "retirement-planning" ||
      launchedAssignment.module.workspace === "mortgage-debt-planning" ||
      launchedAssignment.module.workspace === "bank-lending" ||
      launchedAssignment.module.workspace === "client-meeting-readiness";

    if (launchedAssignment.module.workspace === "mortgage-debt-planning" && autoBoundMortgageAssignmentId !== launchedAssignment.assignmentId) {
      const mappedClientId = mortgageScenarioClientId(launchedAssignment.assignedMortgageScenarioId);
      const mappedClientExists = mappedClientId ? clients.some((client) => client.id === mappedClientId) : false;
      if (mappedClientId && mappedClientExists && activeClientId !== mappedClientId) {
        setAutoBoundMortgageAssignmentId(launchedAssignment.assignmentId);
        void selectClient(mappedClientId);
        return;
      }
      if (mappedClientId && mappedClientExists) {
        setAutoBoundMortgageAssignmentId(launchedAssignment.assignmentId);
      }
    }

    if (requiresClientContext && clients[0] && (!activeClientId || activeClientId === "player")) {
      void selectClient(clients[0].id);
    }

    if (launchedAssignment.module.workspace === "exam-foundations" && !activeQuestion.question && clients[0]) {
      void selectClient(clients[0].id);
    }
  }, [activeClientId, activeQuestion.question, autoBoundMortgageAssignmentId, clients, launchedAssignment, selectClient]);

  useEffect(() => {
    if (!launchedAssignment || !launchedAssignment.module.endsWhenCompleted || launchedAssignment.status === "completed") {
      return;
    }

    if (!moduleShowsLaunchProgress) {
      return;
    }

    if (!moduleReachedCompletion(launchedAssignment.module, moduleMetrics)) {
      return;
    }

    recordTrainingReport({
      moduleId: launchedAssignment.module.id,
      moduleTitle: launchedAssignment.module.title,
      moduleScore,
      moduleSummary: launchedAssignment.module.completionLabel,
      moduleScoreCards: moduleScoreCards.map((card) => ({
        label: card.label,
        score: card.score,
        summary: card.summary ?? ""
      }))
    });
    if (!isPaused) {
      togglePause();
    }
    setCompletedAssignmentId(launchedAssignment.assignmentId);
  }, [isPaused, launchedAssignment, moduleMetrics, moduleShowsLaunchProgress, recordTrainingReport, togglePause]);

  useEffect(() => {
    if (activeAssignments.length === 0) {
      return undefined;
    }

    const timer = window.setInterval(() => tickTimer(), 1000);
    return () => window.clearInterval(timer);
  }, [activeAssignments.length, tickTimer]);

  useEffect(() => {
    if (!launchedAssignment) {
      return;
    }

    void initializeQuestionBank(launchedAssignment.module.requiredDifficulty ?? activeDifficulty);
  }, [activeDifficulty, initializeQuestionBank, launchedAssignment]);

  if (activeAssignments.length === 0) {
    return <ModuleUnassignedScreen onLogout={onLogout} />;
  }

  if (!launchedAssignment) {
    return (
      <ModuleSelectionScreen
        assignments={activeAssignments}
        selectedAssignmentId={selectedAssignment?.assignmentId ?? null}
        onSelectAssignment={setSelectedAssignmentId}
        onLaunchAssignment={(assignmentId) => {
          const assignment = activeAssignments.find((entry) => entry.assignmentId === assignmentId) ?? null;
          const baselineMetrics = assignment ? {
            difficulty: assignment.module.requiredDifficulty ?? activeDifficulty,
            studyAccuracy,
            answeredQuestions,
            summary: trainingSummary,
            workspaceScoreOverride: null,
            workspaceScoreCards: null
          } : null;
          setWorkspaceTelemetry({ score: 0, scoreCards: [], answeredCount: 0 });
          setLaunchBaseline(
            assignment && baselineMetrics
              ? {
                  assignmentId,
                  moduleScore: computeModuleScore(assignment.module, baselineMetrics),
                  answeredQuestions
                }
              : null
          );
          setLaunchedAssignmentId(assignmentId);
        }}
        onLogout={onLogout}
      />
    );
  }

  const showPlannerTools = launchedAssignment.module.workspace === "full-access";
  const showFullAccessControls = launchedAssignment.module.workspace === "full-access";
  const topBarTitle = showFullAccessControls ? "Fiduciary Duty - Training" : `Fiduciary Duty - ${launchedAssignment.module.title}`;
  const assignmentRibbonCard =
    launchedAssignment.module.workspace === "mortgage-debt-planning" && launchedAssignment.assignedMortgageRate !== null
      ? {
          label: "Assigned File",
          title: `${(launchedAssignment.assignedMortgageRate * 100).toFixed(2)}% mortgage`,
          detail: formatAssignmentScenarioTitle(launchedAssignment.assignedMortgageScenarioId) ?? "Locked mortgage scenario"
        }
      : null;
  const focusedRibbonItems =
    launchedAssignment.module.workspace === "exam-foundations"
      ? ["score", "timer", "study", "trainee", "coach"] as const
      : launchedAssignment.module.workspace === "suitability-client-fit"
        ? ["score", "client", "timer", "sec", "trainee", "coach"] as const
        : launchedAssignment.module.workspace === "retirement-planning"
          ? ["score", "client", "timer", "sec", "trainee", "coach", "calendar"] as const
          : launchedAssignment.module.workspace === "mortgage-debt-planning"
            ? ["score", "assignment", "timer", "calendar"] as const
            : launchedAssignment.module.workspace === "bank-lending"
              ? ["score", "timer", "calendar"] as const
              : launchedAssignment.module.workspace === "client-meeting-readiness"
                ? ["score", "timer", "trainee", "coach"] as const
                : undefined;

  return (
    <main className="layout">
      <TopBar
        brandTitle={topBarTitle}
        showPlannerTools={showPlannerTools}
        showDifficultyControls={showFullAccessControls}
        showNewSessionButton={showFullAccessControls}
        showDifficultyRibbon={showFullAccessControls}
        showSessionManager={showFullAccessControls}
        showReloadBank={showFullAccessControls}
        visibleRibbonItems={showFullAccessControls ? undefined : (focusedRibbonItems ? [...focusedRibbonItems] : undefined)}
        assignmentRibbonCard={assignmentRibbonCard}
        extraControls={(
          <>
            <button type="button" className="control-btn" onClick={() => setLaunchedAssignmentId(null)}>
              Main Menu
            </button>
            <button type="button" className="control-btn" onClick={onLogout}>
              Logout
            </button>
          </>
        )}
      />
      <EmployeeModuleWorkspace
        assignment={launchedAssignment}
        moduleScore={moduleScore}
        scoreCards={moduleScoreCards}
        onModuleTelemetryChange={(telemetry) => setWorkspaceTelemetry(telemetry)}
      />
      {completedAssignmentId === launchedAssignment.assignmentId && launchedAssignment.module.completionScoreTarget !== null ? (
        <ModuleCompletionOverlay
          module={launchedAssignment.module}
          moduleScore={moduleScore}
          targetScore={launchedAssignment.module.completionScoreTarget}
          onDismiss={() => {
            setCompletedAssignmentId(null);
            setLaunchedAssignmentId(null);
            setLaunchBaseline(null);
            setWorkspaceTelemetry({ score: 0, scoreCards: [], answeredCount: 0 });
            const nextPending = activeAssignments.find((entry) => entry.assignmentId !== launchedAssignment.assignmentId);
            if (nextPending) {
              setSelectedAssignmentId(nextPending.assignmentId);
            }
          }}
        />
      ) : null}
      <Suspense fallback={null}>
        <AuditOverlay />
        <AccountTransferOverlay />
        <BehaviorEventOverlay />
        <ClientMeetingOverlay />
        <CycleRecapOverlay />
        <DocumentationOverlay />
        <InsuranceDialogueOverlay />
        <OnboardingOverlay />
        <OperationsRequestOverlay />
        <PlayerComplianceOverlay />
        <RecommendationDialogueOverlay />
        <SessionEndScreen />
        <SupervisionRequestOverlay />
      </Suspense>
    </main>
  );
}
