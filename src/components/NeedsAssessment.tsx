import { useState } from "react";
import { ClipboardList, Check, Loader2 } from "lucide-react";
import type { Client, NeedsAssessment as NA } from "@/domain/types";
import { useClients } from "@/store/useClients";
import { cn } from "@/lib/utils";

const MARITAL: { value: NA["maritalStatus"]; label: string }[] = [
  { value: "single", label: "רווק/ה" },
  { value: "married", label: "נשוי/אה" },
  { value: "divorced", label: "גרוש/ה" },
  { value: "widowed", label: "אלמן/ה" },
];

const GOALS = [
  "פרישה",
  "חיסכון ארוך טווח",
  "נזילות עתידית",
  "ביטחון למשפחה",
  "צמצום דמי ניהול",
];

const RISK: { value: 1 | 2 | 3 | 4 | 5; label: string }[] = [
  { value: 1, label: "נמוכה" },
  { value: 2, label: "נמוכה-בינונית" },
  { value: 3, label: "בינונית" },
  { value: 4, label: "בינונית-גבוהה" },
  { value: 5, label: "גבוהה" },
];

export function NeedsAssessment({ client }: { client: Client }) {
  const save = useClients((s) => s.saveNeedsAssessment);
  const na = client.needsAssessment ?? {};
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);

  const patch = async (data: Partial<NA>) => {
    setSaving(true);
    try {
      await save(client.id, data);
      setSavedAt(true);
      setTimeout(() => setSavedAt(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <ClipboardList className="size-4 text-cyan-600" /> בירור צרכים והכנת טפסים
        </div>
        <span className="flex items-center gap-1 text-[11px] text-slate-500">
          {saving ? (
            <>
              <Loader2 className="size-3 animate-spin" /> שומר…
            </>
          ) : savedAt ? (
            <>
              <Check className="size-3 text-emerald-600" /> נשמר
            </>
          ) : (
            "נשתל אוטומטית על הטפסים"
          )}
        </span>
      </div>

      {/* known-from-mislaka banner */}
      <div className="mb-4 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.05] px-3 py-2 text-[11px] text-emerald-700/80">
        שם, ת.ז ותאריך לידה נשתלו אוטומטית מנתוני המסלקה. השלם מולו את הפרטים
        שמשתנים:
      </div>

      <div className="space-y-4">
        {/* marital */}
        <Row label="מצב משפחתי">
          <Segmented
            options={MARITAL.map((m) => ({ value: m.value!, label: m.label }))}
            value={na.maritalStatus}
            onChange={(v) => patch({ maritalStatus: v as NA["maritalStatus"] })}
          />
        </Row>

        {/* employer */}
        <Row label="מעסיק">
          <TextInput
            value={na.employer ?? ""}
            placeholder="שם מקום העבודה"
            onSave={(v) => patch({ employer: v })}
          />
        </Row>

        {/* goal */}
        <Row label="מטרת החיסכון">
          <div className="flex flex-wrap gap-1.5">
            {GOALS.map((g) => (
              <Chip
                key={g}
                active={na.savingsGoal === g}
                onClick={() => patch({ savingsGoal: g })}
              >
                {g}
              </Chip>
            ))}
          </div>
        </Row>

        {/* risk 1-5 */}
        <Row label="רמת סיכון">
          <div className="grid grid-cols-5 gap-1.5">
            {RISK.map((r) => (
              <button
                key={r.value}
                onClick={() => patch({ riskLevel: r.value })}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition",
                  na.riskLevel === r.value
                    ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-800"
                    : "border-line bg-surface-2/50 text-slate-500 hover:border-zinc-600",
                )}
              >
                <span className="text-sm font-semibold">{r.value}</span>
                <span className="text-[9.5px] leading-tight">{r.label}</span>
              </button>
            ))}
          </div>
        </Row>

        {/* free text justification */}
        <Row label="הנמקה (מלל חופשי)">
          <TextArea
            value={na.justification ?? ""}
            placeholder="מדוע הוחלט להעביר / לא להעביר — הנימוקים ייכתבו על מסמך ההנמקה…"
            onSave={(v) => patch({ justification: v })}
          />
        </Row>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-medium text-slate-500">{label}</div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value?: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-[12px] transition",
            value === o.value
              ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-800"
              : "border-line bg-surface-2/50 text-slate-500 hover:border-zinc-600",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-[12px] transition",
        active
          ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-800"
          : "border-line bg-surface-2/50 text-slate-500 hover:border-zinc-600",
      )}
    >
      {children}
    </button>
  );
}

function TextInput({
  value,
  placeholder,
  onSave,
}: {
  value: string;
  placeholder?: string;
  onSave: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  return (
    <input
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v.trim())}
      className="h-9 w-full rounded-lg border border-line bg-surface-2/60 px-3 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500/60"
    />
  );
}

function TextArea({
  value,
  placeholder,
  onSave,
}: {
  value: string;
  placeholder?: string;
  onSave: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  return (
    <textarea
      value={v}
      placeholder={placeholder}
      rows={3}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v.trim())}
      className="w-full resize-y rounded-lg border border-line bg-surface-2/60 px-3 py-2 text-[13px] leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500/60"
    />
  );
}
