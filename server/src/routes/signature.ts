import { Router } from "express";
import { z } from "zod";
import { getDB, updateDB } from "../db.js";
import { setStage } from "../mislaka/mapping.js";
import type { Client, Submission } from "../types.js";

export const signatureRouter = Router();

const AGENCY_NAME = process.env.AGENCY_NAME ?? "תורגמן סוכנות לביטוח";
const AGENT_NAME = process.env.AGENT_NAME ?? "יואל תורגמן";

/**
 * Submits the signed deal to the target insurance company(ies).
 * NOT a real integration yet — sending the actual 1700/ניוד request to
 * Swiftness is tracked in docs/mislaka-api-integration-plan.md. This still
 * performs one real, meaningful check: a deal with no product decisions has
 * nothing to send, which is a genuine failure, not a simulated one.
 */
function submitToInsuranceCompanies(client: Client): Submission {
  const at = new Date().toISOString();
  if (!client.productActions || client.productActions.length === 0) {
    return { status: "failed", at, note: "לא נבחרו מוצרים לשליחה — אין מה לשלוח לחברה" };
  }
  return { status: "success", at };
}

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
    // The 3 actions that fire the moment the client signs:
    // (1) attempt submission to the company + record success/failure,
    // (2) that outcome IS the "sent to company" record,
    // (3) close the record — move to the terminal "submitted" stage.
    client.submission = submitToInsuranceCompanies(client);
    if (client.stage === "signature") {
      const note =
        client.submission.status === "success"
          ? "הלקוח חתם דיגיטלית — נשלח לחברה בהצלחה"
          : `הלקוח חתם דיגיטלית — השליחה לחברה נכשלה: ${client.submission.note}`;
      setStage(client, "submitted", note);
    }
    return client;
  });
  if (!result) return res.status(404).json({ error: "not found" });
  res.json(publicView(result));
});
