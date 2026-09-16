import type { Discount } from "./types";

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
 *
 * The two-step flow (base premium, then apply a discount, then final premium)
 * mirrors how the real SMS system's "תעריף ספר" / product simulator works
 * per the training transcript: enter inputs → "חשב" → base monthly cost
 * "לפני הנחות" → apply a personal/system discount → "חשב" again → final.
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
  /** The monthly cost before any discount is applied ("לפני הנחות"). */
  baseMonthlyPremium: number;
  /** The discount actually applied, if any matching one was found. */
  appliedDiscount?: { name: string; percent: number };
  /** Final monthly premium after the discount, if any. */
  monthlyPremium: number;
  basis: string;
}

/** ₪ monthly premium per ₪1,000 of sum insured, at a 40-year-old non-smoker baseline. PLACEHOLDER VALUES. */
const BASE_RATE_PER_1000: Record<string, number> = {
  "ביטוח חיים": 0.45,
  "ביטוח מנהלים": 0.4,
  "פנסיה מקיפה": 0.35,
  "מחלות קשות": 0.9,
  "ביטוח בריאות": 12, // flat-ish per 1000 of coverage as a rough stand-in
  "תאונות אישיות": 0.25,
  "ביטוח סיעודי": 0.6,
  "ביטוח משכנתא": 0.3,
};

const SUPPORTED_PRODUCTS = new Set(Object.keys(BASE_RATE_PER_1000));

/** Whether the calculator has any placeholder coverage for this product — used to decide whether to show the "חשב פרמיה" button at all. */
export function hasCalculatorSupport(productType?: string, _company?: string): boolean {
  return Boolean(productType && SUPPORTED_PRODUCTS.has(productType));
}

const DEFAULT_SUM_INSURED = 500_000;
const DEFAULT_AGE = 40;

/**
 * Picks the best applicable discount for this product/company: prefers an
 * exact productType+company match, falls back to a productType-only or
 * company-only match, then a fully general one. Only the tier that covers
 * month 0 is used — a fresh quote has no elapsed policy months yet, so
 * later-starting tiers (e.g. "from month 13") don't apply at quote time.
 * Matches the real system's "one discount, not stacked" flow.
 */
function pickDiscount(
  input: Pick<PremiumInput, "productType" | "company">,
  discounts: Discount[],
): { name: string; percent: number } | undefined {
  const month0 = (d: Discount) =>
    d.tiers.find((t) => t.fromMonth <= 0 && (t.toMonth == null || t.toMonth >= 0));

  const candidates = discounts
    .map((d) => ({ d, tier: month0(d) }))
    .filter((x): x is { d: Discount; tier: NonNullable<ReturnType<typeof month0>> } =>
      Boolean(x.tier),
    )
    .filter(
      (x) =>
        (!x.d.productType || x.d.productType === input.productType) &&
        (!x.d.company || x.d.company === input.company),
    );
  if (candidates.length === 0) return undefined;

  // Prefer the most specific match (both fields matching beats one, beats none), then highest percent.
  const specificity = (d: Discount) => (d.productType ? 1 : 0) + (d.company ? 1 : 0);
  candidates.sort((a, b) => specificity(b.d) - specificity(a.d) || b.tier.percent - a.tier.percent);
  const best = candidates[0];
  return { name: best.d.name, percent: best.tier.percent };
}

/**
 * Rough estimate only. Age/smoker loading factors are illustrative
 * multipliers, not actuarial data — do not present this number to a client
 * as a quote. Pass `discounts` (from settings) to apply the best-matching
 * one automatically, mirroring the real system's two-step calculation.
 */
export function calculatePremium(
  input: PremiumInput,
  discounts: Discount[] = [],
): PremiumResult | null {
  const baseRate = BASE_RATE_PER_1000[input.productType];
  if (!baseRate) return null;

  const sum = input.sumInsured && input.sumInsured > 0 ? input.sumInsured : DEFAULT_SUM_INSURED;
  const age = input.age && input.age > 0 ? input.age : DEFAULT_AGE;

  let premium = (sum / 1000) * baseRate;

  // Age loading: +2.5% per year above the 40yo baseline, -1.5% below it.
  const ageDelta = age - DEFAULT_AGE;
  premium *= 1 + (ageDelta > 0 ? ageDelta * 0.025 : ageDelta * 0.015);

  if (input.smoker) premium *= 1.35;

  const baseMonthlyPremium = Math.max(20, Math.round(premium));

  const applied = pickDiscount(input, discounts);
  const monthlyPremium = applied
    ? Math.max(20, Math.round(baseMonthlyPremium * (1 - applied.percent / 100)))
    : baseMonthlyPremium;

  return {
    baseMonthlyPremium,
    appliedDiscount: applied,
    monthlyPremium,
    basis: `אומדן לדוגמה: סכום ${sum.toLocaleString("he-IL")}₪, גיל ${age}${input.smoker ? ", מעשן" : ""}${applied ? ` · הנחה "${applied.name}" ${applied.percent}%` : ""} — לא תעריף רשמי`,
  };
}
