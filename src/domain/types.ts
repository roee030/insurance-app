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

export type ProductActionKind = "transfer" | "new" | "modify" | "cancel";

/** Who is responsible for cancelling the replaced/cancelled policy — a mandatory disclosure per חוזר הצירוף whenever an existing policy is replaced or dropped. */
export type CancellationResponsibility = "agent" | "new_company" | "client";

/**
 * A decision made on ONE product, taken independently for each holding the
 * Mislaka returned (פנסיה / קרן השתלמות / ביטוח בריאות / גמל להשקעה ...).
 * - "transfer" (ניוד/שחלוף): moves an existing policy to a new company/track.
 * - "new" (פתיחה חדשה): opens a fresh policy that didn't exist before.
 * - "modify" (שינוי כיסויים): changes the sum insured/premium on an existing
 *   policy WITHOUT switching companies — targetCompany stays the source
 *   company; the before/after fields capture the comparison shown in the report.
 * - "cancel" (ביטול): drops an existing policy with no replacement —
 *   targetCompany/targetTrack are not applicable for this kind.
 */
export interface ProductAction {
  id: string;
  productType: string;
  kind: ProductActionKind;
  sourceCompany?: string;
  sourcePolisaNumber?: string;
  sourceBalance?: number;
  /** Required for transfer/new/modify; absent for "cancel" (nothing to move to). */
  targetCompany?: string;
  targetTrack?: string;
  monthlyPremium?: number;
  note?: string;
  createdAt: string;

  /** Required for "transfer" and "cancel" — who cancels the existing policy. */
  cancellationResponsibility?: CancellationResponsibility;
  /** "modify" only — the before/after comparison shown in the report. */
  beforeSum?: number;
  afterSum?: number;
  beforePremium?: number;
}

export type MaritalStatus = "single" | "married" | "divorced" | "widowed";

export interface Spouse {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  gender?: "male" | "female";
  smoker?: boolean;
}

export interface Child {
  id: string;
  firstName: string;
  birthDate?: string;
}

export type BeneficiaryType = "specific" | "legal_heirs";

export interface Beneficiary {
  type: BeneficiaryType;
  /** Relevant when type === "specific" — e.g. "בן/בת זוג", "הורה". */
  relation?: string;
  name?: string;
}

/**
 * Full needs-assessment (בירור צרכים) — the regulatory record that a proper
 * needs-collection process was performed before any recommendation. Extended
 * per docs/sms-feature-gap-analysis.md to cover the same data SMS collects
 * across many client-record tabs, kept here as one consolidated form.
 */
export interface NeedsAssessment {
  maritalStatus?: MaritalStatus;
  employer?: string;
  savingsGoal?: string;
  timeHorizon?: string;
  riskLevel?: 1 | 2 | 3 | 4 | 5;
  justification?: string;

  // health — feeds premium-calculator inputs and shows attentiveness in the report
  smoker?: boolean;
  cigarettesPerDay?: number;
  heightCm?: number;
  weightKg?: number; // BMI derived from height+weight, not stored separately
  dangerousHobbies?: string;

  // family
  spouse?: Spouse;
  children?: Child[];

  // financial — informs recommended life-insurance sums
  mortgageAmount?: number;
  otherLoansAmount?: number;
  additionalDependents?: string;

  beneficiary?: Beneficiary;

  notes?: string;

  updatedAt?: string;
}

/** BMI = weight(kg) / height(m)^2. Returns null when inputs are missing/invalid. */
export function computeBmi(
  heightCm?: number,
  weightKg?: number,
): number | null {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
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
  contracts?: Contract[];
  reports?: Report[];

  createdAt: string;
  updatedAt: string;
}

export interface ReportSnapshot {
  clientName: string;
  personId: string;
  agentName: string;
  agencyName: string;
  agentLicenseNumber?: string;
  agentBio?: string;
  generatedAt: string;
  holdings: PolisaSummary[];
  totals: {
    accumulation: number;
    productCount: number;
    avgFeeAccumulation: number;
  };
  productActions?: ProductAction[];
  needsAssessment?: NeedsAssessment;
  /** Producers requiring mandatory disclosure (>40% commission) — snapshotted at report time. */
  disclosedManufacturers?: PrimaryManufacturer[];
}

