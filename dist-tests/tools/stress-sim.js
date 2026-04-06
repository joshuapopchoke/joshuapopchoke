"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const clients_1 = require("../src/data/clients");
const complianceEngine_1 = require("../src/engine/complianceEngine");
const marketEngine_1 = require("../src/engine/marketEngine");
const playerComplianceEngine_1 = require("../src/engine/playerComplianceEngine");
const questionEngine_1 = require("../src/engine/questionEngine");
async function runQuestionStress(summary) {
    const difficulties = ["learner", "trainee", "associate", "advisor", "senior"];
    for (const difficulty of difficulties) {
        const tracker = (0, questionEngine_1.createQuestionTracker)();
        for (let index = 0; index < 180; index += 1) {
            const question = await (0, questionEngine_1.pickQuestion)(difficulty, tracker);
            const correct = index % 3 !== 0;
            (0, questionEngine_1.markQuestionAsked)(tracker, difficulty, question, clients_1.CLIENTS[index % clients_1.CLIENTS.length].id);
            (0, questionEngine_1.recordQuestionOutcome)(tracker, question, correct);
            summary.questionDraws += 1;
        }
        strict_1.default.ok(tracker.questionsAsked === 180, `${difficulty} tracker should count all simulated questions.`);
        strict_1.default.ok(Object.keys(tracker.domainPerformance).length > 0, `${difficulty} should record domain performance.`);
    }
}
function runMarketStress(summary) {
    const engine = (0, marketEngine_1.createMarketEngine)();
    for (let index = 0; index < 1200; index += 1) {
        const state = engine.simulateTick(1, 0.14);
        summary.marketTicks += 1;
        for (const ticker of Object.values(state.tickers)) {
            strict_1.default.ok(Number.isFinite(ticker.price), `${ticker.symbol} price should remain finite.`);
            strict_1.default.ok(ticker.price > 0, `${ticker.symbol} price should remain positive.`);
            strict_1.default.ok(Number.isFinite(ticker.change), `${ticker.symbol} change should remain finite.`);
        }
        strict_1.default.ok(Object.values(state.histories).every((history) => history.length >= 1 && history.length <= 60), "Histories should stay bounded during stress.");
    }
}
function runSuitabilityStress(summary) {
    const engine = (0, marketEngine_1.createMarketEngine)();
    const market = engine.getState();
    const tickers = Object.values(market.tickers);
    for (const client of clients_1.CLIENTS) {
        const hydratedClient = {
            ...client,
            cash: client.startingAum,
            holdings: {},
            status: "pending"
        };
        for (const ticker of tickers) {
            const quantity = Math.max(1, Math.round((client.startingAum * 0.08) / Math.max(ticker.price, 1)));
            const decision = (0, complianceEngine_1.evaluateTradeSuitability)(hydratedClient, ticker, quantity, "buy", market.tickers);
            summary.suitabilityChecks += 1;
            strict_1.default.ok(Number.isFinite(decision.scrutinyDelta), "Scrutiny deltas should stay finite.");
            strict_1.default.ok(decision.scrutinyDelta >= 0, "Scrutiny deltas should not go negative.");
            if (!decision.suitable && decision.reasons.length === 0) {
                summary.warnings.push(`Unsuitable decision without reasons for ${client.id}/${ticker.symbol}`);
            }
        }
    }
}
function runInsiderStress(summary) {
    const engine = (0, marketEngine_1.createMarketEngine)();
    const market = engine.getState();
    let violations = 0;
    for (let index = 0; index < 250; index += 1) {
        const event = (0, playerComplianceEngine_1.createInsiderInfoEvent)(market.tickers);
        strict_1.default.ok(event, "Stress sim should be able to create insider events.");
        summary.insiderEvents += 1;
        const tradeDecision = index % 4 === 0 ? "trade" : "avoid";
        const resolution = (0, playerComplianceEngine_1.evaluateInsiderDecision)(event, tradeDecision, violations);
        strict_1.default.ok(Number.isFinite(resolution.fineUsd), "Fines should remain finite.");
        strict_1.default.ok(Number.isFinite(resolution.complianceDelta), "Compliance deltas should remain finite.");
        violations = resolution.nextViolationCount;
        if (resolution.gameOver) {
            violations = 0;
        }
    }
}
async function main() {
    const summary = {
        marketTicks: 0,
        questionDraws: 0,
        suitabilityChecks: 0,
        insiderEvents: 0,
        warnings: []
    };
    runMarketStress(summary);
    await runQuestionStress(summary);
    runSuitabilityStress(summary);
    runInsiderStress(summary);
    console.log(JSON.stringify(summary, null, 2));
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
