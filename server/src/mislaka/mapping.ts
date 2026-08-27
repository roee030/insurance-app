import type { Client, StageEvent, StageId } from "../types.js";

export const STAGE_ORDER: StageId[] = [
  "lead",
  "sms_sent",
  "authorized",
  "policy",
  "signature",
  "submitted",
];

export function stageEvent(stage: StageId, note?: string): StageEvent {
  return { id: crypto.randomUUID(), stage, at: new Date().toISOString(), note };
}

/** Move a client to a specific stage (idempotent — no-op if already there). */
export function setStage(client: Client, stage: StageId, note?: string): void {
  if (client.stage === stage) return;
  client.stage = stage;
  client.history.push(stageEvent(stage, note));
  client.updatedAt = new Date().toISOString();
}
