import { betaFitLabel, calculatePortfolioBeta } from "../engine/portfolioAnalytics";
import { buildPolicyReviewSnapshot } from "../engine/policyReviewEngine";
import { buildRetirementIncomeSnapshot } from "../engine/retirementIncomeEngine";
import { useGameStore } from "../store/gameStore";

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function computeAccountUsd(
  client: {
    cash: number;
    holdings: Record<string, { ticker: string; shares: number }>;
    shortHoldings?: Record<string, { ticker: string; shares: number }>;
    marginDebt?: number;
  },
  tickers: Record<string, { price: number }>
) {
  const longValue = client.cash + Object.values(client.holdings).reduce((sum, holding) => sum + (tickers[holding.ticker]?.price ?? 0) * holding.shares, 0);
  const shortValue = Object.values(client.shortHoldings ?? {}).reduce((sum, holding) => sum + (tickers[holding.ticker]?.price ?? 0) * holding.shares, 0);
  return longValue - shortValue - (client.marginDebt ?? 0);
}

function relationshipBand(trustScore: number) {
  if (trustScore >= 75) {
    return "Trusted";
  }
  if (trustScore >= 50) {
    return "Stable";
  }
  return "Fragile";
}

function formatBeta(value: number) {
  return `Beta ${value.toFixed(2)}`;
}

