import { Router } from "express";
import { z } from "zod";
import { getDB, updateDB } from "../db.js";
import { setStage, stageEvent } from "../mislaka/mapping.js";
import { parseMislakaExport, MislakaExportParseError } from "../mislaka/parseMislakaExport.js";
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
  /** Raw text content of the מסלקה export file the agent uploaded. */
  mislakaFileContent: z.string().min(1, "יש לצרף קובץ מסלקה"),
});

/**
 * POST /api/clients
 * Creates the client from an agent-uploaded Mislaka export — no SMS, no
 * waiting: the file IS the data, so the client starts directly at
 * "authorized" with mislaka already populated.
 */
clientsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: "invalid", issues: parsed.error.issues });
  }
  const input = parsed.data;

  let parsedFile;
  try {
    parsedFile = parseMislakaExport(input.mislakaFileContent);
  } catch (err) {
    const message =
      err instanceof MislakaExportParseError ? err.message : "שגיאה בקריאת הקובץ";
    return res.status(422).json({ error: "invalid_mislaka_file", detail: message });
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
    history: [stageEvent("authorized", "נתוני מסלקה נטענו מקובץ")],
    mislaka: {
      transactionId: parsedFile.transactionId ?? crypto.randomUUID(),
      mislakaNumber: parsedFile.mislakaNumber,
      actionCode: "file_upload",
      receivedAt: now,
      polisot: parsedFile.polisot,
      raw: parsedFile.raw,
    },
    createdAt: now,
    updatedAt: now,
  };

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

/**
 * POST /api/clients/:id/advance — move one stage forward manually.
 * authorized → signature generates the client's online-signing link;
 * signature → submitted is normally driven by the client actually signing
 * (see routes/signature.ts), this is the agent-side manual fallback.
 */
const STAGE_NEXT: Partial<Record<Client["stage"], Client["stage"]>> = {
  authorized: "signature",
  signature: "submitted",
};

clientsRouter.post("/:id/advance", async (req, res) => {
  const note = typeof req.body?.note === "string" ? req.body.note : undefined;
  const updated = await updateDB((db) => {
    const client = db.clients.find((c) => c.id === req.params.id);
    if (!client) return null;
    const next = STAGE_NEXT[client.stage];
    if (next) setStage(client, next, note);
    if (next === "signature" && !client.signRequest) {
      client.signRequest = {
        token: crypto.randomUUID().replace(/-/g, "").slice(0, 14),
        sentAt: new Date().toISOString(),
      };
    }
    if (next === "submitted" && !client.submission) {
      client.submission = { status: "success", at: new Date().toISOString() };
    }
    return client;
  });
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(updated);
});
