import type { PolisaSummary } from "../types.js";

/** Input for creating a personalized lead page + informing the client by SMS. */
export interface CreateLeadPageInput {
  firstName?: string;
  lastName?: string;
  personId: string;
  mobile: string;
  email?: string;
  /** Fire the 9100 pre-advisory info request once the client signs. */
  send9100Process?: boolean;
  sendHarbProcess?: boolean;
  sendPolisotProcess?: boolean;
  inform?: boolean;
  webhookUrl?: string;
  senderId?: string;
}

export interface CreateLeadPageResult {
  transactionId: string;
  leadPageUrl?: string;
}

export interface SendFormInput {
  senderId: string;
  type: "formA" | "harb";
  firstName: string;
  lastName: string;
  personId: string;
  mobile?: string;
  email?: string;
  sendType: "email" | "sms" | "email_sms";
  send9100WhenSigned?: boolean;
}

export interface TransactionStatus {
  transactionId: string;
  mislakaNumber?: string;
  status: string; // "finished" | "failed" | "processing" | ...
  actionCode: string;
  personId: string;
}

export interface Manufacturer {
  name: string;
  manager_id: number;
  handler: number;
}

/** Unified contract implemented by both the live and mock clients. */
export interface MislakaClient {
  createLeadPage(input: CreateLeadPageInput): Promise<CreateLeadPageResult>;
  sendForm(input: SendFormInput): Promise<{ formId: string }>;
  getTransaction(transactionId: string): Promise<TransactionStatus>;
  getPolisot(transactionId: string): Promise<PolisaSummary[]>;
  getPolisotData(transactionId: string): Promise<unknown>;
  getManufacturers(): Promise<Manufacturer[]>;
}
