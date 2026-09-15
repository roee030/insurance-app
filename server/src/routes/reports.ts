import { Router } from "express";
import { getDB, updateDB } from "../db.js";
import type { Client, PolisaSummary, Report, ReportSnapshot, Settings } from "../types.js";

export const reportsRouter = Router();

const DEFAULT_AGENT_NAME = process.env.AGENT_NAME ?? "יואל תורגמן";
const DEFAULT_AGENCY_NAME = process.env.AGENCY_NAME ?? "תורגמן סוכנות לביטוח";

/** Disclosure threshold per חוזר הצירוף — commission from one manufacturer exceeding this % of a branch requires disclosure. */
const DISCLOSURE_THRESHOLD_PERCENT = 40;

function weightedAvgFee(holdings: PolisaSummary[]): number {
  const total = holdings.reduce((s, h) => s + (h.balance ?? 0), 0);
  if (total === 0) return 0;
  const weighted = holdings.reduce(
    (s, h) => s + (h.feeAccumulation ?? 0) * (h.balance ?? 0),
    0,
  );
  return Math.round((weighted / total) * 100) / 100;
}

function buildSnapshot(client: Client, settings: Settings): ReportSnapshot {
  const holdings = client.mislaka?.polisot ?? [];
  const accumulation = holdings.reduce((s, h) => s + (h.balance ?? 0), 0);
  return {
    clientName: `${client.firstName} ${client.lastName}`,
    personId: client.personId,
    agentName: settings.agentProfile.agentName || DEFAULT_AGENT_NAME,
    agencyName: settings.agentProfile.agencyName || DEFAULT_AGENCY_NAME,
    agentLicenseNumber: settings.agentProfile.licenseNumber,
    agentBio: settings.agentProfile.bio,
    generatedAt: new Date().toISOString(),
    holdings,
    totals: {
      accumulation,
      productCount: holdings.length,
      avgFeeAccumulation: weightedAvgFee(holdings),
    },
    productActions: client.productActions,
    needsAssessment: client.needsAssessment,
    disclosedManufacturers: settings.manufacturers.filter(
      (m) => m.commissionPercent >= DISCLOSURE_THRESHOLD_PERCENT,
    ),
  };
}

/** POST /api/clients/:id/reports — freeze a new snapshot report. */
reportsRouter.post("/clients/:id/reports", async (req, res) => {
  const result = await updateDB((db) => {
    const client = db.clients.find((c) => c.id === req.params.id);
    if (!client) return null;
    const version = (client.reports?.length ?? 0) + 1;
    const report: Report = {
      id: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
      version,
      createdAt: new Date().toISOString(),
      snapshot: buildSnapshot(client, db.settings),
    };
    client.reports = [report, ...(client.reports ?? [])];
    return report;
  });
  if (!result) return res.status(404).json({ error: "not found" });
  res.status(201).json(result);
});

/** GET /api/reports/:reportId — public fetch for the shareable link. */
reportsRouter.get("/reports/:reportId", async (req, res) => {
  const db = await getDB();
  for (const c of db.clients) {
    const report = c.reports?.find((r) => r.id === req.params.reportId);
    if (report) return res.json(report);
  }
  res.status(404).json({ error: "report not found" });
});
