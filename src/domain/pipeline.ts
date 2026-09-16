import type { Client, Owner, StageId, StageEvent } from "./types";
import { hoursSince } from "@/lib/utils";

/**
 * The pipeline definition — the single source of truth for the whole app.
 * Each stage declares who owns it, how it looks, what the next action is,
 * and after how many hours a client sitting in it is considered "stuck".
 * The UI (kanban, stepper, dashboard) is derived entirely from this table.
 */
export interface StageMeta {
  id: StageId;
  /** Short label for chips / columns. */
  label: string;
  /** Longer human description of what happens here. */
  description: string;
  owner: Owner;
  /** CTA text for the button that advances the client out of this stage. */
  action: string | null;
  /** Tailwind accent token used across UI for this stage. */
  accent: "zinc" | "amber" | "emerald" | "cyan" | "violet" | "green";
  /** Hours after which a client here is flagged as aging / stuck. */
  slaHours: number;
}

/**
 * The VISIBLE pipeline — only 3 stages now. "lead", "sms_sent" and "policy"
 * are gone from the active flow: there's no more SMS/webhook wait, since
 * the agent uploads the מסלקה export directly and the client starts with
 * its data already in hand. They remain in STAGES/StageId for old records.
 */
export const STAGE_ORDER: StageId[] = ["authorized", "signature", "submitted"];

export const STAGES: Record<StageId, StageMeta> = {
  lead: {
    id: "lead",
    label: "נרשם חדש",
    description: "פרטי הלקוח הוזנו.",
    owner: "agent",
    action: null,
    accent: "zinc",
    slaHours: 24,
  },
  sms_sent: {
    id: "sms_sent",
    label: "ממתין לאישור מסלקה",
    description: "שלב היסטורי — הוסר מהתהליך הפעיל.",
    owner: "client",
    action: null,
    accent: "amber",
    slaHours: 72,
  },
  authorized: {
    id: "authorized",
    label: "בטיפול — נתונים נטענו",
    description:
      "נתוני המסלקה נטענו מהקובץ שהועלה. השלם בירור צרכים ובחר מוצר/ניוד, ואז הפק חוזה לחתימה.",
    owner: "agent",
    action: "הפק חוזה לחתימה",
    accent: "emerald",
    slaHours: 48,
  },
  policy: {
    id: "policy",
    label: "פתיחת פוליסה",
    description: "שלב היסטורי — מוזג לתוך שלב הטיפול.",
    owner: "agent",
    action: null,
    accent: "cyan",
    slaHours: 48,
  },
  signature: {
    id: "signature",
    label: "ממתין לחתימת לקוח",
    description:
      "החוזה נשלח ללקוח לחתימה דיגיטלית מרחוק. עם קבלת החתימה — נשלח אוטומטית לחברת הביטוח.",
    owner: "client",
    action: "סמן כנחתם ושלח לחברה",
    accent: "violet",
    slaHours: 96,
  },
  submitted: {
    id: "submitted",
    label: "הושלם",
    description: "הלקוח חתם והבקשה נשלחה לחברת הביטוח — הרשומה סגורה.",
    owner: "done",
    action: null,
    accent: "green",
    slaHours: Infinity,
  },
};

export function stageIndex(stage: StageId): number {
  return STAGE_ORDER.indexOf(stage);
}

export function nextStage(stage: StageId): StageId | null {
  const i = stageIndex(stage);
  return i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null;
}

export function isTerminal(stage: StageId): boolean {
  return stage === "submitted";
}

/** Progress 0..1 across the pipeline for progress bars. */
export function progress(stage: StageId): number {
  return stageIndex(stage) / (STAGE_ORDER.length - 1);
}

/** Timestamp the client entered its current stage. */
export function enteredCurrentStageAt(client: Client): string {
  for (let i = client.history.length - 1; i >= 0; i--) {
    if (client.history[i].stage === client.stage) return client.history[i].at;
  }
  return client.createdAt;
}

export function hoursInStage(client: Client): number {
  return hoursSince(enteredCurrentStageAt(client));
}

/** A client is "stuck" when it has exceeded the SLA for its current stage. */
export function isStuck(client: Client): boolean {
  if (isTerminal(client.stage)) return false;
  return hoursInStage(client) > STAGES[client.stage].slaHours;
}

/** Pure transition: returns a new client advanced to the next stage. */
export function advance(client: Client, note?: string): Client {
  const next = nextStage(client.stage);
  if (!next) return client;
  const event: StageEvent = {
    id: crypto.randomUUID(),
    stage: next,
    at: new Date().toISOString(),
    note,
  };
  return { ...client, stage: next, history: [...client.history, event] };
}

/**
 * Rolls up a client's (possibly several) independent contracts into one
 * status for dashboard/analytics/notification code that only cares about
 * "did this deal go through overall" — not which specific contract.
 * undefined = nothing submitted yet; "pending" = some done, some not.
 */
export function clientOverallSubmission(
  client: Client,
): "success" | "failed" | "pending" | undefined {
  const contracts = client.contracts ?? [];
  const withOutcome = contracts.filter((c) => c.submission);
  if (withOutcome.length === 0) return undefined;
  if (withOutcome.some((c) => c.submission!.status === "failed")) return "failed";
  return withOutcome.length === contracts.length ? "success" : "pending";
}
