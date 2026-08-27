import { Router } from "express";
import { z } from "zod";
import { getDB, updateDB } from "../db.js";
import { setStage } from "../mislaka/mapping.js";
import type { Client } from "../types.js";

export const signatureRouter = Router();

const AGENCY_NAME = process.env.AGENCY_NAME ?? "תורגמן סוכנות לביטוח";
const AGENT_NAME = process.env.AGENT_NAME ?? "יואל תורגמן";

function publicView(client: Client) {
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

/** GET /api/sign/:token — public: what the client sees before signing. */
signatureRouter.get("/sign/:token", async (req, res) => {
  const db = await getDB();
  const client = db.clients.find(
    (c) => c.signRequest?.token === req.params.token,
  );
  if (!client) return res.status(404).json({ error: "not found" });
  res.json(publicView(client));
});

const signSchema = z.object({ signerName: z.string().min(2) });

/** POST /api/sign/:token — the client signs; the deal is sent to the company. */
signatureRouter.post("/sign/:token", async (req, res) => {
  const parsed = signSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: "invalid", issues: parsed.error.issues });
  }
  const result = await updateDB((db) => {
    const client = db.clients.find(
      (c) => c.signRequest?.token === req.params.token,
    );
    if (!client || !client.signRequest) return null;
    if (client.signRequest.signedAt) return client; // idempotent
    client.signRequest.signedAt = new Date().toISOString();
    client.signRequest.signerName = parsed.data.signerName;
    if (client.stage === "signature") {
      setStage(client, "submitted", "הלקוח חתם דיגיטלית — נשלח לחברה");
    }
    return client;
  });
  if (!result) return res.status(404).json({ error: "not found" });
  res.json(publicView(result));
});
