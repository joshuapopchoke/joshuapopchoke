"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRevenueSnapshot = buildRevenueSnapshot;
function computeAccountValue(client, tickers) {
    const longValue = Object.values(client.holdings).reduce((sum, holding) => sum + (tickers[holding.ticker]?.price ?? 0) * holding.shares, 0);
    const shortValue = Object.values(client.shortHoldings ?? {}).reduce((sum, holding) => sum + (tickers[holding.ticker]?.price ?? 0) * holding.shares, 0);
    return Math.max(0, client.cash + longValue - shortValue - (client.marginDebt ?? 0));
}
function buildRevenueSnapshot(clients, tickers, priorTrailingCycleRevenue = 0) {
    const annualizedGrossRevenue = clients.reduce((sum, client) => {
        const accountValue = computeAccountValue(client, tickers);
        return sum + (accountValue * client.revenueProfile.advisoryFeeBps) / 10000;
    }, 0);
    const cycleRevenue = annualizedGrossRevenue / 240;
    const trailingCycleRevenue = (priorTrailingCycleRevenue * 0.82) + cycleRevenue;
    return {
        annualizedGrossRevenue: Number(annualizedGrossRevenue.toFixed(2)),
        cycleRevenue: Number(cycleRevenue.toFixed(2)),
        retainedClients: clients.length,
        trailingCycleRevenue: Number(trailingCycleRevenue.toFixed(2))
    };
}
