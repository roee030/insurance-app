import { useState } from "react";
import { PenLine, Copy, Check, ExternalLink, CheckCircle2, AlertTriangle, Plus } from "lucide-react";
import type { Client } from "@/domain/types";
import { api, DEMO } from "@/lib/api";
import { useClients } from "@/store/useClients";
import { ActionSelector } from "./ActionSelector";
import { Button } from "./ui/Button";
import { formatDate } from "@/lib/utils";

function signUrl(token: string) {
  return `${window.location.origin}/sign/${token}`;
}

/**
 * Shows every independent signing contract on this client, plus a picker to
 * create another one for any productActions not yet covered by an existing
 * contract — "כל דבר זה חוזה אחד בפני עצמו": e.g. one contract for the ניוד
 * actions, a separate one for a new policy, each tracked to its own
 * signature and company-submission outcome. Replaces the old single-
 * SignatureSection (see git history) now that a client can have several.
 */
export function ContractsSection({ client }: { client: Client }) {
  const refresh = useClients((s) => s.refresh);
  const createContract = useClients((s) => s.createContract);
  const actions = client.productActions ?? [];
  const contracts = client.contracts ?? [];
  const coveredIds = new Set(contracts.flatMap((c) => c.productActionIds));
  const uncovered = actions.filter((a) => !coveredIds.has(a.id));

  const [picking, setPicking] = useState(contracts.length === 0);
  const [selected, setSelected] = useState<Set<string>>(new Set(uncovered.map((a) => a.id)));
  const [creating, setCreating] = useState(false);

  if (contracts.length === 0 && uncovered.length === 0) return null;

  const handleCreate = async () => {
    if (selected.size === 0) return;
    setCreating(true);
    try {
      await createContract(client.id, Array.from(selected));
      setPicking(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      {contracts.map((c) => (
        <ContractCard key={c.id} client={client} contract={c} onSigned={refresh} />
      ))}

      {uncovered.length > 0 && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.05] p-4">
          {!picking ? (
            <button
              onClick={() => {
                setSelected(new Set(uncovered.map((a) => a.id)));
                setPicking(true);
              }}
              className="inline-flex items-center gap-1.5 text-[15px] font-medium text-violet-700 hover:underline"
            >
              <Plus className="size-4" />
              {contracts.length > 0
                ? `צור חוזה נוסף — נותרו ${uncovered.length} פעולות ללא חוזה`
                : "צור חוזה לחתימה"}
            </button>
          ) : (
            <>
              <div className="mb-2 flex items-center gap-2 text-lg font-semibold text-violet-700">
                <PenLine className="size-4" />
                {contracts.length > 0 ? "חוזה נוסף לחתימה" : "חתימה דיגיטלית"}
              </div>
              <p className="mb-3 text-[15px] text-slate-500">
                בחר אילו פעולות ייכללו בחוזה זה — ניתן ליצור חוזה נפרד לכל
                קבוצה (למשל חוזה לניוד וחוזה נפרד למוצר חדש).
              </p>
              <ActionSelector actions={uncovered} selected={selected} onChange={setSelected} />
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={creating || selected.size === 0}
                className="mt-3"
              >
                {creating ? "יוצר…" : "צור חוזה לחתימה"}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ContractCard({
  client,
  contract,
  onSigned,
}: {
  client: Client;
  contract: NonNullable<Client["contracts"]>[number];
  onSigned: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const signed = Boolean(contract.signedAt);
  const label =
    contract.label ??
    (client.productActions ?? [])
      .filter((a) => contract.productActionIds.includes(a.id))
      .map((a) => a.productType)
      .join(", ");

  const copy = async () => {
    await navigator.clipboard.writeText(signUrl(contract.token)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const demoSign = async () => {
    setBusy(true);
    try {
      await api.signDocument(contract.token, `${client.firstName} ${client.lastName}`);
      await onSigned();
    } finally {
      setBusy(false);
    }
  };

  if (signed) {
    const failed = contract.submission?.status === "failed";
    return (
      <div
        className={
          failed
            ? "rounded-2xl border border-red-200 bg-red-50 p-4"
            : "rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4"
        }
      >
        <div
          className={
            failed
              ? "flex items-center gap-2 text-lg font-semibold text-red-600"
              : "flex items-center gap-2 text-lg font-semibold text-emerald-700"
          }
        >
          {failed ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
          הלקוח חתם דיגיטלית{label ? ` · ${label}` : ""}
        </div>
        <p className="mt-1 text-[16px] text-slate-500">
          נחתם ע״י {contract.signerName ?? "הלקוח"} · {formatDate(contract.signedAt!)}
        </p>
        <p className={failed ? "mt-1 text-[16px] text-red-500" : "mt-1 text-[16px] text-emerald-600"}>
          {failed
            ? `שליחה לחברת הביטוח נכשלה${contract.submission?.note ? ` — ${contract.submission.note}` : ""}`
            : "נשלח בהצלחה לחברת הביטוח"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.05] p-4">
      <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-violet-700">
        <PenLine className="size-4" /> חתימה דיגיטלית{label ? ` · ${label}` : ""}
      </div>
      <p className="mb-3 text-[16px] text-slate-500">
        שלח ללקוח את הקישור האישי לחתימה. עם קבלת החתימה — הבקשה תיסגר ותסומן
        כנשלחה לחברה.
      </p>

      <div className="flex items-center gap-2">
        <div
          dir="ltr"
          className="flex-1 truncate rounded-lg border border-line bg-white px-3 py-2 text-[16px] text-slate-500"
        >
          {signUrl(contract.token)}
        </div>
        <button
          onClick={copy}
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-slate-500 hover:bg-slate-50"
          title="העתק קישור"
        >
          {copied ? (
            <Check className="size-4 text-emerald-600" />
          ) : (
            <Copy className="size-4" />
          )}
        </button>
        <a
          href={signUrl(contract.token)}
          target="_blank"
          rel="noreferrer"
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-slate-500 hover:bg-slate-50"
          title="פתח דף חתימה"
        >
          <ExternalLink className="size-4" />
        </a>
      </div>

      {/* Only in the demo build — against a real backend this would let the
          agent forge the client's own signature through the real endpoint. */}
      {DEMO && (
        <button
          onClick={demoSign}
          disabled={busy}
          className="mt-3 w-full rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-3 py-2 text-[15px] text-violet-700 hover:bg-violet-500/10 disabled:opacity-50"
        >
          דמה חתימת לקוח (דמו)
        </button>
      )}
    </div>
  );
}
