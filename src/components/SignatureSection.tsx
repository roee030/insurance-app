import { useState } from "react";
import { PenLine, Copy, Check, ExternalLink, CheckCircle2 } from "lucide-react";
import type { Client } from "@/domain/types";
import { api } from "@/lib/api";
import { useClients } from "@/store/useClients";
import { formatDate } from "@/lib/utils";

function signUrl(token: string) {
  return `${window.location.origin}/sign/${token}`;
}

export function SignatureSection({ client }: { client: Client }) {
  const refresh = useClients((s) => s.refresh);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const sr = client.signRequest;
  if (!sr) return null;

  const signed = Boolean(sr.signedAt);

  const copy = async () => {
    await navigator.clipboard.writeText(signUrl(sr.token)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const demoSign = async () => {
    setBusy(true);
    try {
      await api.signDocument(sr.token, `${client.firstName} ${client.lastName}`);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  if (signed) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="size-4" /> הלקוח חתם דיגיטלית
        </div>
        <p className="mt-1 text-[12px] text-slate-500">
          נחתם ע״י {sr.signerName ?? "הלקוח"} · {formatDate(sr.signedAt!)}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.05] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-violet-700">
        <PenLine className="size-4" /> חתימה דיגיטלית
      </div>
      <p className="mb-3 text-[12px] text-slate-500">
        שלח ללקוח את הקישור האישי לחתימה. עם קבלת החתימה — הבקשה תיסגר ותסומן
        כנשלחה לחברה.
      </p>

      <div className="flex items-center gap-2">
        <div
          dir="ltr"
          className="flex-1 truncate rounded-lg border border-line bg-white px-3 py-2 text-[12px] text-slate-500"
        >
          {signUrl(sr.token)}
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
          href={signUrl(sr.token)}
          target="_blank"
          rel="noreferrer"
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-slate-500 hover:bg-slate-50"
          title="פתח דף חתימה"
        >
          <ExternalLink className="size-4" />
        </a>
      </div>

      <button
        onClick={demoSign}
        disabled={busy}
        className="mt-3 w-full rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-3 py-2 text-[11px] text-violet-700 hover:bg-violet-500/10 disabled:opacity-50"
      >
        דמה חתימת לקוח (דמו)
      </button>
    </div>
  );
}
