import { Router } from "express";
import { getDB } from "../db.js";
import { mislaka } from "../mislaka/index.js";
import { config } from "../config.js";

export const metaRouter = Router();

/** GET /api/manufacturers — insurance companies list (for the product form). */
metaRouter.get("/manufacturers", async (_req, res) => {
  try {
    res.json(await mislaka.getManufacturers());
  } catch (err) {
    res.status(502).json({ error: "failed", detail: String(err) });
  }
});

/** GET /api/webhooks/logs — recent webhook deliveries (audit / debugging). */
metaRouter.get("/webhooks/logs", async (_req, res) => {
  const db = await getDB();
  res.json(db.webhookLogs.slice(0, 50));
});

/** GET /api/health — status + which Mislaka mode is active. */
metaRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    mislakaMode: config.mislaka.mode,
    hasToken: Boolean(config.mislaka.token),
  });
});
