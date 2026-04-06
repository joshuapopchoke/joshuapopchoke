import { Suspense, lazy, useEffect } from "react";
import { ClientRoster } from "./ClientRoster";
import { MarketChart } from "./MarketChart";
import { OrderEntry } from "./OrderEntry";
import { QuestionPanel } from "./QuestionPanel";
import { StudyDashboard } from "./StudyDashboard";
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
const PortfolioPanel = lazy(() => import("./PortfolioPanel").then((module) => ({ default: module.PortfolioPanel })));
const PlayerComplianceOverlay = lazy(() => import("./PlayerComplianceOverlay").then((module) => ({ default: module.PlayerComplianceOverlay })));
const RecommendationDialogueOverlay = lazy(() => import("./RecommendationDialogueOverlay").then((module) => ({ default: module.RecommendationDialogueOverlay })));
const ResearchTerminal = lazy(() => import("./ResearchTerminal").then((module) => ({ default: module.ResearchTerminal })));
const SessionEndScreen = lazy(() => import("./SessionEndScreen").then((module) => ({ default: module.SessionEndScreen })));
const SupervisionRequestOverlay = lazy(() => import("./SupervisionRequestOverlay").then((module) => ({ default: module.SupervisionRequestOverlay })));

interface EmployeeAppViewProps {
  onLogout: () => void;
}

export function EmployeeAppView({ onLogout }: EmployeeAppViewProps) {
  const activeTab = useGameStore((state) => state.activeTab);
  const activeDifficulty = useGameStore((state) => state.activeDifficulty);
  const setTab = useGameStore((state) => state.setTab);
  const tickTimer = useGameStore((state) => state.tickTimer);
  const initializeQuestionBank = useGameStore((state) => state.initializeQuestionBank);

  useEffect(() => {
    void initializeQuestionBank(activeDifficulty);
  }, [activeDifficulty, initializeQuestionBank]);

  useEffect(() => {
    const timer = window.setInterval(() => tickTimer(), 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [tickTimer]);

  return (
    <main className="layout">
      <TopBar
        brandTitle="Fiduciary Duty — Training"
        extraControls={(
          <button type="button" className="control-btn" onClick={onLogout}>
            Logout
          </button>
        )}
      />
      <div className="main-grid">
        <ClientRoster />
        <div className="center-column">
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
