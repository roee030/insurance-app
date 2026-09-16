/**
 * In-memory "backend" used only in the static demo build (GitHub Pages has
 * no server to talk to). It mirrors the real Express routes in
 * server/src/routes/*.ts closely enough that api.ts can swap between the
 * two transparently — every other file in the app is unaware this exists.
 */
import type {
  AgentProfile,
  AnswerBankEntry,
  Client,
  Contract,
  Discount,
  DocSignView,
  DocumentField,
  NeedsAssessment,
  PrimaryManufacturer,
  ProductAction,
  Report,
  ReportSnapshot,
  Settings,
  SignDocument,
  SignView,
  Submission,
} from "@/domain/types";
import { advance as advanceStage } from "@/domain/pipeline";
import { buildDemoClients, DEMO_MANUFACTURERS } from "@/data/demoSeed";
import { parseMislakaExport, MislakaExportParseError } from "./parseMislakaExport";
import type { NewClientInput } from "./api";

/**
 * Persisted to localStorage so a shared /report/:id or /sign/:token link
 * still resolves after a full reload or in a brand-new tab on the SAME
 * browser (data created during the demo doesn't just live in one tab's JS
 * memory). It does NOT sync across different browsers/devices — there's no
 * server — so this is a single-browser demo, not real multi-user state.
 */
const STORAGE_KEY = "insurance-app-demo-v3";

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
const DISCLOSURE_THRESHOLD_PERCENT = 40;

const SETTINGS_KEY = "insurance-app-demo-settings-v1";
const emptySettings: Settings = {
  agentProfile: {},
  answerBank: [],
  discounts: [],
  manufacturers: [],
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...emptySettings, ...JSON.parse(raw) };
  } catch {
    // corrupt/old-shape storage — fall through to empty
  }
  return structuredClone(emptySettings);
}

function persistSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // storage full/unavailable — demo still works in-memory for this tab
  }
}

let settings: Settings = loadSettings();

const DOCS_KEY = "insurance-app-demo-documents-v1";

function loadDocuments(): SignDocument[] {
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // corrupt/old-shape storage — fall through to empty
  }
  return [];
}

function persistDocuments() {
  try {
    localStorage.setItem(DOCS_KEY, JSON.stringify(documents));
  } catch {
    // storage full (base64 PDFs can be large in a demo browser) — in-memory only for this tab
  }
}

let documents: SignDocument[] = loadDocuments();

function findDoc(id: string): SignDocument | undefined {
  return documents.find((d) => d.id === id);
}

function docSignView(d: SignDocument): DocSignView {
  return {
    id: d.id,
    title: d.title,
    fileName: d.fileName,
    fields: d.fields,
    token: d.token,
    createdAt: d.createdAt,
    sentAt: d.sentAt,
    completedAt: d.completedAt,
    values: d.values,
    signerName: d.signerName,
  };
}

