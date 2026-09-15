import type { PolisaSummary } from "@/domain/types";

/**
 * Client-side mirror of server/src/mislaka/parseMislakaExport.ts. The real
 * backend is the source of truth for this parsing (never trust client-side
 * validation alone) — this copy exists only because the demo build
 * (src/lib/demoDb.ts) has no server to send the file to at all. Keep the two
 * in sync if the accepted shapes change.
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
  } else if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as Record<string, unknown>).polisot)
  ) {
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
