import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Percent,
  Plus,
  Settings as SettingsIcon,
  Trash2,
  User,
} from "lucide-react";
import type {
  AgentProfile,
  AnswerBankEntry,
  Discount,
  DiscountTier,
  PrimaryManufacturer,
} from "@/domain/types";
import { PRODUCT_TYPES, COMPANIES, BRANCHES } from "@/domain/constants";
import { useSettings } from "@/store/useSettings";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type TabId = "profile" | "answerBank" | "discounts" | "manufacturers";

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "profile", label: "פרופיל סוכן", icon: User },
  { id: "answerBank", label: "בנק תשובות", icon: BookOpen },
  { id: "discounts", label: "ניהול הנחות", icon: Percent },
  { id: "manufacturers", label: "יצרנים עיקריים", icon: Building2 },
];

export function SettingsPage() {
  const { settings, loading, load } = useSettings();
  const [tab, setTab] = useState<TabId>("profile");

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 lg:p-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-[17px] text-slate-500 hover:text-slate-700"
      >
        <ArrowRight className="size-4" /> חזרה לצנרת
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900">
          <SettingsIcon className="size-5 text-slate-500" /> הגדרות
        </h1>
        <p className="text-base text-slate-500">
          פרופיל סוכן, בנק תשובות, ניהול הנחות וגילוי יצרנים עיקריים
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-line pb-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[17px] font-medium transition",
                tab === t.id
                  ? "bg-cyan-500/10 text-cyan-700"
                  : "text-slate-500 hover:bg-slate-100",
              )}
            >
              <Icon className="size-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {loading || !settings ? (
        <div className="py-12 text-center text-lg text-slate-400">טוען…</div>
      ) : (
        <>
          {tab === "profile" && <ProfileTab profile={settings.agentProfile} />}
          {tab === "answerBank" && <AnswerBankTab entries={settings.answerBank} />}
          {tab === "discounts" && <DiscountsTab discounts={settings.discounts} />}
          {tab === "manufacturers" && (
            <ManufacturersTab manufacturers={settings.manufacturers} />
          )}
        </>
      )}
    </main>
  );
}

/* ---------------------------------------------------------------------- */
/* פרופיל סוכן */

