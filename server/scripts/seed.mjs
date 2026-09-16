/**
 * Seeds server/data/db.json with a clean, realistic demo dataset spanning
 * all 3 pipeline stages. Run with: node scripts/seed.mjs (from server/).
 * Restart the dev server afterwards — the DB is cached in memory on load.
 */
import { writeFileSync, mkdirSync } from "node:fs";

const now = Date.now();
const iso = (hAgo) => new Date(now - hAgo * 3600000).toISOString();
const uid = () => crypto.randomUUID();
const tok = () => uid().replace(/-/g, "").slice(0, 14);

const HSTAGES = ["authorized", "signature", "submitted"];

function hist(upto, agesH) {
  let cursor = agesH.reduce((a, b) => a + b, 0);
  const end = HSTAGES.indexOf(upto);
  const ev = [];
  for (let i = 0; i <= end; i++) {
    ev.push({ id: uid(), stage: HSTAGES[i], at: iso(cursor) });
    cursor -= agesH[i] ?? 0;
  }
  return ev;
}

function polisot(seed) {
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

function transferAction(holding, targetCompany, targetTrack, premium) {
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
    createdAt: iso(3),
  };
}

function newAction(productType, targetCompany, targetTrack, premium) {
  return {
    id: "new-" + uid().slice(0, 8),
    productType,
    kind: "new",
    targetCompany,
    targetTrack,
    monthlyPremium: premium,
    createdAt: iso(3),
  };
}

function mk({ fn, ln, pid, mob, stage, ages, productActions, na, forceFailedSubmission }) {
  const h = hist(stage, ages);
  const c = {
    id: uid(),
    firstName: fn,
    lastName: ln,
    personId: pid,
    mobile: mob,
    stage,
    history: h,
    createdAt: h[0].at,
    updatedAt: h[h.length - 1].at,
    mislaka: {
      transactionId: "mock-" + uid(),
      mislakaNumber: "MSL-" + pid.slice(0, 8),
      actionCode: "file_upload",
      receivedAt: h[0].at,
      polisot: polisot(Number(pid.slice(-3))),
    },
  };
  if (na) c.needsAssessment = na;
  if (productActions) c.productActions = productActions;
  if (stage === "signature") {
    c.contracts = [
      {
        id: uid(),
        token: tok(),
        productActionIds: (productActions ?? []).map((a) => a.id),
        sentAt: iso(18),
      },
    ];
  }
  if (stage === "submitted") {
    const submission = forceFailedSubmission
      ? { status: "failed", at: iso(13), note: "לא נבחרו מוצרים לשליחה — אין מה לשלוח לחברה" }
      : { status: "success", at: iso(13) };
    c.contracts = [
      {
        id: uid(),
        token: tok(),
        productActionIds: (productActions ?? []).map((a) => a.id),
        sentAt: iso(20),
        signedAt: iso(13),
        signerName: fn + " " + ln,
        submission,
      },
    ];
  }
  return c;
}

const roiHoldings = polisot(90);
const aimanHoldings = polisot(899);
const adamHoldings = polisot(543);

const clients = [
  // just uploaded, agent hasn't started working the file yet
  mk({ fn: "ענת", ln: "עובדיה", pid: "512345678", mob: "0534455667", stage: "authorized", ages: [1] }),
  mk({ fn: "גל", ln: "נגרין", pid: "207654321", mob: "0501234567", stage: "authorized", ages: [30] }),
  mk({ fn: "אורלי", ln: "חזקיאל", pid: "301234567", mob: "0541122334", stage: "authorized", ages: [80] }),
  mk({
    fn: "רועי", ln: "גינוסר", pid: "033845090", mob: "0524567890", stage: "authorized", ages: [8],
    na: {
      maritalStatus: "married", employer: "טק-נובה מערכות בע״מ", savingsGoal: "פרישה", timeHorizon: "ארוך טווח", riskLevel: 4,
      justification: "דמי ניהול גבוהים בביטוח המנהלים במגדל — מומלץ ניוד לקרן פנסיה מקיפה זולה יותר במנורה מבטחים.",
      updatedAt: iso(2),
    },
    productActions: [
      transferAction(roiHoldings[0], "מנורה מבטחים", "מסלול מניות עד 50", 1450),
      transferAction(roiHoldings[1], "כלל", "מסלול כללי", 380),
      newAction("גמל להשקעה", "אלטשולר שחם", "מסלול מניות עד 50", 500),
    ],
  }),
  mk({
    fn: "אימן", ln: "טאהא", pid: "066778899", mob: "0527766554", stage: "signature", ages: [30, 20],
    na: { maritalStatus: "single", employer: "עצמאי", savingsGoal: "חיסכון ארוך טווח", riskLevel: 3, updatedAt: iso(15) },
    productActions: [transferAction(aimanHoldings[0], "הפניקס", "מושלם פלטינום", 320)],
  }),
  mk({
    fn: "אדם", ln: "חזקיאל", pid: "319876543", mob: "0583344556", stage: "submitted", ages: [54, 24, 12],
    productActions: [transferAction(adamHoldings[0], "אלטשולר שחם", "מסלול כללי", 980)],
  }),
  // demonstrates a failed submission — signed but no product decisions were ever made
  mk({ fn: "נועה", ln: "שרון", pid: "422113355", mob: "0549012345", stage: "submitted", ages: [40, 20, 8], forceFailedSubmission: true }),
];

mkdirSync("data", { recursive: true });
writeFileSync("data/db.json", JSON.stringify({ clients }, null, 2));
console.log("seeded", clients.length, "clients across 3 stages");
