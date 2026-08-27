import { config } from "../config.js";
import type { PolisaSummary } from "../types.js";
import type {
  CreateLeadPageInput,
  CreateLeadPageResult,
  Manufacturer,
  MislakaClient,
  SendFormInput,
  TransactionStatus,
} from "./client.js";

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

  async createLeadPage(
    input: CreateLeadPageInput,
  ): Promise<CreateLeadPageResult> {
    const res = await this.request<{ transactionId?: string; url?: string }>(
      "POST",
      "/leads-page/create",
      {
        firstName: input.firstName,
        lastName: input.lastName,
        personId: input.personId,
        mobile: input.mobile,
        email: input.email,
        send9100Process: input.send9100Process ?? true,
        sendHarbProcess: input.sendHarbProcess ?? false,
        sendPolisotProcess: input.sendPolisotProcess ?? false,
        inform: input.inform ?? true,
        webhookUrl: input.webhookUrl,
        senderId: input.senderId ?? config.mislaka.senderId,
      },
    );
    return {
      transactionId: res.transactionId ?? crypto.randomUUID(),
      leadPageUrl: res.url,
    };
  }

  async sendForm(input: SendFormInput): Promise<{ formId: string }> {
    return this.request("POST", "/forms", {
      sender_id: input.senderId,
      type: input.type,
      first_name: input.firstName,
      last_name: input.lastName,
      person_id_number: input.personId,
      mobile: input.mobile,
      email: input.email,
      send_type: input.sendType,
      send_9100_when_signed: input.send9100WhenSigned ?? true,
    });
  }

  async getTransaction(transactionId: string): Promise<TransactionStatus> {
    const r = await this.request<{
      transaction_id: string;
      mislaka_number?: string;
      status: string;
      action_code: string;
      person_id_number: string;
    }>("GET", `/transaction/${transactionId}`);
    return {
      transactionId: r.transaction_id,
      mislakaNumber: r.mislaka_number,
      status: r.status,
      actionCode: r.action_code,
      personId: r.person_id_number,
    };
  }

  async getPolisot(transactionId: string): Promise<PolisaSummary[]> {
    const r = await this.request<{ polisot: PolisaSummary[] }>(
      "GET",
      `/transaction/${transactionId}/polisot/`,
    );
    return r.polisot ?? [];
  }

  async getPolisotData(transactionId: string): Promise<unknown> {
    return this.request("GET", `/transaction/${transactionId}/polisot/data`);
  }

  async getManufacturers(): Promise<Manufacturer[]> {
    const r = await this.request<{ manufacturers: Manufacturer[] }>(
      "GET",
      "/manufacturers/list/",
    );
    return r.manufacturers ?? [];
  }
}
