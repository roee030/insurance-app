/**
 * Server-side domain model. Mirrors the frontend pipeline stages so the two
 * stay in sync, and adds the fields the Mislaka integration needs
 * (transaction ids, raw uploaded מסלקה payloads).
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
  actionCode: string; // "file_upload" — the agent-uploaded מסלקה export
  receivedAt: string;
  polisot: PolisaSummary[];
  /** The raw uploaded payload, kept for traceability/audit. */
  raw?: unknown;
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
  relation?: string;
  name?: string;
}

/**
 * The data the agent collects WITH the client after the Mislaka returns —
 * completes what gets "planted" onto the forms + the justification document
 * (מסמך הנמקה). Known fields (name/id/birthdate) come from the Mislaka;
 * these are the ones that must be confirmed/collected live. Extended per
 * docs/sms-feature-gap-analysis.md to cover the full בירור צרכים SMS performs
 * across many client-record tabs — kept here as one consolidated record.
 */
export interface NeedsAssessment {
  maritalStatus?: MaritalStatus;
  employer?: string; //        מעסיק
  savingsGoal?: string; //     מטרת החיסכון (פרישה / חיסכון ארוך טווח ...)
  timeHorizon?: string; //     אופק ההשקעה
  riskLevel?: 1 | 2 | 3 | 4 | 5; // רמת סיכון
  justification?: string; //   מלל חופשי / הנמקה

  smoker?: boolean;
  cigarettesPerDay?: number;
  heightCm?: number;
  weightKg?: number;
  dangerousHobbies?: string;

  spouse?: Spouse;
  children?: Child[];

  mortgageAmount?: number;
  otherLoansAmount?: number;
  additionalDependents?: string;

  beneficiary?: Beneficiary;

  notes?: string;

  updatedAt?: string;
}

/**
 * The outcome of submitting one contract's signed deal to the insurance
 * company(ies) — set the moment the client signs THAT contract. Surfaced to
 * the agent as a notification (אישור קבלה: נשלח בהצלחה/כישלון).
 */
export interface Submission {
  status: "success" | "failed";
  at: string;
  note?: string;
}

/**
 * ONE online-signature contract handed to the client via a personal link,
 * covering a chosen subset of the client's productActions. A client can
 * have several independent contracts (e.g. one for ניוד actions, a separate
 * one for a new policy) — "כל דבר זה חוזה אחד בפני עצמו" — each tracked to
 * its own signature and submission outcome, per docs/sms-feature-gap-analysis.md.
 */
export interface Contract {
  id: string;
  token: string; //     used in the public /sign/:token link
  /** Which of the client's productActions this contract covers. */
  productActionIds: string[];
  /** Optional agent-facing label, e.g. "ניוד" / "מוצר חדש". */
  label?: string;
  sentAt: string;
  signedAt?: string;
  signerName?: string;
  submission?: Submission;
}

export type ProductActionKind = "transfer" | "new" | "modify" | "cancel";

/** Who is responsible for cancelling the replaced/cancelled policy — a mandatory disclosure per חוזר הצירוף whenever an existing policy is replaced or dropped. */
export type CancellationResponsibility = "agent" | "new_company" | "client";

/**
 * A decision made on ONE product, taken independently for each holding the
 * Mislaka returned (פנסיה / קרן השתלמות / ביטוח בריאות / גמל להשקעה ...).
 * - "transfer" (ניוד/שחלוף): moves an existing policy to a new company/track.
 * - "new" (פתיחה חדשה): opens a fresh policy that didn't exist before.
 * - "modify" (שינוי כיסויים): changes sum insured/premium on an existing
 *   policy without switching companies — targetCompany stays the source
 *   company; the before/after fields capture the comparison shown in the report.
 * - "cancel" (ביטול): drops an existing policy with no replacement —
 *   targetCompany/targetTrack are not applicable for this kind.
 */
export interface ProductAction {
  id: string;
  productType: string;
  kind: ProductActionKind;
  /** Populated for "transfer"/"modify"/"cancel" — the existing holding acted on. */
  sourceCompany?: string;
  sourcePolisaNumber?: string;
  sourceBalance?: number;
  /** Required for transfer/new/modify; absent for "cancel" (nothing to move to). */
  targetCompany?: string;
  targetTrack?: string;
  monthlyPremium?: number;
  note?: string;
  createdAt: string;

  cancellationResponsibility?: CancellationResponsibility;
  beforeSum?: number;
  afterSum?: number;
  beforePremium?: number;
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

  mislaka?: MislakaResult;

  needsAssessment?: NeedsAssessment;

  /** Per-product decisions (ניוד / פתיחת פוליסה חדשה), one per holding. */
  productActions?: ProductAction[];

  /** Independent signing contracts — see Contract for why this is an array. */
  contracts?: Contract[];

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
  /** Producers requiring mandatory disclosure (>40% commission) — snapshotted at report time so a later settings edit doesn't retroactively change a frozen report. */
  disclosedManufacturers?: PrimaryManufacturer[];
}

export interface Report {
  id: string; // shareable id used in the public link
  version: number;
  createdAt: string;
  snapshot: ReportSnapshot;
}

/** A reusable justification/answer snippet (בנק תשובות) — inserted into the needs-assessment justification text instead of retyping the same regulatory phrasing each time. */
export interface AnswerBankEntry {
  id: string;
  title: string;
  text: string;
  /** Optional scoping — leave unset for a general-purpose entry. */
  productType?: string;
  company?: string;
}

export interface DiscountTier {
  id: string;
  /** Months from policy start this tier applies from. */
  fromMonth: number;
  /** Months from policy start this tier applies until — open-ended if unset. */
  toMonth?: number;
  percent: number;
}

export type DiscountScope = "personal" | "system";

/** A staged discount (ניהול הנחות) — either the agent's personal discount or a system/company-wide one, applied in month-based tiers. */
export interface Discount {
  id: string;
  name: string;
  scope: DiscountScope;
  productType?: string;
  company?: string;
  tiers: DiscountTier[];
  note?: string;
}

/** A producer whose commission exceeds the disclosure threshold — mandatory disclosure per חוזר הצירוף (יצרנים עיקריים) whenever commission from one manufacturer in a branch exceeds 40%. */
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

/** Single-tenant settings — this app serves one agent, so there's exactly one of these. */
export interface Settings {
  agentProfile: AgentProfile;
  answerBank: AnswerBankEntry[];
  discounts: Discount[];
  manufacturers: PrimaryManufacturer[];
}

/**
 * VSign-style remote-signing foundation (תכין קרקע — explicitly NOT the full
 * feature). A generic PDF the agent uploads, with a flat list of fields the
 * client must fill/sign. What's deferred: visual placement of fields on the
 * actual PDF page canvas, and burning the filled values back into the PDF
 * pixels — the client-facing page instead just lists the required fields
 * and lets them provide values, no PDF rendering yet.
 */
export type DocFieldType = "signature" | "text" | "checkbox";

/** Where a field's value comes from — "manual" means the client types it themselves. */
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

export interface SignDocument {
  id: string;
  title: string;
  fileName: string;
  /** Base64-encoded PDF bytes. Stored inline in the JSON db for now — fine
   *  at foundation scale, not meant for large-volume production use. */
  fileContent: string;
  fields: DocumentField[];
  clientId?: string;
  /** Used in the public /docsign/:token link. */
  token: string;
  createdAt: string;
  sentAt?: string;
  completedAt?: string;
  values?: Record<string, string | boolean>;
  signerName?: string;
}

export interface DB {
  clients: Client[];
  settings: Settings;
  documents: SignDocument[];
}
