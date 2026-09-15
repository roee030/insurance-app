import { useEffect, useState } from "react";
import { ClipboardList, Check, Loader2, Plus, Trash2, BookOpen } from "lucide-react";
import type {
  AnswerBankEntry,
  Client,
  NeedsAssessment as NA,
  Child,
  Spouse,
  Beneficiary,
} from "@/domain/types";
import { computeBmi } from "@/domain/types";
import { useClients } from "@/store/useClients";
import { useSettings } from "@/store/useSettings";
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

const RELATIONS = ["בן/בת זוג", "ילד/ה", "הורה", "אח/ות", "אחר"];

/** Stable reference so the zustand selector below never returns a fresh
 *  array on each render (a literal `?? []` fallback would create a new
 *  reference every time settings is still null, causing an infinite
 *  update loop under useSyncExternalStore's reference-equality check). */
const EMPTY_ANSWER_BANK: AnswerBankEntry[] = [];

export function NeedsAssessment({ client }: { client: Client }) {
  const save = useClients((s) => s.saveNeedsAssessment);
  const answerBank = useSettings((s) => s.settings?.answerBank ?? EMPTY_ANSWER_BANK);
  const loadSettings = useSettings((s) => s.load);
  const na = client.needsAssessment ?? {};
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  // Bumped whenever an answer-bank chip programmatically changes the
  // justification text, so the (otherwise uncontrolled) TextArea below
  // remounts and picks up the new value instead of ignoring it.
  const [justificationKey, setJustificationKey] = useState(0);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

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

  const bmi = computeBmi(na.heightCm, na.weightKg);

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

      <div className="mb-4 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.05] px-3 py-2 text-[11px] text-emerald-700/80">
        שם, ת.ז ותאריך לידה נשתלו אוטומטית מנתוני המסלקה. השלם מולו את הפרטים
        שמשתנים:
      </div>

      <div className="space-y-5">
        <Section title="פרטים כלליים">
          <div className="space-y-4">
            <Row label="מצב משפחתי">
              <Segmented
                options={MARITAL.map((m) => ({ value: m.value!, label: m.label }))}
                value={na.maritalStatus}
                onChange={(v) => patch({ maritalStatus: v as NA["maritalStatus"] })}
              />
            </Row>
            <Row label="מעסיק">
              <TextInput
                value={na.employer ?? ""}
                placeholder="שם מקום העבודה"
                onSave={(v) => patch({ employer: v })}
              />
            </Row>
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
          </div>
        </Section>

        <Section title="נתונים בריאותיים">
          <div className="grid grid-cols-2 gap-3">
            <Row label="מעשן/ת">
              <Segmented
                options={[
                  { value: "yes", label: "כן" },
                  { value: "no", label: "לא" },
                ]}
                value={na.smoker == null ? undefined : na.smoker ? "yes" : "no"}
                onChange={(v) => patch({ smoker: v === "yes" })}
              />
            </Row>
            {na.smoker && (
              <Row label="סיגריות ביום">
                <NumberInput
                  value={na.cigarettesPerDay}
                  onSave={(v) => patch({ cigarettesPerDay: v })}
                />
              </Row>
            )}
            <Row label="גובה (ס״מ)">
              <NumberInput
                value={na.heightCm}
                onSave={(v) => patch({ heightCm: v })}
              />
            </Row>
            <Row label="משקל (ק״ג)">
              <NumberInput
                value={na.weightKg}
                onSave={(v) => patch({ weightKg: v })}
              />
            </Row>
          </div>
          {bmi != null && (
            <p className="mt-2 text-[11px] text-slate-500">
              BMI מחושב: <span className="font-medium text-slate-700">{bmi}</span>
            </p>
          )}
          <Row label="תחביבים מסוכנים">
            <TextInput
              value={na.dangerousHobbies ?? ""}
              placeholder="לדוגמה: צלילה, טיפוס הרים, טיסון... (או ׳אין׳)"
              onSave={(v) => patch({ dangerousHobbies: v })}
            />
          </Row>
        </Section>

        {(na.maritalStatus === "married" || na.spouse) && (
          <Section title="בן/בת זוג">
            <SpouseForm
              spouse={na.spouse}
              onSave={(spouse) => patch({ spouse })}
            />
          </Section>
        )}

        <Section title="ילדים">
          <ChildrenList
            children={na.children ?? []}
            onSave={(children) => patch({ children })}
          />
        </Section>

        <Section title="מצב כלכלי">
          <div className="grid grid-cols-2 gap-3">
            <Row label="יתרת משכנתה (₪)">
              <NumberInput
                value={na.mortgageAmount}
                onSave={(v) => patch({ mortgageAmount: v })}
              />
            </Row>
            <Row label="הלוואות אחרות (₪)">
              <NumberInput
                value={na.otherLoansAmount}
                onSave={(v) => patch({ otherLoansAmount: v })}
              />
            </Row>
          </div>
          <Row label="תלויים נוספים">
            <TextInput
              value={na.additionalDependents ?? ""}
              placeholder="לדוגמה: ילד מקשר קודם, הורה נתמך..."
              onSave={(v) => patch({ additionalDependents: v })}
            />
          </Row>
        </Section>

        <Section title="מוטבים">
          <BeneficiaryForm
            beneficiary={na.beneficiary}
            onSave={(beneficiary) => patch({ beneficiary })}
          />
        </Section>

        <Section title="הנמקה והערות">
          <Row label="הנמקה (מלל חופשי)">
            <div className="space-y-2">
              {answerBank.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {answerBank.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      title={entry.text}
                      onClick={() => {
                        const current = na.justification ?? "";
                        const next = current ? `${current}\n${entry.text}` : entry.text;
                        patch({ justification: next });
                        setJustificationKey((k) => k + 1);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2/50 px-2.5 py-1 text-[11px] text-slate-600 hover:border-cyan-500/50 hover:text-cyan-700"
                    >
                      <BookOpen className="size-3" /> {entry.title}
                    </button>
                  ))}
                </div>
              )}
              <TextArea
                key={justificationKey}
                value={na.justification ?? ""}
                placeholder="מדוע הוחלט להעביר / לא להעביר — הנימוקים ייכתבו על מסמך ההנמקה…"
                onSave={(v) => patch({ justification: v })}
              />
            </div>
          </Row>
          <Row label="הערות כלליות">
            <TextArea
              value={na.notes ?? ""}
              placeholder="סיכום פגישה, נתונים נוספים שעלו..."
              onSave={(v) => patch({ notes: v })}
            />
          </Row>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <div className="mb-2.5 text-[12px] font-semibold text-slate-700">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
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