function formatCompactUsd(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function annualizedRevenue(clientUsd: number, feeBps: number) {
  return clientUsd * feeBps / 10000;
}

export function ClientRoster() {
  const clients = useGameStore((state) => state.clients);
  const personalPortfolioUsd = useGameStore((state) => state.personalPortfolioUsd);
  const personalHoldings = useGameStore((state) => state.personalHoldings);
  const personalShortHoldings = useGameStore((state) => state.personalShortHoldings);
  const personalMarginDebt = useGameStore((state) => state.personalMarginDebt);
  const personalMarginCall = useGameStore((state) => state.personalMarginCall);
  const playerTradeStatus = useGameStore((state) => state.playerTradeStatus);
  const playerComplianceLevel = useGameStore((state) => state.playerComplianceLevel);
  const activeClientId = useGameStore((state) => state.activeClientId);
  const questionBankStatus = useGameStore((state) => state.questionBankStatus);
  const tickers = useGameStore((state) => state.tickers);
  const cycleNumber = useGameStore((state) => state.cycleNumber);
  const selectClient = useGameStore((state) => state.selectClient);
  const playerBeta = calculatePortfolioBeta(personalHoldings, personalShortHoldings, tickers);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Client Roster</h2>
        <span className="panel-meta">
          {questionBankStatus === "loading" ? "Bank loading" : "Ready"}
        </span>
      </div>
      <div className="client-list">
        <div className="client-section-label">Client Accounts</div>
        {clients.map((client) => {
          const accountUsd = computeAccountUsd(client, tickers);
          const accountDelta = accountUsd - client.startingAum;
          const accountBeta = calculatePortfolioBeta(client.holdings, client.shortHoldings ?? {}, tickers);
          const retirementIncome = buildRetirementIncomeSnapshot(client, tickers);
          const policyReview = buildPolicyReviewSnapshot(client, tickers, cycleNumber);
          const revenue = annualizedRevenue(accountUsd, client.revenueProfile.advisoryFeeBps);
          const mandateLabel =
            client.mandateScore >= 72 ? "Mandate fit strong" : client.mandateScore >= 50 ? "Mandate fit mixed" : "Mandate drifting";

          return (
            <button
              key={client.id}
              className={`client-card ${client.id === activeClientId ? "active" : ""}`}
              disabled={questionBankStatus === "loading"}
              onClick={() => selectClient(client.id)}
            >
              <div className="client-card-top">
                <span className="avatar">{client.avatar}</span>
                <span className={`status-dot ${client.status}`} />
              </div>
              <strong>{client.name}</strong>
              <span>{client.accountType}</span>
              <span>{client.ageLabel}</span>
              <span>{client.riskProfile}</span>
              <span className="client-card-goal">{client.goal}</span>
              <span className="client-card-money">{formatCurrency(accountUsd)}</span>
              <span className={accountDelta >= 0 ? "up" : "down"}>
                {accountDelta >= 0 ? "+" : "-"}
                {formatCurrency(Math.abs(accountDelta))}
              </span>
              <span className="client-card-trust">{formatBeta(accountBeta)} | {betaFitLabel(accountBeta, client.riskProfile)}</span>
              <span className="client-card-trust">
                Cash flow: {formatCompactUsd(client.cashFlow.monthlyIncome)} in | {formatCompactUsd(client.cashFlow.monthlyExpenses + client.cashFlow.monthlyDebtPayments)} out
              </span>
              <span className="client-card-trust">
                Tax: {client.taxProfile.taxBracketLabel} | Liquidity: {client.cashFlow.nearTermLiquidityNeed}
              </span>
              <span className="client-card-trust">
                Revenue: {formatCompactUsd(revenue)}/yr | {client.revenueProfile.serviceTier}
              </span>
              <span className="client-card-trust">
                CRM: {client.crmProfile.nextReviewWindow} | {client.crmProfile.serviceModel}
              </span>
              <span className="client-card-trust">
                IPS: {client.investmentPolicy.equityRangeLabel ?? "Policy active"} | {policyReview.dueLabel}
              </span>
              {retirementIncome.applicable ? (
                <span className="client-card-trust">
                  {retirementIncome.mode === "spending-rule"
                    ? `Spending support: ${(retirementIncome.withdrawalRate * 100).toFixed(1)}% draw | ${retirementIncome.sustainabilityLabel}`
                    : `Income gap: ${formatCurrency(retirementIncome.monthlyShortfall)}/mo | ${retirementIncome.runwayLabel}`}
                </span>
              ) : null}
              <span className="client-card-trust">
                Benefits: {client.benefitsProfile.primaryPlan}
              </span>
              <span className="client-card-trust">
                Account home: {client.accountStructure.registration}
              </span>
              {client.educationPlanning.active ? (
                <span className="client-card-trust">
                  Education: {client.educationPlanning.targetYears}
                </span>
              ) : null}
              <span className="client-card-trust">
                Estate: {client.estateProfile.coreDocuments[0]} | {client.estateProfile.beneficiaryReview}
              </span>
              <span className="client-card-trust">
                Supervision: {client.supervisionProfile.reviewLevel}
              </span>
              <span className="client-card-trust">
                Insurance gap: {client.insuranceGapScore}/100 | {client.insuranceCoverage.length}/{client.insuranceNeeds.length} addressed
              </span>
              {(client.marginDebt > 0 || client.marginCall || Object.keys(client.shortHoldings ?? {}).length > 0) ? (
                <span className={client.marginCall ? "down" : "client-card-trust"}>
                  Margin: {formatCurrency(client.marginDebt ?? 0)} debt | {Object.keys(client.shortHoldings ?? {}).length} short | {client.marginCall ? "Call active" : "Stable"}
                </span>
              ) : null}
              <span className="client-card-trust">Trust: {client.trustScore}/100 | {relationshipBand(client.trustScore)}</span>
              <span className="client-card-note">{client.advisorNote}</span>
              <span className="client-card-note">{policyReview.ipsAlignmentNote}</span>
              <div className="client-progress">
                <div className="client-progress-track">
                  <div className="client-progress-fill" style={{ width: `${client.mandateScore}%` }} />
                </div>
                <span>{mandateLabel}</span>
              </div>
            </button>
          );
        })}
        <div className="client-section-label">Player Account</div>
        <div className="client-card player-card">
          <div className="client-card-top">
            <span className="avatar player-avatar">P</span>
            <span className="status-dot satisfied" />
          </div>
          <strong>Your Portfolio</strong>
          <span>Self-Directed Trading</span>
          <span className="client-card-money">Cash Available: {formatCurrency(personalPortfolioUsd)}</span>
          <span>{Object.keys(personalHoldings).length} long | {Object.keys(personalShortHoldings).length} short</span>
          <span className="client-card-trust">{formatBeta(playerBeta)} | self-directed risk</span>
          <span className={personalMarginCall ? "down" : "client-card-trust"}>Margin Debt: {formatCurrency(personalMarginDebt)} | {personalMarginCall ? "Call active" : "Stable"}</span>
          <span>Status: {playerTradeStatus}</span>
          <span>Compliance: {playerComplianceLevel}%</span>
        </div>
      </div>
    </section>
  );
}
