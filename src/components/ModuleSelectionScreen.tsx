import type { AssignmentProgressSnapshot } from "../engine/trainingCurriculumEngine";
import { getStateName } from "../data/usStates";

interface ModuleSelectionScreenProps {
  assignments: AssignmentProgressSnapshot[];
  selectedAssignmentId: string | null;
  onSelectAssignment: (assignmentId: string) => void;
  onLaunchAssignment: (assignmentId: string) => void;
  onLogout: () => void;
}

function formatDueDate(value: number | null) {
  if (!value) {
    return "No due date";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

export function ModuleSelectionScreen({
  assignments,
  selectedAssignmentId,
  onSelectAssignment,
  onLaunchAssignment,
  onLogout
}: ModuleSelectionScreenProps) {
  const selectedAssignment = assignments.find((assignment) => assignment.assignmentId === selectedAssignmentId) ?? assignments[0] ?? null;

  return (
    <main className="manager-shell module-launch-shell">
      <header className="manager-topbar">
        <div className="manager-brand">
          <p className="eyebrow">Sterling Fiduciary Group</p>
          <h1>Fiduciary Duty — Training</h1>
          <p className="manager-subtitle">Choose one assigned module to start. We’ll only load that workspace so the experience stays focused.</p>
        </div>
        <div className="manager-topbar-actions">
          <button type="button" className="control-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="panel manager-panel">
        <div className="panel-header">
          <h2>Select Assigned Module</h2>
        </div>
        <div className="manager-panel-body">
          <div className="assignment-grid">
            {assignments.map((assignment) => (
              <button
                key={assignment.assignmentId}
                type="button"
                className={`assignment-card assignment-card--${assignment.status}${selectedAssignmentId === assignment.assignmentId ? " assignment-card--selected" : ""}`}
                onClick={() => onSelectAssignment(assignment.assignmentId)}
              >
                <span>{assignment.module.focus}</span>
                <strong>{assignment.module.title}</strong>
                <small>{assignment.module.description}</small>
                {assignment.jurisdictionCode ? <small>State overlay: {getStateName(assignment.jurisdictionCode)}</small> : null}
                <small>{assignment.module.completionLabel}</small>
                <small>Due {formatDueDate(assignment.dueAt)} | {assignment.status.replace("-", " ")}</small>
                <div className="study-meter-track">
                  <div className="study-meter-fill" style={{ width: `${assignment.completionPercent}%` }} />
                </div>
                <small>{assignment.completionPercent}% ready{assignment.bestMatchingReport ? ` | Best ${assignment.bestMatchingReport.overall.grade}` : ""}</small>
              </button>
            ))}
          </div>

          {selectedAssignment ? (
            <div className="portfolio-summary-card module-launch-card">
              <span>Ready to begin</span>
              <strong>{selectedAssignment.module.title}</strong>
              {selectedAssignment.jurisdictionCode ? <small>State overlay: {getStateName(selectedAssignment.jurisdictionCode)}</small> : null}
              <small>{selectedAssignment.module.focus} | {selectedAssignment.module.completionLabel}</small>
              <div className="slot-actions">
                <button
                  type="button"
                  className="primary-btn manager-inline-btn"
                  onClick={() => onLaunchAssignment(selectedAssignment.assignmentId)}
                >
                  Start Module
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
