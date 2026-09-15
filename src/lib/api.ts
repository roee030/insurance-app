import type {
  AgentProfile,
  AnswerBankEntry,
  Client,
  Discount,
  DocSignView,
  DocumentField,
  PrimaryManufacturer,
  ProductAction,
  Report,
  NeedsAssessment,
  Settings,
  SignDocument,
  SignView,
} from "@/domain/types";
import { demoDb } from "./demoDb";

/**
 * DEMO mode powers the static GitHub Pages build, which has no server to
 * talk to: every call below is routed to the in-memory demoDb instead of
 * fetch(). Nothing outside this file needs to know — same shapes, same
 * async contract, just no network. Set via `VITE_DEMO_MODE=1` (see
 * .env.demo / the "build:demo" script).
 *
 * Exported (not just module-local) because a couple of UI affordances —
 * e.g. the "simulate client signature" button — must only ever appear in
 * the demo build. Against a real backend that button would let an agent
 * forge a client's digital signature through the real /sign/:token
 * endpoint, so any demo-only action must check this before rendering.
 */
export const DEMO = import.meta.env.VITE_DEMO_MODE === "1";

const BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:4000/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/** Small artificial delay so demo interactions still feel like round-trips. */
function demo<T>(fn: () => T, ms = 200): Promise<T> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      try {
        resolve(fn());
      } catch (e) {
        reject(e);
      }
    }, ms),
  );
}

function orThrow<T>(value: T | null | undefined, msg = "not found"): T {
  if (value == null) throw new Error(msg);
  return value;
}

export interface NewClientInput {
  firstName: string;
  lastName: string;
  personId: string;
  mobile: string;
  email?: string;
  /** Raw text content of the מסלקה export file the agent uploaded. */
  mislakaFileContent: string;
}

