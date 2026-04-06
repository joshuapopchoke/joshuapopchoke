import { Suspense, lazy, useEffect } from "react";
import { ClientRoster } from "../src/components/ClientRoster";
import { MarketChart } from "../src/components/MarketChart";
import { OrderEntry } from "../src/components/OrderEntry";
import { QuestionPanel } from "../src/components/QuestionPanel";
import { StudyDashboard } from "../src/components/StudyDashboard";
import { TopBar } from "../src/components/TopBar";
import { useGameStore } from "../src/store/gameStore";

const AuditOverlay = lazy(() => import("../src/components/AuditOverlay").then((module) => ({ default: module.AuditOverlay })));
const AccountTransferOverlay = lazy(() => import("../src/components/AccountTransferOverlay").then((module) => ({ default: module.AccountTransferOverlay })));
const BehaviorEventOverlay = lazy(() => import("../src/components/BehaviorEventOverlay").then((module) => ({ default: module.BehaviorEventOverlay })));
const ClientMeetingOverlay = lazy(() => import("../src/components/ClientMeetingOverlay").then((module) => ({ default: module.ClientMeetingOverlay })));
const CycleRecapOverlay = lazy(() => import("../src/components/CycleRecapOverlay").then((module) => ({ default: module.CycleRecapOverlay })));
const DocumentationOverlay = lazy(() => import("../src/components/DocumentationOverlay").then((module) => ({ default: module.DocumentationOverlay })));
const InsuranceDialogueOverlay = lazy(() => import("../src/components/InsuranceDialogueOverlay").then((module) => ({ default: module.InsuranceDialogueOverlay })));
const OnboardingOverlay = lazy(() => import("../src/components/OnboardingOverlay").then((module) => ({ default: module.OnboardingOverlay })));
const PortfolioPanel = lazy(() => import("../src/components/PortfolioPanel").then((module) => ({ default: module.PortfolioPanel })));
const PlayerComplianceOverlay = lazy(() => import("../src/components/PlayerComplianceOverlay").then((module) => ({ default: module.PlayerComplianceOverlay })));
const ResearchTerminal = lazy(() => import("../src/components/ResearchTerminal").then((module) => ({ default: module.ResearchTerminal })));
const SessionEndScreen = lazy(() => import("../src/components/SessionEndScreen").then((module) => ({ default: module.SessionEndScreen })));

export default function App() {
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
      <TopBar />
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
              <button className={activeTab === "research" ? "tab-btn active" : "tab-btn"} onClick={() => setTab("research")}>
              Research
              </button>
              <button className={activeTab === "portfolio" ? "tab-btn active" : "tab-btn"} onClick={() => setTab("portfolio")}>
              Portfolio
              </button>
            </div>
          </div>
          <Suspense fallback={<div className="empty-state">Loading panel…</div>}>
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
        <PlayerComplianceOverlay />
        <SessionEndScreen />
      </Suspense>
    </main>
  );
}
