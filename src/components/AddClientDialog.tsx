import { useState, useRef, type FormEvent } from "react";
import { motion } from "motion/react";
import { X, UserPlus, Loader2, Upload, FileJson, Check, ChevronDown } from "lucide-react";
import { useClients } from "@/store/useClients";
import { Button } from "./ui/Button";
import { cn } from "@/lib/utils";

type Errors = Record<string, string>;

const SAMPLE_JSON = `{
  "transaction_id": "abc123",
  "mislaka_number": "MSL-12345678",
  "polisot": [
    {
      "manufacturer": "הראל",
      "product_type": "פנסיה מקיפה",
      "polisa_number": "PH-000123",
      "polisa_name": "הראל פנסיה מקיפה",
      "polisa_status": "active",
      "balance": 138000,
      "track": "מסלול כללי",
      "feeAccumulation": 0.3,
      "feeDeposit": 2.25
    }
  ]
}`;

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
      <span className="text-base font-medium text-slate-500">{label}</span>
      <input
        name={name}
        dir={dir}
        placeholder={placeholder}
        className={cn(
          "h-10 rounded-xl border bg-white px-3 text-lg text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20",
          error ? "border-red-500/60" : "border-line",
        )}
      />
      {error && <span className="text-[15px] text-red-500">{error}</span>}
    </label>
  );
}

export function AddClientDialog({ onClose }: { onClose: () => void }) {
  const addClient = useClients((s) => s.addClient);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showSample, setShowSample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("קריאת הקובץ נכשלה"));
      reader.readAsText(file);
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    const firstName = String(fd.get("firstName") ?? "").trim();
    const lastName = String(fd.get("lastName") ?? "").trim();
    const personId = String(fd.get("personId") ?? "").trim();
    const mobile = String(fd.get("mobile") ?? "").trim();
    const file = fileInputRef.current?.files?.[0];

    const next: Errors = {};
    if (!firstName) next.firstName = "שדה חובה";
    if (!lastName) next.lastName = "שדה חובה";
    if (!/^\d{9}$/.test(personId)) next.personId = "ת.ז צריכה 9 ספרות";
    if (!/^0\d{1,2}-?\d{7}$/.test(mobile.replace(/\s/g, "")))
      next.mobile = "מספר טלפון לא תקין";
    if (!file) next.file = "יש לצרף קובץ מסלקה (JSON)";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const mislakaFileContent = await readFileAsText(file!);
      await addClient({ firstName, lastName, personId, mobile, mislakaFileContent });
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "שגיאה בשליחה" });
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
        className="card-shadow relative w-full max-w-lg rounded-2xl border border-line bg-surface p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/25">
              <UserPlus className="size-4.5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">לקוח חדש</h2>
              <p className="text-[15px] text-slate-500">
                הזנת פרטים והעלאת קובץ נתוני מסלקה
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <Field label="שם פרטי" name="firstName" placeholder="רועי" error={errors.firstName} />
          <Field label="שם משפחה" name="lastName" placeholder="גינוסר" error={errors.lastName} />
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

          <div className="col-span-2">
            <span className="mb-1.5 block text-base font-medium text-slate-500">
              קובץ מסלקה (JSON)
            </span>
            <label
              className={cn(
                "flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3 text-[17px] transition",
                errors.file
                  ? "border-red-500/60 text-red-500"
                  : fileName
                    ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-700"
                    : "border-line text-slate-500 hover:border-slate-400",
              )}
            >
              {fileName ? (
                <Check className="size-4 shrink-0" />
              ) : (
                <Upload className="size-4 shrink-0" />
              )}
              <span className="truncate">
                {fileName ?? "בחר קובץ שהתקבל מהמסלקה…"}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              />
            </label>
            {errors.file && (
              <span className="mt-1 block text-[15px] text-red-500">{errors.file}</span>
            )}

            <button
              type="button"
              onClick={() => setShowSample((v) => !v)}
              className="mt-1.5 inline-flex items-center gap-1 text-[15px] text-slate-400 hover:text-slate-600"
            >
              <ChevronDown className={cn("size-3 transition-transform", showSample && "rotate-180")} />
              איך אמור להיראות הקובץ?
            </button>
            {showSample && (
              <pre
                dir="ltr"
                className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-900 p-3 text-[15px] leading-relaxed text-emerald-300"
              >
                <FileJson className="mb-1 inline size-3.5" /> {"\n"}
                {SAMPLE_JSON}
              </pre>
            )}
          </div>

          {errors.form && (
            <div className="col-span-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[16px] text-red-600">
              {errors.form}
            </div>
          )}

          <div className="col-span-2 mt-2 flex items-center justify-between">
            <p className="text-[15px] text-slate-500">
              הנתונים ייטענו מיידית — ללא המתנה.
            </p>
            <Button type="submit" disabled={pending} className="min-w-40">
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> טוען נתונים…
                </>
              ) : (
                <>
                  <Upload className="size-4" /> הוסף וטען קובץ
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
