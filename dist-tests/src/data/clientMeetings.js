"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientMeetingScenario = getClientMeetingScenario;
const CLIENT_MEETING_BANK = {
    retiree: [
        {
            clientId: "retiree",
            meetingId: "retiree-healthcare",
            title: "Healthcare Costs Rising",
            summary: "Margaret is worried that prescription and specialist costs are climbing faster than expected.",
            question: "How do you adjust the plan without pushing her into unnecessary risk?",
            options: [
                {
                    id: "rebalance-income",
                    label: "Increase reserve cash and shift toward steadier income assets",
                    outcome: "Margaret feels heard because the plan now treats healthcare cash flow as a first-order need instead of chasing extra upside.",
                    trustDelta: 7,
                    expenseDelta: 450,
                    reserveMonthsDelta: 2,
                    liquidityNeed: "High"
                },
                {
                    id: "push-growth",
                    label: "Recommend higher-growth tech names to outpace medical inflation",
                    outcome: "Margaret sees the answer as too speculative for her stage of life and loses confidence in the guidance.",
                    trustDelta: -9,
                    expenseDelta: 300
                },
                {
                    id: "delay-action",
                    label: "Tell her to wait a few months before adjusting anything",
                    outcome: "Margaret appreciates the calm tone but still feels the plan is not reacting quickly enough to a real cost pressure.",
                    trustDelta: -2,
                    expenseDelta: 350
                }
            ]
        }
    ],
    young_pro: [
        {
            clientId: "young_pro",
            meetingId: "young-pro-home",
            title: "Considering a Home Purchase",
            summary: "Derek may buy a home within two years and wants to know how much to keep liquid.",
            question: "What is the best planning response?",
            options: [
                {
                    id: "fund-down-payment",
                    label: "Carve out a down-payment reserve and keep the growth sleeve invested separately",
                    outcome: "Derek likes that the plan separates near-term housing cash from long-term compounding instead of gambling with both.",
                    trustDelta: 8,
                    debtPaymentDelta: 300,
                    reserveMonthsDelta: 2,
                    liquidityNeed: "High"
                },
                {
                    id: "all-in-growth",
                    label: "Keep everything aggressively invested until the purchase date is close",
                    outcome: "Derek likes growth, but this answer underestimates the timing risk of needing a house down payment in a drawdown.",
                    trustDelta: -6,
                    liquidityNeed: "Moderate"
                },
                {
                    id: "debt-first",
                    label: "Pause investing entirely and pay every spare dollar toward future housing costs",
                    outcome: "The answer feels too one-dimensional and ignores Derek's long horizon and appetite for controlled growth.",
                    trustDelta: -1,
                    reserveMonthsDelta: 1
                }
            ]
        }
    ],
    family: [
        {
            clientId: "family",
            meetingId: "family-refi",
            title: "Mortgage Refinance Question",
            summary: "The Kowalskis ask whether refinancing the mortgage would be smarter than investing the cash flow elsewhere.",
            question: "How should you frame the decision?",
            options: [
                {
                    id: "compare-rate-and-horizon",
                    label: "Compare the refinance rate savings, break-even period, and college-liquidity needs before choosing",
                    outcome: "The family trusts the advice because it balances debt, education funding, and time horizon instead of forcing one answer.",
                    trustDelta: 8,
                    debtPaymentDelta: -350,
                    reserveMonthsDelta: 1
                },
                {
                    id: "always-refi",
                    label: "Tell them refinancing is always the right move if a lower rate is available",
                    outcome: "The family feels the answer is too simplistic because fees, timing, and cash-flow needs were ignored.",
                    trustDelta: -5
                },
                {
                    id: "ignore-refi",
                    label: "Tell them to ignore the mortgage and just invest more aggressively",
                    outcome: "The family hears this as dismissive of a major household decision and becomes less confident in the advice.",
                    trustDelta: -8,
                    liquidityNeed: "High"
                }
            ]
        }
    ],
    entrepreneur: [
        {
            clientId: "entrepreneur",
            meetingId: "entrepreneur-tax-bill",
            title: "Liquidity for Upcoming Tax Bill",
            summary: "Sofia wants to deploy capital quickly, but a large tax payment is coming from the business exit.",
            question: "How do you respond?",
            options: [
                {
                    id: "tax-reserve",
                    label: "Ring-fence a tax reserve first and invest the strategic excess separately",
                    outcome: "Sofia sees this as disciplined and strategic because it protects the tax obligation without freezing the whole plan.",
                    trustDelta: 8,
                    reserveMonthsDelta: 2,
                    liquidityNeed: "High"
                },
                {
                    id: "invest-all",
                    label: "Invest the full balance now and plan to raise cash later if needed",
                    outcome: "Sofia hears unnecessary execution risk and becomes less comfortable with the plan.",
                    trustDelta: -7,
                    liquidityNeed: "High"
                },
                {
                    id: "all-cash",
                    label: "Keep everything in cash until every tax detail is finalized",
                    outcome: "Sofia appreciates the caution but thinks the answer is too passive for a strategic exit-planning mandate.",
                    trustDelta: -1
                }
            ]
        }
    ],
    institutional: [
        {
            clientId: "institutional",
            meetingId: "institutional-spending-rule",
            title: "Spending Rule Pressure",
            summary: "The endowment committee asks how to support next year's spending draw without undermining long-run purchasing power.",
            question: "What should you recommend?",
            options: [
                {
                    id: "liquidity-sleeve",
                    label: "Maintain a spending-support liquidity sleeve and preserve the long-horizon growth core",
                    outcome: "The committee sees a prudent balance between current distribution needs and perpetual capital preservation.",
                    trustDelta: 7,
                    reserveMonthsDelta: 3,
                    liquidityNeed: "Moderate"
                },
                {
                    id: "sell-growth",
                    label: "Meet the spending need by selling whichever assets rallied most recently",
                    outcome: "The committee worries that this is reactive and not tied to policy discipline.",
                    trustDelta: -5
                },
                {
                    id: "higher-risk",
                    label: "Take more risk to try to earn the spending need through extra return",
                    outcome: "The committee sees this as a governance problem because it confuses spending policy with return chasing.",
                    trustDelta: -9
                }
            ]
        }
    ]
};
function getClientMeetingScenario(client, difficulty, cycleNumber) {
    const bank = CLIENT_MEETING_BANK[client.id] ?? [];
    const fallback = bank[0];
    const index = bank.length > 1 ? cycleNumber % bank.length : 0;
    const base = bank[index] ?? fallback;
    const options = base.options.map((option) => ({
        ...option,
        trustDelta: difficulty === "senior" ? Math.round(option.trustDelta * 1.1) :
            difficulty === "advisor" ? option.trustDelta :
                difficulty === "associate" ? Math.round(option.trustDelta * 0.95) :
                    difficulty === "trainee" ? Math.round(option.trustDelta * 0.9) :
                        Math.round(option.trustDelta * 0.85)
    }));
    return {
        ...base,
        options,
        resolved: false,
        selectedOptionId: null,
        feedback: null
    };
}