function ProfileTab({ profile }: { profile: AgentProfile }) {
  const save = useSettings((s) => s.saveAgentProfile);
  const [draft, setDraft] = useState<AgentProfile>(profile);

  const patch = (p: Partial<AgentProfile>) => {
    const next = { ...draft, ...p };
    setDraft(next);
    void save(p);
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-4 text-lg font-semibold text-slate-800">
        פרטי הסוכן והסוכנות
      </div>
      <p className="mb-4 text-[15px] text-slate-500">
        מוצגים בכל דוח ללקוח ובעמוד החתימה — מזהים אותך מול הלקוח.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <LabeledInput
          label="שם הסוכן"
          value={draft.agentName ?? ""}
          onSave={(v) => patch({ agentName: v })}
        />
        <LabeledInput
          label="שם הסוכנות"
          value={draft.agencyName ?? ""}
          onSave={(v) => patch({ agencyName: v })}
        />
        <LabeledInput
          label="מספר רישיון סוכן"
          value={draft.licenseNumber ?? ""}
          onSave={(v) => patch({ licenseNumber: v })}
        />
        <LabeledInput
          label="קישור ללוגו (URL)"
          value={draft.logoUrl ?? ""}
          onSave={(v) => patch({ logoUrl: v })}
        />
      </div>
      <div className="mt-3">
        <div className="mb-1.5 text-[15px] font-medium text-slate-500">
          תיאור קצר / ביו
        </div>
        <textarea
          value={draft.bio ?? ""}
          onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
          onBlur={(e) => patch({ bio: e.target.value })}
          rows={3}
          placeholder="ניסיון, התמחויות, מילות פתיחה לדוח..."
          className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-[17px] leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500/60"
        />
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onSave,
  placeholder,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
}) {
  const [v, setV] = useState(value);
  return (
    <div>
      <div className="mb-1.5 text-[15px] font-medium text-slate-500">{label}</div>
      <input
        value={v}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onSave(v.trim())}
        className="h-9 w-full rounded-lg border border-line bg-white px-3 text-[17px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500/60"
      />
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* בנק תשובות */

function emptyAnswer(): AnswerBankEntry {
  return { id: crypto.randomUUID(), title: "", text: "" };
}

function AnswerBankTab({ entries }: { entries: AnswerBankEntry[] }) {
  const save = useSettings((s) => s.saveAnswerBankEntry);
  const remove = useSettings((s) => s.deleteAnswerBankEntry);
  const [adding, setAdding] = useState<AnswerBankEntry | null>(null);

  return (
    <div className="space-y-2">
      <p className="mb-1 text-[15px] text-slate-500">
        קטעי נימוקים/תשובות שחוזרים על עצמם — ניתן להוסיף אותם ישירות לשדה
        ״הנמקה״ בבירור הצרכים של כל לקוח.
      </p>
      {entries.map((e) => (
        <AnswerCard key={e.id} entry={e} onSave={save} onRemove={remove} />
      ))}
      {adding ? (
        <AnswerCard
          entry={adding}
          editing
          onSave={async (e) => {
            await save(e);
            setAdding(null);
          }}
          onRemove={async () => setAdding(null)}
        />
      ) : (
        <button
          onClick={() => setAdding(emptyAnswer())}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-[16px] text-slate-500 hover:border-cyan-500/50 hover:text-cyan-700"
        >
          <Plus className="size-3.5" /> הוסף קטע תשובה
        </button>
      )}
    </div>
  );
}

function AnswerCard({
  entry,
  editing,
  onSave,
  onRemove,
}: {
  entry: AnswerBankEntry;
  editing?: boolean;
  onSave: (e: AnswerBankEntry) => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState(entry);
  const patch = (p: Partial<AnswerBankEntry>) => {
    const next = { ...draft, ...p };
    setDraft(next);
    if (!editing && next.title && next.text) void onSave(next);
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="mb-2 flex items-center gap-2">
        <input
          value={draft.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="כותרת קצרה (לדוגמה: ׳דמי ניהול נמוכים משמעותית׳)"
          className="h-9 flex-1 rounded-lg border border-line bg-white px-3 text-[17px] font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500/60"
        />
        <select
          value={draft.productType ?? ""}
          onChange={(e) => patch({ productType: e.target.value || undefined })}
          className="h-9 rounded-lg border border-line bg-white px-2 text-[16px] text-slate-600 outline-none"
        >
          <option value="">כל סוגי המוצר</option>
          {PRODUCT_TYPES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          onClick={() => void onRemove(entry.id)}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <textarea
        value={draft.text}
        onChange={(e) => patch({ text: e.target.value })}
        rows={2}
        placeholder="נוסח הקטע שיוכנס להנמקה..."
        className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-[17px] leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500/60"
      />
      {editing && (
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            disabled={!draft.title || !draft.text}
            onClick={() => void onSave(draft)}
          >
            שמור
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* ניהול הנחות */

function emptyDiscount(): Discount {
  return { id: crypto.randomUUID(), name: "", scope: "personal", tiers: [] };
}

function DiscountsTab({ discounts }: { discounts: Discount[] }) {
  const save = useSettings((s) => s.saveDiscount);
  const remove = useSettings((s) => s.deleteDiscount);
  const [adding, setAdding] = useState<Discount | null>(null);

  return (
    <div className="space-y-2">
      <p className="mb-1 text-[15px] text-slate-500">
        הנחות אישיות של הסוכן או הנחות מערכת של החברה, לפי שלבים (חודשים
        מתחילת הפוליסה) עם אחוז שונה בכל שלב.
      </p>
      {discounts.map((d) => (
        <DiscountCard key={d.id} discount={d} onSave={save} onRemove={remove} />
      ))}
      {adding ? (
        <DiscountCard
          discount={adding}
          editing
          onSave={async (d) => {
            await save(d);
            setAdding(null);
          }}
          onRemove={async () => setAdding(null)}
        />
      ) : (
        <button
          onClick={() => setAdding(emptyDiscount())}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-[16px] text-slate-500 hover:border-cyan-500/50 hover:text-cyan-700"
        >
          <Plus className="size-3.5" /> הוסף הנחה
        </button>
      )}
    </div>
  );
}

function DiscountCard({
  discount,
  editing,
  onSave,
  onRemove,
}: {
  discount: Discount;
  editing?: boolean;
  onSave: (d: Discount) => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState(discount);
  const patch = (p: Partial<Discount>) => {
    const next = { ...draft, ...p };
    setDraft(next);
    if (!editing && next.name) void onSave(next);
  };

  const addTier = () => {
    const tiers = [
      ...draft.tiers,
      { id: crypto.randomUUID(), fromMonth: 0, percent: 0 } as DiscountTier,
    ];
    patch({ tiers });
  };
  const updateTier = (id: string, p: Partial<DiscountTier>) => {
    patch({ tiers: draft.tiers.map((t) => (t.id === id ? { ...t, ...p } : t)) });
  };
  const removeTier = (id: string) => {
    patch({ tiers: draft.tiers.filter((t) => t.id !== id) });
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          value={draft.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="שם ההנחה"
          className="h-9 flex-1 rounded-lg border border-line bg-white px-3 text-[17px] font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500/60"
        />
        <div className="flex gap-1">
          {(["personal", "system"] as const).map((s) => (
            <button
              key={s}
              onClick={() => patch({ scope: s })}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-[16px]",
                draft.scope === s
                  ? "border-violet-500/50 bg-violet-500/10 text-violet-800"
                  : "border-line bg-white text-slate-500",
              )}
            >
              {s === "personal" ? "אישית" : "מערכת"}
            </button>
          ))}
        </div>
        <select
          value={draft.company ?? ""}
          onChange={(e) => patch({ company: e.target.value || undefined })}
          className="h-9 rounded-lg border border-line bg-white px-2 text-[16px] text-slate-600 outline-none"
        >
          <option value="">כל החברות</option>
          {COMPANIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={() => void onRemove(discount.id)}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        {draft.tiers.map((t) => (
          <div key={t.id} className="flex items-center gap-2 text-[16px]">
            <span className="text-slate-500">מחודש</span>
            <input
              type="number"
              dir="ltr"
              value={t.fromMonth}
              onChange={(e) => updateTier(t.id, { fromMonth: Number(e.target.value) })}
              className="h-8 w-16 rounded-md border border-line bg-white px-2 text-slate-900 outline-none"
            />
            <span className="text-slate-500">עד</span>
            <input
              type="number"
              dir="ltr"
              value={t.toMonth ?? ""}
              placeholder="∞"
              onChange={(e) =>
                updateTier(t.id, {
                  toMonth: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="h-8 w-16 rounded-md border border-line bg-white px-2 text-slate-900 outline-none placeholder:text-slate-400"
            />
            <span className="text-slate-500">הנחה %</span>
            <input
              type="number"
              dir="ltr"
              value={t.percent}
              onChange={(e) => updateTier(t.id, { percent: Number(e.target.value) })}
              className="h-8 w-16 rounded-md border border-line bg-white px-2 text-slate-900 outline-none"
            />
            <button
              onClick={() => removeTier(t.id)}
              className="grid size-8 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={addTier}
          className="inline-flex items-center gap-1 text-[15px] text-cyan-700 hover:underline"
        >
          <Plus className="size-3" /> הוסף שלב
        </button>
      </div>

      {editing && (
        <div className="mt-2 flex justify-end">
          <Button size="sm" disabled={!draft.name} onClick={() => void onSave(draft)}>
            שמור
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* יצרנים עיקריים */

function emptyManufacturer(): PrimaryManufacturer {
  return { id: crypto.randomUUID(), company: "", branch: "", commissionPercent: 0 };
}

function ManufacturersTab({ manufacturers }: { manufacturers: PrimaryManufacturer[] }) {
  const save = useSettings((s) => s.saveManufacturer);
  const remove = useSettings((s) => s.deleteManufacturer);
  const [adding, setAdding] = useState<PrimaryManufacturer | null>(null);

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2 text-[15px] text-amber-800">
        חובה רגולטורית: כאשר עמלה מיצרן מסוים בענף מסוים עולה על 40%, יש
        לגלות זאת ללקוח בדוח. שורות עם עמלה 40% ומעלה יופיעו אוטומטית בדוח
        הלקוח.
      </div>
      {manufacturers.map((m) => (
        <ManufacturerCard key={m.id} m={m} onSave={save} onRemove={remove} />
      ))}
      {adding ? (
        <ManufacturerCard
          m={adding}
          editing
          onSave={async (m) => {
            await save(m);
            setAdding(null);
          }}
          onRemove={async () => setAdding(null)}
        />
      ) : (
        <button
          onClick={() => setAdding(emptyManufacturer())}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-[16px] text-slate-500 hover:border-cyan-500/50 hover:text-cyan-700"
        >
          <Plus className="size-3.5" /> הוסף יצרן
        </button>
      )}
    </div>
  );
}

function ManufacturerCard({
  m,
  editing,
  onSave,
  onRemove,
}: {
  m: PrimaryManufacturer;
  editing?: boolean;
  onSave: (m: PrimaryManufacturer) => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState(m);
  const patch = (p: Partial<PrimaryManufacturer>) => {
    const next = { ...draft, ...p };
    setDraft(next);
    if (!editing && next.company && next.branch) void onSave(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3">
      <select
        value={draft.company}
        onChange={(e) => patch({ company: e.target.value })}
        className="h-9 flex-1 rounded-lg border border-line bg-white px-2 text-[17px] text-slate-900 outline-none"
      >
        <option value="">חברה</option>
        {COMPANIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        value={draft.branch}
        onChange={(e) => patch({ branch: e.target.value })}
        className="h-9 rounded-lg border border-line bg-white px-2 text-[17px] text-slate-900 outline-none"
      >
        <option value="">ענף</option>
        {BRANCHES.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-1">
        <input
          type="number"
          dir="ltr"
          value={draft.commissionPercent}
          onChange={(e) => patch({ commissionPercent: Number(e.target.value) })}
          className={cn(
            "h-9 w-20 rounded-lg border bg-white px-2 text-[17px] text-slate-900 outline-none",
            draft.commissionPercent >= 40 ? "border-amber-400" : "border-line",
          )}
        />
        <span className="text-[16px] text-slate-500">% עמלה</span>
      </div>
      <button
        onClick={() => void onRemove(m.id)}
        className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
      >
        <Trash2 className="size-4" />
      </button>
      {editing && (
        <Button
          size="sm"
          disabled={!draft.company || !draft.branch}
          onClick={() => void onSave(draft)}
        >
          שמור
        </Button>
      )}
    </div>
  );
}
