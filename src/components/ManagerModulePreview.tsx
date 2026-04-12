import { useEffect, useMemo } from "react";
import { TRAINING_MODULES } from "../data/trainingModules";
import type { AssignmentProgressSnapshot } from "../engine/trainingCurriculumEngine";
import type { PlayDifficulty } from "../types/gameState";
import { useGameStore } from "../store/gameStore";
import { EmployeeModuleWorkspace } from "./EmployeeModuleWorkspace";
import { TopBar } from "./TopBar";

interface ManagerModulePreviewProps {
  moduleId: string;
  assignedDifficulty: PlayDifficulty;
  jurisdictionCode: string | null;
  onExit: () => void;
}

function formatScenarioTitle(value: string | null) {
  if (!value) {
    return "Locked mortgage scenario";
  }

  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ManagerModulePreview({ moduleId, assignedDifficulty, jurisdictionCode, onExit }: ManagerModulePreviewProps) {
  const setDifficulty = useGameStore((state) => state.setDifficulty);
  const module = useMemo(
    () => TRAINING_MODULES.find((entry) => entry.id === moduleId) ?? TRAINING_MODULES[0],
    [moduleId]
  );

  useEffect(() => {
    if (assignedDifficulty) {
      setDifficulty(assignedDifficulty);
    }
  }, [assignedDifficulty, setDifficulty]);

  if (!module) {
    return null;
  }

  const focusedRibbonItems =
    module.workspace === "mortgage-debt-planning" || module.workspace === "bank-lending"
      ? module.workspace === "mortgage-debt-planning"
        ? ["score", "assignment", "timer", "calendar"] as const
        : ["score", "timer", "calendar"] as const
      : module.workspace === "exam-foundations"
        ? ["score", "timer", "study"] as const
        : undefined;

  const previewMortgageRate = module.workspace === "mortgage-debt-planning"
    ? Number((0.055 + Math.random() * 0.03).toFixed(4))
    : null;
  const previewScenarioId = module.workspace === "mortgage-debt-planning"
    ? "fha-vs-conventional"
    : null;

  const assignment: AssignmentProgressSnapshot = {
    assignmentId: `manager-preview-${module.id}`,
    module: {
      ...module,
      requiredDifficulty: assignedDifficulty
    },
    assignedDifficulty,
    jurisdictionCode,
    assignedMortgageRate: previewMortgageRate,
    assignedMortgageScenarioId: previewScenarioId,
    status: "in-progress",
    completionPercent: 0,
    bestMatchingReport: null,
    dueAt: null,
    assignedAt: Date.now()
  };

  return (
    <main className="layout">
      <TopBar
        brandTitle="Fiduciary Duty — Manager Preview"
        showPlannerTools={module.workspace === "full-access"}
        showDifficultyControls={module.workspace === "full-access"}
        showNewSessionButton={module.workspace === "full-access"}
        showDifficultyRibbon={module.workspace === "full-access"}
        showSessionManager={module.workspace === "full-access"}
        showReloadBank={module.workspace === "full-access"}
        visibleRibbonItems={module.workspace === "full-access" ? undefined : (focusedRibbonItems ? [...focusedRibbonItems] : undefined)}
        assignmentRibbonCard={module.workspace === "mortgage-debt-planning" && previewMortgageRate !== null ? {
          label: "Assigned File",
          title: `${(previewMortgageRate * 100).toFixed(2)}% mortgage`,
          detail: formatScenarioTitle(previewScenarioId)
        } : null}
        extraControls={(
          <button type="button" className="control-btn" onClick={onExit}>
            Back to Manager
          </button>
        )}
      />
      <EmployeeModuleWorkspace assignment={assignment} moduleScore={0} scoreCards={[]} />
    </main>
  );
}