export const api = {
  health: () =>
    DEMO
      ? demo(() => demoDb.health(), 80)
      : req<{ ok: boolean; mislakaMode: string; hasToken: boolean }>("/health"),

  listClients: () =>
    DEMO ? demo(() => demoDb.listClients(), 80) : req<Client[]>("/clients"),

  getClient: (id: string) =>
    DEMO
      ? demo(() => orThrow(demoDb.getClient(id)))
      : req<Client>(`/clients/${id}`),

  /** Creates the client from an uploaded מסלקה export — no waiting. */
  createClient: (input: NewClientInput) =>
    DEMO
      ? demo(() => demoDb.createClient(input), 500)
      : req<Client>("/clients", { method: "POST", body: JSON.stringify(input) }),

  /** Upsert one per-product decision (ניוד / פתיחת חדש). */
  saveProductAction: (id: string, action: ProductAction) =>
    DEMO
      ? demo(() => orThrow(demoDb.saveProductAction(id, action)))
      : req<Client>(`/clients/${id}/product-actions`, {
          method: "POST",
          body: JSON.stringify(action),
        }),

  removeProductAction: (id: string, actionId: string) =>
    DEMO
      ? demo(() => orThrow(demoDb.removeProductAction(id, actionId)))
      : req<Client>(`/clients/${id}/product-actions/${actionId}`, {
          method: "DELETE",
        }),

  saveNeedsAssessment: (id: string, data: NeedsAssessment) =>
    DEMO
      ? demo(() => orThrow(demoDb.saveNeedsAssessment(id, data)))
      : req<Client>(`/clients/${id}/needs-assessment`, {
          method: "POST",
          body: JSON.stringify(data),
        }),

  advance: (id: string, note?: string) =>
    DEMO
      ? demo(() => orThrow(demoDb.advance(id, note)), 350)
      : req<Client>(`/clients/${id}/advance`, {
          method: "POST",
          body: JSON.stringify({ note }),
        }),

  manufacturers: () =>
    DEMO
      ? demo(() => demoDb.manufacturers())
      : req<Array<{ name: string; manager_id: number; handler: number }>>(
          "/manufacturers",
        ),

  /** Freeze a new client-facing report snapshot. */
  createReport: (clientId: string) =>
    DEMO
      ? demo(() => orThrow(demoDb.createReport(clientId)), 400)
      : req<Report>(`/clients/${clientId}/reports`, { method: "POST" }),

  /** Public fetch of a report by its shareable id. */
  getReport: (reportId: string) =>
    DEMO
      ? demo(() => orThrow(demoDb.getReport(reportId)))
      : req<Report>(`/reports/${reportId}`),

  /** Public: what the client sees on the signing page. */
  getSignRequest: (token: string) =>
    DEMO
      ? demo(() => orThrow(demoDb.getSignRequest(token)))
      : req<SignView>(`/sign/${token}`),

  /** Public: the client submits their signature. */
  signDocument: (token: string, signerName: string) =>
    DEMO
      ? demo(() => orThrow(demoDb.signDocument(token, signerName)), 400)
      : req<SignView>(`/sign/${token}`, {
          method: "POST",
          body: JSON.stringify({ signerName }),
        }),

  getSettings: () =>
    DEMO ? demo(() => demoDb.getSettings()) : req<Settings>("/settings"),

  saveAgentProfile: (profile: AgentProfile) =>
    DEMO
      ? demo(() => demoDb.saveAgentProfile(profile))
      : req<Settings>("/settings/agent-profile", {
          method: "PUT",
          body: JSON.stringify(profile),
        }),

  saveAnswerBankEntry: (entry: AnswerBankEntry) =>
    DEMO
      ? demo(() => demoDb.saveAnswerBankEntry(entry))
      : req<Settings>("/settings/answer-bank", {
          method: "POST",
          body: JSON.stringify(entry),
        }),

  deleteAnswerBankEntry: (id: string) =>
    DEMO
      ? demo(() => demoDb.deleteAnswerBankEntry(id))
      : req<Settings>(`/settings/answer-bank/${id}`, { method: "DELETE" }),

  saveDiscount: (discount: Discount) =>
    DEMO
      ? demo(() => demoDb.saveDiscount(discount))
      : req<Settings>("/settings/discounts", {
          method: "POST",
          body: JSON.stringify(discount),
        }),

  deleteDiscount: (id: string) =>
    DEMO
      ? demo(() => demoDb.deleteDiscount(id))
      : req<Settings>(`/settings/discounts/${id}`, { method: "DELETE" }),

  saveManufacturer: (m: PrimaryManufacturer) =>
    DEMO
      ? demo(() => demoDb.saveManufacturer(m))
      : req<Settings>("/settings/manufacturers", {
          method: "POST",
          body: JSON.stringify(m),
        }),

  deleteManufacturer: (id: string) =>
    DEMO
      ? demo(() => demoDb.deleteManufacturer(id))
      : req<Settings>(`/settings/manufacturers/${id}`, { method: "DELETE" }),

  listDocuments: () =>
    DEMO ? demo(() => demoDb.listDocuments()) : req<SignDocument[]>("/documents"),

  uploadDocument: (input: { title: string; fileName: string; fileContent: string; clientId?: string }) =>
    DEMO
      ? demo(() => demoDb.uploadDocument(input), 400)
      : req<SignDocument>("/documents", { method: "POST", body: JSON.stringify(input) }),

  saveDocumentFields: (id: string, fields: DocumentField[]) =>
    DEMO
      ? demo(() => orThrow(demoDb.saveDocumentFields(id, fields)))
      : req<SignDocument>(`/documents/${id}/fields`, {
          method: "PUT",
          body: JSON.stringify({ fields }),
        }),

  sendDocument: (id: string) =>
    DEMO
      ? demo(() => orThrow(demoDb.sendDocument(id)))
      : req<SignDocument>(`/documents/${id}/send`, { method: "POST" }),

  deleteDocument: (id: string) =>
    DEMO
      ? demo(() => {
          demoDb.deleteDocument(id);
        })
      : req<void>(`/documents/${id}`, { method: "DELETE" }),

  getDocSign: (token: string) =>
    DEMO
      ? demo(() => orThrow(demoDb.getDocSign(token)))
      : req<DocSignView>(`/docsign/${token}`),

  submitDocSign: (token: string, values: Record<string, string | boolean>, signerName: string) =>
    DEMO
      ? demo(() => orThrow(demoDb.submitDocSign(token, values, signerName)), 400)
      : req<DocSignView>(`/docsign/${token}`, {
          method: "POST",
          body: JSON.stringify({ values, signerName }),
        }),
};
