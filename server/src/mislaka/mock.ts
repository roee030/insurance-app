import { config, webhookUrl } from "../config.js";
import type { PolisaSummary } from "../types.js";
import type {
  CreateLeadPageInput,
  CreateLeadPageResult,
  Manufacturer,
  MislakaClient,
  SendFormInput,
  TransactionStatus,
} from "./client.js";

interface MockTx {
  transactionId: string;
  personId: string;
  actionCode: string;
  polisot: PolisaSummary[];
}

const MANUFACTURERS: Manufacturer[] = [
  { name: "מגדל מקפת קרנות פנסיה וגמל בע\"מ", manager_id: 512237744, handler: 512237744 },
  { name: "הראל פנסיה וגמל בע\"מ", manager_id: 513026484, handler: 513026484 },
  { name: "כלל פנסיה וגמל בע\"מ", manager_id: 513973156, handler: 513973156 },
  { name: "הפניקס פנסיה וגמל בע\"מ", manager_id: 520023185, handler: 520023185 },
  { name: "מנורה מבטחים פנסיה וגמל בע\"מ", manager_id: 512245812, handler: 512790221 },
  { name: "אלטשולר שחם גמל ופנסיה בע\"מ", manager_id: 513173393, handler: 513173393 },
];

function fakePolisot(personId: string): PolisaSummary[] {
  // deterministic-ish set derived from the id so repeat calls are stable
  const seed = Number(personId.slice(-1)) || 3;
  const pool: PolisaSummary[] = [
    {
      manufacturer: "הראל",
      product_type: "פנסיה מקיפה",
      polisa_number: "PH-" + personId.slice(0, 6),
      polisa_name: "הראל פנסיה מקיפה",
      polisa_status: "active",
      balance: 120000 + seed * 9000,
      track: "מסלול מותאם לגיל עד 50",
      feeAccumulation: 0.3 + (seed % 3) * 0.05,
      feeDeposit: 2 + (seed % 4) * 0.25,
    },
    {
      manufacturer: "מגדל",
      product_type: "ביטוח מנהלים",
      polisa_number: "MG-" + personId.slice(2, 8),
      polisa_name: "מגדל לעצמאים",
      polisa_status: "active",
      balance: 55000 + seed * 4000,
      track: "מסלול כללי",
      feeAccumulation: 0.8 + (seed % 3) * 0.1,
      feeDeposit: 3 + (seed % 3) * 0.3,
    },
    {
      manufacturer: "כלל",
      product_type: "קרן השתלמות",
      polisa_number: "CL-" + personId.slice(1, 7),
      polisa_name: "כלל השתלמות",
      polisa_status: seed % 2 ? "active" : "frozen",
      balance: 32000 + seed * 2500,
      track: "מסלול מנייתי",
      feeAccumulation: 0.6 + (seed % 2) * 0.15,
      feeDeposit: 0,
    },
  ];
  return pool.slice(0, 2 + (seed % 2));
}

/**
 * Mock client — a fully local simulator of the Mislaka. No credentials, no
 * cost. It mimics the real async flow: createLeadPage returns immediately,
 * then after a delay it POSTs a "finished" webhook back to our own server,
 * exactly like the production callback would.
 */
export class MockMislakaClient implements MislakaClient {
  private txs = new Map<string, MockTx>();

  async createLeadPage(
    input: CreateLeadPageInput,
  ): Promise<CreateLeadPageResult> {
    const transactionId = "mock-" + crypto.randomUUID();
    const tx: MockTx = {
      transactionId,
      personId: input.personId,
      actionCode: input.send9100Process ? "9100" : "harBituach",
      polisot: fakePolisot(input.personId),
    };
    this.txs.set(transactionId, tx);

    const target = input.webhookUrl || webhookUrl;
    // Fire the webhook asynchronously, simulating the client signing + Mislaka
    // processing time. Never block the create call on this.
    setTimeout(() => {
      void this.fireWebhook(target, tx);
    }, config.mock.webhookDelayMs);

    return {
      transactionId,
      leadPageUrl: `https://mock.mislaka-api.co.il/lead/${transactionId}`,
    };
  }

  private async fireWebhook(target: string, tx: MockTx): Promise<void> {
    try {
      await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: tx.transactionId,
          mislaka_number: "MSL-" + tx.transactionId.slice(5, 13),
          status: "finished",
          action_code: tx.actionCode,
          person_id_number: tx.personId,
        }),
      });
      console.log(`[mock] webhook fired → ${target} (${tx.transactionId})`);
    } catch (err) {
      console.error("[mock] webhook failed:", err);
    }
  }

  async sendForm(_input: SendFormInput): Promise<{ formId: string }> {
    return { formId: "mock-form-" + crypto.randomUUID() };
  }

  async getTransaction(transactionId: string): Promise<TransactionStatus> {
    const tx = this.txs.get(transactionId);
    return {
      transactionId,
      mislakaNumber: "MSL-" + transactionId.slice(5, 13),
      status: "finished",
      actionCode: tx?.actionCode ?? "9100",
      personId: tx?.personId ?? "",
    };
  }

  async getPolisot(transactionId: string): Promise<PolisaSummary[]> {
    return this.txs.get(transactionId)?.polisot ?? fakePolisot("000000003");
  }

  async getPolisotData(transactionId: string): Promise<unknown> {
    return {
      transaction_id: transactionId,
      status: "finished",
      polisot: this.getPolisot(transactionId),
    };
  }

  async getManufacturers(): Promise<Manufacturer[]> {
    return MANUFACTURERS;
  }
}
