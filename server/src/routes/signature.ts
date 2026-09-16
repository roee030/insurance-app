import { Router } from "express";
import { z } from "zod";
import { getDB, updateDB } from "../db.js";
import { setStage } from "../mislaka/mapping.js";
import type { Client, Contract, Submission } from "../types.js";

export const signatureRouter = Router();

const AGENCY_NAME = process.env.AGENCY_NAME ?? "תורגמן סוכנות לביטוח";
const AGENT_NAME = process.env.AGENT_NAME ?? "יואל תורגמן";

/**
 * Submits ONE contract's signed deal to the target insurance company(ies).
 * NOT a real integration yet — sending the actual 1700/ניוד request to
 * Swiftness is tracked in docs/mislaka-api-integration-plan.md. This still
 * performs one real, meaningful check: a contract with no product actions
 * has nothing to send, which is a genuine failure, not a simulated one.
 */
function submitContract(productActionCount: number): Submission {
  const at = new Date().toISOString();
  if (productActionCount === 0) {
    return { status: "failed", at, note: "לא נבחרו מוצרים לשליחה — אין מה לשלוח לחברה" };
  }
  return { status: "success", at };
}

function findByToken(client: Client, token: string): Contract | undefined {
  return client.contracts?.find((c) => c.token === token);
}

function publicView(client: Client, contract: Contract) {
  const ids = new Set(contract.productActionIds);
  return {
    clientName: `${client.firstName} ${client.lastName}`,
    personId: client.personId,
    agencyName: AGENCY_NAME,
    agentName: AGENT_NAME,
    label: contract.label,
    productActions: (client.productActions ?? []).filter((a) => ids.has(a.id)),
    sentAt: contract.sentAt,
    signedAt: contract.signedAt ?? null,
    signerName: contract.signerName ?? null,
  };
}

/** GET /api/sign/:token — public: what the client sees before signing THIS contract. */
signatureRouter.get("/sign/:token", async (req, res) => {
  const db = await getDB();
  for (const client of db.clients) {
    const contract = findByToken(client, req.params.token);
    if (contract) return res.json(publicView(client, contract));
  }
  res.status(404).json({ error: "not found" });
});

const signSchema = z.object({ signerName: z.string().min(2) });

/** POST /api/sign/:token — the client signs this one contract; its actions are sent to the company. */
signatureRouter.post("/sign/:token", async (req, res) => {
  const parsed = signSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: "invalid", issues: parsed.error.issues });
  }
  const result = await updateDB((db) => {
    for (const client of db.clients) {
      const contract = findByToken(client, req.params.token);
      if (!contract) continue;
      if (contract.signedAt) return { client, contract }; // idempotent

      contract.signedAt = new Date().toISOString();
      contract.signerName = parsed.data.signerName;
      // The 3 actions that fire the moment the client signs THIS contract:
      // (1) attempt submission to the company + record success/failure,
      // (2) that outcome IS the "sent to company" record for this contract,
      // (3) once every contract on the client is signed — close the record.
      contract.submission = submitContract(contract.productActionIds.length);

      const allSigned = (client.contracts ?? []).every((c) => c.signedAt);
      if (allSigned && client.stage === "signature") {
        const anyFailed = (client.contracts ?? []).some(
          (c) => c.submission?.status === "failed",
        );
        const note = anyFailed
          ? "הלקוח חתם על כל החוזים — חלק מהשליחות לחברה נכשלו"
          : "הלקוח חתם על כל החוזים — נשלח לחברה בהצלחה";
        setStage(client, "submitted", note);
      }
      return { client, contract };
    }
    return null;
  });
  if (!result) return res.status(404).json({ error: "not found" });
  res.json(publicView(result.client, result.contract));
});
