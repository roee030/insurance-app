import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ShieldCheck, PenLine, CheckCircle2, Loader2 } from "lucide-react";
import type { SignView } from "@/domain/types";
import { api } from "@/lib/api";
import { formatCurrency as ils } from "@/lib/utils";

export function SignPage() {
  const { token } = useParams();
  const [view, setView] = useState<SignView | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [name, setName] = useState("");
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .getSignRequest(token)
      .then((v) => {
        setView(v);
        setState("ok");
      })
      .catch(() => setState("error"));
  }, [token]);

  const sign = async () => {
    if (!token || name.trim().length < 2) return;
    setSigning(true);
    try {
      const v = await api.signDocument(token, name.trim());
      setView(v);
    } finally {
      setSigning(false);
    }
  };

  if (state === "loading") return <Centered>טוען…</Centered>;
  if (state === "error" || !view)
    return <Centered>הקישור אינו תקין או שפג תוקפו.</Centered>;

  const signed = Boolean(view.signedAt);

  return (
    <div className="grid min-h-screen place-items-center bg-[#eef1f5] p-4 text-[#0f172a]">
      <article
        dir="rtl"
        className="w-full max-w-lg rounded-2xl bg-white px-7 py-8 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.25)] sm:px-9"
      >
        <header className="flex items-center gap-2 border-b border-slate-200 pb-5">
          <span className="grid size-9 place-items-center rounded-lg bg-emerald-600 text-white">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <div className="text-[15px] font-bold text-slate-900">
              {view.agencyName}
            </div>
            <div className="text-[12px] text-slate-500">
              הסוכן {view.agentName}
            </div>
          </div>
        </header>

        {signed ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="size-8" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">המסמך נחתם בהצלחה</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              תודה, {view.signerName ?? view.clientName}. הבקשה נשלחה לחברת הביטוח.
            </p>
          </div>
        ) : (
          <>
            <div className="py-5">
              <h1 className="text-lg font-bold text-slate-900">
                שלום {view.clientName},
              </h1>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                להשלמת התהליך נדרשת חתימתך הדיגיטלית על טופס המעבר. אנא עיין
                בפרטים וחתום למטה.
              </p>
            </div>

            {view.productActions.length > 0 && (
              <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 text-[12px] font-semibold text-slate-700">
                  פרטי הבקשה
                </div>
                <div className="space-y-2">
                  {view.productActions.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg border border-slate-200 bg-white p-3 text-[13px]"
                    >
                      <div className="mb-1.5 font-medium text-slate-800">
                        {a.productType}
                        <span className="mr-1 text-[11px] font-normal text-slate-500">
                          {a.kind === "transfer"
                            ? `· ניוד מ־${a.sourceCompany}`
                            : "· פתיחה חדשה"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[12px]">
                        <Field label="אל" value={a.targetCompany} />
                        <Field label="מסלול" value={a.targetTrack} />
                        <Field label="פרמיה" value={ils(a.monthlyPremium)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label className="block text-[12px] font-medium text-slate-600">
              שם מלא לחתימה
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="הקלד/י את שמך המלא"
                className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-[15px] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>

            <button
              onClick={sign}
              disabled={signing || name.trim().length < 2}
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[15px] font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
            >
              {signing ? (
                <>
                  <Loader2 className="size-5 animate-spin" /> חותם…
                </>
              ) : (
                <>
                  <PenLine className="size-5" /> חתום דיגיטלית ושלח
                </>
              )}
            </button>
            <p className="mt-3 text-center text-[11px] text-slate-400">
              החתימה הדיגיטלית מהווה אישור משפטי מחייב לביצוע הבקשה.
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="font-medium text-slate-800">{value}</div>
    </div>
  );
}
