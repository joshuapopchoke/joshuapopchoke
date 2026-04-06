"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBenefitsSnapshot = buildBenefitsSnapshot;
exports.buildEstatePlanningSnapshot = buildEstatePlanningSnapshot;
exports.buildRetirementMathSnapshot = buildRetirementMathSnapshot;
exports.buildProductComparisonSnapshot = buildProductComparisonSnapshot;
exports.buildCrmWorkflowSnapshot = buildCrmWorkflowSnapshot;
exports.buildSupervisionSnapshot = buildSupervisionSnapshot;
function isInstitutional(client) {
    return client.id === "institutional";
}
function buildBenefitsSnapshot(client) {
    if (isInstitutional(client)) {
        return {
            applicable: false,
            label: "Institutional mandate",
            note: "Employer-benefit planning is not the driver here. Governance and spending support matter more than workplace benefit elections.",
            action: "Keep attention on policy discipline, liquidity, and governance."
        };
    }
    if (client.retirementDistribution.distributionPhase && client.id === "retiree") {
        return {
            applicable: true,
            label: "Healthcare and income coordination",
            note: client.benefitsProfile.planningFocus,
            action: "Coordinate Medicare, taxable income, and reserve planning before stretching for extra risk."
        };
    }
    return {
        applicable: true,
        label: "Workplace benefits review",
        note: client.benefitsProfile.planningFocus,
        action: client.benefitsProfile.employerMatch
    };
}
function buildEstatePlanningSnapshot(client) {
    const complexityScore = client.estateProfile.coreDocuments.length +
        (client.insuranceGapScore > 35 ? 1 : 0) +
        (client.cashFlow.nearTermLiquidityNeed === "High" ? 1 : 0) +
        (client.id === "entrepreneur" || client.id === "family" ? 1 : 0);
    const urgency = complexityScore >= 5 ? "high" :
        complexityScore >= 3 ? "moderate" :
            "low";
    const label = urgency === "high" ? "Estate work active" :
        urgency === "moderate" ? "Estate review due" :
            "Estate basics in place";
    return {
        urgency,
        label,
        note: client.estateProfile.planningFocus,
        action: `${client.estateProfile.trustStructure} ${client.estateProfile.beneficiaryReview}`
    };
}
function buildRetirementMathSnapshot(client, accountValue) {
    const annualGap = Math.max(0, client.retirementMath.annualSpendingGoal - client.retirementMath.annualGuaranteedIncome);
    const sustainableSpend = accountValue * client.retirementMath.safeWithdrawalGuardrail;
    const fundedRatio = annualGap <= 0 ? 1.5 : sustainableSpend / annualGap;
    const longevityLabel = client.retirementMath.assumedLongevityAge === null
        ? "Perpetual mandate"
        : `Modeled to age ${client.retirementMath.assumedLongevityAge}`;
    const summary = fundedRatio >= 1.1
        ? "Current assets can plausibly support the modeled withdrawal need if risk stays disciplined."
        : fundedRatio >= 0.8
            ? "The plan is close, but spending pressure or weaker returns could force tougher tradeoffs."
            : "The plan is under strain; spending, guaranteed income, or allocation assumptions likely need work.";
    return {
        applicable: true,
        fundedRatio,
        projectedLongevitySuccess: longevityLabel,
        annualGap,
        summary
    };
}
function buildProductComparisonSnapshot(client) {
    return {
        primaryNeed: client.productComparison.primaryNeed,
        recommendedLane: client.productComparison.recommendedLane,
        lowerCostAlternative: client.productComparison.lowerCostAlternative,
        caution: client.productComparison.caution
    };
}
function buildCrmWorkflowSnapshot(client) {
    return {
        serviceModel: client.crmProfile.serviceModel,
        nextReviewWindow: client.crmProfile.nextReviewWindow,
        nextTask: client.crmProfile.nextTask,
        relationshipNote: `${client.crmProfile.lastContactSummary} Referral potential: ${client.crmProfile.referralPotential}.`
    };
}
function buildSupervisionSnapshot(client) {
    return {
        reviewLevel: client.supervisionProfile.reviewLevel,
        exceptionFocus: client.supervisionProfile.exceptionFocus,
        documentationPriority: client.supervisionProfile.documentationPriority,
        note: client.supervisionProfile.supervisionNote
    };
}
