"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPolicyReviewSnapshot = buildPolicyReviewSnapshot;
function reviewCadenceCycles(cadence) {
    const normalized = cadence.toLowerCase();
    if (normalized.includes("monthly"))
        return 20;
    if (normalized.includes("quarter"))
        return 60;
    if (normalized.includes("semi"))
        return 120;
    return 40;
}
function buildPolicyReviewSnapshot(client, tickers, cycleNumber) {
    const cadenceCycles = reviewCadenceCycles(client.investmentPolicy.reviewCadence);
    const dueIn = cadenceCycles - ((Math.max(1, cycleNumber) - 1) % cadenceCycles);
    const prohibitedBuckets = new Set(client.investmentPolicy.prohibitedBuckets ?? []);
    const prohibitedExposure = Object.values(client.holdings)
        .map((holding) => tickers[holding.ticker])
        .filter((ticker) => Boolean(ticker))
        .filter((ticker) => prohibitedBuckets.has(ticker.category) || (ticker.sector && client.watchouts.includes(ticker.sector)))
        .map((ticker) => ticker.name)
        .slice(0, 3);
    const dueLabel = dueIn <= 5 ? "Review due now" :
        dueIn <= 15 ? `Review due in ${dueIn} days` :
            `Next review in ${dueIn} days`;
    const maxSinglePositionLabel = client.investmentPolicy.maxSinglePositionPct
        ? `${client.investmentPolicy.maxSinglePositionPct}% max single-position target`
        : "Use diversification guardrails";
    const ipsAlignmentNote = prohibitedExposure.length > 0
        ? `Policy watch: ${prohibitedExposure.join(", ")} is pressing against the current IPS.`
        : `Policy focus: ${client.investmentPolicy.nextReviewFocus}`;
    return {
        dueLabel,
        cadenceLabel: client.investmentPolicy.reviewCadence,
        reviewFocus: client.investmentPolicy.nextReviewFocus,
        prohibitedExposure,
        maxSinglePositionLabel,
        ipsAlignmentNote
    };
}
