/**
 * Self-contained demo dataset for the static (GitHub Pages) build. Mirrors
 * server/scripts/seed.mjs but computes timestamps relative to Date.now() at
 * CALL time (not build time), so the shared page never looks stale — "3
 * hours ago" stays "3 hours ago" no matter when someone opens the link.
 */
import type {
  Client,
  MislakaResult,
  NeedsAssessment,
  PolisaSummary,
  ProductAction,
  StageEvent,
  StageId,
} from "@/domain/types";

const HSTAGES: StageId[] = ["lead", "sms_sent", "authorized", "signature", "submitted"];

function uid(): string {
  return crypto.randomUUID();
}
function tok(): string {
  return uid().replace(/-/g, "").slice(0, 14);
}

function hist(now: number, upto: StageId, agesH: number[]): StageEvent[] {
  let cursor = agesH.reduce((a, b) => a + b, 0);
  const end = HSTAGES.indexOf(upto);
  const ev: StageEvent[] = [];
  for (let i = 0; i <= end; i++) {
    ev.push({
      id: uid(),
      stage: HSTAGES[i],
      at: new Date(now - cursor * 3_600_000).toISOString(),
    });
    cursor -= agesH[i] ?? 0;
  }
  return ev;
}

function polisot(seed: number): PolisaSummary[] {
  return [
    {
      manufacturer: "הראל",
      product_type: "פנסיה מקיפה",
      polisa_number: "PH-" + seed,
      polisa_name: "הראל פנסיה מקיפה",
      polisa_status: "active",
      balance: 120000 + seed * 137,
      track: "מסלול מותאם לגיל עד 50",
      feeAccumulation: 0.3,
      feeDeposit: 2.25,
    },
    {
      manufacturer: "מגדל",
      product_type: "ביטוח מנהלים",
      polisa_number: "MG-" + seed,
      polisa_name: "מגדל לעצמאים",
      polisa_status: "active",
      balance: 64000 + seed * 91,
      track: "מסלול כללי",
      feeAccumulation: 0.85,
      feeDeposit: 3.5,
    },
    {
      manufacturer: "כלל",
      product_type: "קרן השתלמות",
      polisa_number: "CL-" + seed,
      polisa_name: "כלל השתלמות",
      polisa_status: "active",
      balance: 38000 + seed * 63,
      track: "מסלול מנייתי",
      feeAccumulation: 0.6,
      feeDeposit: 0,
    },
  ];
}

function transferAction(
  holding: PolisaSummary,
  targetCompany: string,
  targetTrack: string,
  premium: number,
  now: number,
): ProductAction {
  return {
    id: "transfer-" + holding.polisa_number,
    productType: holding.product_type,
    kind: "transfer",
    sourceCompany: holding.manufacturer,
    sourcePolisaNumber: holding.polisa_number,
    sourceBalance: holding.balance,
    targetCompany,
    targetTrack,
    monthlyPremium: premium,
    createdAt: new Date(now - 3 * 3_600_000).toISOString(),
  };
}

function newAction(
  productType: string,
  targetCompany: string,
  targetTrack: string,
  premium: number,
  now: number,
): ProductAction {
  return {
    id: "new-" + uid().slice(0, 8),
    productType,
    kind: "new",
    targetCompany,
    targetTrack,
    monthlyPremium: premium,
    createdAt: new Date(now - 3 * 3_600_000).toISOString(),
  };
}

interface Spec {
  fn: string;
  ln: string;
  pid: string;
  mob: string;
  stage: StageId;
  ages: number[];
  productActions?: ProductAction[];
  withMislaka?: boolean;
  na?: NeedsAssessment;
}

