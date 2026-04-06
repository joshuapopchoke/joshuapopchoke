export interface InsuranceProduct {
  id: string;
  name: string;
  category: "Life" | "Disability" | "Liability" | "Care" | "Planning";
  pitch: string;
  growthAngle: string;
}

export const INSURANCE_PRODUCTS: InsuranceProduct[] = [
  {
    id: "term-life",
    name: "Term Life Insurance",
    category: "Life",
    pitch: "Replaces income during peak family or debt years without crowding out the investment plan.",
    growthAngle: "Protecting a household cash-flow base can preserve long-term investment compounding because assets do not need to be liquidated after a shock."
  },
  {
    id: "whole-life",
    name: "Whole Life Insurance",
    category: "Life",
    pitch: "Permanent coverage with a cash-value component for estate or liquidity planning cases.",
    growthAngle: "It can support liquidity and estate planning, but the policy only helps when the use case is specific and the funding burden fits the plan."
  },
  {
    id: "disability",
    name: "Disability Insurance",
    category: "Disability",
    pitch: "Protects earned income when the client still depends on salary or business cash flow.",
    growthAngle: "Income protection can keep a savings plan intact during working years, which indirectly preserves the investing runway."
  },
  {
    id: "long-term-care",
    name: "Long-Term Care Coverage",
    category: "Care",
    pitch: "Helps reduce the risk that care costs consume retirement and legacy assets.",
    growthAngle: "When appropriate, it can ring-fence part of the portfolio from a late-life care shock that would otherwise force withdrawals."
  },
  {
    id: "umbrella",
    name: "Umbrella Liability Policy",
    category: "Liability",
    pitch: "Adds liability coverage above auto and homeowners limits for higher-net-worth households.",
    growthAngle: "It protects capital already built, which matters when the wealth plan is starting to compound and the client has more to lose."
  }
];
