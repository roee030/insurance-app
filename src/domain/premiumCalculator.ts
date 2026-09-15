/**
 * Placeholder premium estimator — NOT real insurer tariffs.
 *
 * Real per-company/per-product pricing tables are proprietary and not
 * published by insurers, so this ships with clearly-labeled example rates
 * (per docs/sms-feature-gap-analysis.md item "מחשבון פרמיה"). It exists so
 * the agent has a starting number to negotiate from, always shown with an
 * "אומדן" (estimate) label and never silently written as a final price.
 * Swap `BASE_RATE_PER_1000` for a real tariff feed when one is available —
 * the calculation shape (age/gender/smoker/sum → premium) stays the same.
 */

export type Gender = "male" | "female";

export interface PremiumInput {
  productType: string;
  company?: string;
  sumInsured?: number;
  age?: number;
  gender?: Gender;
  smoker?: boolean;
}

export interface PremiumResult {
  monthlyPremium: number;
  basis: string;
}

/** ₪ monthly premium per ₪1,000 of sum insured, at a 40-year-old non-smoker baseline. PLACEHOLDER VALUES. */
const BASE_RATE_PER_1000: Record<string, number> = {
  "ביטוח חיים": 0.45,
  "ביטוח מנהלים": 0.4,
  "פנסיה מקיפה": 0.35,
  "ביטוח בריאות": 12, // flat-ish per 1000 of coverage as a rough stand-in
};

const SUPPORTED_PRODUCTS = new Set(Object.keys(BASE_RATE_PER_1000));

/** Whether the calculator has any placeholder coverage for this product — used to decide whether to show the "חשב פרמיה" button at all. */
export function hasCalculatorSupport(productType?: string, _company?: string): boolean {
  return Boolean(productType && SUPPORTED_PRODUCTS.has(productType));
}

const DEFAULT_SUM_INSURED = 500_000;
const DEFAULT_AGE = 40;

/**
 * Rough estimate only. Age/smoker loading factors are illustrative
 * multipliers, not actuarial data — do not present this number to a client
 * as a quote.
 */
export function calculatePremium(input: PremiumInput): PremiumResult | null {
  const baseRate = BASE_RATE_PER_1000[input.productType];
  if (!baseRate) return null;

  const sum = input.sumInsured && input.sumInsured > 0 ? input.sumInsured : DEFAULT_SUM_INSURED;
  const age = input.age && input.age > 0 ? input.age : DEFAULT_AGE;

  let premium = (sum / 1000) * baseRate;

  // Age loading: +2.5% per year above the 40yo baseline, -1.5% below it.
  const ageDelta = age - DEFAULT_AGE;
  premium *= 1 + (ageDelta > 0 ? ageDelta * 0.025 : ageDelta * 0.015);

  if (input.smoker) premium *= 1.35;

  premium = Math.max(20, Math.round(premium));

  return {
    monthlyPremium: premium,
    basis: `אומדן לדוגמה: סכום ${sum.toLocaleString("he-IL")}₪, גיל ${age}${input.smoker ? ", מעשן" : ""} — לא תעריף רשמי`,
  };
}
