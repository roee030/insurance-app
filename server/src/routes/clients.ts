import { Router } from "express";
import { z } from "zod";
import { config, webhookUrl } from "../config.js";
import { getDB, updateDB } from "../db.js";
import { mislaka } from "../mislaka/index.js";
import { setStage, stageEvent } from "../mislaka/mapping.js";
import type { Client } from "../types.js";

export const clientsRouter = Router();

/** GET /api/clients — list all, newest first. */
clientsRouter.get("/", async (_req, res) => {
  const db = await getDB();
  res.json(db.clients);
});

/** GET /api/clients/:id */
clientsRouter.get("/:id", async (req, res) => {
  const db = await getDB();
  const client = db.clients.find((c) => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: "not found" });
  res.json(client);
});

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  personId: z.string().regex(/^\d{9}$/, "ת.ז חייבת 9 ספרות"),
  mobile: z.string().min(9),
  email: z.string().email().optional(),
});

/**
 * POST /api/clients
 * Creates the client AND sends the SMS with the personal Mislaka link.
 * This is stage ① → ② in one action.
 */
clientsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: "invalid", issues: parsed.error.issues });
  }
  const input = parsed.data;
  const now = new Date().toISOString();

  // 1. call Mislaka: create the personal lead page + inform by SMS
  let transactionId: string | undefined;
  let leadPageUrl: string | undefined;
  try {
    const r = await mislaka.createLeadPage({
      firstName: input.firstName,
      lastName: input.lastName,
      personId: input.personId,
      mobile: input.mobile,
      email: input.email,
      send9100Process: true,
      inform: true,
      webhookUrl,
      senderId: config.mislaka.senderId,
    });
    transactionId = r.transactionId;
    leadPageUrl = r.leadPageUrl;
  } catch (err) {
    console.error("[clients] createLeadPage failed:", err);
    return res.status(502).json({ error: "mislaka_send_failed", detail: String(err) });
  }

  // 2. persist the client at stage sms_sent
  const client: Client = {
    id: crypto.randomUUID(),
    firstName: input.firstName,
    lastName: input.lastName,
    personId: input.personId,
    mobile: input.mobile,
    email: input.email,
    stage: "lead",
    history: [stageEvent("lead")],
    transactionId,
    leadPageUrl,
    createdAt: now,
    updatedAt: now,
  };
  setStage(client, "sms_sent", "נשלח SMS עם קישור אישי למסלקה");

  await updateDB((db) => db.clients.unshift(client));
  res.status(201).json(client);
});

const productActionSchema = z.object({
  id: z.string().min(1),
  productType: z.string().min(1),
  kind: z.enum(["transfer", "new"]),
  sourceCompany: z.string().optional(),
  sourcePolisaNumber: z.string().optional(),
  sourceBalance: z.number().optional(),
  targetCompany: z.string().min(1),
  targetTrack: z.string().min(1),
  monthlyPremium: z.number().optional(),
  note: z.string().optional(),
});

/**
 * POST /api/clients/:id/product-actions — upsert ONE per-product decision
 * (ניוד קיים / פתיחת חדש). The frontend generates the id client-side (tied
 * to the source polisa number for transfers) so repeated saves while the
 * agent edits a card just replace that one entry.
 */
clientsRouter.post("/:id/product-actions", async (req, res) => {
  const parsed = productActionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: "invalid", issues: parsed.error.issues });
  }
  const updated = await updateDB((db) => {
    const client = db.clients.find((c) => c.id === req.params.id);
    if (!client) return null;
    const actions = client.productActions ?? [];
    const idx = actions.findIndex((a) => a.id === parsed.data.id);
    const action = { ...parsed.data, createdAt: new Date().toISOString() };
    if (idx >= 0) actions[idx] = { ...actions[idx], ...action };
    else actions.push(action);
    client.productActions = actions;
    client.updatedAt = new Date().toISOString();
    return client;
  });
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(updated);
});

/** DELETE /api/clients/:id/product-actions/:actionId — remove one decision. */
clientsRouter.delete("/:id/product-actions/:actionId", async (req, res) => {
  const updated = await updateDB((db) => {
    const client = db.clients.find((c) => c.id === req.params.id);
    if (!client) return null;
    client.productActions = (client.productActions ?? []).filter(
      (a) => a.id !== req.params.actionId,
    );
    client.updatedAt = new Date().toISOString();
    return client;
  });
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(updated);
});

const needsSchema = z.object({
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional(),
  employer: z.string().optional(),
  savingsGoal: z.string().optional(),
  timeHorizon: z.string().optional(),
  riskLevel: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]).optional(),
  justification: z.string().optional(),
});

/** POST /api/clients/:id/needs-assessment — save/merge needs-assessment data. */
clientsRouter.post("/:id/needs-assessment", async (req, res) => {
  const parsed = needsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: "invalid", issues: parsed.error.issues });
  }
  const updated = await updateDB((db) => {
    const client = db.clients.find((c) => c.id === req.params.id);
    if (!client) return null;
    client.needsAssessment = {
      ...client.needsAssessment,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };
    client.updatedAt = new Date().toISOString();
    return client;
  });
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(updated);
});

/** POST /api/clients/:id/advance — move one stage forward manually. */
clientsRouter.post("/:id/advance", async (req, res) => {
  const note = typeof req.body?.note === "string" ? req.body.note : undefined;
  const STAGE_NEXT: Record<Client["stage"], Client["stage"] | null> = {
    lead: "sms_sent",
    sms_sent: "authorized",
    authorized: "signature", // policy stage removed — go straight to signature
    policy: "signature",
    signature: "submitted",
    submitted: null,
  };
  const updated = await updateDB((db) => {
    const client = db.clients.find((c) => c.id === req.params.id);
    if (!client) return null;
    const next = STAGE_NEXT[client.stage];
    if (next) setStage(client, next, note);
    // Entering the signature stage generates a personal online-signing link.
    if (next === "signature" && !client.signRequest) {
      client.signRequest = {
        token: crypto.randomUUID().replace(/-/g, "").slice(0, 14),
        sentAt: new Date().toISOString(),
      };
    }
    return client;
  });
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(updated);
});

/** POST /api/clients/:id/simulate-approval — dev helper (mock mode only). */
clientsRouter.post("/:id/simulate-approval", async (req, res) => {
  if (config.mislaka.mode !== "mock") {
    return res.status(400).json({ error: "only available in mock mode" });
  }
  const db = await getDB();
  const client = db.clients.find((c) => c.id === req.params.id);
  if (!client?.transactionId) return res.status(404).json({ error: "not found" });

  // manually trigger the same webhook the mock would fire
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transaction_id: client.transactionId,
      status: "finished",
      action_code: "9100",
      person_id_number: client.personId,
    }),
  });
  res.json({ ok: true });
});
