import { Router } from "express";
import { z } from "zod";
import { getDB, updateDB } from "../db.js";
import type { SignDocument } from "../types.js";

export const documentsRouter = Router();

/** Never expose the raw base64 PDF bytes on list views — only the single-document agent view and the create response need it. */
function toListItem(d: SignDocument) {
  const { fileContent: _fileContent, ...rest } = d;
  return rest;
}

/** GET /api/documents — agent-side list (no PDF bytes). */
documentsRouter.get("/documents", async (_req, res) => {
  const db = await getDB();
  res.json(db.documents.map(toListItem));
});

/** GET /api/documents/:id — agent-side single doc, including PDF bytes (for re-download/preview). */
documentsRouter.get("/documents/:id", async (req, res) => {
  const db = await getDB();
  const doc = db.documents.find((d) => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: "not found" });
  res.json(doc);
});

const createSchema = z.object({
  title: z.string().min(1),
  fileName: z.string().min(1),
  fileContent: z.string().min(1),
  clientId: z.string().optional(),
});

/** POST /api/documents — upload a new PDF, empty field list to start. */
documentsRouter.post("/documents", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: "invalid", issues: parsed.error.issues });
  }
  const doc: SignDocument = {
    id: crypto.randomUUID(),
    title: parsed.data.title,
    fileName: parsed.data.fileName,
    fileContent: parsed.data.fileContent,
    fields: [],
    clientId: parsed.data.clientId,
    token: crypto.randomUUID().replace(/-/g, "").slice(0, 14),
    createdAt: new Date().toISOString(),
  };
  await updateDB((db) => db.documents.unshift(doc));
  res.status(201).json(toListItem(doc));
});

const fieldSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["signature", "text", "checkbox"]),
  label: z.string().min(1),
  source: z.enum(["manual", "client_name", "client_id", "agent_name", "date"]),
  required: z.boolean(),
});

/** PUT /api/documents/:id/fields — replace the full field list. */
documentsRouter.put("/documents/:id/fields", async (req, res) => {
  const parsed = z.array(fieldSchema).safeParse(req.body?.fields);
  if (!parsed.success) {
    return res.status(422).json({ error: "invalid", issues: parsed.error.issues });
  }
  const updated = await updateDB((db) => {
    const doc = db.documents.find((d) => d.id === req.params.id);
    if (!doc) return null;
    doc.fields = parsed.data;
    return doc;
  });
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(toListItem(updated));
});

/** POST /api/documents/:id/send — mark ready, the token link can now be shared. */
documentsRouter.post("/documents/:id/send", async (req, res) => {
  const updated = await updateDB((db) => {
    const doc = db.documents.find((d) => d.id === req.params.id);
    if (!doc) return null;
    doc.sentAt = new Date().toISOString();
    return doc;
  });
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(toListItem(updated));
});

documentsRouter.delete("/documents/:id", async (req, res) => {
  await updateDB((db) => {
    db.documents = db.documents.filter((d) => d.id !== req.params.id);
  });
  res.status(204).end();
});

/** GET /api/docsign/:token — public: what the client sees (no PDF bytes yet — see types.ts note on what's deferred). */
documentsRouter.get("/docsign/:token", async (req, res) => {
  const db = await getDB();
  const doc = db.documents.find((d) => d.token === req.params.token);
  if (!doc) return res.status(404).json({ error: "not found" });
  const { fileContent: _fileContent, clientId: _clientId, ...view } = doc;
  res.json(view);
});

const submitSchema = z.object({
  values: z.record(z.string(), z.union([z.string(), z.boolean()])),
  signerName: z.string().min(2),
});

/** POST /api/docsign/:token — public: client submits filled values. */
documentsRouter.post("/docsign/:token", async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: "invalid", issues: parsed.error.issues });
  }
  const updated = await updateDB((db) => {
    const doc = db.documents.find((d) => d.token === req.params.token);
    if (!doc) return null;
    if (!doc.completedAt) {
      doc.values = parsed.data.values;
      doc.signerName = parsed.data.signerName;
      doc.completedAt = new Date().toISOString();
    }
    return doc;
  });
  if (!updated) return res.status(404).json({ error: "not found" });
  const { fileContent: _fileContent, clientId: _clientId, ...view } = updated;
  res.json(view);
});
