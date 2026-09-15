/**
 * Frontend domain model. Kept in sync with the server (server/src/types.ts)
 * so payloads flow through without mapping.
 */

export type StageId =
  | "lead"
  | "sms_sent"
  | "authorized"
  | "policy"
  | "signature"
  | "submitted";

export type Owner = "agent" | "client" | "done";

export interface StageEvent {
  id: string;
  stage: StageId;
  at: string;
  note?: string;
}

/** A policy line as returned by the Mislaka (…/polisot). */
export interface PolisaSummary {
  manufacturer: string;
  product_type: string;
  polisa_number: string;
  polisa_name: string;
  polisa_status: string;
  balance?: number; //          צבירה
  track?: string; //            מסלול השקעה
  feeAccumulation?: number; //  דמי ניהול מצבירה (%)
  feeDeposit?: number; //       דמי ניהול מהפקדה (%)
}

export interface MislakaResult {
  transactionId: string;
  mislakaNumber?: string;
  actionCode: string; // "file_upload" — the agent-uploaded מסלקה export
  receivedAt: string;
  polisot: PolisaSummary[];
  raw?: unknown;
}

export type ProductActionKind = "transfer" | "new";

/**
 * A decision made on ONE product, taken independently for each holding the
 * Mislaka returned (פנסיה / קרן השתלמות / ביטוח בריאות / גמל להשקעה ...).
 * "transfer" (ניוד) moves an existing policy to a new company/track;
 * "new" (פתיחה חדשה) opens a fresh policy that didn't exist before.
 */
export interface ProductAction {
  id: string;
  productType: string;
  kind: ProductActionKind;
  sourceCompany?: string;
  sourcePolisaNumber?: string;
  sourceBalance?: number;
  targetCompany: string;
  targetTrack: string;
  monthlyPremium?: number;
  note?: string;
  createdAt: string;
}

export type MaritalStatus = "single" | "married" | "divorced" | "widowed";

export interface NeedsAssessment {
  maritalStatus?: MaritalStatus;
  employer?: string;
  savingsGoal?: string;
  timeHorizon?: string;
  riskLevel?: 1 | 2 | 3 | 4 | 5;
  justification?: string;
  updatedAt?: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  personId: string; // ת.ז
  mobile: string;
  email?: string;
  birthDate?: string;

  stage: StageId;
  history: StageEvent[];

  mislaka?: MislakaResult;
  needsAssessment?: NeedsAssessment;
  productActions?: ProductAction[];
  signRequest?: SignatureRequest;
  submission?: Submission;
  reports?: Report[];

  createdAt: string;
  updatedAt: string;
}

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
  id: string;
  version: number;
  createdAt: string;
  snapshot: ReportSnapshot;
}

export interface SignatureRequest {
  token: string;
  sentAt: string;
  signedAt?: string;
  signerName?: string;
}

/** Outcome of submitting the signed deal to the insurance company(ies). */
export interface Submission {
  status: "success" | "failed";
  at: string;
  note?: string;
}

/** Public view returned by the sign endpoint (what the client sees). */
export interface SignView {
  clientName: string;
  personId: string;
  agencyName: string;
  agentName: string;
  productActions: ProductAction[];
  sentAt?: string;
  signedAt?: string | null;
  signerName?: string | null;
}

export interface AppNotification {
  id: string;
  clientId: string;
  kind: "mislaka_loaded" | "submission_success" | "submission_failed";
  message: string;
  at: string;
  read: boolean;
}
