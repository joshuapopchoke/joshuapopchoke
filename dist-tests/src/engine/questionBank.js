"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExamKeysForDifficulty = getExamKeysForDifficulty;
exports.loadAuthoredQuestionBank = loadAuthoredQuestionBank;
exports.getAuthoredQuestionBankSync = getAuthoredQuestionBankSync;
exports.getLoadedQuestionBankKeys = getLoadedQuestionBankKeys;
const examBlueprints_1 = require("../data/examBlueprints");
const questions_1 = require("../data/questions");
const emptyAuthoredBank = () => ({
    sie: [],
    series7: [],
    series65: [],
    series66: []
});
const authoredBankCache = {};
const authoredBankPromises = {};
function validateQuestions(label, questions, enforceBlueprintDomains = true) {
    const seenTags = new Set();
    const blueprintDomains = new Set(Object.values(examBlueprints_1.EXAM_BLUEPRINTS)
        .flat()
        .map((domain) => `${domain.exam}:${domain.label}`));
    const allowedLegacyDomainAliases = new Set(["SIE:Overview of Regulatory Framework"]);
    questions.forEach((question, index) => {
        const pointer = `${label}[${index}]`;
        if (!question.question.trim()) {
            throw new Error(`${pointer} is missing question text.`);
        }
        if (question.options.length !== 4) {
            throw new Error(`${pointer} must have exactly 4 options.`);
        }
        if (question.correct < 0 || question.correct >= question.options.length) {
            throw new Error(`${pointer} has an out-of-range correct index.`);
        }
        if (!question.explanation.trim()) {
            throw new Error(`${pointer} is missing an explanation.`);
        }
        if (seenTags.has(question.topicTag)) {
            throw new Error(`${pointer} reuses topicTag "${question.topicTag}".`);
        }
        seenTags.add(question.topicTag);
        if (enforceBlueprintDomains && question.exam !== "Audit" && question.exam !== "Client") {
            const domainKey = `${question.exam}:${question.domain}`;
            if (!blueprintDomains.has(domainKey) &&
                !allowedLegacyDomainAliases.has(domainKey) &&
                question.domain !== "Legacy Foundation") {
                throw new Error(`${pointer} uses unexpected domain "${question.domain}" for ${question.exam}.`);
            }
        }
    });
}
function validateQuestionBank(bank) {
    if (bank.sie)
        validateQuestions("authored.sie", bank.sie);
    if (bank.series7)
        validateQuestions("authored.series7", bank.series7);
    if (bank.series65)
        validateQuestions("authored.series65", bank.series65);
    if (bank.series66)
        validateQuestions("authored.series66", bank.series66);
    validateQuestions("fallback.sie", questions_1.QUESTION_POOLS.sie, false);
    validateQuestions("fallback.series7", questions_1.QUESTION_POOLS.series7, false);
    validateQuestions("fallback.series65", questions_1.QUESTION_POOLS.series65, false);
    validateQuestions("fallback.series66", questions_1.QUESTION_POOLS.series66, false);
    validateQuestions("audit", questions_1.AUDIT_QUESTIONS, false);
}
function examToKey(exam) {
    switch (exam) {
        case "SIE":
            return "sie";
        case "Series 7":
            return "series7";
        case "Series 65":
            return "series65";
        case "Series 66":
            return "series66";
    }
}
function getExamKeysForDifficulty(difficulty) {
    return [...new Set(examBlueprints_1.EXAM_BLUEPRINTS[difficulty].map((domain) => examToKey(domain.exam)))];
}
async function loadAuthoredQuestionSet(key) {
    if (authoredBankCache[key]) {
        return authoredBankCache[key];
    }
    if (!authoredBankPromises[key]) {
        authoredBankPromises[key] = (async () => {
            switch (key) {
                case "sie": {
                    const module = await Promise.resolve().then(() => __importStar(require("../data/authoredQuestions/sie")));
                    return module.SIE_AUTHORED_QUESTIONS;
                }
                case "series7": {
                    const module = await Promise.resolve().then(() => __importStar(require("../data/authoredQuestions/series7")));
                    return module.SERIES7_AUTHORED_QUESTIONS;
                }
                case "series65": {
                    const module = await Promise.resolve().then(() => __importStar(require("../data/authoredQuestions/series65")));
                    return module.SERIES65_AUTHORED_QUESTIONS;
                }
                case "series66": {
                    const module = await Promise.resolve().then(() => __importStar(require("../data/authoredQuestions/series66")));
                    return module.SERIES66_AUTHORED_QUESTIONS;
                }
            }
        })().then((questions) => {
            authoredBankCache[key] = questions;
            validateQuestionBank({ [key]: questions });
            return questions;
        });
    }
    return authoredBankPromises[key];
}
async function loadAuthoredQuestionBank(keys) {
    const requestedKeys = keys ?? ["sie", "series7", "series65", "series66"];
    const bank = emptyAuthoredBank();
    await Promise.all(requestedKeys.map(async (key) => {
        bank[key] = await loadAuthoredQuestionSet(key);
    }));
    validateQuestionBank(bank);
    return bank;
}
function getAuthoredQuestionBankSync(keys) {
    const requestedKeys = keys ?? ["sie", "series7", "series65", "series66"];
    const bank = emptyAuthoredBank();
    requestedKeys.forEach((key) => {
        bank[key] = authoredBankCache[key] ?? [];
    });
    return bank;
}
function getLoadedQuestionBankKeys() {
    return Object.keys(authoredBankCache).filter((key) => {
        const questions = authoredBankCache[key];
        return Array.isArray(questions) && questions.length > 0;
    });
}
