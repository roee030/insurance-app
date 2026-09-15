import type { PolisaSummary } from "../types.js";
import type { Manufacturer, MislakaClient } from "./client.js";

export const MANUFACTURERS: Manufacturer[] = [
  { name: "מגדל מקפת קרנות פנסיה וגמל בע\"מ", manager_id: 512237744, handler: 512237744 },
  { name: "הראל פנסיה וגמל בע\"מ", manager_id: 513026484, handler: 513026484 },
  { name: "כלל פנסיה וגמל בע\"מ", manager_id: 513973156, handler: 513973156 },
  { name: "הפניקס פנסיה וגמל בע\"מ", manager_id: 520023185, handler: 520023185 },
  { name: "מנורה מבטחים פנסיה וגמל בע\"מ", manager_id: 512245812, handler: 512790221 },
  { name: "אלטשולר שחם גמל ופנסיה בע\"מ", manager_id: 513173393, handler: 513173393 },
];

/** Deterministic sample policy set — used for the mock manufacturers list and the "sample file" download that helps agents see the expected upload format. */
export function fakePolisot(personId: string): PolisaSummary[] {
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

/** Mock client — local manufacturers list, no credentials, no cost. */
export class MockMislakaClient implements MislakaClient {
  async getManufacturers(): Promise<Manufacturer[]> {
    return MANUFACTURERS;
  }
}