function NumberInput({
  value,
  onSave,
}: {
  value?: number;
  onSave: (v: number | undefined) => void;
}) {
  const [v, setV] = useState(value != null ? String(value) : "");
  const commit = () => {
    const num = v.trim() === "" ? undefined : Number(v);
    if (num !== value) onSave(num);
  };
  return (
    <input
      type="number"
      dir="ltr"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      className="h-9 w-full rounded-lg border border-line bg-surface-2/60 px-3 text-[13px] text-slate-900 outline-none focus:border-cyan-500/60"
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

function SpouseForm({
  spouse,
  onSave,
}: {
  spouse?: Spouse;
  onSave: (s: Spouse) => void;
}) {
  const [draft, setDraft] = useState<Spouse>(spouse ?? {});
  const patch = (p: Partial<Spouse>) => {
    const next = { ...draft, ...p };
    setDraft(next);
    onSave(next);
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      <Row label="שם פרטי">
        <TextInput
          value={draft.firstName ?? ""}
          onSave={(v) => patch({ firstName: v })}
        />
      </Row>
      <Row label="שם משפחה">
        <TextInput
          value={draft.lastName ?? ""}
          onSave={(v) => patch({ lastName: v })}
        />
      </Row>
      <Row label="תאריך לידה">
        <input
          type="date"
          dir="ltr"
          value={draft.birthDate ?? ""}
          onChange={(e) => patch({ birthDate: e.target.value })}
          className="h-9 w-full rounded-lg border border-line bg-surface-2/60 px-3 text-[13px] text-slate-900 outline-none focus:border-cyan-500/60"
        />
      </Row>
      <Row label="מין">
        <Segmented
          options={[
            { value: "female", label: "אישה" },
            { value: "male", label: "גבר" },
          ]}
          value={draft.gender}
          onChange={(v) => patch({ gender: v as Spouse["gender"] })}
        />
      </Row>
      <Row label="מעשנ/ת">
        <Segmented
          options={[
            { value: "yes", label: "כן" },
            { value: "no", label: "לא" },
          ]}
          value={draft.smoker == null ? undefined : draft.smoker ? "yes" : "no"}
          onChange={(v) => patch({ smoker: v === "yes" })}
        />
      </Row>
    </div>
  );
}

function ChildrenList({
  children,
  onSave,
}: {
  children: Child[];
  onSave: (children: Child[]) => void;
}) {
  const add = () => {
    onSave([...children, { id: crypto.randomUUID(), firstName: "" }]);
  };
  const update = (id: string, patch: Partial<Child>) => {
    onSave(children.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };
  const remove = (id: string) => {
    onSave(children.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-2">
      {children.map((child) => (
        <div key={child.id} className="flex items-center gap-2">
          <input
            value={child.firstName}
            placeholder="שם הילד/ה"
            onChange={(e) => update(child.id, { firstName: e.target.value })}
            className="h-9 flex-1 rounded-lg border border-line bg-surface-2/60 px-3 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500/60"
          />
          <input
            type="date"
            dir="ltr"
            value={child.birthDate ?? ""}
            onChange={(e) => update(child.id, { birthDate: e.target.value })}
            className="h-9 w-40 rounded-lg border border-line bg-surface-2/60 px-2 text-[13px] text-slate-900 outline-none focus:border-cyan-500/60"
          />
          <button
            onClick={() => remove(child.id)}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-1.5 text-[12px] text-slate-500 hover:border-cyan-500/50 hover:text-cyan-700"
      >
        <Plus className="size-3.5" /> הוסף ילד/ה
      </button>
    </div>
  );
}

function BeneficiaryForm({
  beneficiary,
  onSave,
}: {
  beneficiary?: Beneficiary;
  onSave: (b: Beneficiary) => void;
}) {
  const [draft, setDraft] = useState<Beneficiary>(
    beneficiary ?? { type: "legal_heirs" },
  );
  const patch = (p: Partial<Beneficiary>) => {
    const next = { ...draft, ...p };
    setDraft(next);
    onSave(next);
  };
  return (
    <div className="space-y-3">
      <Segmented
        options={[
          { value: "specific", label: "ישות ספציפית" },
          { value: "legal_heirs", label: "יורשים על פי חוק" },
        ]}
        value={draft.type}
        onChange={(v) => patch({ type: v as BeneficiaryTypeValue })}
      />
      {draft.type === "specific" && (
        <div className="grid grid-cols-2 gap-3">
          <Row label="קרבה">
            <div className="flex flex-wrap gap-1.5">
              {RELATIONS.map((r) => (
                <Chip
                  key={r}
                  active={draft.relation === r}
                  onClick={() => patch({ relation: r })}
                >
                  {r}
                </Chip>
              ))}
            </div>
          </Row>
          <Row label="שם">
            <TextInput
              value={draft.name ?? ""}
              placeholder="שם המוטב"
              onSave={(v) => patch({ name: v })}
            />
          </Row>
        </div>
      )}
    </div>
  );
}

type BeneficiaryTypeValue = Beneficiary["type"];
