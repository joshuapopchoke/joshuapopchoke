import { Suspense, lazy } from "react";
import type { AssignmentProgressSnapshot, ModuleScoreCard } from "../engine/trainingCurriculumEngine";
import { ClientRoster } from "./ClientRoster";
import { MarketChart } from "./MarketChart";
import { OrderEntry } from "./OrderEntry";
import { QuestionPanel } from "./QuestionPanel";
import { StudyDashboard } from "./StudyDashboard";
import { MortgageDebtPlanningPanel } from "./MortgageDebtPlanningPanel";
import { BankLendingPanel } from "./BankLendingPanel";
import { ClientMeetingReadinessPanel } from "./ClientMeetingReadinessPanel";
import { MortgageContextPanel } from "./MortgageContextPanel";
import { LendingContextPanel } from "./LendingContextPanel";
import { useGameStore } from "../store/gameStore";

const PortfolioPanel = lazy(() => import("./PortfolioPanel").then((module) => ({ default: module.PortfolioPanel })));
const ResearchTerminal = lazy(() => import("./ResearchTerminal").then((module) => ({ default: module.ResearchTerminal })));

interface EmployeeModuleWorkspaceProps {
  assignment: AssignmentProgressSnapshot;
  moduleScore: number;
  scoreCards: ModuleScoreCard[];
  onModuleTelemetryChange?: (telemetry: {
    score: number;
    scoreCards: ModuleScoreCard[];
    answeredCount: number;
  }) => void;
}

function ModuleBanner({ assignment, moduleScore, scoreCards }: EmployeeModuleWorkspaceProps) {
  return (
    <section className="panel module-banner">
      <div className="panel-header">
        <div className="side-panel-heading">
          <h2>{assignment.module.title}</h2>
          <span className="panel-meta">{assignment.module.focus}</span>
        </div>
      </div>
      <div className="study-summary-grid">
        <div className="study-summary-card">
          <span>Module Score</span>
          <strong>{moduleScore}/100</strong>
          <small>{assignment.module.completionLabel}</small>
        </div>
        {scoreCards.map((card) => (
          <div key={card.label} className="study-summary-card">
            <span>{card.label}</span>
            <strong>{card.score}/100</strong>
            <small>{assignment.module.coachingSignals.join(" | ")}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

export function EmployeeModuleWorkspace(props: EmployeeModuleWorkspaceProps) {
  const activeTab = useGameStore((state) => state.activeTab);
  const setTab = useGameStore((state) => state.setTab);
  const { assignment } = props;

  switch (assignment.module.workspace) {
    case "exam-foundations":
      return (
        <div className="module-layout module-layout--single">
          <ModuleBanner {...props} />
          <QuestionPanel />
        </div>
      );
    case "suitability-client-fit":
      return (
        <div className="module-layout module-layout--three">
          <ClientRoster />
          <div className="center-column">
            <ModuleBanner {...props} />
            <MarketChart />
            <OrderEntry />
          </div>
          <section className="panel side-shell">
            <div className="panel-header">
              <div className="side-panel-heading">
                <h2>Suitability Monitor</h2>
                <span className="panel-meta">Client fit, sleeve totals, and suitability context</span>
              </div>
            </div>
            <Suspense fallback={<div className="empty-state">Loading panel...</div>}>
              <PortfolioPanel />
            </Suspense>
          </section>
        </div>
      );
    case "retirement-planning":
      return (
        <div className="module-layout module-layout--three">
          <ClientRoster />
          <div className="center-column">
            <ModuleBanner {...props} />
            <OrderEntry />
          </div>
          <section className="panel side-shell">
            <div className="panel-header tabs">
              <div className="side-panel-heading">
                <h2>{activeTab === "research" ? "Retirement Research" : "Retirement Portfolio"}</h2>
                <span className="panel-meta">Wealth protection, tax sleeves, and planning context</span>
              </div>
              <div className="tabs">
                <button type="button" className={activeTab === "research" ? "tab-btn active" : "tab-btn"} onClick={() => setTab("research")}>
                  Research
                </button>
                <button type="button" className={activeTab === "portfolio" ? "tab-btn active" : "tab-btn"} onClick={() => setTab("portfolio")}>
                  Portfolio
                </button>
              </div>
            </div>
            <Suspense fallback={<div className="empty-state">Loading panel...</div>}>
              {activeTab === "research" ? <ResearchTerminal /> : <PortfolioPanel />}
            </Suspense>
          </section>
        </div>
      );
    case "mortgage-debt-planning":
      return (
        <div className="module-layout module-layout--three">
          <ClientRoster mode="mortgage" showPlayerAccount={false} />
          <div className="center-column">
            <ModuleBanner {...props} />
            <MortgageDebtPlanningPanel assignment={assignment} />
          </div>
          <MortgageContextPanel />
        </div>
      );
    case "bank-lending":
      return (
        <div className="module-layout module-layout--three">
          <ClientRoster mode="lending" showPlayerAccount={false} />
          <div className="center-column">
            <ModuleBanner {...props} />
            <BankLendingPanel assignment={assignment} />
          </div>
          <LendingContextPanel />
        </div>
      );
    case "client-meeting-readiness":
      return (
        <div className="module-layout module-layout--single">
          <ModuleBanner {...props} />
          <ClientMeetingReadinessPanel onTelemetryChange={props.onModuleTelemetryChange ?? (() => undefined)} />
        </div>
      );
    case "full-access":
    default:
      return (
        <div className="module-layout module-layout--three">
          <ClientRoster />
          <div className="center-column">
            <ModuleBanner {...props} />
            <MarketChart />
            <QuestionPanel />
            <StudyDashboard />
            <OrderEntry />
          </div>
          <section className="panel side-shell">
            <div className="panel-header tabs">
              <div className="side-panel-heading">
                <h2>{activeTab === "research" ? "Research Terminal" : "Portfolio Book"}</h2>
                <span className="panel-meta">{activeTab === "research" ? "Live quote context" : "Player and client holdings"}</span>
              </div>
              <div className="tabs">
                <button type="button" className={activeTab === "research" ? "tab-btn active" : "tab-btn"} onClick={() => setTab("research")}>
                  Research
                </button>
                <button type="button" className={activeTab === "portfolio" ? "tab-btn active" : "tab-btn"} onClick={() => setTab("portfolio")}>
                  Portfolio
                </button>
              </div>
            </div>
            <Suspense fallback={<div className="empty-state">Loading panel...</div>}>
              {activeTab === "research" ? <ResearchTerminal /> : <PortfolioPanel />}
            </Suspense>
          </section>
        </div>
      );
  }
}
