"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSocialSecurityCalculator = buildSocialSecurityCalculator;
exports.buildRothConversionCalculator = buildRothConversionCalculator;
exports.buildMortgageRefiCalculator = buildMortgageRefiCalculator;
exports.buildDebtVsInvestCalculator = buildDebtVsInvestCalculator;
exports.buildEducationFundingCalculator = buildEducationFundingCalculator;
exports.buildRetirementStressCalculator = buildRetirementStressCalculator;
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function monthlyPayment(principal, annualRate, years) {
    const monthlyRate = annualRate / 12;
    const numberOfPayments = years * 12;
    if (monthlyRate === 0) {
        return principal / numberOfPayments;
    }
    return principal * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -numberOfPayments)));
}
function buildSocialSecurityCalculator(client) {
    const baseBenefit = clamp(client.cashFlow.monthlyIncome * 0.42, 18000, 42000);
    const age62Annual = Math.round(baseBenefit * 0.72);
    const fullRetirementAnnual = Math.round(baseBenefit);
    const age70Annual = Math.round(baseBenefit * 1.24);
    const recommendation = client.retirementDistribution.distributionPhase
        ? "Compare the higher later claim with current income needs before defaulting to the earliest filing date."
        : "Use delayed claiming as a benchmark so the client sees the income tradeoff created by filing early.";
    return {
        age62Annual,
        fullRetirementAnnual,
        age70Annual,
        recommendation
    };
}
function buildRothConversionCalculator(client, accountValue) {
    const conversionAmount = Math.round(Math.max(10000, accountValue * 0.08));
    const estimatedTaxRate = client.taxProfile.taxBracketLabel.toLowerCase().includes("upper") ? 0.24 :
        client.taxProfile.taxBracketLabel.toLowerCase().includes("moderate") ? 0.18 :
            0.12;
    const estimatedTaxCost = Math.round(conversionAmount * estimatedTaxRate);
    const futureTaxFreeValue = Math.round(conversionAmount * Math.pow(1 + client.retirementMath.expectedReturn, 10));
    const recommendation = client.retirementDistribution.distributionPhase
        ? "Model whether smaller staged conversions reduce future RMD pressure without creating unnecessary near-term tax drag."
        : "Use conversion sizing carefully so the client understands the tradeoff between today's tax hit and future tax-free growth.";
    return {
        conversionAmount,
        estimatedTaxCost,
        futureTaxFreeValue,
        recommendation
    };
}
function buildMortgageRefiCalculator(client) {
    const principal = clamp(client.cashFlow.monthlyExpenses * 48, 180000, 650000);
    const currentRate = client.riskProfile === "Conservative" ? 0.068 : 0.071;
    const proposedRate = currentRate - 0.0075;
    const currentPayment = monthlyPayment(principal, currentRate, 30);
    const proposedPayment = monthlyPayment(principal, proposedRate, 30);
    const monthlySavings = Math.max(0, Math.round(currentPayment - proposedPayment));
    const closingCosts = Math.round(principal * 0.018);
    const breakEvenMonths = monthlySavings > 0 ? Math.round(closingCosts / monthlySavings) : 999;
    const recommendation = monthlySavings > 0
        ? `If the client expects to stay put beyond about ${breakEvenMonths} months, a refinance review is worth discussing.`
        : "Current market terms do not create a clear refinance advantage right now.";
    return {
        currentRate,
        proposedRate,
        monthlySavings,
        breakEvenMonths,
        recommendation
    };
}
function buildDebtVsInvestCalculator(client) {
    const debtRate = clamp(0.045 + (client.cashFlow.monthlyDebtPayments / Math.max(1, client.cashFlow.monthlyIncome)) * 0.18, 0.035, 0.18);
    const expectedPortfolioReturn = client.retirementMath.expectedReturn;
    const betterLane = debtRate >= expectedPortfolioReturn
        ? "Prioritize debt paydown first"
        : debtRate >= expectedPortfolioReturn - 0.015
            ? "Use a blended debt-and-invest approach"
            : "Keep investing while servicing debt";
    const rationale = betterLane === "Prioritize debt paydown first"
        ? "The debt cost is high enough that reducing liabilities likely creates the cleaner risk-adjusted win."
        : betterLane === "Use a blended debt-and-invest approach"
            ? "The rates are close enough that liquidity, taxes, and behavior should drive the recommendation."
            : "The expected long-run portfolio return still has a meaningful edge over the debt cost.";
    return {
        debtRate,
        expectedPortfolioReturn,
        betterLane,
        rationale
    };
}
function buildEducationFundingCalculator(client) {
    if (!client.educationPlanning.active) {
        return null;
    }
    const targetCost = client.id === "family" ? 220000 : 80000;
    const fundedAmount = Math.round(client.cash * 0.08 + Object.keys(client.holdings).length * 2500);
    const remainingGap = Math.max(0, targetCost - fundedAmount);
    const targetMonths = client.id === "family" ? 12 * 12 : 8 * 12;
    const monthlySavingsNeeded = Math.round(remainingGap / Math.max(1, targetMonths));
    return {
        targetCost,
        fundedAmount,
        remainingGap,
        monthlySavingsNeeded,
        recommendation: "Use this gap to compare whether the family needs a dedicated 529 sleeve, higher monthly savings, or a longer funding timeline."
    };
}
function buildRetirementStressCalculator(client, accountValue) {
    const annualGap = Math.max(1, client.retirementMath.annualSpendingGoal - client.retirementMath.annualGuaranteedIncome);
    const fundedRatio = (accountValue * client.retirementMath.safeWithdrawalGuardrail) / annualGap;
    const baseSuccessRate = clamp(58 + fundedRatio * 32, 28, 96);
    const stressedSuccessRate = clamp(baseSuccessRate - 18 - client.cashFlow.nearTermLiquidityNeed.length, 12, 88);
    const estimatedDrawdownRisk = client.riskProfile === "Aggressive" ? "High drawdown sensitivity" :
        client.riskProfile === "Moderate-Aggressive" ? "Elevated drawdown sensitivity" :
            client.riskProfile === "Moderate" ? "Manageable drawdown sensitivity" :
                "Lower drawdown sensitivity";
    const recommendation = stressedSuccessRate >= 70
        ? "The plan still holds up reasonably well in a weaker return environment."
        : stressedSuccessRate >= 50
            ? "The plan works, but a downturn would make spending discipline and reserves much more important."
            : "The plan looks fragile under stress, so contribution, spending, or allocation changes should be discussed.";
    return {
        baseSuccessRate,
        stressedSuccessRate,
        estimatedDrawdownRisk,
        recommendation
    };
}
