import { useState } from "react";
import {
  Phone,
  CreditCard,
  Mail,
  CheckCircle2,
  FileSignature,
  Building2,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useClients } from "@/store/useClients";
import {
  STAGES,
  clientOverallSubmission,
  isTerminal,
  hoursInStage,
  isStuck,
} from "@/domain/pipeline";
import type { Client, StageId } from "@/domain/types";
import { ProcessStepper } from "./ProcessStepper";
import { StageBadge, OwnerChip } from "./StageBadge";
import { Avatar } from "./Avatar";
import { Button } from "./ui/Button";
import { Timeline } from "./Timeline";
import { ProductActionsPanel } from "./ProductActionsPanel";
import { MislakaPanel } from "./MislakaPanel";
import { NeedsAssessment } from "./NeedsAssessment";
import { ContractsSection } from "./ContractsSection";
import { ReportsSection } from "./ReportsSection";
import { cn, formatDate, formatCurrency } from "@/lib/utils";

function ActionIcon({ stage }: { stage: StageId }) {
  const map = {
    lead: FileSignature,
    sms_sent: FileSignature,
    authorized: FileSignature,
    policy: FileSignature,
    signature: Building2,
    submitted: CheckCircle2,
  } as const;
  const Icon = map[stage];
  return <Icon className="size-4" />;
}

/** Full client detail body — shared by the modal and the standalone profile page. */
export function ClientDetail({
  client,
  hideHeader = false,
}: {
  client: Client;
  hideHeader?: boolean;
}) {
  const advanceClient = useClients((s) => s.advanceClient);
  const createContract = useClients((s) => s.createContract);
  const [busy, setBusy] = useState(false);

  const meta = STAGES[client.stage];
  const terminal = isTerminal(client.stage);
  const stuck = isStuck(client);
  const hrs = Math.round(hoursInStage(client));
  const overallSubmission = clientOverallSubmission(client);
  const needsProduct =
    client.stage === "authorized" && !(client.productActions?.length ?? 0);
  // From the moment the Mislaka data is in, the agent can work the forms.
  const canPrepForms =
    client.stage === "authorized" ||
    client.stage === "signature" ||
    client.stage === "submitted";

  const handleAdvance = async () => {
    setBusy(true);
    try {
      // "authorized" → "signature" now happens by creating the first
      // contract (covering everything, by default — same one-click result
      // as before); afterwards this button is only the manual
      // signature→submitted fallback. Splitting into several contracts for
      // different action groups is done via ContractsSection below instead.
      if (client.stage === "authorized") {
        await createContract(client.id);
      } else {
        await advanceClient(client.id);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* identity header */}
      {!hideHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={`${client.firstName} ${client.lastName}`} size={54} />
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                {client.firstName} {client.lastName}
              </h2>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <CreditCard className="size-3" />
                  <span dir="ltr">{client.personId}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3" />
                  <span dir="ltr">{client.mobile}</span>
                </span>
                {client.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="size-3" />
                    <span dir="ltr">{client.email}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <StageBadge stage={client.stage} />
        </div>
      )}

      {/* stepper */}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <ProcessStepper stage={client.stage} />
      </div>

      {/* status line */}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-base">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">כדור אצל:</span>
          <OwnerChip owner={meta.owner} />
        </div>
        <span className={cn(stuck ? "text-amber-600" : "text-slate-500")}>
          {terminal ? "התהליך הושלם" : `${hrs} ש׳ בשלב הנוכחי`}
          {stuck && " · חריגת SLA"}
        </span>
      </div>

      {/* mislaka */}
      {client.mislaka ? (
        <MislakaPanel data={client.mislaka} detailed />
      ) : (
        <p className="rounded-2xl border border-dashed border-line bg-surface/40 p-5 text-center text-[17px] text-slate-500">
          {meta.description}
        </p>
      )}

      {/* needs assessment / form prep — available once mislaka data is in */}
      {canPrepForms && <NeedsAssessment client={client} />}

      {/* product / ניוד — editable while deciding, read-only summary after */}
      {client.stage === "authorized" && <ProductActionsPanel client={client} />}
      {client.stage !== "authorized" &&
        (client.productActions?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-700">
              <Sparkles className="size-3.5 text-cyan-600" /> החלטות שהתקבלו
            </div>
            <div className="space-y-1.5">
              {client.productActions!.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-base"
                >
                  <span className="text-slate-700">
                    <span className="font-medium">{a.productType}</span>
                    {a.kind === "transfer" && (
                      <>
                        {" "}
                        · ניוד מ־{a.sourceCompany} אל {a.targetCompany}
                        {a.targetTrack ? ` · ${a.targetTrack}` : ""}
                      </>
                    )}
                    {a.kind === "new" && (
                      <>
                        {" "}
                        · פתיחה חדשה ב־{a.targetCompany}
                        {a.targetTrack ? ` · ${a.targetTrack}` : ""}
                      </>
                    )}
                    {a.kind === "modify" && (
                      <> · שינוי כיסויים ב־{a.sourceCompany}</>
                    )}
                    {a.kind === "cancel" && (
                      <> · ביטול פוליסה ב־{a.sourceCompany}</>
                    )}
                  </span>
                  {a.kind === "modify" ? (
                    a.monthlyPremium != null && (
                      <span className="shrink-0 tabular-nums text-slate-500">
                        {formatCurrency(a.beforePremium)} ← {formatCurrency(a.monthlyPremium)}/חודש
                      </span>
                    )
                  ) : (
                    a.monthlyPremium != null && (
                      <span className="shrink-0 tabular-nums text-slate-500">
                        {formatCurrency(a.monthlyPremium)}/חודש
                      </span>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* digital signature — one or more independent contracts. Available
          from "authorized" onward so the agent can split into separate
          contracts (e.g. ניוד vs. מוצר חדש) from the start, not just after
          the default "everything in one" contract already went out. */}
      {(client.productActions?.length ?? 0) > 0 && <ContractsSection client={client} />}

      {/* reports */}
      <ReportsSection client={client} />

      {/* timeline */}
      <Timeline client={client} />

      {/* next action */}
      {!terminal ? (
        <div className="sticky bottom-0 -mx-1 rounded-2xl border border-line bg-surface/95 p-3 backdrop-blur">
          <Button
            onClick={handleAdvance}
            disabled={busy || needsProduct}
            className="w-full"
          >
            <ActionIcon stage={client.stage} />
            {needsProduct ? "החלט על מוצר אחד לפחות כדי להמשיך" : meta.action}
          </Button>
        </div>
      ) : overallSubmission === "failed" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-center text-base text-red-600">
          <AlertTriangle className="mx-auto mb-1 size-5" />
          חלק מהשליחות לחברת הביטוח נכשלו — פירוט למעלה בחוזים
          <div className="mt-0.5 text-red-400">
            {formatDate(client.history.at(-1)!.at)}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-emerald-500/[0.06] p-3 text-center text-base text-emerald-700">
          <CheckCircle2 className="mx-auto mb-1 size-5" />
          נשלח בהצלחה לחברת הביטוח · {formatDate(client.history.at(-1)!.at)}
        </div>
      )}
    </div>
  );
}
