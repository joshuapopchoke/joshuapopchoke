"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const marketEngine_1 = require("../src/engine/marketEngine");
const complianceEngine_1 = require("../src/engine/complianceEngine");
const questionEngine_1 = require("../src/engine/questionEngine");
const questionBank_1 = require("../src/engine/questionBank");
const clients_1 = require("../src/data/clients");
async function main() {
    const bank = await (0, questionBank_1.loadAuthoredQuestionBank)();
    strict_1.default.equal(bank.sie.length, 300, "SIE authored bank should contain 300 questions.");
    strict_1.default.equal(bank.series7.length, 500, "Series 7 authored bank should contain 500 questions.");
    strict_1.default.equal(bank.series65.length, 400, "Series 65 authored bank should contain 400 questions.");
    strict_1.default.equal(bank.series66.length, 400, "Series 66 authored bank should contain 400 questions.");
    strict_1.default.ok(Object.values(bank).flat().every((question) => question.explanation.trim().split(/\s+/).length >= 8), "Each authored question should retain a substantive explanation.");
    const tracker = (0, questionEngine_1.createQuestionTracker)();
    const learnerQuestion = await (0, questionEngine_1.pickQuestion)("learner", tracker);
    strict_1.default.equal(learnerQuestion.exam, "SIE", "Learner difficulty should only draw from SIE.");
    (0, questionEngine_1.recordQuestionOutcome)(tracker, learnerQuestion, true);
    strict_1.default.equal(tracker.domainPerformance[`${learnerQuestion.exam}::${learnerQuestion.domain}`]?.correct, 1, "Question tracker should record domain outcomes.");
    const traineeQuestion = await (0, questionEngine_1.pickQuestion)("trainee", tracker);
    strict_1.default.ok(traineeQuestion.exam === "SIE" || traineeQuestion.exam === "Series 65", "Easy difficulty should draw from SIE or Series 65.");
    const associateQuestion = await (0, questionEngine_1.pickQuestion)("associate", tracker);
    strict_1.default.ok(associateQuestion.exam === "SIE" || associateQuestion.exam === "Series 65", "Medium difficulty should draw from SIE or Series 65.");
    const engine = (0, marketEngine_1.createMarketEngine)();
    const before = engine.getState();
    const next = engine.simulateTick();
    strict_1.default.equal(Object.keys(before.tickers).length, Object.keys(next.tickers).length, "Ticker count should remain stable.");
    strict_1.default.ok(Object.values(next.histories).every((history) => history.length >= 1 && history.length <= 60), "Price histories should remain bounded.");
    const conservativeClient = {
        ...clients_1.CLIENTS[0],
        cash: clients_1.CLIENTS[0].startingAum,
        holdings: {},
        status: "pending"
    };
    const futuresTicker = next.tickers.ES;
    const decision = (0, complianceEngine_1.evaluateTradeSuitability)(conservativeClient, futuresTicker, 2, "buy", next.tickers);
    strict_1.default.equal(decision.suitable, false, "Conservative clients should fail leveraged futures suitability.");
    strict_1.default.ok(decision.flags.includes("unsuitable-product"), "Unsuitable product flag should be raised.");
    strict_1.default.ok((0, complianceEngine_1.applyScrutinyLevel)(20, decision) > 20, "Unsuitable trades should raise scrutiny.");
    strict_1.default.equal((0, complianceEngine_1.resolveAuditScrutiny)(100, true), 40, "Passing an audit should reset scrutiny to 40% or lower.");
    strict_1.default.equal((0, complianceEngine_1.resolveAuditScrutiny)(100, false), 60, "Failing an audit should reset scrutiny to 60%.");
    strict_1.default.ok(clients_1.CLIENTS.every((client) => client.trustScore >= 0 && client.trustScore <= 100 && client.mandateTargets.length > 0), "Client seeds should include valid trust and mandate metadata.");
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
