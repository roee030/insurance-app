/**
 * In-memory "backend" used only in the static demo build (GitHub Pages has
 * no server to talk to). It mirrors the real Express routes in
 * server/src/routes/*.ts closely enough that api.ts can swap between the
 * two transparently — every other file in the app is unaware this exists.
 */
import type {
  Client,
  NeedsAssessment,
  ProductAction,
  Report,
  ReportSnapshot,
  SignView,
} from "@/domain/types";
import { advance as advanceStage, nextStage } from "@/domain/pipeline";
import { buildDemoClients, DEMO_MANUFACTURERS } from "@/data/demoSeed";

/**
 * Persisted to localStorage so a shared /report/:id or /sign/:token link
 * still resolves after a full reload or in a brand-new tab on the SAME
 * browser (data created during the demo doesn't just live in one tab's JS
 * memory). It does NOT sync across different browsers/devices — there's no
 * server — so this is a single-browser demo, not real multi-user state.
 */
const STORAGE_KEY = "insurance-app-demo-v1";

function loadClients(): Client[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // corrupt/old-shape storage — fall through to a fresh seed
  }
  return buildDemoClients();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  } catch {
    // storage full/unavailable (e.g. private browsing) — demo still works
    // in-memory for the rest of this tab's session, it just won't persist.
  }
}

let clients: Client[] = loadClients();

const AGENT_NAME = "יואל תורגמן";
const AGENCY_NAME = "תורגמן סוכנות לביטוח";
/** Simulated Mislaka turnaround in the demo — long enough to feel real. */
const WEBHOOK_DELAY_MS = 6000;

function find(id: string): Client | undefined {
  return clients.find((c) => c.id === id);
}

function fakePolisot(personId: string) {
  const seed = Number(personId.slice(-1)) || 3;
  const pool = [
    {
      manufacturer: "הראל",
      product_type: "פנסיה מקיפה",
      polisa_number: "PH-" + personId.slice(0, 6),
      polisa_name: "הראל פנסיה מקיפה",
      polisa_status: "active",
      balance: 120000 + seed * 9000,
      track: "מסלול מותאם לגיל עד 50",
      feeAccumulation: 0.3,
      feeDeposit: 2.25,
    },
    {
      manufacturer: "מגדל",
      product_type: "ביטוח מנהלים",
      polisa_number: "MG-" + personId.slice(2, 8),
      polisa_name: "מגדל לעצמאים",
      polisa_status: "active",
      balance: 55000 + seed * 4000,
      track: "מסלול כללי",
      feeAccumulation: 0.85,
      feeDeposit: 3.5,
    },
    {
      manufacturer: "כלל",
      product_type: "קרן השתלמות",
      polisa_number: "CL-" + personId.slice(1, 7),
      polisa_name: "כלל השתלמות",
      polisa_status: seed % 2 ? "active" : "frozen",
      balance: 32000 + seed * 2500,
      track: "מסלול מנייתי",
      feeAccumulation: 0.6,
      feeDeposit: 0,
    },
  ];
  return pool.slice(0, 2 + (seed % 2));
}

function weightedAvgFee(holdings: { balance?: number; feeAccumulation?: number }[]): number {
  const total = holdings.reduce((s, h) => s + (h.balance ?? 0), 0);
  if (total === 0) return 0;
  const weighted = holdings.reduce(
    (s, h) => s + (h.feeAccumulation ?? 0) * (h.balance ?? 0),
    0,
  );
  return Math.round((weighted / total) * 100) / 100;
}

function buildSnapshot(client: Client): ReportSnapshot {
  const holdings = client.mislaka?.polisot ?? [];
  const accumulation = holdings.reduce((s, h) => s + (h.balance ?? 0), 0);
  return {
    clientName: `${client.firstName} ${client.lastName}`,
    personId: client.personId,
    agentName: AGENT_NAME,
    agencyName: AGENCY_NAME,
    generatedAt: new Date().toISOString(),
    holdings,
    totals: {
      accumulation,
      productCount: holdings.length,
      avgFeeAccumulation: weightedAvgFee(holdings),
    },
    productActions: client.productActions,
    needsAssessment: client.needsAssessment,
  };
}

function signView(client: Client): SignView {
  return {
    clientName: `${client.firstName} ${client.lastName}`,
    personId: client.personId,
    agencyName: AGENCY_NAME,
    agentName: AGENT_NAME,
    productActions: client.productActions ?? [],
    sentAt: client.signRequest?.sentAt,
    signedAt: client.signRequest?.signedAt ?? null,
    signerName: client.signRequest?.signerName ?? null,
  };
}

/** Fires once, asynchronously — simulates the Mislaka's return-of-data. */
function scheduleMislakaReturn(clientId: string) {
  setTimeout(() => {
    const c = find(clientId);
    if (!c || c.stage !== "sms_sent") return;
    c.mislaka = {
      transactionId: c.transactionId ?? crypto.randomUUID(),
      mislakaNumber: "MSL-" + crypto.randomUUID().slice(0, 8),
      actionCode: "9100",
      receivedAt: new Date().toISOString(),
      polisot: fakePolisot(c.personId),
    };
    const idx = clients.findIndex((x) => x.id === clientId);
    clients[idx] = advanceStage(c, "התקבל אישור מסלקה — נתונים נשמרו");
    persist();
  }, WEBHOOK_DELAY_MS);
}

