import { create } from "zustand";
import type {
  AppNotification,
  Client,
  ProductAction,
  Report,
  NeedsAssessment,
} from "@/domain/types";
import { api, type NewClientInput } from "@/lib/api";

interface ClientsState {
  clients: Client[];
  notifications: AppNotification[];
  selectedId: string | null;
  loading: boolean;
  connected: boolean;
  mislakaMode: string | null;
  error: string | null;

  init: () => void;
  stop: () => void;
  refresh: () => Promise<void>;
  select: (id: string | null) => void;
  addClient: (input: NewClientInput) => Promise<Client>;
  saveProductAction: (id: string, action: ProductAction) => Promise<void>;
  removeProductAction: (id: string, actionId: string) => Promise<void>;
  saveNeedsAssessment: (id: string, data: NeedsAssessment) => Promise<void>;
  advanceClient: (id: string) => Promise<void>;
  createReport: (id: string) => Promise<Report>;
  simulateApproval: (id: string) => Promise<void>;
  markNotificationsRead: () => void;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
/** Remember each client's last-seen stage so we can detect transitions. */
const lastStage = new Map<string, Client["stage"]>();
let notifSeq = 0;

function diffNotifications(prev: Client[], next: Client[]): AppNotification[] {
  const out: AppNotification[] = [];
  const firstRun = lastStage.size === 0 && prev.length === 0;
  for (const c of next) {
    const before = lastStage.get(c.id);
    lastStage.set(c.id, c.stage);
    if (firstRun || before === undefined || before === c.stage) continue;
    const name = `${c.firstName} ${c.lastName}`;
    if (c.stage === "authorized") {
      out.push(mkNotif(c.id, "mislaka_approved", `התקבל מידע מהמסלקה עבור ${name}`));
    } else if (c.stage === "submitted") {
      out.push(mkNotif(c.id, "signature_signed", `${name} נשלח לחברת הביטוח`));
    }
  }
  return out;
}

function mkNotif(
  clientId: string,
  kind: AppNotification["kind"],
  message: string,
): AppNotification {
  return {
    id: `n${Date.now()}_${notifSeq++}`,
    clientId,
    kind,
    message,
    at: new Date().toISOString(),
    read: false,
  };
}

export const useClients = create<ClientsState>((set, get) => ({
  clients: [],
  notifications: [],
  selectedId: null,
  loading: true,
  connected: false,
  mislakaMode: null,
  error: null,

  init: () => {
    void get().refresh();
    api
      .health()
      .then((h) => set({ mislakaMode: h.mislakaMode, connected: true }))
      .catch(() => set({ connected: false }));
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => void get().refresh(), 3500);
  },

  stop: () => {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  },

  refresh: async () => {
    try {
      const next = await api.listClients();
      const prev = get().clients;
      const fresh = diffNotifications(prev, next);
      set((s) => ({
        clients: next,
        loading: false,
        connected: true,
        error: null,
        notifications: fresh.length
          ? [...fresh, ...s.notifications].slice(0, 50)
          : s.notifications,
        selectedId:
          s.selectedId && next.some((c) => c.id === s.selectedId)
            ? s.selectedId
            : (next[0]?.id ?? null),
      }));
    } catch (err) {
      set({ connected: false, loading: false, error: String(err) });
    }
  },

  select: (id) => set({ selectedId: id }),

  addClient: async (input) => {
    const client = await api.createClient(input);
    lastStage.set(client.id, client.stage);
    set((s) => ({
      clients: [client, ...s.clients.filter((c) => c.id !== client.id)],
      selectedId: client.id,
      notifications: [
        mkNotif(client.id, "sms_sent", `נשלח SMS ל${client.firstName} ${client.lastName}`),
        ...s.notifications,
      ].slice(0, 50),
    }));
    return client;
  },

  saveProductAction: async (id, action) => {
    const updated = await api.saveProductAction(id, action);
    set((s) => ({
      clients: s.clients.map((c) => (c.id === id ? updated : c)),
    }));
  },

  removeProductAction: async (id, actionId) => {
    const updated = await api.removeProductAction(id, actionId);
    set((s) => ({
      clients: s.clients.map((c) => (c.id === id ? updated : c)),
    }));
  },

  advanceClient: async (id) => {
    const updated = await api.advance(id);
    lastStage.set(id, updated.stage);
    set((s) => ({
      clients: s.clients.map((c) => (c.id === id ? updated : c)),
    }));
  },

  saveNeedsAssessment: async (id, data) => {
    const updated = await api.saveNeedsAssessment(id, data);
    set((s) => ({
      clients: s.clients.map((c) => (c.id === id ? updated : c)),
    }));
  },

  createReport: async (id) => {
    const report = await api.createReport(id);
    set((s) => ({
      clients: s.clients.map((c) =>
        c.id === id
          ? { ...c, reports: [report, ...(c.reports ?? [])] }
          : c,
      ),
    }));
    return report;
  },

  simulateApproval: async (id) => {
    await api.simulateApproval(id);
    // webhook is async on the server; refresh shortly after
    setTimeout(() => void get().refresh(), 600);
  },

  markNotificationsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),
}));
