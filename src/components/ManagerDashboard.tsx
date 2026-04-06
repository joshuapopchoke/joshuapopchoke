import { useMemo, useState } from "react";
import type { ManagerDashboardState, User } from "../types/auth";
import { DIFFICULTY_LABELS } from "../data/examBlueprints";
import { useGameStore } from "../store/gameStore";

interface ManagerDashboardProps {
  currentUser: User;
  users: User[];
  onLogout: () => void;
  onAddEmployee: (input: { displayName: string; username: string; password: string }) => void;
  onRemoveEmployee: (userId: string) => void;
  onChangeManagerPassword: (currentPassword: string, nextPassword: string) => void;
}

const defaultDashboardState: ManagerDashboardState = {
  newEmployeeName: "",
  newEmployeeUsername: "",
  newEmployeePassword: "",
  passwordChangeCurrent: "",
  passwordChangeNext: "",
  passwordChangeConfirm: "",
  error: null
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
  onChangeManagerPassword
}: ManagerDashboardProps) {
  const [dashboardState, setDashboardState] = useState<ManagerDashboardState>(defaultDashboardState);
  const trainees = useGameStore((state) => state.trainees);
  const trainingReports = useGameStore((state) => state.trainingReports);

  const employeeUsers = useMemo(() => users.filter((user) => user.role === "employee"), [users]);
  const employeeCards = useMemo(() => employeeUsers.map((user) => {
    const reports = trainingReports.filter((report) => report.traineeId === user.id);
    const latestReport = reports[0] ?? null;
    const averageOverall = reports.length === 0
      ? 0
      : reports.reduce((sum, report) => sum + report.overall.score, 0) / reports.length;
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

  const updateState = (next: Partial<ManagerDashboardState>) => {
    setDashboardState((previous) => ({ ...previous, ...next }));
  };

  const resetAddEmployeeForm = () => {
    updateState({
      newEmployeeName: "",
      newEmployeeUsername: "",
      newEmployeePassword: "",
      error: null
    });
  };

  return (
    <main className="manager-shell">
      <header className="manager-topbar">
        <div className="manager-brand">
          <p className="eyebrow">Sterling Fiduciary Group</p>
          <h1>Fiduciary Duty — Manager</h1>
          <p className="manager-subtitle">Training oversight, employee access management, and score monitoring.</p>
        </div>
        <div className="manager-topbar-actions">
          <div className="manager-badge">
            <span>Manager</span>
            <strong>{currentUser.displayName}</strong>
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
              onClick={() => {
                if (!dashboardState.passwordChangeNext || dashboardState.passwordChangeNext.length < 6) {
                  updateState({ error: "Choose a stronger password with at least 6 characters." });
                  return;
                }
                if (dashboardState.passwordChangeNext !== dashboardState.passwordChangeConfirm) {
                  updateState({ error: "The new passwords do not match." });
                  return;
                }
                try {
                  onChangeManagerPassword(dashboardState.passwordChangeCurrent, dashboardState.passwordChangeNext);
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
                onClick={() => {
                  if (!dashboardState.newEmployeeName.trim() || !dashboardState.newEmployeeUsername.trim() || !dashboardState.newEmployeePassword.trim()) {
                    updateState({ error: "Name, username, and password are all required." });
                    return;
                  }
                  try {
                    onAddEmployee({
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
                    <span>{reports.length ? `Average overall ${averageOverall.toFixed(0)}/100` : "Awaiting first report"}</span>
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
            <h2>Progress and Scores</h2>
          </div>
          <div className="manager-panel-body manager-report-list">
            {employeeCards.length === 0 ? (
              <div className="empty-state">Create employee accounts to begin tracking progress.</div>
            ) : employeeCards.map(({ user, latestReport, reports }) => (
              <div key={`${user.id}-report`} className="portfolio-summary-card manager-report-card">
                <span>{user.displayName}</span>
                <strong>{latestReport ? `Overall ${latestReport.overall.grade} (${latestReport.overall.score}/100)` : "No score yet"}</strong>
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
      </div>
    </main>
  );
}
