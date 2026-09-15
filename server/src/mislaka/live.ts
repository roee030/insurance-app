import { config } from "../config.js";
import type { Manufacturer, MislakaClient } from "./client.js";

/**
 * Live client — talks to the real Nobel Digital / Swiftness endpoint.
 * Every request carries the `token` header and JSON content types, exactly
 * as the docs at docs.mislaka-api.co.il specify.
 */
export class LiveMislakaClient implements MislakaClient {
  private base = config.mislaka.baseUrl;

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (!config.mislaka.token) {
      throw new Error(
        "MISLAKA_TOKEN is empty — cannot call the live API. Set MISLAKA_MODE=mock for local dev.",
      );
    }
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: {
        token: config.mislaka.token,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Mislaka ${method} ${path} → ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }

  async getManufacturers(): Promise<Manufacturer[]> {
    const r = await this.request<{ manufacturers: Manufacturer[] }>(
      "GET",
      "/manufacturers/list/",
    );
    return r.manufacturers ?? [];
  }
}
