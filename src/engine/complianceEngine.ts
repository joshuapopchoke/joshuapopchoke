import type { ClientAccount } from "../types/client";
import type { Ticker } from "../types/market";

export interface ComplianceDecision {
  suitable: boolean;
  reasons: string[];
  scrutinyDelta: number;
  flags: Array<"suitability" | "risk-override" | "unsuitable-product" | "concentration">;
}

const RISK_LIMITS: Record<ClientAccount["riskProfile"], number> = {
  Conservative: 0.3,
  Moderate: 0.55,
  "Moderate-Aggressive": 0.75,
  Aggressive: 0.95
};

const CAPITAL_PRESERVATION_ACCOUNT_TYPES = new Set(["Retirement Income Account", "Institutional Endowment"]);
const DEFENSIVE_FIT_HINT = "Better fit examples: diversified dividend funds, short-duration bond funds, high-quality large-cap dividend payers, or balanced funds.";

function ageContext(client: ClientAccount) {
  return client.age ? `${client.age}-year-old` : client.accountType.toLowerCase();
}

function betaText(ticker: Ticker) {
  return typeof ticker.beta === "number" ? `Beta ${ticker.beta.toFixed(2)}` : "Higher-volatility";
}

function isHighBetaTicker(ticker: Ticker) {
  return (ticker.beta ?? 1) >= 1.5;
}

function violatesPolicyBucket(client: ClientAccount, ticker: Ticker) {
  return (client.investmentPolicy.prohibitedBuckets ?? []).includes(ticker.category);
}

function getEquityExposure(client: ClientAccount, tickers: Record<string, Ticker>) {
  let total = client.cash;
  let equities = 0;

  Object.values(client.holdings).forEach((holding) => {
    const ticker = tickers[holding.ticker];

    if (!ticker) {
      return;
    }

    const value = ticker.price * holding.shares;
    total += value;

    if (ticker.category === "stocks" || ticker.category === "funds" || ticker.category === "futures") {
      equities += value;
    }
  });

  return total === 0 ? 0 : equities / total;
}

export function evaluateTradeSuitability(
  client: ClientAccount,
  ticker: Ticker,
  quantity: number,
  direction: "buy" | "sell",
  tickers: Record<string, Ticker>
): ComplianceDecision {
  if (direction === "sell") {
    return { suitable: true, reasons: [], scrutinyDelta: 0, flags: [] };
  }

  const reasons: string[] = [];
  const flags: ComplianceDecision["flags"] = [];
  let scrutinyDelta = 0;
  const projectedCost = ticker.price * quantity;
  const currentAum = client.cash + Object.values(client.holdings).reduce((total, holding) => total + (tickers[holding.ticker]?.price ?? 0) * holding.shares, 0);
  const equityExposure = getEquityExposure(client, tickers);
  const projectedExposure = (equityExposure * Math.max(currentAum, projectedCost) + projectedCost) / Math.max(currentAum + projectedCost, 1);
  const riskLimit = RISK_LIMITS[client.riskProfile];

  if (projectedExposure > riskLimit) {
    reasons.push(
      `Risk tolerance override: projected equity exposure would rise to ${(projectedExposure * 100).toFixed(0)}%, above the ${(riskLimit * 100).toFixed(0)}% risk ceiling for this ${client.riskProfile.toLowerCase()} mandate. ${DEFENSIVE_FIT_HINT}`
    );
    scrutinyDelta += 18;
    flags.push("risk-override", "suitability");
  }

  if (violatesPolicyBucket(client, ticker)) {
    reasons.push(
      `IPS violation: ${ticker.name} falls into a prohibited bucket for this mandate. The current policy is trying to avoid ${ticker.category.toLowerCase()} exposure for this account while it focuses on ${client.investmentPolicy.objective.toLowerCase()}. ${DEFENSIVE_FIT_HINT}`
    );
    scrutinyDelta += 16;
    flags.push("unsuitable-product", "suitability");
  }

  if (
    client.riskProfile === "Conservative" &&
    (ticker.category === "futures" || ticker.sector === "Hedge Funds" || isHighBetaTicker(ticker))
  ) {
    reasons.push(
      `Unsuitable product placement: ${ticker.name} is being treated as speculative for a conservative ${client.accountType.toLowerCase()} tied to a ${ageContext(client)} client. ${betaText(ticker)} is elevated for capital-preservation goals. ${DEFENSIVE_FIT_HINT}`
    );
    scrutinyDelta += 20;
    flags.push("unsuitable-product", "suitability");
  }

  if (client.riskProfile === "Moderate" && (ticker.category === "futures" || ticker.sector === "Hedge Funds")) {
    reasons.push(
      `Unsuitable product placement: leveraged futures or hedge-fund style exposure is a stretch for this moderate-risk account. The client needs more balanced risk than a concentrated speculative sleeve. ${DEFENSIVE_FIT_HINT}`
    );
    scrutinyDelta += 15;
    flags.push("unsuitable-product", "suitability");
  }

  if (CAPITAL_PRESERVATION_ACCOUNT_TYPES.has(client.accountType) && ticker.category === "futures") {
    reasons.push(
      "Unsuitable product placement: leveraged futures conflict with capital-preservation and institutional-prudence mandates. These accounts should generally lead with liquidity, diversification, and drawdown control."
    );
    scrutinyDelta += 20;
    flags.push("unsuitable-product", "suitability");
  }

  if (client.accountType === "Institutional Endowment" && ticker.category === "stocks" && projectedExposure > 0.65) {
    reasons.push(
      "Suitability violation: endowment equity concentration is inconsistent with prudent diversification expectations. A single equity-heavy sleeve is too narrow for an institutional preservation-and-growth mandate."
    );
    scrutinyDelta += 16;
    flags.push("suitability");
  }

  const maxSinglePositionPct = (client.investmentPolicy.maxSinglePositionPct ?? 35) / 100;
  if (projectedCost > client.cash * 0.75 || projectedCost > Math.max(currentAum, projectedCost) * maxSinglePositionPct) {
    reasons.push(
      `Suitability concern: this single position would take ${((projectedCost / Math.max(currentAum + projectedCost, 1)) * 100).toFixed(0)}% of the account, above the client policy guardrail of ${(maxSinglePositionPct * 100).toFixed(0)}% for a single position.`
    );
    scrutinyDelta += 12;
    flags.push("concentration", "suitability");
  }

  if (
    client.riskProfile === "Moderate" &&
    ticker.category === "stocks" &&
    isHighBetaTicker(ticker) &&
    projectedCost > Math.max(currentAum, projectedCost) * 0.2
  ) {
    reasons.push(
      `Risk tolerance override: ${ticker.name} is a high-beta single-name equity, and this ticket is too large for a moderate-risk client. ${betaText(ticker)} plus position size pushes the account beyond a balanced growth profile.`
    );
    scrutinyDelta += 14;
    flags.push("risk-override", "suitability");
  }

  return {
    suitable: reasons.length === 0,
    reasons,
    scrutinyDelta,
    flags: [...new Set(flags)]
  };
}

export function applyScrutinyLevel(currentLevel: number, decision: ComplianceDecision) {
  return Math.min(100, currentLevel + decision.scrutinyDelta);
}

export function resolveAuditScrutiny(currentLevel: number, passed: boolean) {
  return passed ? Math.min(40, currentLevel) : 60;
}
