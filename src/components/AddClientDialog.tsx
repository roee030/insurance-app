import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { X, UserPlus, Loader2, Send } from "lucide-react";
import { useClients } from "@/store/useClients";
import { Button } from "./ui/Button";
import { cn } from "@/lib/utils";

type Errors = Record<string, string>;

function Field({
  label,
  name,
  dir,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  dir?: "ltr" | "rtl";
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <input
        name={name}
        dir={dir}
        placeholder={placeholder}
        className={cn(
          "h-10 rounded-xl border bg-surface-2/60 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20",
          error ? "border-red-500/60" : "border-line",
        )}
      />
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </label>
  );
}

/**
 * A plain async submit handler (not useActionState) is used deliberately:
 * useActionState runs its action inside a low-priority transition, whose
 * commit can be starved by the background polling — which delayed the modal
 * close. A normal handler + useState commits at default priority, so the
 * dialog closes instantly on success.
 */
export function AddClientDialog({ onClose }: { onClose: () => void }) {
  const addClient = useClients((s) => s.addClient);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    const firstName = String(fd.get("firstName") ?? "").trim();
    const lastName = String(fd.get("lastName") ?? "").trim();
    const personId = String(fd.get("personId") ?? "").trim();
    const mobile = String(fd.get("mobile") ?? "").trim();

    const next: Errors = {};
    if (!firstName) next.firstName = "שדה חובה";
    if (!lastName) next.lastName = "שדה חובה";
    if (!/^\d{9}$/.test(personId)) next.personId = "ת.ז צריכה 9 ספרות";
    if (!/^0\d{1,2}-?\d{7}$/.test(mobile.replace(/\s/g, "")))
      next.mobile = "מספר טלפון לא תקין";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await addClient({ firstName, lastName, personId, mobile });
      onClose(); // instant, default-priority close
    } catch (err) {
      setErrors({ form: String(err) });
      setPending(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 320, damping: 26, mass: 0.8 }}
        className="glass relative w-full max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/25">
              <UserPlus className="size-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">נרשם חדש</h2>
              <p className="text-[11px] text-slate-500">
                הוספת פרטים ושליחת קישור הרשאה למסלקה
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <Field
            label="שם פרטי"
            name="firstName"
            placeholder="רועי"
            error={errors.firstName}
          />
          <Field
            label="שם משפחה"
            name="lastName"
            placeholder="גינוסר"
            error={errors.lastName}
          />
          <Field
            label="תעודת זהות"
            name="personId"
            dir="ltr"
            placeholder="033845090"
            error={errors.personId}
          />
          <Field
            label="טלפון נייד"
            name="mobile"
            dir="ltr"
            placeholder="052-4567890"
            error={errors.mobile}
          />
          {errors.form && (
            <div className="col-span-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-600">
              שגיאה בשליחה לשרת: {errors.form}
            </div>
          )}
          <div className="col-span-2 mt-2 flex items-center justify-between">
            <p className="text-[11px] text-slate-500">
              לאחר ההוספה יישלח SMS אוטומטי עם קישור למסלקה.
            </p>
            <Button type="submit" disabled={pending} className="min-w-40">
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> שולח SMS…
                </>
              ) : (
                <>
                  <Send className="size-4" /> הוסף ושלח SMS למסלקה
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