export const demoDb = {
  health: () => ({ ok: true, mislakaMode: "mock" as const, hasToken: false }),

  listClients: () => clients.map((c) => ({ ...c })),

  getClient: (id: string) => find(id),

  createClient: (input: {
    firstName: string;
    lastName: string;
    personId: string;
    mobile: string;
    email?: string;
  }) => {
    const now = new Date().toISOString();
    // "lead" is a real history entry but isn't in STAGE_ORDER (see pipeline.ts),
    // so nextStage()-based advance() can't walk out of it — set sms_sent directly,
    // exactly like the server's setStage(client, "sms_sent") does.
    const client: Client = {
      id: crypto.randomUUID(),
      ...input,
      stage: "sms_sent",
      history: [
        { id: crypto.randomUUID(), stage: "lead", at: now },
        {
          id: crypto.randomUUID(),
          stage: "sms_sent",
          at: now,
          note: "נשלח SMS עם קישור אישי למסלקה",
        },
      ],
      transactionId: "mock-" + crypto.randomUUID(),
      leadPageUrl: "https://mock.mislaka-api.co.il/lead/demo",
      createdAt: now,
      updatedAt: now,
    };
    clients = [client, ...clients];
    scheduleMislakaReturn(client.id);
    persist();
    return client;
  },

  saveProductAction: (id: string, action: ProductAction) => {
    const c = find(id);
    if (!c) return null;
    const actions = c.productActions ?? [];
    const idx = actions.findIndex((a) => a.id === action.id);
    const withStamp = { ...action, createdAt: new Date().toISOString() };
    if (idx >= 0) actions[idx] = { ...actions[idx], ...withStamp };
    else actions.push(withStamp);
    c.productActions = actions;
    c.updatedAt = new Date().toISOString();
    persist();
    return c;
  },

  removeProductAction: (id: string, actionId: string) => {
    const c = find(id);
    if (!c) return null;
    c.productActions = (c.productActions ?? []).filter((a) => a.id !== actionId);
    c.updatedAt = new Date().toISOString();
    persist();
    return c;
  },

  saveNeedsAssessment: (id: string, data: NeedsAssessment) => {
    const c = find(id);
    if (!c) return null;
    c.needsAssessment = { ...c.needsAssessment, ...data, updatedAt: new Date().toISOString() };
    c.updatedAt = new Date().toISOString();
    persist();
    return c;
  },

  advance: (id: string, note?: string) => {
    const c = find(id);
    if (!c) return null;
    const target = nextStage(c.stage);
    const idx = clients.findIndex((x) => x.id === id);
    const updated = advanceStage(c, note);
    if (target === "signature" && !updated.signRequest) {
      updated.signRequest = {
        token: crypto.randomUUID().replace(/-/g, "").slice(0, 14),
        sentAt: new Date().toISOString(),
      };
    }
    clients[idx] = updated;
    persist();
    return updated;
  },

  simulateApproval: (id: string) => {
    const c = find(id);
    if (!c || c.stage !== "sms_sent") return null;
    c.mislaka = {
      transactionId: c.transactionId ?? crypto.randomUUID(),
      mislakaNumber: "MSL-" + crypto.randomUUID().slice(0, 8),
      actionCode: "9100",
      receivedAt: new Date().toISOString(),
      polisot: fakePolisot(c.personId),
    };
    const idx = clients.findIndex((x) => x.id === id);
    clients[idx] = advanceStage(c, "התקבל אישור מסלקה — נתונים נשמרו");
    persist();
    return { ok: true };
  },

  manufacturers: () => DEMO_MANUFACTURERS,

  createReport: (clientId: string): Report | null => {
    const c = find(clientId);
    if (!c) return null;
    const version = (c.reports?.length ?? 0) + 1;
    const report: Report = {
      id: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
      version,
      createdAt: new Date().toISOString(),
      snapshot: buildSnapshot(c),
    };
    c.reports = [report, ...(c.reports ?? [])];
    persist();
    return report;
  },

  getReport: (reportId: string): Report | null => {
    for (const c of clients) {
      const r = c.reports?.find((x) => x.id === reportId);
      if (r) return r;
    }
    return null;
  },

  getSignRequest: (token: string): SignView | null => {
    const c = clients.find((x) => x.signRequest?.token === token);
    return c ? signView(c) : null;
  },

  signDocument: (token: string, signerName: string): SignView | null => {
    const c = clients.find((x) => x.signRequest?.token === token);
    if (!c || !c.signRequest) return null;
    if (!c.signRequest.signedAt) {
      c.signRequest.signedAt = new Date().toISOString();
      c.signRequest.signerName = signerName;
      if (c.stage === "signature") {
        const idx = clients.findIndex((x) => x.id === c.id);
        clients[idx] = advanceStage(c, "הלקוח חתם דיגיטלית — נשלח לחברה");
      }
      persist();
    }
    return signView(find(c.id)!);
  },
};
