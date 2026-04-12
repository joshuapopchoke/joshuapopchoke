import { useSelectedClient } from "../store/gameStore";

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function LendingContextPanel() {
  const activeClient = useSelectedClient();

  if (!activeClient) {
    return <section className="panel"><div className="empty-state">Select a borrower profile to load lending context.</div></section>;
  }

  return (
    <section className="panel side-shell">
      <div className="panel-header">
        <div className="side-panel-heading">
          <h2>Lending Context</h2>
          <span className="panel-meta">Borrower quality, collateral, and requested purpose only</span>
        </div>
      </div>
      <div className="comparison-grid">
        <div className="comparison-card">
          <span>Borrower quality</span>
          <strong>{activeClient.creditProfile.score} | {activeClient.creditProfile.scoreBand}</strong>
          <small>{activeClient.creditProfile.recentInquiries} inquiries | {activeClient.lendingProfile.recentLatePayments} recent late pays</small>
        </div>
        <div className="comparison-card">
          <span>Debt burden</span>
          <strong>{formatCurrency(activeClient.cashFlow.monthlyDebtPayments)}/mo</strong>
          <small>{formatCurrency(activeClient.debtProfile.creditCardBalance)} cards | {formatCurrency(activeClient.debtProfile.autoLoanBalance + activeClient.debtProfile.studentLoanBalance)} installment debt</small>
        </div>
        <div className="comparison-card">
          <span>Collateral strength</span>
          <strong>{activeClient.lendingProfile.collateralStrength}</strong>
          <small>{activeClient.debtProfile.propertyValue > 0 ? `${formatCurrency(activeClient.debtProfile.propertyValue)} property value` : "No pledged property value"} | {activeClient.lendingProfile.underwritingTrack}</small>
        </div>
        <div className="comparison-card">
          <span>Requested purpose</span>
          <strong>{activeClient.lendingProfile.requestedLoanPurpose}</strong>
          <small>{activeClient.lendingProfile.employmentStrength} employment strength | {activeClient.lendingProfile.businessCashFlowCoverage ? `${activeClient.lendingProfile.businessCashFlowCoverage.toFixed(1)}x cash-flow coverage` : "No business cash-flow coverage case"}</small>
        </div>
      </div>
    </section>
  );
}