function find(id: string): Client | undefined {
  return clients.find((c) => c.id === id);
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

/**
 * `productActionIds`, when given, scopes the "ההמלצה שלנו" section to just
 * that subset — see server/src/routes/reports.ts for why the holdings table
 * always shows everything regardless.
 */
function buildSnapshot(client: Client, productActionIds?: string[]): ReportSnapshot {
  const holdings = client.mislaka?.polisot ?? [];
  const accumulation = holdings.reduce((s, h) => s + (h.balance ?? 0), 0);
  const productActions = productActionIds
    ? (client.productActions ?? []).filter((a) => productActionIds.includes(a.id))
    : client.productActions;
  return {
    clientName: `${client.firstName} ${client.lastName}`,
    personId: client.personId,
    agentName: settings.agentProfile.agentName || AGENT_NAME,
    agencyName: settings.agentProfile.agencyName || AGENCY_NAME,
    agentLicenseNumber: settings.agentProfile.licenseNumber,
    agentBio: settings.agentProfile.bio,
    generatedAt: new Date().toISOString(),
    holdings,
    totals: {
      accumulation,
      productCount: holdings.length,
      avgFeeAccumulation: weightedAvgFee(holdings),
    },
    productActions,
    needsAssessment: client.needsAssessment,
    disclosedManufacturers: settings.manufacturers.filter(
      (m) => m.commissionPercent >= DISCLOSURE_THRESHOLD_PERCENT,
    ),
  };
}

function signView(client: Client, contract: Contract): SignView {
  const ids = new Set(contract.productActionIds);
  return {
    clientName: `${client.firstName} ${client.lastName}`,
    personId: client.personId,
    agencyName: AGENCY_NAME,
    agentName: AGENT_NAME,
    label: contract.label,
    productActions: (client.productActions ?? []).filter((a) => ids.has(a.id)),
    sentAt: contract.sentAt,
    signedAt: contract.signedAt ?? null,
    signerName: contract.signerName ?? null,
  };
}

/** Same real check the server runs — see routes/signature.ts for why. */
function submitContract(productActionCount: number): Submission {
  const at = new Date().toISOString();
  if (productActionCount === 0) {
    return { status: "failed", at, note: "לא נבחרו מוצרים לשליחה — אין מה לשלוח לחברה" };
  }
  return { status: "success", at };
}

export const demoDb = {
  health: () => ({ ok: true, mislakaMode: "mock" as const, hasToken: false }),

  listClients: () => clients.map((c) => ({ ...c })),

  getClient: (id: string) => find(id),

  /** Parses the uploaded file and creates the client already "authorized". */
  createClient: (input: NewClientInput) => {
    let parsed;
    try {
      parsed = parseMislakaExport(input.mislakaFileContent);
    } catch (err) {
      throw err instanceof MislakaExportParseError
        ? err
        : new Error("שגיאה בקריאת הקובץ");
    }
    const now = new Date().toISOString();
    const client: Client = {
      id: crypto.randomUUID(),
      firstName: input.firstName,
      lastName: input.lastName,
      personId: input.personId,
      mobile: input.mobile,
      email: input.email,
      stage: "authorized",
      history: [{ id: crypto.randomUUID(), stage: "authorized", at: now, note: "נתוני מסלקה נטענו מקובץ" }],
      mislaka: {
        transactionId: parsed.transactionId ?? crypto.randomUUID(),
        mislakaNumber: parsed.mislakaNumber,
        actionCode: "file_upload",
        receivedAt: now,
        polisot: parsed.polisot,
        raw: parsed.raw,
      },
      createdAt: now,
      updatedAt: now,
    };
    clients = [client, ...clients];
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

  /** signature → submitted manual fallback — stamps a success submission on any contract still missing one. */
  advance: (id: string, note?: string) => {
    const c = find(id);
    if (!c || c.stage !== "signature") return null;
    const idx = clients.findIndex((x) => x.id === id);
    for (const contract of c.contracts ?? []) {
      if (!contract.submission) {
        contract.submission = { status: "success", at: new Date().toISOString() };
      }
    }
    const updated = advanceStage(c, note);
    clients[idx] = updated;
    persist();
    return updated;
  },

  /** Create one independent signing contract, scoped to a subset of productActions (all not-yet-covered ones, if omitted). */
  createContract: (id: string, productActionIds?: string[], label?: string) => {
    const c = find(id);
    if (!c) return null;
    const coveredIds = new Set((c.contracts ?? []).flatMap((k) => k.productActionIds));
    const uncoveredIds = (c.productActions ?? [])
      .map((a) => a.id)
      .filter((aid) => !coveredIds.has(aid));
    const ids =
      productActionIds && productActionIds.length > 0 ? productActionIds : uncoveredIds;
    if (ids.length === 0) return null;

    const contract: Contract = {
      id: crypto.randomUUID(),
      token: crypto.randomUUID().replace(/-/g, "").slice(0, 14),
      productActionIds: ids,
      label,
      sentAt: new Date().toISOString(),
    };
    c.contracts = [...(c.contracts ?? []), contract];
    c.updatedAt = new Date().toISOString();
    if (c.stage === "authorized") {
      const idx = clients.findIndex((x) => x.id === id);
      clients[idx] = advanceStage(c);
    }
    persist();
    return find(id)!;
  },

  manufacturers: () => DEMO_MANUFACTURERS,

  createReport: (clientId: string, productActionIds?: string[]): Report | null => {
    const c = find(clientId);
    if (!c) return null;
    const version = (c.reports?.length ?? 0) + 1;
    const report: Report = {
      id: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
      version,
      createdAt: new Date().toISOString(),
      snapshot: buildSnapshot(c, productActionIds),
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
    for (const c of clients) {
      const contract = c.contracts?.find((k) => k.token === token);
      if (contract) return signView(c, contract);
    }
    return null;
  },

  signDocument: (token: string, signerName: string): SignView | null => {
    for (const c of clients) {
      const contract = c.contracts?.find((k) => k.token === token);
      if (!contract) continue;
      if (!contract.signedAt) {
        contract.signedAt = new Date().toISOString();
        contract.signerName = signerName;
        contract.submission = submitContract(contract.productActionIds.length);

        const allSigned = (c.contracts ?? []).every((k) => k.signedAt);
        if (allSigned && c.stage === "signature") {
          const idx = clients.findIndex((x) => x.id === c.id);
          const anyFailed = (c.contracts ?? []).some((k) => k.submission?.status === "failed");
          const note = anyFailed
            ? "הלקוח חתם על כל החוזים — חלק מהשליחות לחברה נכשלו"
            : "הלקוח חתם על כל החוזים — נשלח לחברה בהצלחה";
          clients[idx] = advanceStage(c, note);
        }
        persist();
      }
      return signView(find(c.id)!, contract);
    }
    return null;
  },

  getSettings: () => settings,

  saveAgentProfile: (profile: AgentProfile) => {
    settings.agentProfile = { ...settings.agentProfile, ...profile };
    persistSettings();
    return settings;
  },

  saveAnswerBankEntry: (entry: AnswerBankEntry) => {
    const idx = settings.answerBank.findIndex((e) => e.id === entry.id);
    if (idx >= 0) settings.answerBank[idx] = entry;
    else settings.answerBank.push(entry);
    persistSettings();
    return settings;
  },

  deleteAnswerBankEntry: (id: string) => {
    settings.answerBank = settings.answerBank.filter((e) => e.id !== id);
    persistSettings();
    return settings;
  },

  saveDiscount: (discount: Discount) => {
    const idx = settings.discounts.findIndex((e) => e.id === discount.id);
    if (idx >= 0) settings.discounts[idx] = discount;
    else settings.discounts.push(discount);
    persistSettings();
    return settings;
  },

  deleteDiscount: (id: string) => {
    settings.discounts = settings.discounts.filter((e) => e.id !== id);
    persistSettings();
    return settings;
  },

  saveManufacturer: (m: PrimaryManufacturer) => {
    const idx = settings.manufacturers.findIndex((e) => e.id === m.id);
    if (idx >= 0) settings.manufacturers[idx] = m;
    else settings.manufacturers.push(m);
    persistSettings();
    return settings;
  },

  deleteManufacturer: (id: string) => {
    settings.manufacturers = settings.manufacturers.filter((e) => e.id !== id);
    persistSettings();
    return settings;
  },

  listDocuments: () => documents.map(({ fileContent: _fileContent, ...rest }) => rest),

  uploadDocument: (input: {
    title: string;
    fileName: string;
    fileContent: string;
    clientId?: string;
  }) => {
    const doc: SignDocument = {
      id: crypto.randomUUID(),
      title: input.title,
      fileName: input.fileName,
      fileContent: input.fileContent,
      fields: [],
      clientId: input.clientId,
      token: crypto.randomUUID().replace(/-/g, "").slice(0, 14),
      createdAt: new Date().toISOString(),
    };
    documents = [doc, ...documents];
    persistDocuments();
    const { fileContent: _fileContent, ...rest } = doc;
    return rest;
  },

  saveDocumentFields: (id: string, fields: DocumentField[]) => {
    const d = findDoc(id);
    if (!d) return null;
    d.fields = fields;
    persistDocuments();
    const { fileContent: _fileContent, ...rest } = d;
    return rest;
  },

  sendDocument: (id: string) => {
    const d = findDoc(id);
    if (!d) return null;
    d.sentAt = new Date().toISOString();
    persistDocuments();
    const { fileContent: _fileContent, ...rest } = d;
    return rest;
  },

  deleteDocument: (id: string) => {
    documents = documents.filter((d) => d.id !== id);
    persistDocuments();
  },

  getDocSign: (token: string): DocSignView | null => {
    const d = documents.find((x) => x.token === token);
    return d ? docSignView(d) : null;
  },

  submitDocSign: (
    token: string,
    values: Record<string, string | boolean>,
    signerName: string,
  ): DocSignView | null => {
    const d = documents.find((x) => x.token === token);
    if (!d) return null;
    if (!d.completedAt) {
      d.values = values;
      d.signerName = signerName;
      d.completedAt = new Date().toISOString();
      persistDocuments();
    }
    return docSignView(d);
  },
};
