import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Printer, ShieldCheck, TrendingUp, Sparkles } from "lucide-react";
import type { Report } from "@/domain/types";
import { api } from "@/lib/api";
import { formatDate, formatCurrency as ils } from "@/lib/utils";

const MARITAL_HE: Record<string, string> = {
  single: "רווק/ה",
  married: "נשוי/אה",
  divorced: "גרוש/ה",
  widowed: "אלמן/ה",
};
const RISK_HE = [
  "",
  "נמוכה",
  "נמוכה-בינונית",
  "בינונית",
  "בינונית-גבוהה",
  "גבוהה",
];

export function ReportPage() {
  const { reportId } = useParams();
  const [report, setReport] = useState<Report | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!reportId) return;
    api
      .getReport(reportId)
      .then((r) => {
        setReport(r);
        setState("ok");
      })
      .catch(() => setState("error"));
  }, [reportId]);

  if (state === "loading")
    return <Centered>טוען דוח…</Centered>;
  if (state === "error" || !report)
    return <Centered>הדוח לא נמצא או שאינו זמין.</Centered>;

  const s = report.snapshot;

  return (
    <div className="report-root min-h-screen bg-[#eef1f5] py-8 text-[#0f172a]">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .report-root { background: #fff !important; padding: 0 !important; }
          .paper { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>

      {/* action bar */}
      <div className="no-print mx-auto mb-4 flex max-w-[820px] items-center justify-between px-4">
        <span className="text-xs text-slate-500">
          דוח לקוח · גרסה {report.version} · הופק {formatDate(s.generatedAt)}
        </span>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Printer className="size-4" /> הדפס / שמור PDF
        </button>
      </div>

      {/* the document */}
      <article
        dir="rtl"
        className="paper mx-auto max-w-[820px] rounded-2xl bg-white px-8 py-9 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.25)] sm:px-12"
      >
        {/* header / brand */}
        <header className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 text-[15px] font-bold tracking-tight text-slate-900">
              <span className="grid size-8 place-items-center rounded-lg bg-emerald-600 text-white">
                <ShieldCheck className="size-5" />
              </span>
              {s.agencyName}
            </div>
            <p className="mt-1 text-[13px] text-slate-500">
              הסוכן {s.agentName}
              {s.agentLicenseNumber && ` · רישיון ${s.agentLicenseNumber}`}
            </p>
            {s.agentBio && (
              <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-slate-400">
                {s.agentBio}
              </p>
            )}
          </div>
          <div className="text-left">
            <h1 className="text-lg font-bold text-slate-900">דוח תיק פנסיוני</h1>
            <p className="text-[13px] text-slate-500">
              נכון לתאריך {formatDate(s.generatedAt)}
            </p>
          </div>
        </header>

        {/* client */}
        <section className="flex flex-wrap items-baseline justify-between gap-2 py-5">
          <div>
            <div className="text-[13px] text-slate-500">מוגש עבור</div>
            <div className="text-xl font-bold text-slate-900">{s.clientName}</div>
          </div>
          <div className="text-[13px] text-slate-500">
            ת.ז <span dir="ltr">{s.personId}</span>
          </div>
        </section>

        {/* headline metrics */}
        <section className="grid grid-cols-3 gap-3">
          <Stat
            label="סך הצבירה הפנסיונית"
            value={ils(s.totals.accumulation)}
            highlight
          />
          <Stat label="מספר מוצרים" value={String(s.totals.productCount)} />
          <Stat
            label="דמי ניהול ממוצע (מצבירה)"
            value={`${s.totals.avgFeeAccumulation.toFixed(2)}%`}
          />
        </section>

        {/* holdings */}
        <section className="mt-7">
          <h2 className="mb-3 text-sm font-bold text-slate-900">
            הרכב התיק הקיים
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-right text-[13px]">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">חברה</th>
                  <th className="px-3 py-2 font-medium">מוצר</th>
                  <th className="px-3 py-2 font-medium">מסלול</th>
                  <th className="px-3 py-2 font-medium">דמי ניהול</th>
                  <th className="px-3 py-2 text-left font-medium">צבירה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {s.holdings.map((h, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2.5 font-medium text-slate-800">
                      {h.manufacturer}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {h.product_type}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {h.track ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {h.feeAccumulation != null ? `${h.feeAccumulation}%` : "—"}
                      {h.feeDeposit ? ` · ${h.feeDeposit}% מהפקדה` : ""}
                    </td>
                    <td className="px-3 py-2.5 text-left font-semibold tabular-nums text-slate-900">
                      {ils(h.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={4} className="px-3 py-2.5 font-bold text-slate-900">
                    סה״כ
                  </td>
                  <td className="px-3 py-2.5 text-left font-bold tabular-nums text-emerald-700">
                    {ils(s.totals.accumulation)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* recommendation — per-product decisions */}
        {s.productActions && s.productActions.length > 0 && (
          <section className="mt-7">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
              <Sparkles className="size-4 text-emerald-600" /> ההמלצה שלנו
            </h2>
            <div className="space-y-2">
              {s.productActions.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                >
                  <div className="mb-2 text-[13px] font-semibold text-slate-800">
                    {a.productType}
                    <span className="mr-1.5 text-[11px] font-normal text-slate-500">
                      {a.kind === "transfer" && `· ניוד מ־${a.sourceCompany}`}
                      {a.kind === "new" && "· פתיחת מוצר חדש"}
                      {a.kind === "modify" && `· שינוי כיסויים ב־${a.sourceCompany}`}
                      {a.kind === "cancel" && `· ביטול פוליסה ב־${a.sourceCompany}`}
                    </span>
                  </div>
                  {a.kind === "modify" ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Field label="סכום לפני" value={ils(a.beforeSum)} />
                      <Field label="סכום אחרי" value={ils(a.afterSum)} />
                      <Field label="עלות לפני" value={ils(a.beforePremium)} />
                      <Field label="עלות אחרי" value={ils(a.monthlyPremium)} />
                    </div>
                  ) : a.kind === "cancel" ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {a.sourceBalance != null && (
                        <Field label="צבירה בפוליסה המבוטלת" value={ils(a.sourceBalance)} />
                      )}
                      <Field
                        label="באחריות ביטול"
                        value={cancellationLabel(a.cancellationResponsibility)}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Field label="חברה" value={a.targetCompany} />
                      <Field label="מסלול" value={a.targetTrack} />
                      <Field label="פרמיה חודשית" value={ils(a.monthlyPremium)} />
                      {a.sourceBalance != null && (
                        <Field label="צבירה מנוידת" value={ils(a.sourceBalance)} />
                      )}
                    </div>
                  )}
                  {a.note && (
                    <p className="mt-3 border-t border-emerald-200 pt-3 text-[13px] leading-relaxed text-slate-700">
                      {a.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* needs assessment / justification — מסמך הנמקה */}
        {s.needsAssessment &&
          (s.needsAssessment.riskLevel ||
            s.needsAssessment.savingsGoal ||
            s.needsAssessment.justification) && (
            <section className="mt-7">
              <h2 className="mb-3 text-sm font-bold text-slate-900">
                בירור צרכים והנמקה
              </h2>
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {s.needsAssessment.savingsGoal && (
                    <Field label="מטרת החיסכון" value={s.needsAssessment.savingsGoal} />
                  )}
                  {s.needsAssessment.riskLevel && (
                    <Field
                      label="רמת סיכון"
                      value={`${s.needsAssessment.riskLevel} · ${RISK_HE[s.needsAssessment.riskLevel]}`}
                    />
                  )}
                  {s.needsAssessment.maritalStatus && (
                    <Field
                      label="מצב משפחתי"
                      value={MARITAL_HE[s.needsAssessment.maritalStatus] ?? "—"}
                    />
                  )}
                  {s.needsAssessment.employer && (
                    <Field label="מעסיק" value={s.needsAssessment.employer} />
                  )}
                </div>
                {s.needsAssessment.justification && (
                  <p className="mt-3 border-t border-slate-100 pt-3 text-[13px] leading-relaxed text-slate-700">
                    {s.needsAssessment.justification}
                  </p>
                )}
              </div>
            </section>
          )}

        {/* mandatory disclosure — יצרנים עיקריים, per חוזר הצירוף */}
        {s.disclosedManufacturers && s.disclosedManufacturers.length > 0 && (
          <section className="mt-7">
            <h2 className="mb-3 text-sm font-bold text-slate-900">
              גילוי נאות — יצרנים עיקריים
            </h2>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[12px] leading-relaxed text-amber-900">
              <p className="mb-2">
                בהתאם לחובת הגילוי הרגולטורית, סוכן זה מקבל למעלה מ־40% מהיקף
                העמלות בענף מסוים מהיצרנים הבאים:
              </p>
              <ul className="list-inside list-disc space-y-1">
                {s.disclosedManufacturers.map((m) => (
                  <li key={m.id}>
                    <span className="font-medium">{m.company}</span> — {m.branch} (
                    {m.commissionPercent}% מהעמלות בענף)
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* disclaimer */}
        <footer className="mt-8 flex items-start gap-2 border-t border-slate-200 pt-5 text-[11px] leading-relaxed text-slate-400">
          <TrendingUp className="mt-0.5 size-3.5 shrink-0" />
          <p>
            דוח זה מבוסס על נתוני מסלקה פנסיונית נכון לתאריך ההפקה ומהווה מידע כללי
            בלבד, אינו מהווה ייעוץ פנסיוני או המלצה אישית מחייבת. אין באמור כדי
            להוות תחליף לייעוץ המתחשב בנתונים ובצרכים המיוחדים של כל אדם.
            © {new Date().getFullYear()} {s.agencyName}.
          </p>
        </footer>
      </article>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#eef1f5] text-sm text-slate-500">
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl border p-3.5 " +
        (highlight
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white")
      }
    >
      <div
        className={
          "text-lg font-bold tabular-nums " +
          (highlight ? "text-emerald-700" : "text-slate-900")
        }
      >
        {value}
      </div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-[13px] font-medium text-slate-800">{value ?? "—"}</div>
    </div>
  );
}

function cancellationLabel(v?: "agent" | "new_company" | "client"): string | undefined {
  if (v === "agent") return "הסוכן";
  if (v === "new_company") return "החברה החדשה";
  if (v === "client") return "הלקוח";
  return undefined;
}
