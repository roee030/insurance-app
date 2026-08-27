/**
 * Server-side domain model. Mirrors the frontend pipeline stages so the two
 * stay in sync, and adds the fields the Mislaka integration needs
 * (transaction ids, raw mislaka payloads, webhook audit trail).
 */

export type StageId =
  | "lead"
  | "sms_sent"
  | "authorized"
  | "policy"
  | "signature"
  | "submitted";

export interface StageEvent {
  id: string;
  stage: StageId;
  at: string;
  note?: string;
}

/** A single policy line as returned by /transaction/{id}/polisot. */
export interface PolisaSummary {
  manufacturer: string;
  product_type: string;
  polisa_number: string;
  polisa_name: string;
  polisa_status: string;
  /** צבירה — accumulated balance in the product. */
  balance?: number;
  /** מסלול השקעה — investment track name. */
  track?: string;
  /** דמי ניהול מצבירה (%). */
  feeAccumulation?: number;
  /** דמי ניהול מהפקדה (%). */
  feeDeposit?: number;
}

export interface MislakaResult {
  transactionId: string;
  mislakaNumber?: string;
  actionCode: string; // "9100" | "harBituach" | ...
  receivedAt: string;
  polisot: PolisaSummary[];
  /** Raw payload we must persist because Mislaka deletes it after 7 days. */
  raw?: unknown;
}

export type MaritalStatus = "single" | "married" | "divorced" | "widowed";

/**
 * The data the agent collects WITH the client after the Mislaka returns —
 * completes what gets "planted" onto the forms + the justification document
 * (מסמך הנמקה). Known fields (name/id/birthdate) come from the Mislaka;
 * these are the ones that must be confirmed/collected live.
 */
export interface NeedsAssessment {
  maritalStatus?: MaritalStatus;
  employer?: string; //        מעסיק
  savingsGoal?: string; //     מטרת החיסכון (פרישה / חיסכון ארוך טווח ...)
  timeHorizon?: string; //     אופק ההשקעה
  riskLevel?: 1 | 2 | 3 | 4 | 5; // רמת סיכון
  justification?: string; //   מלל חופשי / הנמקה
  updatedAt?: string;
}

/** An online-signature request handed to the client via a personal link. */
export interface SignatureRequest {
  token: string; //     used in the public /sign/:token link
  sentAt: string;
  signedAt?: string;
  signerName?: string;
}

export type ProductActionKind = "transfer" | "new";

/**
 * A decision made on ONE product, taken independently for each holding the
 * Mislaka returned (פנסיה / קרן השתלמות / ביטוח בריאות / גמל להשקעה ...).
 * "transfer" moves an existing policy (ניוד) to a new company/track;
 * "new" opens a fresh policy that didn't exist before. Some fields are
 * planted automatically from the Mislaka holding (source*), the rest —
 * the target — is filled/edited by the agent and lands on the signature form.
 */
export interface ProductAction {
  id: string;
  productType: string;
  kind: ProductActionKind;
  /** Populated for "transfer" — the existing holding being moved. */
  sourceCompany?: string;
  sourcePolisaNumber?: string;
  sourceBalance?: number;
  targetCompany: string;
  targetTrack: string;
  monthlyPremium?: number;
  note?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  personId: string; // ת.ז — 9 digits
  mobile: string;
  email?: string;
  birthDate?: string;

  stage: StageId;
  history: StageEvent[];

  /** Transaction currently in flight / completed at the Mislaka. */
  transactionId?: string;
  leadPageUrl?: string;
  mislaka?: MislakaResult;

  needsAssessment?: NeedsAssessment;

  /** Per-product decisions (ניוד / פתיחת פוליסה חדשה), one per holding. */
  productActions?: ProductAction[];

  signRequest?: SignatureRequest;

  /** Frozen client-facing reports generated over time (newest first). */
  reports?: Report[];

  createdAt: string;
  updatedAt: string;
}

/**
 * A report is an immutable, point-in-time snapshot handed to the client.
 * Once created it never changes — even if the client's live data does —
 * because it becomes a regulatory record of what was presented.
 */
export interface ReportSnapshot {
  clientName: string;
  personId: string;
  agentName: string;
  agencyName: string;
  generatedAt: string;
  holdings: PolisaSummary[];
  totals: {
    accumulation: number;
    productCount: number;
    avgFeeAccumulation: number;
  };
  productActions?: ProductAction[];
  needsAssessment?: NeedsAssessment;
}

export interface Report {
  id: string; // shareable id used in the public link
  version: number;
  createdAt: string;
  snapshot: ReportSnapshot;
}

export interface WebhookLog {
  id: string;
  at: string;
  transactionId: string;
  personId?: string;
  status: string;
  matchedClientId?: string;
  raw: unknown;
}

export interface DB {
  clients: Client[];
  webhookLogs: WebhookLog[];
}
