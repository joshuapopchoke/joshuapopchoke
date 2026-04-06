// ============================================================
// FIDUCIARY DUTY - Market Engine
// Simulates stocks, options, forex, commodities, futures
// ============================================================

const ASSETS = {
  stocks: [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 182.50, sector: 'Technology' },
    { symbol: 'JPM',  name: 'JPMorgan Chase', price: 198.30, sector: 'Financials' },
    { symbol: 'XOM',  name: 'Exxon Mobil', price: 104.20, sector: 'Energy' },
    { symbol: 'JNJ',  name: 'Johnson & Johnson', price: 156.80, sector: 'Healthcare' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 374.90, sector: 'Technology' },
    { symbol: 'BRK',  name: 'Berkshire Hathaway', price: 362.10, sector: 'Financials' },
    { symbol: 'PG',   name: 'Procter & Gamble', price: 147.60, sector: 'Consumer' },
    { symbol: 'GS',   name: 'Goldman Sachs', price: 412.80, sector: 'Financials' },
  ],
  forex: [
    { symbol: 'EUR/USD', name: 'Euro / US Dollar', price: 1.0842 },
    { symbol: 'GBP/USD', name: 'British Pound / US Dollar', price: 1.2634 },
    { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', price: 149.82 },
    { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', price: 1.3521 },
  ],
  commodities: [
    { symbol: 'GLD',  name: 'Gold (oz)', price: 2021.40 },
    { symbol: 'SLV',  name: 'Silver (oz)', price: 23.18 },
    { symbol: 'OIL',  name: 'Crude Oil (bbl)', price: 78.42 },
    { symbol: 'NAT',  name: 'Natural Gas (MMBtu)', price: 2.61 },
    { symbol: 'WHT',  name: 'Wheat (bu)', price: 582.25 },
  ],
  futures: [
    { symbol: 'ES',   name: 'S&P 500 Futures', price: 4892.50 },
    { symbol: 'NQ',   name: 'Nasdaq 100 Futures', price: 17124.75 },
    { symbol: 'YM',   name: 'Dow Jones Futures', price: 38412.00 },
    { symbol: 'ZB',   name: '30-Year T-Bond Futures', price: 118.28 },
  ]
};

const MARKET_EVENTS = [
  { id: 'fed_hike',      title: 'Fed Rate Hike',           description: 'Federal Reserve raises rates by 25bps. Bonds fall, growth stocks under pressure.', effect: { stocks: -0.03, bonds: -0.05, forex: 0.01 }, severity: 'HIGH' },
  { id: 'fed_cut',       title: 'Fed Rate Cut',            description: 'Federal Reserve cuts rates by 25bps. Growth stocks rally, dollar weakens.', effect: { stocks: 0.04, bonds: 0.03, forex: -0.01 }, severity: 'HIGH' },
  { id: 'cpi_hot',       title: 'CPI Exceeds Expectations', description: 'Inflation data comes in hotter than expected. Market sells off.', effect: { stocks: -0.025, commodities: 0.02 }, severity: 'MEDIUM' },
  { id: 'jobs_strong',   title: 'Strong Jobs Report',      description: 'Non-farm payrolls beat estimates. Economy showing resilience.', effect: { stocks: 0.02, forex: 0.01 }, severity: 'MEDIUM' },
  { id: 'earnings_miss', title: 'Major Earnings Miss',     description: 'A blue-chip company misses earnings estimates by wide margin. Sector selloff begins.', effect: { stocks: -0.04 }, severity: 'HIGH' },
  { id: 'geo_tension',   title: 'Geopolitical Tensions Rise', description: 'International conflict escalates. Safe haven assets surge.', effect: { stocks: -0.03, commodities: 0.05, forex: -0.02 }, severity: 'HIGH' },
  { id: 'oil_spike',     title: 'Oil Supply Shock',        description: 'OPEC cuts production unexpectedly. Energy sector rallies, transportation costs rise.', effect: { stocks: -0.01, commodities: 0.08 }, severity: 'MEDIUM' },
  { id: 'bull_run',      title: 'Market Sentiment Surge',  description: 'Investor confidence hits yearly high. Broad market rally across sectors.', effect: { stocks: 0.05, futures: 0.03 }, severity: 'LOW' },
  { id: 'recession_fear','title': 'Recession Fears Mount', description: 'Leading economic indicators flash warning signs. Defensive stocks outperform.', effect: { stocks: -0.05, commodities: 0.02 }, severity: 'HIGH' },
  { id: 'dollar_strong', title: 'Dollar Strengthens',     description: 'USD rallies on safe haven demand. International holdings face headwinds.', effect: { forex: 0.03, stocks: -0.01 }, severity: 'LOW' },
];

const CLIENT_PERSONAS = [
  {
    id: 'retiree',
    name: 'Margaret Chen',
    age: 68,
    avatar: '👩‍💼',
    goal: 'Retirement Income',
    riskTolerance: 'Conservative',
    portfolio: 450000,
    description: 'Recently retired teacher. Needs stable income. Cannot afford major losses.',
    questions: [
      { q: 'Should I move everything into stocks for higher returns?', correct: 'No', explanation: 'At 68 with conservative risk tolerance, heavy equity exposure is unsuitable. A balanced income-focused allocation is appropriate.', points: 15 },
      { q: 'How will selling my bond fund affect my taxes this year?', correct: 'Capital gains tax applies. If held over 1 year, long-term rates apply (0%, 15%, or 20% depending on income).', explanation: 'Bond fund sales trigger capital gains events. Duration of holding determines tax rate.', points: 20 },
      { q: 'My neighbor says I should put it all in gold. Good idea?', correct: 'No', explanation: 'Gold is a hedge, not an income generator. A 5-10% allocation may be appropriate but not 100%.', points: 15 },
    ]
  },
  {
    id: 'young_pro',
    name: 'Derek Washington',
    age: 31,
    avatar: '👨‍💻',
    goal: 'Wealth Accumulation',
    riskTolerance: 'Aggressive',
    portfolio: 85000,
    description: 'Software engineer. Long time horizon. Wants maximum growth. Can tolerate volatility.',
    questions: [
      { q: 'Should I use margin to buy more tech stocks?', correct: 'Cautiously yes with limits', explanation: 'With aggressive tolerance and long horizon, moderate margin use is acceptable but should be disclosed and limited.', points: 15 },
      { q: 'I want to buy call options on AAPL before earnings. Is this suitable?', correct: 'Yes with risk disclosure', explanation: 'Speculative options are suitable for aggressive risk profiles. Full disclosure of loss potential required.', points: 20 },
      { q: 'Should I max my 401k or invest in a taxable account first?', correct: 'Max 401k first', explanation: 'Tax-advantaged accounts should be maximized before taxable investing for long-term wealth accumulation.', points: 15 },
    ]
  },
  {
    id: 'family',
    name: 'The Kowalski Family',
    age: 42,
    avatar: '👨‍👩‍👧',
    goal: 'College Fund + Mortgage',
    riskTolerance: 'Moderate',
    portfolio: 220000,
    description: 'Dual income household. Two kids (8 and 12). Mortgage up for renewal. College in 6-10 years.',
    questions: [
      { q: 'Should we pay off the mortgage or invest more?', correct: 'Compare mortgage rate to expected returns', explanation: 'If mortgage rate is below 5% and expected returns are higher, investing may be optimal. Depends on their rate.', points: 20 },
      { q: 'What account should we use for the college fund?', correct: '529 Plan', explanation: '529 plans offer tax-advantaged growth for education expenses and are the standard vehicle for college funding.', points: 15 },
      { q: 'Our 12 year old\'s fund is in aggressive stocks. Should we rebalance?', correct: 'Yes, shift toward moderate allocation', explanation: 'With college 6 years away, gradually reducing equity risk is appropriate — time horizon is shortening.', points: 20 },
    ]
  },
  {
    id: 'entrepreneur',
    name: 'Sofia Reyes',
    age: 52,
    avatar: '👩‍🏫',
    goal: 'Business Exit Planning',
    riskTolerance: 'Moderate-Aggressive',
    portfolio: 1200000,
    description: 'Sold her business. Large cash position. Needs tax-efficient deployment strategy.',
    questions: [
      { q: 'I just received $1.2M. What are the tax implications?', correct: 'Depends on structure — asset vs stock sale. Could trigger capital gains up to 20% plus state taxes.', explanation: 'Business sale taxation is complex. Asset sales vs stock sales are taxed differently. Professional tax advice required.', points: 25 },
      { q: 'Should I put it all in the market at once or dollar cost average?', correct: 'Lump sum statistically outperforms but DCA reduces timing risk', explanation: 'Research favors lump sum investing ~66% of the time, but DCA is psychologically easier and appropriate for large sums.', points: 20 },
      { q: 'Can I use a Roth conversion to reduce future taxes?', correct: 'Yes, if income allows', explanation: 'Roth conversions can make sense post-exit if income is temporarily lower. Requires careful tax bracket analysis.', points: 20 },
    ]
  },
];

class MarketEngine {
  constructor() {
    this.assets = JSON.parse(JSON.stringify(ASSETS));
    this.history = {};
    this.currentEvent = null;
    this.tick = 0;
    this.initHistory();
  }

  initHistory() {
    const allAssets = [
      ...this.assets.stocks,
      ...this.assets.forex,
      ...this.assets.commodities,
      ...this.assets.futures
    ];
    allAssets.forEach(a => {
      this.history[a.symbol] = [a.price];
    });
  }

  // Simulate one market tick
  simulateTick() {
    this.tick++;
    const allAssets = [
      ...this.assets.stocks,
      ...this.assets.forex,
      ...this.assets.commodities,
      ...this.assets.futures
    ];

    allAssets.forEach(asset => {
      const volatility = this.getVolatility(asset.symbol);
      const drift = (Math.random() - 0.48) * volatility;
      const eventEffect = this.getEventEffect(asset.symbol);
      asset.prevPrice = asset.price;
      asset.price = Math.max(0.01, asset.price * (1 + drift + eventEffect));
      asset.change = ((asset.price - asset.prevPrice) / asset.prevPrice) * 100;
      this.history[asset.symbol].push(asset.price);
      if (this.history[asset.symbol].length > 50) {
        this.history[asset.symbol].shift();
      }
    });

    // Random event trigger (~8% chance per tick)
    if (Math.random() < 0.08) {
      this.triggerRandomEvent();
    } else if (this.currentEvent && Math.random() < 0.3) {
      this.currentEvent = null;
    }

    return this.getState();
  }

  getVolatility(symbol) {
    if (['AAPL','MSFT','GS'].includes(symbol)) return 0.018;
    if (['EUR/USD','GBP/USD'].includes(symbol)) return 0.004;
    if (['GLD','SLV'].includes(symbol)) return 0.012;
    if (['OIL','NAT'].includes(symbol)) return 0.025;
    if (['ES','NQ','YM'].includes(symbol)) return 0.010;
    return 0.015;
  }

  getEventEffect(symbol) {
    if (!this.currentEvent) return 0;
    const e = this.currentEvent.effect;
    const isStock = this.assets.stocks.find(a => a.symbol === symbol);
    const isForex = this.assets.forex.find(a => a.symbol === symbol);
    const isCommodity = this.assets.commodities.find(a => a.symbol === symbol);
    const isFuture = this.assets.futures.find(a => a.symbol === symbol);
    if (isStock && e.stocks) return e.stocks * (0.5 + Math.random());
    if (isForex && e.forex) return e.forex * (0.5 + Math.random());
    if (isCommodity && e.commodities) return e.commodities * (0.5 + Math.random());
    if (isFuture && e.futures) return e.futures * (0.5 + Math.random());
    return 0;
  }

  triggerRandomEvent() {
    const event = MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)];
    this.currentEvent = { ...event, timestamp: Date.now() };
    return this.currentEvent;
  }

  getState() {
    return {
      tick: this.tick,
      assets: this.assets,
      history: this.history,
      currentEvent: this.currentEvent
    };
  }

  getClients() {
    return CLIENT_PERSONAS;
  }

  getEvents() {
    return MARKET_EVENTS;
  }
}

module.exports = { MarketEngine, CLIENT_PERSONAS, MARKET_EVENTS, ASSETS };
