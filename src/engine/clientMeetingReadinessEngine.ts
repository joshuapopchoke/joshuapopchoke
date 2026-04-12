import type { ClientReadinessScenario } from "../data/clientMeetingReadiness";

export interface ClientReadinessEvaluation {
  overallScore: number;
  complianceScore: number;
  empathyScore: number;
  rationaleScore: number;
  suitabilityScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

function containsAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}

export function evaluateClientReadinessResponse(
  scenario: ClientReadinessScenario,
  response: string
): ClientReadinessEvaluation {
  const normalized = response.toLowerCase();
  const strengths: string[] = [];
  const improvements: string[] = [];

  const empathyHits = containsAny(normalized, ["understand", "i hear", "that makes sense", "concern", "goal", "comfortable"]);
  const riskHits = containsAny(normalized, ["risk", "volatility", "drawdown", "concentrat", "speculative", "beta"]);
  const suitabilityHits = containsAny(normalized, ["suitable", "time horizon", "liquidity", "income need", "retirement", "reserve"]);
  const alternativeHits = containsAny(normalized, ["alternative", "instead", "divers", "balanced", "bond", "index", "step"]);
  const forbiddenGuarantee = containsAny(normalized, ["guarantee", "guaranteed return", "can't lose", "sure thing"]);

  const empathyScore = empathyHits ? 88 : 58;
  const rationaleScore = riskHits ? 84 : 56;
  const suitabilityScore = suitabilityHits ? 86 : 54;
  let complianceScore = alternativeHits ? 82 : 64;

  if (forbiddenGuarantee) {
    complianceScore = Math.max(18, complianceScore - 46);
    improvements.push("Avoid guarantees or language that suggests a certain outcome.");
  } else {
    strengths.push("Avoided obvious prohibited promise language.");
  }

  if (empathyHits) {
    strengths.push("Used coaching language that keeps the client conversation calm.");
  } else {
    improvements.push("Lead with empathy before moving into technical reasoning.");
  }

  if (riskHits) {
    strengths.push("Explained risk or concentration instead of only reacting to performance.");
  } else {
    improvements.push("Call out volatility, concentration, or downside risk more directly.");
  }

  if (suitabilityHits) {
    strengths.push("Connected the recommendation to suitability, liquidity, or time horizon.");
  } else {
    improvements.push("Tie the answer back to suitability, time horizon, or liquidity.");
  }

  if (alternativeHits) {
    strengths.push("Offered a practical next step or alternative path.");
  } else {
    improvements.push("Offer a safer alternative or concrete next step.");
  }

  const overallScore = Math.round((complianceScore * 0.3) + (empathyScore * 0.2) + (rationaleScore * 0.2) + (suitabilityScore * 0.3));
  const feedback =
    overallScore >= 85
      ? `${scenario.clientName} would likely hear this as thoughtful, compliant, and practically useful coaching.`
      : overallScore >= 70
        ? `${scenario.clientName} would likely hear the right general message, but the explanation still needs more precision or warmth.`
        : `${scenario.clientName} would probably leave this conversation with too much confusion, risk, or compliance concern.`;

  return {
    overallScore,
    complianceScore,
    empathyScore,
    rationaleScore,
    suitabilityScore,
    feedback,
    strengths,
    improvements
  };
}
