import { useMemo, useState } from "react";
import { DIFFICULTY_LABELS } from "../data/examBlueprints";
import { getMortgageStateProfile } from "../data/mortgageStateProfiles";
import { TRAINING_MODULES } from "../data/trainingModules";
import { getStateName, US_STATES } from "../data/usStates";
import { buildAssignmentSnapshots } from "../engine/trainingCurriculumEngine";
import type { ManagerDashboardState, User } from "../types/auth";
import type { PlayDifficulty } from "../types/gameState";
import { useGameStore } from "../store/gameStore";

interface ManagerDashboardProps {
  currentUser: User;
  users: User[];
  onLogout: () => void;
  onAddEmployee: (input: { displayName: string; username: string; password: string }) => void | Promise<void>;
  onRemoveEmployee: (userId: string) => void;
  onChangeManagerPassword: (currentPassword: string, nextPassword: string) => void | Promise<void>;
  onAssignModule: (traineeId: string, moduleId: string, assignedDifficulty: PlayDifficulty, dueAt: number | null, jurisdictionCode: string | null) => void;
  onRemoveModule: (assignmentId: string) => void;
  onLaunchModulePreview: (moduleId: string, assignedDifficulty: PlayDifficulty, jurisdictionCode: string | null) => void;
}

const defaultDashboardState: ManagerDashboardState = {
  newEmployeeName: "",
  newEmployeeUsername: "",
  newEmployeePassword: "",
  selectedEmployeeId: "",
  selectedModuleId: TRAINING_MODULES[0]?.id ?? "",
  selectedModuleDifficulty: TRAINING_MODULES[0]?.requiredDifficulty ?? "learner",
  selectedJurisdictionCode: "CA",
  assignmentDueDate: "",
  passwordChangeCurrent: "",
  passwordChangeNext: "",
  passwordChangeConfirm: "",
  error: null
};

const DIFFICULTY_DESCRIPTIONS: Record<PlayDifficulty, string> = {
  learner: "Most guided pacing. Best for foundations and first-pass recall.",
  trainee: "Adds more independent recognition and broader exam application.",
  associate: "Working-practice pace with more judgment expected from the trainee.",
  advisor: "Advanced planning and communication pressure with less hand-holding.",
  senior: "Highest-pressure environment for complex judgment and compliance discipline."
};

