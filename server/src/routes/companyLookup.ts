import { Router } from "express";

export const companyLookupRouter = Router();

/**
 * Proxies the Israeli Registrar of Companies open-data set (רשם החברות,
 * data.gov.il/dataset/ica_companies) so the employer field can autocomplete
 * against real registered company names instead of free text. Proxied
 * server-side because data.gov.il's API sends no CORS headers, and because
 * the resource_id shouldn't need to be duplicated in demo-mode/browser code.
 *
 * Note: data.gov.il's CKAN instance 404s (WAF) on any request containing a
 * `filters` query param, so status filtering (active-only) happens here in
 * JS after the fetch rather than via the API's own filters param.
 */
const RESOURCE_ID = "f004176c-b85f-4542-8901-7b3176f9a054";
const API_URL = "https://data.gov.il/api/3/action/datastore_search";

interface CkanRecord {
  "שם חברה"?: string;
  "מספר חברה"?: number;
  "סטטוס חברה"?: string;
  "שם עיר"?: string;
}

companyLookupRouter.get("/company-lookup", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) return res.json([]);

  try {
    const url = new URL(API_URL);
    url.searchParams.set("resource_id", RESOURCE_ID);
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "20");

    const upstream = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!upstream.ok) return res.json([]);
    const data = (await upstream.json()) as { result?: { records?: CkanRecord[] } };
    const records = data.result?.records ?? [];

    const results = records
      .filter((r) => r["סטטוס חברה"] === "פעילה" && r["שם חברה"])
      .slice(0, 8)
      .map((r) => ({
        name: r["שם חברה"],
        number: r["מספר חברה"],
        city: r["שם עיר"] || undefined,
      }));

    res.json(results);
  } catch {
    // Upstream hiccup or timeout — degrade to no suggestions, not an error;
    // the field stays usable as plain free text either way.
    res.json([]);
  }
});
