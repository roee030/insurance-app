import type { PolisaSummary } from "../types.js";

/**
 * Parses a Mislaka export file uploaded by the agent (see docs/mislaka-api-integration-plan.md
 * for why we no longer pull this live via webhook). Accepts either shape:
 *  - the raw `/transaction/{id}/polisot(/data)` response: { transaction_id, mislaka_number, polisot: [...] }
 *  - a bare array of policy objects
 * Field names inside each policy are matched leniently (a few common
 * spellings per field) since the exact vendor field names aren't fixed in
 * their public docs — this is the single source of normalization logic,
 * used by the server only; the client just uploads the raw file text.
 */
export interface ParsedMislakaExport {
  polisot: PolisaSummary[];
  mislakaNumber?: string;
  transactionId?: string;
  raw: unknown;
}

export class MislakaExportParseError extends Error {}

function pick(o: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (o[k] !== undefined && o[k] !== null && o[k] !== "") return o[k];
  }
  return undefined;
}

function toNumber(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const n = Number(String(v).replace(/[,₪%\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function toStr(v: unknown): string | undefined {
  return v == null || v === "" ? undefined : String(v);
}

function normalizePolisa(raw: unknown, index: number): PolisaSummary {
  if (typeof raw !== "object" || raw === null) {
    throw new MislakaExportParseError(`פריט מס׳ ${index + 1} בקובץ אינו אובייקט תקין`);
  }
  const o = raw as Record<string, unknown>;

  const manufacturer = pick(o, ["manufacturer", "company", "חברה"]);
  const productType = pick(o, ["product_type", "productType", "product", "מוצר"]);
  const polisaNumber = pick(o, [
    "polisa_number",
    "policyNumber",
    "policy_number",
    "מספר_פוליסה",
  ]);

  if (!manufacturer || !productType || !polisaNumber) {
    throw new MislakaExportParseError(
      `פריט מס׳ ${index + 1}: חסרים שדות חובה — נדרשים חברה, סוג מוצר ומספר פוליסה`,
    );
  }

  return {
    manufacturer: String(manufacturer),
    product_type: String(productType),
    polisa_number: String(polisaNumber),
    polisa_name:
      toStr(pick(o, ["polisa_name", "policyName", "name", "שם_מוצר"])) ??
      String(productType),
    polisa_status: toStr(pick(o, ["polisa_status", "status", "סטטוס"])) ?? "active",
    balance: toNumber(pick(o, ["balance", "צבירה", "accumulation"])),
    track: toStr(pick(o, ["track", "מסלול", "investment_track"])),
    feeAccumulation: toNumber(
      pick(o, ["feeAccumulation", "fee_accumulation", "דמי_ניהול_מצבירה"]),
    ),
    feeDeposit: toNumber(pick(o, ["feeDeposit", "fee_deposit", "דמי_ניהול_מהפקדה"])),
  };
}

export function parseMislakaExport(fileText: string): ParsedMislakaExport {
  let data: unknown;
  try {
    data = JSON.parse(fileText);
  } catch {
    throw new MislakaExportParseError(
      "הקובץ אינו JSON תקין. ודא שזהו הקובץ שהתקבל מהמסלקה ולא נערך.",
    );
  }

  let list: unknown;
  let mislakaNumber: string | undefined;
  let transactionId: string | undefined;

  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === "object" && Array.isArray((data as any).polisot)) {
    const o = data as Record<string, unknown>;
    list = o.polisot;
    mislakaNumber = toStr(o.mislaka_number);
    transactionId = toStr(o.transaction_id);
  } else {
    throw new MislakaExportParseError(
      "פורמט הקובץ לא מוכר. צפוי מערך פוליסות או אובייקט עם שדה polisot.",
    );
  }

  const arr = list as unknown[];
  if (arr.length === 0) {
    throw new MislakaExportParseError("הקובץ ריק — לא נמצאו פוליסות.");
  }

  return {
    polisot: arr.map((item, i) => normalizePolisa(item, i)),
    mislakaNumber,
    transactionId,
    raw: data,
  };
}