export interface Report {
  id: string;
  version: number;
  createdAt: string;
  snapshot: ReportSnapshot;
}

/** Outcome of submitting one contract's signed deal to the insurance company(ies). */
export interface Submission {
  status: "success" | "failed";
  at: string;
  note?: string;
}

/**
 * ONE independent signing contract, covering a chosen subset of the
 * client's productActions. A client can have several — "כל דבר זה חוזה אחד
 * בפני עצמו" — each with its own link, signature and submission outcome.
 */
export interface Contract {
  id: string;
  token: string;
  productActionIds: string[];
  label?: string;
  sentAt: string;
  signedAt?: string;
  signerName?: string;
  submission?: Submission;
}

/** Public view returned by the sign endpoint (what the client sees) for ONE contract. */
export interface SignView {
  clientName: string;
  personId: string;
  agencyName: string;
  agentName: string;
  label?: string;
  productActions: ProductAction[];
  sentAt?: string;
  signedAt?: string | null;
  signerName?: string | null;
}

/** A reusable justification/answer snippet (בנק תשובות) — inserted into the needs-assessment justification text instead of retyping the same regulatory phrasing each time. */
export interface AnswerBankEntry {
  id: string;
  title: string;
  text: string;
  productType?: string;
  company?: string;
}

export interface DiscountTier {
  id: string;
  fromMonth: number;
  toMonth?: number;
  percent: number;
}

export type DiscountScope = "personal" | "system";

/** A staged discount (ניהול הנחות) applied in month-based tiers. */
export interface Discount {
  id: string;
  name: string;
  scope: DiscountScope;
  productType?: string;
  company?: string;
  tiers: DiscountTier[];
  note?: string;
}

/** A producer whose commission exceeds the disclosure threshold (יצרנים עיקריים — >40%). */
export interface PrimaryManufacturer {
  id: string;
  company: string;
  branch: string;
  commissionPercent: number;
}

export interface AgentProfile {
  agentName?: string;
  agencyName?: string;
  licenseNumber?: string;
  bio?: string;
  logoUrl?: string;
}

/** Single-tenant settings — one agent, one settings record. */
export interface Settings {
  agentProfile: AgentProfile;
  answerBank: AnswerBankEntry[];
  discounts: Discount[];
  manufacturers: PrimaryManufacturer[];
}

/**
 * VSign-style remote-signing foundation — see docs/sms-feature-gap-analysis.md.
 * Deferred: visual field placement on the actual PDF page canvas, and
 * burning filled values back into the PDF pixels. The client-facing page
 * instead lists the required fields and collects values, no PDF rendering.
 */
export type DocFieldType = "signature" | "text" | "checkbox";
export type DocFieldSource =
  | "manual"
  | "client_name"
  | "client_id"
  | "agent_name"
  | "date";

export interface DocumentField {
  id: string;
  type: DocFieldType;
  label: string;
  source: DocFieldSource;
  required: boolean;
}

/** Agent-side shape (list views omit fileContent — see server route). */
export interface SignDocument {
  id: string;
  title: string;
  fileName: string;
  fileContent?: string;
  fields: DocumentField[];
  clientId?: string;
  token: string;
  createdAt: string;
  sentAt?: string;
  completedAt?: string;
  values?: Record<string, string | boolean>;
  signerName?: string;
}

/** Public view returned by /docsign/:token (no PDF bytes, no clientId). */
export interface DocSignView {
  id: string;
  title: string;
  fileName: string;
  fields: DocumentField[];
  token: string;
  createdAt: string;
  sentAt?: string;
  completedAt?: string;
  values?: Record<string, string | boolean>;
  signerName?: string;
}

/** One match from the Israeli Registrar of Companies lookup (employer-field autocomplete). */
export interface CompanyLookupResult {
  name: string;
  number?: number;
  city?: string;
}

export interface AppNotification {
  id: string;
  clientId: string;
  kind: "mislaka_loaded" | "submission_success" | "submission_failed";
  message: string;
  at: string;
  read: boolean;
}
