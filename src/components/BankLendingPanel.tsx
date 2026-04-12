import { useMemo, useState } from "react";
import { buildBankLendingWorkflowScenarios } from "../data/bankLendingScenarios";
import { useSelectedClient } from "../store/gameStore";
import { buildBankLendingSnapshot, buildLendingDecisionMatrixSnapshot } from "../engine/creditLendingEngine";
import { LENDING_PROGRAMS } from "../data/loanPrograms";
import type { AssignmentProgressSnapshot } from "../engine/trainingCurriculumEngine";

interface BankLendingPanelProps {
  assignment: AssignmentProgressSnapshot;
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function deriveCreditBand(monthlyIncome: number, monthlyDebtPayments: number, reserveMonths: number) {
  const debtServiceRatio = monthlyIncome > 0 ? monthlyDebtPayments / monthlyIncome : 1;

  if (debtServiceRatio < 0.18 && reserveMonths >= 8) return { label: "Strong", score: 82 };
  if (debtServiceRatio < 0.28 && reserveMonths >= 5) return { label: "Stable", score: 72 };
  if (debtServiceRatio < 0.38 && reserveMonths >= 3) return { label: "Watch", score: 62 };
  return { label: "Stressed", score: 50 };
}

export function BankLendingPanel({ assignment }: BankLendingPanelProps) {
  const activeClient = useSelectedClient();
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("consumer-underwriting");
  const lendingSnapshot = activeClient ? buildBankLendingSnapshot(activeClient) : null;
  const decisionMatrix = activeClient ? buildLendingDecisionMatrixSnapshot(activeClient) : null;
  const workflowScenarios = useMemo(
    () => activeClient ? buildBankLendingWorkflowScenarios(activeClient) : [],
    [activeClient]
  );
  const selectedWorkflow = workflowScenarios.find((scenario) => scenario.id === selectedWorkflowId) ?? workflowScenarios[0] ?? null;
  const relevantPrograms = activeClient
    ? LENDING_PROGRAMS.filter((program) => {
        if (program.category === "Mortgage") {
          return activeClient.lendingProfile.underwritingTrack === "Mortgage";
        }
        if (program.category === "Small Business" || program.category === "Commercial") {
          return activeClient.lendingProfile.underwritingTrack === "Private Wealth" || activeClient.lendingProfile.businessCashFlowCoverage !== null;
        }
        if (program.category === "Public / Institutional") {
          return activeClient.lendingProfile.underwritingTrack === "Institutional";
        }
        return true;
      }).slice(0, 7)
    : [];

  if (!activeClient) {
    return <section className="panel"><div className="empty-state">Select a client to review lending-style underwriting signals.</div></section>;
  }

  const monthlyDebt = activeClient.cashFlow.monthlyDebtPayments;
  const monthlyIncome = activeClient.cashFlow.monthlyIncome;
  const debtServiceRatio = monthlyIncome > 0 ? (monthlyDebt / monthlyIncome) * 100 : 0;
  const reserveMonths = monthlyIncome > 0
    ? activeClient.cash / Math.max(1, activeClient.cashFlow.monthlyExpenses + monthlyDebt)
    : activeClient.cashFlow.emergencyReserveMonths;
  const underwritingBand = deriveCreditBand(monthlyIncome, monthlyDebt, reserveMonths);
  const suggestedLoanCapacity = Math.max(0, monthlyIncome * 36 - monthlyDebt * 18);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Bank Lending Review</h2>
        <span className="panel-meta">{activeClient.name} | {assignment.module.focus}</span>
      </div>
      <div className="comparison-grid">
        <div className="comparison-card">
          <span>Credit file</span>
          <strong>{activeClient.creditProfile.score} | {activeClient.creditProfile.scoreBand}</strong>
          <small>{activeClient.creditProfile.utilizationPct}% utilization | {activeClient.creditProfile.recentInquiries} inquiries | {activeClient.lendingProfile.recentLatePayments} recent late payments</small>
        </div>
        <div className="comparison-card">
          <span>Underwriting band</span>
          <strong>{lendingSnapshot?.decisionBand ?? underwritingBand.label}</strong>
          <small>Indicative lending score {(lendingSnapshot?.underwritingScore ?? underwritingBand.score)}/100 based on debt load, reserves, and credit posture.</small>
        </div>
        <div className="comparison-card">
          <span>Debt-to-income lens</span>
          <strong>{debtServiceRatio.toFixed(0)}%</strong>
          <small>{formatCurrency(monthlyDebt)} monthly debt against {formatCurrency(monthlyIncome)} income.</small>
        </div>
        <div className="comparison-card">
          <span>Liquid reserve depth</span>
          <strong>{reserveMonths.toFixed(1)} months</strong>
          <small>{reserveMonths >= activeClient.cashFlow.emergencyReserveMonths ? "Reserve cushion supports repayment flexibility." : "Reserve cushion still looks thin for new lending."}</small>
        </div>
        <div className="comparison-card">
          <span>Credit and reserve support</span>
          <strong>{lendingSnapshot?.debtCoverageLabel ?? "Coverage pending"}</strong>
          <small>{lendingSnapshot?.reserveSupportLabel ?? "Reserve support pending"}</small>
        </div>
        <div className="comparison-card">
          <span>Indicative capacity</span>
          <strong>{formatCurrency(suggestedLoanCapacity)}</strong>
          <small>Simple affordability proxy before collateral, term, and full credit review are layered in.</small>
        </div>
        <div className="comparison-card">
          <span>Term structure</span>
          <strong>{decisionMatrix?.recommendation ?? "Decision pending"}</strong>
          <small>{decisionMatrix?.termLane ?? "Need a live borrower file to compare term structure."}</small>
        </div>
        <div className="comparison-card">
          <span>Collateral and docs</span>
          <strong>{decisionMatrix?.collateralLane ?? "Collateral review pending"}</strong>
          <small>{decisionMatrix?.documentationLane ?? "Documentation lane pending"}</small>
        </div>
        <div className="comparison-card">
          <span>Lender caution</span>
          <strong>{activeClient.productComparison.caution}</strong>
          <small>{lendingSnapshot?.riskSummary ?? activeClient.supervisionProfile.supervisionNote}</small>
        </div>
        <div className="comparison-card">
          <span>Relationship note</span>
          <strong>{activeClient.crmProfile.nextTask}</strong>
          <small>{lendingSnapshot?.nextBestAction ?? activeClient.description}</small>
        </div>
      </div>
      <div className="portfolio-section">
        <div className="portfolio-section-title">Decision Workflow Track</div>
        <div className="tabs">
          {workflowScenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              className={selectedWorkflow?.id === scenario.id ? "tab-btn active" : "tab-btn"}
              onClick={() => setSelectedWorkflowId(scenario.id)}
            >
              {scenario.title}
            </button>
          ))}
        </div>
        {selectedWorkflow ? (
          <div className="comparison-grid">
            <div className="comparison-card">
              <span>Workflow segment</span>
              <strong>{selectedWorkflow.segment}</strong>
              <small>{selectedWorkflow.summary}</small>
            </div>
            <div className="comparison-card">
              <span>Recommended decision</span>
              <strong>{selectedWorkflow.recommendedDecision}</strong>
              <small>{selectedWorkflow.rationale}</small>
            </div>
            <div className="comparison-card">
              <span>Remediation steps</span>
              <strong>{selectedWorkflow.recommendedDecision === "Approve" ? "Keep approval disciplined" : "Repair path required"}</strong>
              <small>{selectedWorkflow.remediationSteps.join(" ")}</small>
            </div>
            <div className="comparison-card">
              <span>Teaching angle</span>
              <strong>{selectedWorkflow.segment === "Business" ? "Cash-flow and collateral" : "Repayment and reserve durability"}</strong>
              <small>Use this track to train when to approve, when to condition, and when to decline without drifting into optimism bias.</small>
            </div>
          </div>
        ) : null}
      </div>
      <div className="portfolio-section">
        <div className="portfolio-section-title">Lending Program Coverage</div>
        <div className="comparison-grid">
          {relevantPrograms.map((program) => (
            <div key={program.id} className="comparison-card">
              <span>{program.source} | {program.category}</span>
              <strong>{program.name}</strong>
              <small>{program.useCase}</small>
              <small><strong>Best fit:</strong> {program.bestFit}</small>
              <small><strong>Caution:</strong> {program.caution}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
