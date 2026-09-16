import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Plus,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  ListFilter,
} from "lucide-react";
import type { Client } from "@/domain/types";
import { useClients } from "@/store/useClients";
import { Button } from "./ui/Button";
import { ActionSelector } from "./ActionSelector";
import { cn, formatDate, formatCurrency } from "@/lib/utils";

function reportUrl(id: string) {
  return `${window.location.origin}/report/${id}`;
}

export function ReportsSection({ client }: { client: Client }) {
  const createReport = useClients((s) => s.createReport);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const actions = client.productActions ?? [];
  const [selected, setSelected] = useState<Set<string>>(new Set(actions.map((a) => a.id)));
  const reports = client.reports ?? [];
  const canGenerate = Boolean(client.mislaka);

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const ids = picking ? Array.from(selected) : undefined;
      await createReport(client.id, ids);
      setPicking(false);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (id: string) => {
    await navigator.clipboard.writeText(reportUrl(id)).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1800);
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <FileText className="size-4 text-bronze" style={{ color: "#d97706" }} />
          דוחות ללקוח
        </div>
        <div className="flex items-center gap-1.5">
          {actions.length > 1 && (
            <button
              onClick={() => setPicking((v) => !v)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[17px]",
                picking
                  ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-700"
                  : "border-line bg-white text-slate-500",
              )}
              title="בחר אילו פעולות ייכללו בדוח — לדוגמה דוח נפרד לניוד ודוח נפרד למוצר חדש"
            >
              <ListFilter className="size-3.5" /> בחר פעולות
            </button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={busy || !canGenerate || (picking && selected.size === 0)}
            title={canGenerate ? "" : "יש להמתין לנתוני מסלקה"}
          >
            {busy ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> מפיק…
              </>
            ) : (
              <>
                <Plus className="size-3.5" /> הפק דוח
              </>
            )}
          </Button>
        </div>
      </div>

      {!canGenerate && (
        <p className="text-[16px] text-slate-500">
          ניתן להפיק דוח לאחר קבלת נתוני המסלקה.
        </p>
      )}

      {picking && actions.length > 0 && (
        <div className="mb-3 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-3">
          <p className="mb-2 text-[17px] text-slate-500">
            הדוח יכלול רק את הפעולות המסומנות — ניתן להפיק דוח נפרד לכל קבוצה
            (למשל דוח לניוד ודוח נפרד למוצר חדש).
          </p>
          <ActionSelector actions={actions} selected={selected} onChange={setSelected} />
        </div>
      )}

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {reports.map((r) => (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/50 px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="text-[17px] font-medium text-slate-800">
                  דוח תיק פנסיוני · גרסה {r.version}
                </div>
                <div className="text-[15px] text-slate-500">
                  {formatDate(r.createdAt)} · {formatCurrency(r.snapshot.totals.accumulation)} ·{" "}
                  {r.snapshot.totals.productCount} מוצרים
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => copy(r.id)}
                  className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  title="העתק לינק לשיתוף"
                >
                  {copied === r.id ? (
                    <Check className="size-4 text-emerald-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </button>
                <Link
                  to={`/report/${r.id}`}
                  target="_blank"
                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-100 px-2.5 text-[16px] text-slate-800 hover:bg-slate-200/70"
                >
                  פתח <ExternalLink className="size-3.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {reports.length === 0 && canGenerate && (
          <p className="text-[16px] text-slate-500">
            עדיין לא הופק דוח. לחץ “הפק דוח” כדי ליצור snapshot לשיתוף עם הלקוח.
          </p>
        )}
      </div>
    </div>
  );
}
