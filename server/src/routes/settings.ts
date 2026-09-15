import { Router } from "express";
import { z } from "zod";
import { getDB, updateDB } from "../db.js";

export const settingsRouter = Router();

/** GET /api/settings — the single agent's settings record. */
settingsRouter.get("/settings", async (_req, res) => {
  const db = await getDB();
  res.json(db.settings);
});

const agentProfileSchema = z.object({
  agentName: z.string().optional(),
  agencyName: z.string().optional(),
  licenseNumber: z.string().optional(),
  bio: z.string().optional(),
  logoUrl: z.string().optional(),
});

/** PUT /api/settings/agent-profile — merge agent profile fields. */
settingsRouter.put("/settings/agent-profile", async (req, res) => {
  const parsed = agentProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: "invalid", issues: parsed.error.issues });
  }
  const settings = await updateDB((db) => {
    db.settings.agentProfile = { ...db.settings.agentProfile, ...parsed.data };
    return db.settings;
  });
  res.json(settings);
});

const answerBankSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  text: z.string().min(1),
  productType: z.string().optional(),
  company: z.string().optional(),
});

/** POST /api/settings/answer-bank — upsert one snippet. */
settingsRouter.post("/settings/answer-bank", async (req, res) => {
  const parsed = answerBankSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: "invalid", issues: parsed.error.issues });
  }
  const settings = await updateDB((db) => {
    const list = db.settings.answerBank;
    const idx = list.findIndex((e) => e.id === parsed.data.id);
    if (idx >= 0) list[idx] = parsed.data;
    else list.push(parsed.data);
    return db.settings;
  });
  res.json(settings);
});

settingsRouter.delete("/settings/answer-bank/:id", async (req, res) => {
  const settings = await updateDB((db) => {
    db.settings.answerBank = db.settings.answerBank.filter((e) => e.id !== req.params.id);
    return db.settings;
  });
  res.json(settings);
});

const discountTierSchema = z.object({
  id: z.string().min(1),
  fromMonth: z.number().min(0),
  toMonth: z.number().min(0).optional(),
  percent: z.number(),
});

const discountSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  scope: z.enum(["personal", "system"]),
  productType: z.string().optional(),
  company: z.string().optional(),
  tiers: z.array(discountTierSchema),
  note: z.string().optional(),
});

/** POST /api/settings/discounts — upsert one discount. */
settingsRouter.post("/settings/discounts", async (req, res) => {
  const parsed = discountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: "invalid", issues: parsed.error.issues });
  }
  const settings = await updateDB((db) => {
    const list = db.settings.discounts;
    const idx = list.findIndex((e) => e.id === parsed.data.id);
    if (idx >= 0) list[idx] = parsed.data;
    else list.push(parsed.data);
    return db.settings;
  });
  res.json(settings);
});

settingsRouter.delete("/settings/discounts/:id", async (req, res) => {
  const settings = await updateDB((db) => {
    db.settings.discounts = db.settings.discounts.filter((e) => e.id !== req.params.id);
    return db.settings;
  });
  res.json(settings);
});

const manufacturerSchema = z.object({
  id: z.string().min(1),
  company: z.string().min(1),
  branch: z.string().min(1),
  commissionPercent: z.number().min(0).max(100),
});

/** POST /api/settings/manufacturers — upsert one primary-manufacturer disclosure row. */
settingsRouter.post("/settings/manufacturers", async (req, res) => {
  const parsed = manufacturerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: "invalid", issues: parsed.error.issues });
  }
  const settings = await updateDB((db) => {
    const list = db.settings.manufacturers;
    const idx = list.findIndex((e) => e.id === parsed.data.id);
    if (idx >= 0) list[idx] = parsed.data;
    else list.push(parsed.data);
    return db.settings;
  });
  res.json(settings);
});

settingsRouter.delete("/settings/manufacturers/:id", async (req, res) => {
  const settings = await updateDB((db) => {
    db.settings.manufacturers = db.settings.manufacturers.filter(
      (e) => e.id !== req.params.id,
    );
    return db.settings;
  });
  res.json(settings);
});
