import { Suspense, lazy, useMemo } from "react";
import { DIFFICULTY_LABELS, EXAM_BLUEPRINTS } from "../data/examBlueprints";
import { deriveMarketDateTime, describeMarketSession } from "../engine/marketClock";
import { getExamKeysForDifficulty } from "../engine/questionBank";
import { useGameStore, useSelectedClient } from "../store/gameStore";
import { PlannerToolsRibbonCard } from "./PlannerToolsRibbonCard";

const SessionManagerOverlay = lazy(() => import("./SessionManagerOverlay").then((module) => ({ default: module.SessionManagerOverlay })));

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatStamp(value: number | null) {
  if (!value) {
    return "Pending";
  }

  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function bankLabel(key: string) {
  switch (key) {
    case "sie":
      return "SIE";
    case "series7":
      return "Series 7";
    case "series65":
      return "Series 65";
    case "series66":
      return "Series 66";
    default:
      return key;
  }
}

function formatDeltaPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatDeltaDollars(value: number) {
  return `${value >= 0 ? "+" : "-"}${formatCurrency(Math.abs(value))}`;
}

function formatRate(value: number) {
  return `${value.toFixed(2)}%`;
}

function computeClientUsd(
  client: {
    cash: number;
    holdings: Record<string, { ticker: string; shares: number }>;
    shortHoldings?: Record<string, { ticker: string; shares: number }>;
    marginDebt?: number;
    startingAum: number;
  },
  tickers: Record<string, { price: number }>
) {
  const longValue = client.cash + Object.values(client.holdings).reduce((total, holding) => total + (tickers[holding.ticker]?.price ?? 0) * holding.shares, 0);
  const shortValue = Object.values(client.shortHoldings ?? {}).reduce((total, holding) => total + (tickers[holding.ticker]?.price ?? 0) * holding.shares, 0);
  return longValue - shortValue - (client.marginDebt ?? 0);
}

export function TopBar() {
  const score = useGameStore((state) => state.score);
  const interestRates = useGameStore((state) => state.interestRates);
  const revenueSnapshot = useGameStore((state) => state.revenueSnapshot);
  const personalPortfolioUsd = useGameStore((state) => state.personalPortfolioUsd);
  const personalHoldings = useGameStore((state) => state.personalHoldings);
  const personalShortHoldings = useGameStore((state) => state.personalShortHoldings);
  const personalMarginDebt = useGameStore((state) => state.personalMarginDebt);
  const personalMarginCall = useGameStore((state) => state.personalMarginCall);
  const totalAum = useGameStore((state) => state.totalAum);
  const clients = useGameStore((state) => state.clients);
  const tickers = useGameStore((state) => state.tickers);
  const timerSeconds = useGameStore((state) => state.timerSeconds);
  const isPaused = useGameStore((state) => state.isPaused);
  const gameDateIso = useGameStore((state) => state.gameDateIso);
  const playerTradeStatus = useGameStore((state) => state.playerTradeStatus);
  const playerSuspensionRounds = useGameStore((state) => state.playerSuspensionRounds);
  const secMeterLevel = useGameStore((state) => state.secMeterLevel);
  const activeDifficulty = useGameStore((state) => state.activeDifficulty);
  const questionOutcomes = useGameStore((state) => state.questionOutcomes);
  const questionBankStatus = useGameStore((state) => state.questionBankStatus);
  const lastSavedAt = useGameStore((state) => state.lastSavedAt);
  const lastRestoredAt = useGameStore((state) => state.lastRestoredAt);
  const sessionRestored = useGameStore((state) => state.sessionRestored);
  const setDifficulty = useGameStore((state) => state.setDifficulty);
  const togglePause = useGameStore((state) => state.togglePause);
  const resetSession = useGameStore((state) => state.resetSession);
  const initializeQuestionBank = useGameStore((state) => state.initializeQuestionBank);
  const activeClient = useSelectedClient();

  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const personalStart: number = 100000;
  const personalMarketValue = useMemo(
    () => Object.values(personalHoldings).reduce((sum, holding) => sum + (tickers[holding.ticker]?.price ?? 0) * holding.shares, 0),
    [personalHoldings, tickers]
  );
  const personalShortValue = useMemo(
    () => Object.values(personalShortHoldings).reduce((sum, holding) => sum + (tickers[holding.ticker]?.price ?? 0) * holding.shares, 0),
    [personalShortHoldings, tickers]
  );
  const personalEquity = personalPortfolioUsd + personalMarketValue - personalShortValue - personalMarginDebt;
  const startingBook = useMemo(() => clients.reduce((total, client) => total + client.startingAum, 0), [clients]);
  const personalDelta = personalEquity - personalStart;
  const personalDeltaPercent = personalStart === 0 ? 0 : (personalDelta / personalStart) * 100;
  const totalDelta = totalAum - startingBook;
  const totalDeltaPercent = startingBook === 0 ? 0 : (totalDelta / startingBook) * 100;
  const clientUsd = useMemo(() => (activeClient ? computeClientUsd(activeClient, tickers) : 0), [activeClient, tickers]);
  const clientDelta = activeClient ? clientUsd - activeClient.startingAum : 0;
  const clientDeltaPercent = !activeClient || activeClient.startingAum === 0 ? 0 : (clientDelta / activeClient.startingAum) * 100;
  const personalDeltaClass = personalDelta >= 0 ? "up" : "down";
  const totalDeltaClass = totalDelta >= 0 ? "up" : "down";
  const clientDeltaClass = clientDelta >= 0 ? "up" : "down";
  const difficultyExamKeys = getExamKeysForDifficulty(activeDifficulty);
  const allowedExams = useMemo(() => [...new Set(EXAM_BLUEPRINTS[activeDifficulty].map((domain) => domain.exam))], [activeDifficulty]);
  const activeStudyOutcomes = useMemo(
    () => questionOutcomes.filter((outcome) => allowedExams.includes(outcome.exam as typeof allowedExams[number])),
    [allowedExams, questionOutcomes]
  );
  const correctAnswers = activeStudyOutcomes.filter((outcome) => outcome.correct).length;
  const answeredQuestions = activeStudyOutcomes.length;
  const accuracy = answeredQuestions === 0 ? 0 : (correctAnswers / answeredQuestions) * 100;
  const strongestExam = useMemo(() => allowedExams
    .map((exam) => {
      const examOutcomes = activeStudyOutcomes.filter((outcome) => outcome.exam === exam);
      const examCorrect = examOutcomes.filter((outcome) => outcome.correct).length;
      const examAccuracy = examOutcomes.length === 0 ? 0 : (examCorrect / examOutcomes.length) * 100;
      return { exam, examAccuracy, count: examOutcomes.length };
    })
    .sort((left, right) => right.examAccuracy - left.examAccuracy || right.count - left.count)[0], [activeStudyOutcomes, allowedExams]);
  const gameDateTime = useMemo(() => deriveMarketDateTime(gameDateIso, timerSeconds, 15 * 60), [gameDateIso, timerSeconds]);
  const gameDateLabel = useMemo(
    () => gameDateTime.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    [gameDateTime]
  );
  const gameSessionLabel = useMemo(() => describeMarketSession(gameDateTime), [gameDateTime]);

  const playerStatus = playerTradeStatus === "suspended"
    ? `Suspended ${playerSuspensionRounds} rounds`
    : playerTradeStatus === "fined"
      ? "Warning"
      : playerTradeStatus === "incarcerated"
        ? "Incarcerated"
        : "Compliant";

  return (
    <header className="topbar">
      <div className="topbar-main">
        <div className="topbar-brand">
          <p className="eyebrow">Sterling Fiduciary Group</p>
          <h1>Fiduciary Duty</h1>
        </div>
        <div className="topbar-meta-line">
          <span>{sessionRestored ? `Restored ${formatStamp(lastRestoredAt)}` : "Fresh session"}</span>
          <span>Auto-save {formatStamp(lastSavedAt)}</span>
          <span>{isPaused ? "Paused" : "Live"}</span>
          <span>{playerStatus}</span>
          <span>{questionBankStatus === "loading" ? "Bank loading" : "Bank ready"}</span>
        </div>
        <div className="control-strip">
          {(["learner", "trainee", "associate", "advisor", "senior"] as const).map((difficulty) => (
            <button
              key={difficulty}
              className={activeDifficulty === difficulty ? "control-btn active" : "control-btn"}
              onClick={() => setDifficulty(difficulty)}
            >
              {DIFFICULTY_LABELS[difficulty]}
            </button>
          ))}
          <button className="control-btn" onClick={() => resetSession()}>
            New Session
          </button>
          <button className={isPaused ? "control-btn active" : "control-btn"} onClick={() => togglePause()}>
            {isPaused ? "Resume" : "Pause"}
          </button>
          <Suspense fallback={<button className="control-btn" disabled>Sessions</button>}>
            <SessionManagerOverlay />
          </Suspense>
          <button className="control-btn" onClick={() => void initializeQuestionBank(activeDifficulty)}>
            Reload Bank
          </button>
        </div>
      </div>
      <div className="topbar-ribbon">
        <div className="ribbon-item ribbon-item--score">
          <span>Score</span>
          <strong>{score.toLocaleString()}</strong>
        </div>
        <div className="ribbon-item ribbon-item--rates">
          <span>Rates</span>
          <strong>Fed {formatRate(interestRates.fedFunds)} | 10Y {formatRate(interestRates.tenYearTreasury)}</strong>
          <small className={interestRates.periodChangeBps <= 0 ? "up" : "down"}>
            {interestRates.label} | 2Y {formatRate(interestRates.twoYearTreasury)} | Mtg {formatRate(interestRates.mortgage30Year)} | {interestRates.periodChangeBps >= 0 ? "+" : ""}{interestRates.periodChangeBps} bps
          </small>
        </div>
        <div className="ribbon-item ribbon-item--revenue">
          <span>Revenue</span>
          <strong>{formatCurrency(revenueSnapshot.annualizedGrossRevenue)}/yr</strong>
          <small className="up">{formatCurrency(revenueSnapshot.cycleRevenue)} this cycle | {revenueSnapshot.retainedClients} retained</small>
        </div>
        <div className="ribbon-item ribbon-item--personal">
          <span>Personal USD</span>
          <strong>{formatCurrency(personalEquity)}</strong>
          <small className={personalMarginCall ? "down" : personalDeltaClass}>
            {personalMarginCall ? `Call | ${formatCurrency(personalMarginDebt)} debt` : `${formatDeltaDollars(personalDelta)} | ${formatDeltaPercent(personalDeltaPercent)}`}
          </small>
        </div>
        <div className="ribbon-item ribbon-item--book">
          <span>Book</span>
          <strong>{clients.length} Clients</strong>
          <small className={totalDeltaClass}>{formatDeltaDollars(totalDelta)} | {formatDeltaPercent(totalDeltaPercent)}</small>
        </div>
        <div className="ribbon-item ribbon-item--total">
          <span>Total USD</span>
          <strong>{formatCurrency(totalAum)}</strong>
          <small className={totalDeltaClass}>{formatDeltaDollars(totalDelta)} | {formatDeltaPercent(totalDeltaPercent)}</small>
        </div>
        <div className="ribbon-item ribbon-item--client">
          <span>Client USD</span>
          <strong>{formatCurrency(clientUsd)}</strong>
          <small className={clientDeltaClass}>{activeClient?.name ?? "No client"} | {formatDeltaPercent(clientDeltaPercent)}</small>
        </div>
        <div className="ribbon-item ribbon-item--timer">
          <span>Timer</span>
          <strong>{minutes}:{seconds.toString().padStart(2, "0")}</strong>
          <small>{isPaused ? "Paused" : "Cycle live"}</small>
        </div>
        <div className="ribbon-item ribbon-item--sec">
          <span>SEC</span>
          <strong>{secMeterLevel}%</strong>
          <div className="meter-track compact">
            <div className="meter-fill" style={{ width: `${secMeterLevel}%` }} />
          </div>
        </div>
        <div className="ribbon-item ribbon-item--difficulty">
          <span>Difficulty</span>
          <strong>{DIFFICULTY_LABELS[activeDifficulty]}</strong>
          <small>{difficultyExamKeys.map(bankLabel).join(" | ") || "No bank cached"}</small>
        </div>
        <div className="ribbon-item ribbon-item--study">
          <span>Study</span>
          <strong>{answeredQuestions} answered</strong>
          <small className={accuracy >= 70 ? "up" : accuracy >= 50 ? "" : "down"}>
            {correctAnswers} correct | {accuracy.toFixed(0)}% | {strongestExam?.count ? strongestExam.exam : "Build streak"}
          </small>
        </div>
        <div className="ribbon-item ribbon-item--coach">
          <span>Why It Matters</span>
          <strong>Correct answers build exam confidence and grow your personal portfolio.</strong>
          <small>Each right answer reinforces real SIE / Series concepts and adds USD to your self-directed account.</small>
        </div>
        <div className="ribbon-item ribbon-item--calendar">
          <span>Game Clock</span>
          <strong>{gameDateLabel}</strong>
          <small>{gameSessionLabel}</small>
        </div>
        <PlannerToolsRibbonCard />
      </div>
    </header>
  );
}
