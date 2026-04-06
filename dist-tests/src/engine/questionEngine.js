"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQuestionTracker = createQuestionTracker;
exports.getAvailableQuestions = getAvailableQuestions;
exports.pickQuestion = pickQuestion;
exports.markQuestionAsked = markQuestionAsked;
exports.recordQuestionOutcome = recordQuestionOutcome;
exports.pickAuditQuestion = pickAuditQuestion;
exports.shuffleQuestion = shuffleQuestion;
exports.getBlueprintForDifficulty = getBlueprintForDifficulty;
const examBlueprints_1 = require("../data/examBlueprints");
const planningQuestions_1 = require("../data/planningQuestions");
const questions_1 = require("../data/questions");
const questionBank_1 = require("./questionBank");
function createQuestionTracker() {
    return {
        recentlyAsked: [],
        questionsAsked: 0,
        lastClientAsked: null,
        domainPerformance: {}
    };
}
function getDomainKey(question) {
    return `${question.exam}::${question.domain}`;
}
function choosePriorityDomain(difficulty, tracker) {
    const blueprints = examBlueprints_1.EXAM_BLUEPRINTS[difficulty];
    const ranked = blueprints
        .map((domain) => {
        const stats = tracker.domainPerformance[`${domain.exam}::${domain.label}`] ?? { seen: 0, correct: 0, incorrect: 0 };
        const accuracy = stats.seen === 0 ? 0 : stats.correct / stats.seen;
        return {
            blueprint: domain,
            seen: stats.seen,
            accuracy
        };
    })
        .sort((left, right) => left.seen - right.seen || left.accuracy - right.accuracy);
    return ranked[0]?.blueprint ?? (0, examBlueprints_1.pickBlueprintDomain)(difficulty);
}
function examToPoolKey(exam) {
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
function getAvailableQuestions(difficulty, tracker, client) {
    return getAvailableQuestionsInternal(difficulty, tracker, client);
}
async function getAvailableQuestionsInternal(difficulty, tracker, client) {
    const exams = [...new Set(examBlueprints_1.EXAM_BLUEPRINTS[difficulty].map((domain) => domain.exam))];
    const authoredKeys = (0, questionBank_1.getExamKeysForDifficulty)(difficulty);
    const authoredBank = (0, questionBank_1.getAuthoredQuestionBankSync)(authoredKeys);
    const hasAllRequestedAuthored = authoredKeys.every((key) => authoredBank[key].length > 0);
    const resolvedAuthoredBank = hasAllRequestedAuthored ? authoredBank : await (0, questionBank_1.loadAuthoredQuestionBank)(authoredKeys);
    const authoredPool = exams.flatMap((exam) => resolvedAuthoredBank[examToPoolKey(exam)]);
    const fallbackPool = exams.flatMap((exam) => questions_1.QUESTION_POOLS[examToPoolKey(exam)]);
    const preferredPool = authoredPool.length > 0 ? authoredPool : fallbackPool;
    const examQuestions = preferredPool.filter((question) => !tracker.recentlyAsked.includes(question.question));
    if (!client) {
        return examQuestions;
    }
    const planningQuestions = [
        ...client.questionSet,
        ...(0, planningQuestions_1.getPlanningQuestionsForClient)(client.id, difficulty)
    ].filter((question) => !tracker.recentlyAsked.includes(question.question));
    return [...examQuestions, ...planningQuestions];
}
function pickQuestion(difficulty, tracker, client) {
    return pickQuestionInternal(difficulty, tracker, client);
}
async function pickQuestionInternal(difficulty, tracker, client) {
    const exams = [...new Set(examBlueprints_1.EXAM_BLUEPRINTS[difficulty].map((domain) => domain.exam))];
    const authoredKeys = (0, questionBank_1.getExamKeysForDifficulty)(difficulty);
    const authoredBank = (0, questionBank_1.getAuthoredQuestionBankSync)(authoredKeys);
    const hasAllRequestedAuthored = authoredKeys.every((key) => authoredBank[key].length > 0);
    const resolvedAuthoredBank = hasAllRequestedAuthored ? authoredBank : await (0, questionBank_1.loadAuthoredQuestionBank)(authoredKeys);
    const authoredPool = exams.flatMap((exam) => resolvedAuthoredBank[examToPoolKey(exam)]);
    const availableAuthored = authoredPool.filter((question) => !tracker.recentlyAsked.includes(question.question));
    let available = await getAvailableQuestionsInternal(difficulty, tracker, client);
    const planningWeight = {
        learner: 0.2,
        trainee: 0.25,
        associate: 0.35,
        advisor: 0.45,
        senior: 0.5
    };
    const planningAvailable = client
        ? [
            ...client.questionSet,
            ...(0, planningQuestions_1.getPlanningQuestionsForClient)(client.id, difficulty)
        ].filter((question) => !tracker.recentlyAsked.includes(question.question))
        : [];
    if (planningAvailable.length > 0 && Math.random() < planningWeight[difficulty]) {
        available = planningAvailable;
    }
    const blueprintDomain = (0, examBlueprints_1.pickBlueprintDomain)(difficulty);
    const authoredAligned = availableAuthored.filter((question) => question.exam === blueprintDomain.exam && question.domain === blueprintDomain.label);
    const aligned = available.filter((question) => question.exam === blueprintDomain.exam && question.domain === blueprintDomain.label);
    const priorityDomain = choosePriorityDomain(difficulty, tracker);
    const authoredPriority = availableAuthored.filter((question) => question.exam === priorityDomain.exam && question.domain === priorityDomain.label);
    const priorityAligned = available.filter((question) => question.exam === priorityDomain.exam && question.domain === priorityDomain.label);
    if (authoredPriority.length > 0 && Math.random() < 0.7) {
        available = authoredPriority;
    }
    else if (priorityAligned.length > 0 && Math.random() < 0.7) {
        available = priorityAligned;
    }
    else if (authoredAligned.length > 0) {
        available = authoredAligned;
    }
    else {
        const authoredExamMatched = availableAuthored.filter((question) => question.exam === blueprintDomain.exam);
        if (authoredExamMatched.length > 0) {
            available = authoredExamMatched;
        }
        else if (aligned.length > 0) {
            available = aligned;
        }
        else {
            const examMatched = available.filter((question) => question.exam === blueprintDomain.exam);
            if (examMatched.length > 0) {
                available = examMatched;
            }
        }
    }
    if (available.length === 0) {
        const halfLength = Math.floor(tracker.recentlyAsked.length / 2);
        tracker.recentlyAsked = tracker.recentlyAsked.slice(halfLength);
        available = await getAvailableQuestionsInternal(difficulty, tracker, client);
    }
    return available[Math.floor(Math.random() * available.length)];
}
function markQuestionAsked(tracker, difficulty, question, clientId) {
    const cooldown = questions_1.QUESTION_COOLDOWNS[difficulty];
    tracker.recentlyAsked.push(question.question);
    while (tracker.recentlyAsked.length > cooldown) {
        tracker.recentlyAsked.shift();
    }
    tracker.questionsAsked += 1;
    tracker.lastClientAsked = clientId;
}
function recordQuestionOutcome(tracker, question, correct) {
    const key = getDomainKey(question);
    const current = tracker.domainPerformance[key] ?? { seen: 0, correct: 0, incorrect: 0 };
    tracker.domainPerformance[key] = {
        seen: current.seen + 1,
        correct: current.correct + (correct ? 1 : 0),
        incorrect: current.incorrect + (correct ? 0 : 1)
    };
}
function pickAuditQuestion(tracker) {
    const available = questions_1.AUDIT_QUESTIONS.filter((question) => !tracker.recentlyAsked.includes(question.question));
    return available[Math.floor(Math.random() * available.length)] ?? questions_1.AUDIT_QUESTIONS[0];
}
function shuffleQuestion(question) {
    const shuffled = question.options.map((option, index) => ({ option, index })).sort(() => Math.random() - 0.5);
    return {
        shuffledOptions: shuffled.map((entry) => entry.option),
        displayCorrectIndex: shuffled.findIndex((entry) => entry.index === question.correct)
    };
}
function getBlueprintForDifficulty(difficulty) {
    return examBlueprints_1.EXAM_BLUEPRINTS[difficulty];
}