function mk(now: number, s: Spec): Client {
  const h = hist(now, s.stage, s.ages);
  const transactionId = "mock-" + uid();
  const client: Client = {
    id: uid(),
    firstName: s.fn,
    lastName: s.ln,
    personId: s.pid,
    mobile: s.mob,
    stage: s.stage,
    history: h,
    transactionId,
    leadPageUrl: "https://mock.mislaka-api.co.il/lead/" + transactionId,
    createdAt: h[0].at,
    updatedAt: h[h.length - 1].at,
  };
  if (s.withMislaka) {
    const mislaka: MislakaResult = {
      transactionId,
      mislakaNumber: "MSL-" + s.pid.slice(0, 8),
      actionCode: "9100",
      receivedAt: new Date(now - 10 * 3_600_000).toISOString(),
      polisot: polisot(Number(s.pid.slice(-3))),
    };
    client.mislaka = mislaka;
  }
  if (s.na) client.needsAssessment = s.na;
  if (s.productActions) client.productActions = s.productActions;
  if (s.stage === "signature") {
    client.signRequest = { token: tok(), sentAt: new Date(now - 18 * 3_600_000).toISOString() };
  }
  if (s.stage === "submitted") {
    client.signRequest = {
      token: tok(),
      sentAt: new Date(now - 20 * 3_600_000).toISOString(),
      signedAt: new Date(now - 13 * 3_600_000).toISOString(),
      signerName: `${s.fn} ${s.ln}`,
    };
  }
  return client;
}

/** Builds a fresh set of demo clients, timestamped relative to "now". */
export function buildDemoClients(): Client[] {
  const now = Date.now();
  const roiHoldings = polisot(90);
  const aimanHoldings = polisot(899);
  const adamHoldings = polisot(543);

  return [
    mk(now, { fn: "ענת", ln: "עובדיה", pid: "512345678", mob: "053-4455667", stage: "sms_sent", ages: [1, 3] }),
    mk(now, { fn: "גל", ln: "נגרין", pid: "207654321", mob: "050-1234567", stage: "sms_sent", ages: [2, 30] }),
    mk(now, { fn: "אורלי", ln: "חזקיאל", pid: "301234567", mob: "054-1122334", stage: "sms_sent", ages: [2, 80] }),
    mk(now, { fn: "גיא", ln: "דוד חייק", pid: "204455661", mob: "050-9988776", stage: "authorized", ages: [30, 20, 5], withMislaka: true }),
    mk(now, {
      fn: "רועי", ln: "גינוסר", pid: "033845090", mob: "052-4567890", stage: "authorized", ages: [40, 20, 8], withMislaka: true,
      na: {
        maritalStatus: "married", employer: "טק-נובה מערכות בע״מ", savingsGoal: "פרישה", timeHorizon: "ארוך טווח", riskLevel: 4,
        justification: "דמי ניהול גבוהים בביטוח המנהלים במגדל — מומלץ ניוד לקרן פנסיה מקיפה זולה יותר במנורה מבטחים.",
        updatedAt: new Date(now - 2 * 3_600_000).toISOString(),
      },
      productActions: [
        transferAction(roiHoldings[0], "מנורה מבטחים", "מסלול מניות עד 50", 1450, now),
        transferAction(roiHoldings[1], "כלל", "מסלול כללי", 380, now),
        newAction("גמל להשקעה", "אלטשולר שחם", "מסלול מניות עד 50", 500, now),
      ],
    }),
    mk(now, {
      fn: "אימן", ln: "טאהא", pid: "066778899", mob: "052-7766554", stage: "signature", ages: [50, 40, 10, 20], withMislaka: true,
      na: { maritalStatus: "single", employer: "עצמאי", savingsGoal: "חיסכון ארוך טווח", riskLevel: 3, updatedAt: new Date(now - 15 * 3_600_000).toISOString() },
      productActions: [transferAction(aimanHoldings[0], "הפניקס", "מושלם פלטינום", 320, now)],
    }),
    mk(now, {
      fn: "אדם", ln: "חזקיאל", pid: "319876543", mob: "058-3344556", stage: "submitted", ages: [60, 30, 24, 12], withMislaka: true,
      productActions: [transferAction(adamHoldings[0], "אלטשולר שחם", "מסלול כללי", 980, now)],
    }),
  ];
}

export const DEMO_MANUFACTURERS = [
  { name: "מגדל מקפת קרנות פנסיה וגמל בע\"מ", manager_id: 512237744, handler: 512237744 },
  { name: "הראל פנסיה וגמל בע\"מ", manager_id: 513026484, handler: 513026484 },
  { name: "כלל פנסיה וגמל בע\"מ", manager_id: 513973156, handler: 513973156 },
  { name: "הפניקס פנסיה וגמל בע\"מ", manager_id: 520023185, handler: 520023185 },
  { name: "מנורה מבטחים פנסיה וגמל בע\"מ", manager_id: 512245812, handler: 512790221 },
  { name: "אלטשולר שחם גמל ופנסיה בע\"מ", manager_id: 513173393, handler: 513173393 },
];