function formatStamp(value: number) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function ManagerDashboard({
  currentUser,
  users,
  onLogout,
  onAddEmployee,
  onRemoveEmployee,
  onChangeManagerPassword,
  onAssignModule,
  onRemoveModule,
  onLaunchModulePreview
}: ManagerDashboardProps) {
  const [dashboardState, setDashboardState] = useState<ManagerDashboardState>(defaultDashboardState);
  const trainees = useGameStore((state) => state.trainees);
  const trainingAssignments = useGameStore((state) => state.trainingAssignments);
  const trainingReports = useGameStore((state) => state.trainingReports);

  const employeeUsers = useMemo(() => users.filter((user) => user.role === "employee"), [users]);
  const assignmentSnapshots = useMemo(() => buildAssignmentSnapshots(trainingAssignments, trainingReports), [trainingAssignments, trainingReports]);
  const employeeCards = useMemo(() => employeeUsers.map((user) => {
    const reports = trainingReports.filter((report) => report.traineeId === user.id);
    const latestReport = reports[0] ?? null;
    const averageOverall = reports.length === 0 ? 0 : reports.reduce((sum, report) => sum + report.overall.score, 0) / reports.length;
    const trainee = trainees.find((entry) => entry.id === user.id) ?? null;

    return {
      user,
      trainee,
      reports,
      latestReport,
      averageOverall
    };
  }), [employeeUsers, trainees, trainingReports]);

  const managerNeedsPasswordChange = currentUser.mustChangePassword;
  const selectedModule = TRAINING_MODULES.find((entry) => entry.id === dashboardState.selectedModuleId) ?? null;
  const selectedMortgageStateProfile = getMortgageStateProfile(dashboardState.selectedJurisdictionCode);

  const updateState = (next: Partial<ManagerDashboardState>) => {
    setDashboardState((previous) => ({ ...previous, ...next }));
  };

  const applySelectedModule = (moduleId: string) => {
    const module = TRAINING_MODULES.find((entry) => entry.id === moduleId);
    updateState({
      selectedModuleId: moduleId,
      selectedModuleDifficulty: module?.requiredDifficulty ?? dashboardState.selectedModuleDifficulty,
      error: null
    });
  };

  const resetAddEmployeeForm = () => {
    updateState({
      newEmployeeName: "",
      newEmployeeUsername: "",
      newEmployeePassword: "",
      selectedEmployeeId: "",
      error: null
    });
  };

  return (
    <main className="manager-shell">
      <header className="manager-topbar">
        <div className="manager-brand">
          <p className="eyebrow">Sterling Fiduciary Group</p>
          <h1>Fiduciary Duty — Manager</h1>
          <p className="manager-subtitle">Coaching visibility, module assignment, and safe trainee support areas.</p>
        </div>
        <div className="manager-topbar-actions">
          <div className="manager-badge">
            <span>Manager Admin</span>
            <strong>{currentUser.displayName}</strong>
          </div>
          <div className="manager-badge">
            <span>Module Preview</span>
            <select
              value={dashboardState.selectedModuleId}
              onChange={(event) => applySelectedModule(event.target.value)}
            >
              {TRAINING_MODULES.map((module) => (
                <option key={module.id} value={module.id}>{module.title}</option>
              ))}
            </select>
            <button
              type="button"
              className="control-btn"
              onClick={() => onLaunchModulePreview(
                dashboardState.selectedModuleId,
                dashboardState.selectedModuleDifficulty,
                selectedModule?.workspace === "mortgage-debt-planning" ? dashboardState.selectedJurisdictionCode : null
              )}
            >
              Launch
            </button>
          </div>
          <button type="button" className="control-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      {managerNeedsPasswordChange ? (
        <section className="panel manager-password-panel">
          <div className="panel-header">
            <h2>Change Admin Password</h2>
          </div>
          <div className="manager-password-grid">
            <label>
              Current password
              <input
                type="password"
                value={dashboardState.passwordChangeCurrent}
                onChange={(event) => updateState({ passwordChangeCurrent: event.target.value, error: null })}
              />
            </label>
            <label>
              New password
              <input
                type="password"
                value={dashboardState.passwordChangeNext}
                onChange={(event) => updateState({ passwordChangeNext: event.target.value, error: null })}
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                value={dashboardState.passwordChangeConfirm}
                onChange={(event) => updateState({ passwordChangeConfirm: event.target.value, error: null })}
              />
            </label>
            {dashboardState.error ? <div className="auth-error">{dashboardState.error}</div> : null}
            <button
              type="button"
              className="primary-btn manager-inline-btn"
              onClick={async () => {
                if (!dashboardState.passwordChangeNext || dashboardState.passwordChangeNext.length < 6) {
                  updateState({ error: "Choose a stronger password with at least 6 characters." });
                  return;
                }
                if (dashboardState.passwordChangeNext !== dashboardState.passwordChangeConfirm) {
                  updateState({ error: "The new passwords do not match." });
                  return;
                }
                try {
                  await onChangeManagerPassword(dashboardState.passwordChangeCurrent, dashboardState.passwordChangeNext);
                  updateState({
                    passwordChangeCurrent: "",
                    passwordChangeNext: "",
                    passwordChangeConfirm: "",
                    error: null
                  });
                } catch (error) {
                  updateState({ error: error instanceof Error ? error.message : "Unable to update password." });
                }
              }}
            >
              Update Password
            </button>
          </div>
        </section>
      ) : null}

      <div className="manager-grid">
        <section className="panel manager-panel">
          <div className="panel-header">
            <h2>Employee Accounts</h2>
          </div>
          <div className="manager-panel-body">
            <div className="manager-form-grid">
              <label>
                Employee name
                <input
                  value={dashboardState.newEmployeeName}
                  onChange={(event) => updateState({ newEmployeeName: event.target.value, error: null })}
                />
              </label>
              <label>
                Username
                <input
                  value={dashboardState.newEmployeeUsername}
                  onChange={(event) => updateState({ newEmployeeUsername: event.target.value, error: null })}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={dashboardState.newEmployeePassword}
                  onChange={(event) => updateState({ newEmployeePassword: event.target.value, error: null })}
                />
              </label>
            </div>
            {dashboardState.error ? <div className="auth-error">{dashboardState.error}</div> : null}
            <div className="slot-actions">
              <button
                type="button"
                className="primary-btn manager-inline-btn"
                onClick={async () => {
                  if (!dashboardState.newEmployeeName.trim() || !dashboardState.newEmployeeUsername.trim() || !dashboardState.newEmployeePassword.trim()) {
                    updateState({ error: "Name, username, and password are all required." });
                    return;
                  }
                  try {
                    await onAddEmployee({
                      displayName: dashboardState.newEmployeeName.trim(),
                      username: dashboardState.newEmployeeUsername.trim(),
                      password: dashboardState.newEmployeePassword
                    });
                    resetAddEmployeeForm();
                  } catch (error) {
                    updateState({ error: error instanceof Error ? error.message : "Unable to add employee." });
                  }
                }}
              >
                Add Employee
              </button>
            </div>

            <div className="manager-form-grid">
              <label>
                Assign to employee
                <select
                  value={dashboardState.selectedEmployeeId}
                  onChange={(event) => updateState({ selectedEmployeeId: event.target.value, error: null })}
                >
                  <option value="">Select employee</option>
                  {employeeUsers.map((user) => (
                    <option key={user.id} value={user.id}>{user.displayName}</option>
                  ))}
                </select>
              </label>
              <label>
                Module
                <select
                  value={dashboardState.selectedModuleId}
                  onChange={(event) => applySelectedModule(event.target.value)}
                >
                  {TRAINING_MODULES.map((module) => (
                    <option key={module.id} value={module.id}>{module.title}</option>
                  ))}
                </select>
              </label>
              <label>
                Difficulty
                <select
                  value={dashboardState.selectedModuleDifficulty}
                  onChange={(event) => updateState({ selectedModuleDifficulty: event.target.value as PlayDifficulty, error: null })}
                >
                  {(["learner", "trainee", "associate", "advisor", "senior"] as const).map((difficulty) => (
                    <option key={difficulty} value={difficulty}>{DIFFICULTY_LABELS[difficulty]}</option>
                  ))}
                </select>
              </label>
              {selectedModule?.workspace === "mortgage-debt-planning" ? (
                <label>
                  State law overlay
                  <select
                    value={dashboardState.selectedJurisdictionCode}
                    onChange={(event) => updateState({ selectedJurisdictionCode: event.target.value, error: null })}
                  >
                    {US_STATES.map((state) => (
                      <option key={state.code} value={state.code}>{state.name}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label>
                Due date
                <input
                  type="date"
                  value={dashboardState.assignmentDueDate}
                  onChange={(event) => updateState({ assignmentDueDate: event.target.value, error: null })}
                />
              </label>
            </div>
            <div className="slot-actions">
              <button
                type="button"
                className="control-btn active"
                onClick={() => {
                  if (!dashboardState.selectedEmployeeId || !dashboardState.selectedModuleId) {
                    updateState({ error: "Choose an employee and module before assigning curriculum." });
                    return;
                  }

                  const dueAt = dashboardState.assignmentDueDate ? new Date(`${dashboardState.assignmentDueDate}T12:00:00`).getTime() : null;
                  onAssignModule(
                    dashboardState.selectedEmployeeId,
                    dashboardState.selectedModuleId,
                    dashboardState.selectedModuleDifficulty,
                    dueAt,
                    selectedModule?.workspace === "mortgage-debt-planning" ? dashboardState.selectedJurisdictionCode : null
                  );
                  updateState({ assignmentDueDate: "", error: null });
                }}
              >
                Assign Module
              </button>
            </div>
            <div className="manager-employee-list">
              {employeeCards.length === 0 ? (
                <div className="empty-state">No employee accounts have been created yet.</div>
              ) : employeeCards.map(({ user, latestReport, averageOverall, reports, trainee }) => (
                <div key={user.id} className="slot-card manager-employee-card">
                  <div className="slot-copy">
                    <strong>{user.displayName}</strong>
                    <span>{user.username}</span>
                    <span>{trainee?.role ?? "Trainee"} | {reports.length} sessions logged</span>
                    <span>{latestReport ? `Latest ${latestReport.overall.grade} on ${formatStamp(latestReport.endedAt)}` : "No completed sessions yet"}</span>
                    <span>{reports.length ? `Average readiness ${averageOverall.toFixed(0)}/100` : "Awaiting first report"}</span>
                  </div>
                  <div className="slot-actions">
                    <button type="button" className="control-btn" onClick={() => onRemoveEmployee(user.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel manager-panel">
          <div className="panel-header">
            <h2>Coaching Snapshot</h2>
          </div>
          <div className="manager-panel-body manager-report-list">
            {employeeCards.length === 0 ? (
              <div className="empty-state">Create employee accounts to begin tracking progress.</div>
            ) : employeeCards.map(({ user, latestReport, reports }) => (
              <div key={`${user.id}-report`} className="portfolio-summary-card manager-report-card">
                <span>{user.displayName}</span>
                <strong>{latestReport ? `Readiness ${latestReport.overall.grade} (${latestReport.overall.score}/100)` : "No score yet"}</strong>
                <small>
                  {latestReport
                    ? `${DIFFICULTY_LABELS[latestReport.difficulty]} | Exam ${latestReport.examReadiness.grade} | Advisor ${latestReport.advisorPerformance.grade} | Compliance ${latestReport.compliance.grade}`
                    : "Waiting for the first completed session."}
                </small>
                <small>
                  {latestReport
                    ? `${latestReport.correctAnswers}/${latestReport.answeredQuestions} correct | ${latestReport.studyAccuracy.toFixed(0)}% accuracy | ${latestReport.clientCount} retained / ${latestReport.lostClientCount} lost`
                    : `${reports.length} logged sessions`}
                </small>
              </div>
            ))}
          </div>
        </section>

        <section className="panel manager-panel">
          <div className="panel-header">
            <h2>Difficulty Guide</h2>
          </div>
          <div className="manager-panel-body manager-report-list">
            {(["learner", "trainee", "associate", "advisor", "senior"] as const).map((difficulty) => (
              <div key={difficulty} className="portfolio-summary-card manager-report-card">
                <span>{DIFFICULTY_LABELS[difficulty]}</span>
                <strong>{difficulty === dashboardState.selectedModuleDifficulty ? "Selected for assignment" : "Available"}</strong>
                <small>{DIFFICULTY_DESCRIPTIONS[difficulty]}</small>
              </div>
            ))}
          </div>
        </section>

        {selectedModule?.workspace === "mortgage-debt-planning" && selectedMortgageStateProfile ? (
          <section className="panel manager-panel">
            <div className="panel-header">
              <h2>Mortgage State Overlay</h2>
            </div>
            <div className="manager-panel-body manager-report-list">
              <div className="portfolio-summary-card manager-report-card">
                <span>{selectedMortgageStateProfile.name}</span>
                <strong>{selectedMortgageStateProfile.foreclosureTrack}</strong>
                <small>{selectedMortgageStateProfile.deficiencyExposure} | {selectedMortgageStateProfile.closingStyle}</small>
                <small>{selectedMortgageStateProfile.trainingNote}</small>
              </div>
              <div className="portfolio-summary-card manager-report-card">
                <span>First-time buyer coaching</span>
                <strong>Assigned state emphasis</strong>
                <small>{selectedMortgageStateProfile.firstTimeBuyerFocus}</small>
              </div>
              <div className="portfolio-summary-card manager-report-card">
                <span>FHA vs conventional coaching</span>
                <strong>Assigned state emphasis</strong>
                <small>{selectedMortgageStateProfile.fhaConventionalFocus}</small>
              </div>
              <div className="portfolio-summary-card manager-report-card">
                <span>Investor and rate-lock coaching</span>
                <strong>Assigned state emphasis</strong>
                <small>{selectedMortgageStateProfile.investorPropertyFocus}</small>
                <small>{selectedMortgageStateProfile.rateLockFocus}</small>
              </div>
            </div>
          </section>
        ) : null}

        <section className="panel manager-panel">
          <div className="panel-header">
            <h2>Curriculum Assignments</h2>
          </div>
          <div className="manager-panel-body manager-report-list">
            {assignmentSnapshots.length === 0 ? (
              <div className="empty-state">Assigned modules will appear here with readiness progress and completion status.</div>
            ) : assignmentSnapshots.map((snapshot) => {
              const assignment = trainingAssignments.find((entry) => entry.id === snapshot.assignmentId);
              const employeeName = employeeUsers.find((user) => user.id === assignment?.traineeId)?.displayName
                ?? trainees.find((entry) => entry.id === assignment?.traineeId)?.name
                ?? "Assigned trainee";

              return (
                <div key={snapshot.assignmentId} className="portfolio-summary-card manager-report-card">
                  <span>{employeeName}</span>
                  <strong>{snapshot.module.title}</strong>
                  <small>{snapshot.module.focus} | {DIFFICULTY_LABELS[snapshot.module.requiredDifficulty ?? "learner"]} | {snapshot.status.replace("-", " ")} | {snapshot.completionPercent}% ready</small>
                  {snapshot.jurisdictionCode ? <small>State overlay: {getStateName(snapshot.jurisdictionCode)}</small> : null}
                  <small>{snapshot.module.completionLabel}</small>
                  <small>{snapshot.dueAt ? `Due ${new Date(snapshot.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "No due date"}{snapshot.bestMatchingReport ? ` | Best ${snapshot.bestMatchingReport.overall.grade}` : ""}</small>
                  <div className="slot-actions">
                    <button type="button" className="control-btn" onClick={() => onRemoveModule(snapshot.assignmentId)}>
                      Remove Module
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
