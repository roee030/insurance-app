import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, CheckCircle2, Loader2, PenLine } from "lucide-react";
import type { DocSignView } from "@/domain/types";
import { api } from "@/lib/api";

export function DocSignPage() {
  const { token } = useParams();
  const [view, setView] = useState<DocSignView | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .getDocSign(token)
      .then((v) => {
        setView(v);
        setValues(v.values ?? {});
        setState("ok");
      })
      .catch(() => setState("error"));
  }, [token]);

  if (state === "loading") return <Centered>טוען…</Centered>;
  if (state === "error" || !view)
    return <Centered>הקישור אינו תקין או שפג תוקפו.</Centered>;

  const completed = Boolean(view.completedAt);
  const manualFields = view.fields.filter((f) => f.source === "manual");
  const canSubmit =
    name.trim().length >= 2 &&
    manualFields.filter((f) => f.required).every((f) => {
      const v = values[f.id];
      return f.type === "checkbox" ? v === true : typeof v === "string" && v.trim().length > 0;
    });

  const submit = async () => {
    if (!token || !canSubmit) return;
    setSubmitting(true);
    try {
      const v = await api.submitDocSign(token, values, name.trim());
      setView(v);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#eef1f5] p-4 text-[#0f172a]">
      <article
        dir="rtl"
        className="w-full max-w-lg rounded-2xl bg-white px-7 py-8 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.25)] sm:px-9"
      >
        <header className="flex items-center gap-2 border-b border-slate-200 pb-5">
          <span className="grid size-9 place-items-center rounded-lg bg-cyan-600 text-white">
            <FileText className="size-5" />
          </span>
          <div>
            <div className="text-[15px] font-bold text-slate-900">{view.title}</div>
            <div className="text-[12px] text-slate-500">{view.fileName}</div>
          </div>
        </header>

        {completed ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="size-8" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">המסמך נחתם בהצלחה</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              תודה, {view.signerName}.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-5 text-[13px] leading-relaxed text-slate-600">
              אנא מלא/י את הפרטים הנדרשים וחתום/מי בתחתית לאישור המסמך.
            </p>

            {view.fields.length === 0 ? (
              <p className="mt-4 text-[12px] text-slate-400">
                לא הוגדרו שדות למסמך זה עדיין.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {view.fields.map((f) => {
                  if (f.source !== "manual") {
                    // autofilled fields (שם לקוח/סוכן/תאריך וכד') לא מוצגים כאן — הכנת קרקע בלבד, ההזרקה בפועל ל-PDF עדיין לא מבוצעת.
                    return (
                      <div key={f.id} className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
                        {f.label} — ימולא אוטומטית
                      </div>
                    );
                  }
                  return (
                    <label key={f.id} className="block text-[12px] font-medium text-slate-600">
                      {f.label}
                      {f.required && <span className="text-red-500"> *</span>}
                      {f.type === "checkbox" ? (
                        <input
                          type="checkbox"
                          checked={values[f.id] === true}
                          onChange={(e) =>
                            setValues((v) => ({ ...v, [f.id]: e.target.checked }))
                          }
                          className="mt-1 block size-5"
                        />
                      ) : (
                        <input
                          value={typeof values[f.id] === "string" ? (values[f.id] as string) : ""}
                          onChange={(e) =>
                            setValues((v) => ({ ...v, [f.id]: e.target.value }))
                          }
                          className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-[15px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            <label className="mt-4 block text-[12px] font-medium text-slate-600">
              שם מלא לחתימה
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="הקלד/י את שמך המלא"
                className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-[15px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </label>

            <button
              onClick={submit}
              disabled={submitting || !canSubmit}
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 text-[15px] font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-5 animate-spin" /> שולח…
                </>
              ) : (
                <>
                  <PenLine className="size-5" /> חתום דיגיטלית ושלח
                </>
              )}
            </button>
            <p className="mt-3 text-center text-[11px] text-slate-400">
              החתימה הדיגיטלית מהווה אישור משפטי מחייב.
            </p>
          </>
        )}
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
