/**
 * Shared picklist data used across the product-action UI, settings (answer
 * bank/discounts/manufacturers), and the premium calculator.
 *
 * COMPANIES and PRODUCT_TYPES are aligned with the real SMS "פגישת פרט"
 * training transcript the user shared (lecturer: לנית פלג) — these are the
 * companies and product types actually named there, not invented.
 *
 * TRACKS is NOT from that transcript — the lecturer explicitly covers
 * pension/track selection in a separate session ("next week's" training,
 * per the transcript) that was never shared, and the word "מסלול" doesn't
 * appear in the "פרט" transcript at all. These track names are instead
 * pulled from our own seed/demo Mislaka holdings data (server/scripts/seed.mjs,
 * src/data/demoSeed.ts) for internal consistency, plus two standard
 * regulatory track categories (כללי/מנייתי/אג״ח/הלכה) — flagged here so
 * this isn't mistaken for transcript-sourced data.
 */

export const PRODUCT_TYPES = [
  "פנסיה מקיפה",
  "ביטוח מנהלים",
  "ביטוח חיים",
  "מחלות קשות",
  "ביטוח בריאות",
  "תאונות אישיות",
  "ביטוח סיעודי",
  "ביטוח משכנתא",
  "קרן השתלמות",
  "גמל להשקעה",
];

export const COMPANIES = ["מגדל", "הראל", "כלל", "מנורה מבטחים", "הפניקס", "איילון"];

/** Not sourced from the SMS transcript — see file-level note above. */
export const TRACKS = [
  "מסלול כללי",
  "מסלול מנייתי",
  "מסלול אג״ח",
  "מסלול הלכה",
  "מסלול מותאם לגיל עד 50",
  "מסלול מניות עד 50",
];

/** ענפי ביטוח — used for the primary-manufacturers disclosure (יצרנים עיקריים). */
export const BRANCHES = [
  "ביטוח חיים",
  "מחלות קשות",
  "ביטוח בריאות",
  "תאונות אישיות",
  "ביטוח סיעודי",
  "ביטוח משכנתא",
  "פנסיה",
  "גמל",
  "קרן השתלמות",
];
