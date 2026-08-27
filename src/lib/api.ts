import type {
  Client,
  ProductAction,
  Report,
  NeedsAssessment,
  SignView,
} from "@/domain/types";
import { demoDb } from "./demoDb";

/**
 * DEMO mode powers the static GitHub Pages build, which has no server to
 * talk to: every call below is routed to the in-memory demoDb instead of
 * fetch(). Nothing outside this file needs to know — same shapes, same
 * async contract, just no network. Set via `VITE_DEMO_MODE=1` (see
 * .env.demo / the "build:demo" script).
 */
const DEMO = import.meta.env.VITE_DEMO_MODE === "1";

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

  /** Creates the client AND triggers the SMS with the personal Mislaka link. */
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

  /** mock-mode only — manually fire the return-of-data webhook. */
  simulateApproval: (id: string) =>
    DEMO
      ? demo(() => orThrow(demoDb.simulateApproval(id)))
      : req<{ ok: boolean }>(`/clients/${id}/simulate-approval`, {
          method: "POST",
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
};
