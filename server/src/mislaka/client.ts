export interface Manufacturer {
  name: string;
  manager_id: number;
  handler: number;
}

/**
 * Unified contract implemented by both the live and mock clients.
 * Client onboarding no longer goes through the Mislaka's own SMS/webhook
 * flow (see docs/mislaka-api-integration-plan.md) — the agent uploads a
 * Mislaka export file directly instead. What's left here is what the app
 * still genuinely calls: the manufacturers list for the ניוד/פוליסה dropdowns.
 * Extend this when 1700 (ניוד) / formA (signature) integration is built.
 */
export interface MislakaClient {
  getManufacturers(): Promise<Manufacturer[]>;
}
