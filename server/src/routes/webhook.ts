import { Router } from "express";
import { z } from "zod";
import { updateDB } from "../db.js";
import { mislaka } from "../mislaka/index.js";
import { setStage } from "../mislaka/mapping.js";
import type { Client, MislakaResult, WebhookLog } from "../types.js";

export const webhookRouter = Router();

const payloadSchema = z.object({
  transaction_id: z.string(),
  mislaka_number: z.string().optional(),
  status: z.string(),
  action_code: z.union([z.string(), z.number()]).optional(),
  person_id_number: z.string().optional(),
});

/**
 * POST /api/webhooks/mislaka
 * Called by the Mislaka when a transaction finishes/fails.
 * CRITICAL: Mislaka deletes the data after 7 days, so on "finished" we
 * immediately pull the policies and persist them on our side.
 */
webhookRouter.post("/mislaka", async (req, res) => {
  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: "invalid payload", issues: parsed.error.issues });
  }
  const p = parsed.data;

  // Fetch the data OUTSIDE the db mutation (network call), only if finished.
  let result: MislakaResult | null = null;
  if (p.status.toLowerCase() === "finished") {
    try {
      const [polisot, raw] = await Promise.all([
        mislaka.getPolisot(p.transaction_id),
        mislaka.getPolisotData(p.transaction_id),
      ]);
      result = {
        transactionId: p.transaction_id,
        mislakaNumber: p.mislaka_number,
        actionCode: String(p.action_code ?? "9100"),
        receivedAt: new Date().toISOString(),
        polisot,
        raw,
      };
    } catch (err) {
      console.error("[webhook] failed to pull polisot:", err);
    }
  }

  await updateDB((db) => {
    const log: WebhookLog = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      transactionId: p.transaction_id,
      personId: p.person_id_number,
      status: p.status,
      raw: p,
    };

    const client: Client | undefined =
      db.clients.find((c) => c.transactionId === p.transaction_id) ??
      db.clients.find((c) => c.personId === p.person_id_number);

    if (client) {
      log.matchedClientId = client.id;
      if (result) {
        client.mislaka = result;
        setStage(client, "authorized", "התקבל אישור מסלקה — נתונים נשמרו");
      } else if (p.status.toLowerCase() === "failed") {
        setStage(client, "sms_sent", "המסלקה החזירה כשל");
      }
    }
    db.webhookLogs.unshift(log);
  });

  // Always 200 fast so Mislaka does not retry unnecessarily.
  return res.json({ ok: true });
});
