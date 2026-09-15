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
const STORAGE_KEY = "insurance-app-demo-v2";

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

function buildSnapshot(client: Client): ReportSnapshot {
  const holdings = client.mislaka?.polisot ?? [];
  const accumulation = holdings.reduce((s, h) => s + (h.balance ?? 0), 0);
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
    productActions: client.productActions,
    needsAssessment: client.needsAssessment,
    disclosedManufacturers: settings.manufacturers.filter(
      (m) => m.commissionPercent >= DISCLOSURE_THRESHOLD_PERCENT,
    ),
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

/** Same real check the server runs — see routes/signature.ts for why. */
function submitToInsuranceCompanies(client: Client): Submission {
  const at = new Date().toISOString();
  if (!client.productActions || client.productActions.length === 0) {
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

  advance: (id: string, note?: string) => {
    const c = find(id);
    if (!c) return null;
    const idx = clients.findIndex((x) => x.id === id);
    const updated = advanceStage(c, note);
    if (updated.stage === "signature" && !updated.signRequest) {
      updated.signRequest = {
        token: crypto.randomUUID().replace(/-/g, "").slice(0, 14),
        sentAt: new Date().toISOString(),
      };
    }
    if (updated.stage === "submitted" && !updated.submission) {
      updated.submission = submitToInsuranceCompanies(updated);
    }
    clients[idx] = updated;
    persist();
    return updated;
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
      c.submission = submitToInsuranceCompanies(c);
      if (c.stage === "signature") {
        const idx = clients.findIndex((x) => x.id === c.id);
        const note =
          c.submission.status === "success"
            ? "הלקוח חתם דיגיטלית — נשלח לחברה בהצלחה"
            : `הלקוח חתם דיגיטלית — השליחה לחברה נכשלה: ${c.submission.note}`;
        clients[idx] = advanceStage(c, note);
      }
      persist();
    }
    return signView(find(c.id)!);
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
