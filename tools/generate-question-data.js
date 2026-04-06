const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join("public", "legacy", "index.html"), "utf8");

function extract(name) {
  const idx = html.indexOf(`const ${name} =`);

  if (idx < 0) {
    throw new Error(`Missing constant: ${name}`);
  }

  let start = html.indexOf("{", idx);
  const arrayStart = html.indexOf("[", idx);

  if (arrayStart !== -1 && (start === -1 || arrayStart < start)) {
    start = arrayStart;
  }

  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let escaped = false;
  let end = -1;

  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (inSingle) {
      if (ch === "'") inSingle = false;
      continue;
    }

    if (inDouble) {
      if (ch === '"') inDouble = false;
      continue;
    }

    if (inTemplate) {
      if (ch === "`") inTemplate = false;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      continue;
    }

    if (ch === '"') {
      inDouble = true;
      continue;
    }

    if (ch === "`") {
      inTemplate = true;
      continue;
    }

    if (ch === "{" || ch === "[") depth += 1;
    if (ch === "}" || ch === "]") {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  return html.slice(start, end);
}

const legacyPools = eval(`(${extract("QUESTION_POOLS")})`);
const auditQuestions = eval(`(${extract("AUDIT_QUESTIONS")})`);
const clients = eval(`(${extract("CLIENTS")})`);
const institutional = eval(`(${extract("INSTITUTIONAL_CLIENT")})`);

const poolMeta = {
  basic: { exam: "SIE", domain: "Legacy Foundation", difficulty: "trainee", cooldown: 62, topicTag: "legacy-basic" },
  intermediate: { exam: "Series 7", domain: "Legacy Foundation", difficulty: "associate", cooldown: 45, topicTag: "legacy-intermediate" },
  advanced: { exam: "Series 65", domain: "Legacy Foundation", difficulty: "advisor", cooldown: 30, topicTag: "legacy-advanced" },
  expert: { exam: "Series 66", domain: "Legacy Foundation", difficulty: "senior", cooldown: 28, topicTag: "legacy-expert" }
};

const mappedLegacyPools = Object.fromEntries(
  Object.entries(legacyPools).map(([key, questions]) => {
    const meta = poolMeta[key];
    return [
      key,
      questions.map((question, index) => ({
        exam: meta.exam,
        domain: meta.domain,
        difficulty: meta.difficulty,
        cooldown: meta.cooldown,
        topicTag: `${meta.topicTag}-${index + 1}`,
        question: question.q,
        options: question.options,
        correct: question.correct,
        explanation: question.explanation,
        points: question.points
      }))
    ];
  })
);

const mappedClientQuestionSets = Object.fromEntries(
  [...clients, institutional].map((client) => [
    client.id,
    client.questions.map((question, index) => ({
      exam: "Client",
      domain: "Client Suitability",
      difficulty: "client",
      cooldown: 12,
      topicTag: `${client.id}-${index + 1}`,
      question: question.q,
      options: question.options,
      correct: question.correct,
      explanation: question.explanation,
      points: question.points
    }))
  ])
);

const mappedAuditQuestions = auditQuestions.map((question, index) => ({
  exam: "Audit",
  domain: "Fiduciary Audit",
  difficulty: "audit",
  cooldown: 6,
  topicTag: `audit-${index + 1}`,
  question: question.q,
  options: question.options,
  correct: question.correct,
  explanation: question.explanation,
  points: question.passPoints
}));

const file = `import type { Question } from "../types/question";

export const LEGACY_QUESTION_POOLS = ${JSON.stringify(mappedLegacyPools, null, 2)} satisfies Record<string, Question[]>;

export const CLIENT_QUESTION_SETS = ${JSON.stringify(mappedClientQuestionSets, null, 2)} satisfies Record<string, Question[]>;

export const AUDIT_QUESTIONS = ${JSON.stringify(mappedAuditQuestions, null, 2)} satisfies Question[];

export const QUESTION_COOLDOWNS = {
  trainee: 62,
  associate: 45,
  advisor: 30,
  senior: 28,
  audit: 6,
  client: 12
} as const;

const WRAPPERS = [
  "On a licensing exam, ",
  "A candidate is asked: ",
  "During a practice question, ",
  "A client scenario asks, ",
  "In a regulatory review, ",
  "For exam prep, ",
  "A study prompt states, ",
  "A knowledge check asks, ",
  "An exam scenario says, ",
  "A review question asks, "
];

function wrapQuestion(question: Question, variant: number): Question {
  const prefix = WRAPPERS[variant % WRAPPERS.length];

  return {
    ...question,
    topicTag: \`\${question.topicTag}-variant-\${variant + 1}\`,
    question: \`\${prefix}\${question.question.charAt(0).toLowerCase()}\${question.question.slice(1)}\`
  };
}

function inflatePool(base: Question[], generated: Question[], target: number): Question[] {
  const pool = [...base];

  if (pool.length >= target) {
    return pool.slice(0, target);
  }

  let variant = 0;
  while (pool.length < target) {
    const source = generated[variant % generated.length];
    pool.push(wrapQuestion(source, variant));
    variant += 1;
  }

  return pool;
}

function makeQuestion(question: Question): Question {
  return question;
}

const SIE_GENERATED: Question[] = [
  makeQuestion({
    exam: "SIE",
    domain: "Knowledge of Capital Markets",
    difficulty: "trainee",
    cooldown: QUESTION_COOLDOWNS.trainee,
    topicTag: "sie-primary-market",
    question: "Which market handles the sale of newly issued securities in which the issuer receives the proceeds?",
    options: ["Primary market", "Secondary market", "OTC aftermarket", "Auction facility"],
    correct: 0,
    explanation: "The primary market is where issuers sell new securities and receive capital. The secondary market is where investors trade outstanding securities with each other after issuance.",
    points: 10
  }),
  makeQuestion({
    exam: "SIE",
    domain: "Knowledge of Capital Markets",
    difficulty: "trainee",
    cooldown: QUESTION_COOLDOWNS.trainee,
    topicTag: "sie-rate-impact",
    question: "When interest rates rise, what generally happens to outstanding bond prices?",
    options: ["They generally rise", "They generally fall", "They are unchanged", "They become tax-free"],
    correct: 1,
    explanation: "Bond prices and interest rates usually move in opposite directions. When market rates rise, older bonds with lower coupons become less attractive and their prices usually fall.",
    points: 10
  }),
  makeQuestion({
    exam: "SIE",
    domain: "Understanding Products and Their Risks",
    difficulty: "trainee",
    cooldown: QUESTION_COOLDOWNS.trainee,
    topicTag: "sie-common-stock",
    question: "Which feature is typically associated with common stock?",
    options: ["Voting rights and residual ownership", "A fixed maturity date", "Guaranteed dividends", "Priority over secured creditors"],
    correct: 0,
    explanation: "Common stock represents an ownership interest in a corporation and often includes voting rights. Common shareholders are residual owners, so they are paid after creditors and preferred shareholders in liquidation.",
    points: 10
  }),
  makeQuestion({
    exam: "SIE",
    domain: "Understanding Trading, Customer Accounts and Prohibited Activities",
    difficulty: "trainee",
    cooldown: QUESTION_COOLDOWNS.trainee,
    topicTag: "sie-stop-order",
    question: "Which order becomes a market order once the stop price is reached?",
    options: ["Stop order", "Limit order", "Fill-or-kill order", "Market-on-close order"],
    correct: 0,
    explanation: "A stop order activates once the stop price is reached and then becomes a market order. That means the execution price can differ from the trigger price depending on market conditions.",
    points: 10
  }),
  makeQuestion({
    exam: "SIE",
    domain: "Overview of Regulatory Framework",
    difficulty: "trainee",
    cooldown: QUESTION_COOLDOWNS.trainee,
    topicTag: "sie-finra",
    question: "Which organization is the primary self-regulatory organization for broker-dealers in the United States?",
    options: ["FINRA", "IRS", "Treasury Department", "Federal Reserve Board"],
    correct: 0,
    explanation: "FINRA is the primary self-regulatory organization that oversees broker-dealers and their registered representatives. It operates under SEC oversight but is not itself a federal agency.",
    points: 10
  })
];

function buildSeries7QuestionSet(): Question[] {
  const symbols = ["ABC", "XYZ", "QRS", "LMN", "TUV", "MNO", "RST", "JKL", "PQR", "DEF"];
  const generated: Question[] = [];

  symbols.forEach((symbol, index) => {
    const strike = 45 + index * 5;
    const premium = 2 + (index % 4);
    const width = 5;
    const stockCost = strike - 4;
    const stockPrice = strike + premium + 6;

    generated.push(
      makeQuestion({
        exam: "Series 7",
        domain: "Options Strategies",
        difficulty: "associate",
        cooldown: QUESTION_COOLDOWNS.associate,
        topicTag: \`series7-long-call-\${symbol}\`,
        question: \`An investor buys 1 \${symbol} \${strike} call for a premium of \${premium}. What is the breakeven at expiration?\`,
        options: [\`\${strike - premium}\`, \`\${strike}\`, \`\${strike + premium}\`, \`\${strike + premium + 5}\`],
        correct: 2,
        explanation: "A long call's breakeven is the strike price plus the premium paid. The option becomes profitable only if the stock rises above that combined amount by expiration.",
        points: 15
      }),
      makeQuestion({
        exam: "Series 7",
        domain: "Options Strategies",
        difficulty: "associate",
        cooldown: QUESTION_COOLDOWNS.associate,
        topicTag: \`series7-long-put-\${symbol}\`,
        question: \`An investor buys 1 \${symbol} \${strike} put for a premium of \${premium}. What is the breakeven at expiration?\`,
        options: [\`\${strike + premium}\`, \`\${strike}\`, \`\${strike - premium}\`, \`\${strike - premium - 5}\`],
        correct: 2,
        explanation: "A long put's breakeven is the strike price minus the premium paid. The position profits when the market price falls below that level by expiration.",
        points: 15
      }),
      makeQuestion({
        exam: "Series 7",
        domain: "Options Strategies",
        difficulty: "associate",
        cooldown: QUESTION_COOLDOWNS.associate,
        topicTag: \`series7-covered-call-\${symbol}\`,
        question: \`A customer owns \${symbol} stock at \${stockCost} and writes a covered \${strike} call for a premium of \${premium}. What is the maximum gain per share if assigned?\`,
        options: [\`\${premium}\`, \`\${strike - stockCost + premium}\`, \`\${strike + premium}\`, \`\${stockCost}\`],
        correct: 1,
        explanation: "The maximum gain on a covered call equals the appreciation from the stock cost basis to the strike price, plus the premium received. Upside is capped because the shares may be called away at the strike price.",
        points: 15
      }),
      makeQuestion({
        exam: "Series 7",
        domain: "Options Strategies",
        difficulty: "associate",
        cooldown: QUESTION_COOLDOWNS.associate,
        topicTag: \`series7-protective-put-\${symbol}\`,
        question: \`A customer buys \${symbol} stock at \${strike + 3} and a protective \${strike} put for \${premium}. What is the maximum loss per share?\`,
        options: [\`\${premium}\`, \`\${strike + 3 - strike + premium}\`, \`\${strike + premium}\`, \`\${strike + 3 + premium}\`],
        correct: 1,
        explanation: "The maximum loss on a protective put equals the stock purchase price minus the put strike price, plus the premium paid for the put. The put creates a floor that limits downside exposure.",
        points: 15
      }),
      makeQuestion({
        exam: "Series 7",
        domain: "Options Strategies",
        difficulty: "associate",
        cooldown: QUESTION_COOLDOWNS.associate,
        topicTag: \`series7-bull-call-spread-\${symbol}\`,
        question: \`An investor buys the \${strike} call and sells the \${strike + width} call on \${symbol} for a net debit of \${premium}. What is the maximum gain per share?\`,
        options: [\`\${premium}\`, \`\${width - premium}\`, \`\${width + premium}\`, \`\${strike + width}\`],
        correct: 1,
        explanation: "The maximum gain on a bull call spread equals the difference between the strike prices minus the net debit paid. The short call caps the upside while reducing the cost of the long call.",
        points: 20
      }),
      makeQuestion({
        exam: "Series 7",
        domain: "Options Strategies",
        difficulty: "associate",
        cooldown: QUESTION_COOLDOWNS.associate,
        topicTag: \`series7-bear-put-spread-\${symbol}\`,
        question: \`An investor buys the \${strike + width} put and sells the \${strike} put on \${symbol} for a net debit of \${premium}. What is the maximum gain per share?\`,
        options: [\`\${width - premium}\`, \`\${premium}\`, \`\${width + premium}\`, \`\${strike + width}\`],
        correct: 0,
        explanation: "The maximum gain on a bear put spread equals the difference between the strike prices minus the net debit paid. The lower-strike short put limits the upside while offsetting some of the premium cost.",
        points: 20
      }),
      makeQuestion({
        exam: "Series 7",
        domain: "Options Strategies",
        difficulty: "associate",
        cooldown: QUESTION_COOLDOWNS.associate,
        topicTag: \`series7-intrinsic-call-\${symbol}\`,
        question: \`A customer buys 1 \${symbol} \${strike} call for \${premium}. If the stock is \${stockPrice} at expiration, what is the intrinsic value per share?\`,
        options: [\`\${premium}\`, \`\${stockPrice - strike}\`, \`\${stockPrice - strike - premium}\`, \`\${strike - stockPrice}\`],
        correct: 1,
        explanation: "Intrinsic value for a call is the amount by which the market price exceeds the strike price when the option is in the money. Premium affects net profit, but not the intrinsic value calculation itself.",
        points: 15
      })
    );
  });

  generated.push(
    makeQuestion({
      exam: "Series 7",
      domain: "Debt Securities",
      difficulty: "associate",
      cooldown: QUESTION_COOLDOWNS.associate,
      topicTag: "series7-bond-prices",
      question: "When prevailing market rates fall, what generally happens to the price of an outstanding bond with a fixed coupon?",
      options: ["The price generally rises", "The price generally falls", "The bond becomes callable", "The bond loses accrued interest"],
      correct: 0,
      explanation: "Bond prices and rates usually move in opposite directions. A fixed-coupon bond becomes more attractive when new issues offer lower yields, so its market price usually rises.",
      points: 15
    }),
    makeQuestion({
      exam: "Series 7",
      domain: "Municipal Securities",
      difficulty: "associate",
      cooldown: QUESTION_COOLDOWNS.associate,
      topicTag: "series7-go-bonds",
      question: "Which municipal bond is generally backed by the issuer's full faith and credit and taxing power?",
      options: ["General obligation bond", "Revenue bond", "Equipment trust certificate", "Commercial paper"],
      correct: 0,
      explanation: "General obligation bonds are generally supported by the issuer's taxing power and full faith and credit. Revenue bonds depend primarily on the revenues of the financed project or facility.",
      points: 15
    }),
    makeQuestion({
      exam: "Series 7",
      domain: "Direct Participation Programs and Variable Products",
      difficulty: "associate",
      cooldown: QUESTION_COOLDOWNS.associate,
      topicTag: "series7-dpp-risk",
      question: "Which risk is especially important when evaluating a direct participation program for a retail customer?",
      options: ["Liquidity risk", "Guaranteed NAV fluctuations", "Daily redemption pressure", "FDIC insurance risk"],
      correct: 0,
      explanation: "Direct participation programs often have limited secondary markets and long holding periods, so liquidity risk is a major suitability issue. Customers who may need quick access to funds often are not good candidates for illiquid programs.",
      points: 15
    }),
    makeQuestion({
      exam: "Series 7",
      domain: "Margin and Customer Accounts",
      difficulty: "associate",
      cooldown: QUESTION_COOLDOWNS.associate,
      topicTag: "series7-regt",
      question: "Under Regulation T, what is the standard initial margin requirement for most equity purchases in a margin account?",
      options: ["25%", "40%", "50%", "75%"],
      correct: 2,
      explanation: "Regulation T sets the standard initial equity requirement for most margin stock purchases at 50% of the purchase price. Maintenance margin is a separate, ongoing requirement and is usually lower.",
      points: 15
    })
  );

  return generated;
}

const SERIES65_GENERATED: Question[] = [
  makeQuestion({
    exam: "Series 65",
    domain: "Laws, Regulations, and Guidelines",
    difficulty: "advisor",
    cooldown: QUESTION_COOLDOWNS.advisor,
    topicTag: "series65-loyalty",
    question: "An adviser recommends the product that pays the highest compensation without disclosing the conflict, even though a lower-cost alternative better fits the client. Which fiduciary principle is most directly implicated?",
    options: ["Duty of loyalty", "Custody exemption", "Surety bond requirement", "Blue-sky registration by qualification"],
    correct: 0,
    explanation: "The fiduciary duty of loyalty requires an adviser to place the client's interests first and to disclose material conflicts fully and fairly. Steering the client toward a more lucrative product without disclosure puts the adviser's interest ahead of the client's.",
    points: 25
  }),
  makeQuestion({
    exam: "Series 65",
    domain: "Laws, Regulations, and Guidelines",
    difficulty: "advisor",
    cooldown: QUESTION_COOLDOWNS.advisor,
    topicTag: "series65-advisers-act",
    question: "Which federal statute is the primary source of law governing federally registered investment advisers?",
    options: ["Securities Act of 1933", "Investment Advisers Act of 1940", "Securities Exchange Act of 1934", "Trust Indenture Act of 1939"],
    correct: 1,
    explanation: "The Investment Advisers Act of 1940 is the core federal statute regulating investment advisers. It establishes registration, anti-fraud, custody, recordkeeping, and fiduciary standards for advisers subject to federal oversight.",
    points: 25
  }),
  makeQuestion({
    exam: "Series 65",
    domain: "Client Investment Recommendations and Strategies",
    difficulty: "advisor",
    cooldown: QUESTION_COOLDOWNS.advisor,
    topicTag: "series65-mpt",
    question: "Under modern portfolio theory, why can diversification improve a portfolio's risk-adjusted profile?",
    options: ["Because combining imperfectly correlated assets can reduce unsystematic risk", "Because diversification eliminates all market risk", "Because diversification guarantees positive annual returns", "Because diversification converts stocks into fixed-income securities"],
    correct: 0,
    explanation: "Modern portfolio theory teaches that combining assets with imperfect correlations can reduce unsystematic risk. Diversification does not eliminate systematic market risk, but it can improve the overall tradeoff between expected risk and expected return.",
    points: 20
  }),
  makeQuestion({
    exam: "Series 65",
    domain: "Client Investment Recommendations and Strategies",
    difficulty: "advisor",
    cooldown: QUESTION_COOLDOWNS.advisor,
    topicTag: "series65-asset-location",
    question: "When suitable and available, tax-inefficient assets that generate substantial ordinary income are often best located where?",
    options: ["In tax-advantaged accounts", "Only in margin accounts", "Only in taxable joint accounts", "In a custodial account regardless of the client"],
    correct: 0,
    explanation: "Asset location often places tax-inefficient holdings inside tax-advantaged accounts to reduce current tax drag. The strategy still must fit the client's goals, liquidity needs, and account constraints.",
    points: 20
  }),
  makeQuestion({
    exam: "Series 65",
    domain: "Client Investment Recommendations and Strategies",
    difficulty: "advisor",
    cooldown: QUESTION_COOLDOWNS.advisor,
    topicTag: "series65-erisa",
    question: "Under ERISA, what broad standard applies to plan fiduciaries managing retirement plan assets?",
    options: ["They must act solely in the interest of participants and beneficiaries with prudence", "They must maximize employer stock concentration", "They may follow employer preference over participant need", "They are exempt from diversification concerns"],
    correct: 0,
    explanation: "ERISA fiduciaries must act solely in the interest of plan participants and beneficiaries and with the care, skill, prudence, and diligence of a prudent expert. That standard drives plan governance, investment selection, and ongoing oversight.",
    points: 25
  })
];

const SERIES66_GENERATED: Question[] = [
  makeQuestion({
    exam: "Series 66",
    domain: "Laws, Regulations, and Guidelines Including Prohibition on Unethical Business Practices",
    difficulty: "senior",
    cooldown: QUESTION_COOLDOWNS.senior,
    topicTag: "series66-agent-registration",
    question: "Under state securities law, when is an agent of a broker-dealer generally required to register in a state?",
    options: ["When transacting securities business in that state unless an exemption applies", "Only when the SEC orders it", "Only after ten trades", "Only if the customer is institutional"],
    correct: 0,
    explanation: "Agents generally must register in a state before transacting securities business there unless a specific exemption or exclusion applies. Federal status alone does not replace the state's authority over agent registration.",
    points: 25
  }),
  makeQuestion({
    exam: "Series 66",
    domain: "Laws, Regulations, and Guidelines Including Prohibition on Unethical Business Practices",
    difficulty: "senior",
    cooldown: QUESTION_COOLDOWNS.senior,
    topicTag: "series66-bd-registration",
    question: "A broker-dealer with no office in a state actively solicits retail residents there. What is the usual registration implication under the Uniform Securities Act framework?",
    options: ["State registration is generally required unless an exemption applies", "No registration is required without a branch office", "Only the agent must register, not the firm", "Registration is optional if trades settle electronically"],
    correct: 0,
    explanation: "A broker-dealer can be required to register in a state even without a physical office there if it transacts business with residents and no exemption applies. State jurisdiction commonly follows business activity, not just office location.",
    points: 25
  }),
  makeQuestion({
    exam: "Series 66",
    domain: "Client/Customer Investment Recommendations and Strategies",
    difficulty: "senior",
    cooldown: QUESTION_COOLDOWNS.senior,
    topicTag: "series66-customer-profile",
    question: "Which customer-profile factors are most central to analyzing whether a recommendation fits the customer?",
    options: ["Objectives, risk tolerance, financial circumstances, liquidity needs, and time horizon", "Political views and media preferences", "Only age and marital status", "Only the customer's current ticker symbols"],
    correct: 0,
    explanation: "Recommendation analysis depends on the customer's investment objectives, risk tolerance, financial condition, liquidity needs, and time horizon. Those factors are core to determining whether a product or strategy is appropriate.",
    points: 20
  }),
  makeQuestion({
    exam: "Series 66",
    domain: "Economic Factors and Business Information",
    difficulty: "senior",
    cooldown: QUESTION_COOLDOWNS.senior,
    topicTag: "series66-business-cycle",
    question: "Which phase of the business cycle is generally associated with rising output, improving employment, and expanding corporate activity after a recession?",
    options: ["Expansion", "Contraction", "Panic liquidation", "Administrative enforcement"],
    correct: 0,
    explanation: "Expansion is the phase of the business cycle marked by increasing production, improving employment, and broad economic growth. It usually follows recessionary contraction and continues until the economy approaches a peak.",
    points: 15
  }),
  makeQuestion({
    exam: "Series 66",
    domain: "Laws, Regulations, and Guidelines Including Prohibition on Unethical Business Practices",
    difficulty: "senior",
    cooldown: QUESTION_COOLDOWNS.senior,
    topicTag: "series66-unethical-practice",
    question: "Borrowing money from a customer without meeting a valid exception under firm policy and state rules is most likely treated as what?",
    options: ["An unethical business practice", "A normal administrative shortcut", "A de minimis recordkeeping issue", "A federal covered adviser exclusion"],
    correct: 0,
    explanation: "Borrowing from customers is heavily restricted and often treated as an unethical business practice unless a narrow exception applies and the firm permits it. The restriction exists because personal borrowing can create severe conflicts of interest and abuse risk.",
    points: 25
  })
];

export const QUESTION_POOLS = {
  sie: inflatePool(LEGACY_QUESTION_POOLS.basic, SIE_GENERATED, 300),
  series7: inflatePool(LEGACY_QUESTION_POOLS.intermediate, buildSeries7QuestionSet(), 500),
  series65: inflatePool(LEGACY_QUESTION_POOLS.advanced, SERIES65_GENERATED, 400),
  series66: inflatePool(LEGACY_QUESTION_POOLS.expert, SERIES66_GENERATED, 400)
} as const;

export const DIFFICULTY_TO_POOL_KEY = {
  trainee: "sie",
  associate: "series7",
  advisor: "series65",
  senior: "series66"
} as const;

export function getQuestionsForDifficulty(difficulty: "trainee" | "associate" | "advisor" | "senior"): Question[] {
  return QUESTION_POOLS[DIFFICULTY_TO_POOL_KEY[difficulty]];
}
`;

fs.mkdirSync(path.join("src", "data"), { recursive: true });
fs.writeFileSync(path.join("src", "data", "questions.ts"), file);
