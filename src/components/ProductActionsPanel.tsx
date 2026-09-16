import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  Ban,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type {
  CancellationResponsibility,
  Client,
  PolisaSummary,
  ProductAction,
  ProductActionKind,
} from "@/domain/types";
import { useClients } from "@/store/useClients";
import { useSettings } from "@/store/useSettings";
import { cn, formatCurrency } from "@/lib/utils";
import { calculatePremium, hasCalculatorSupport } from "@/domain/premiumCalculator";
import { PRODUCT_TYPES, COMPANIES, TRACKS } from "@/domain/constants";
import type { Discount } from "@/domain/types";

// Stable reference — see NeedsAssessment.tsx for why a literal `?? []`
// fallback on a zustand selector is unsafe (infinite update loop).
const EMPTY_DISCOUNTS: Discount[] = [];

const RESPONSIBILITY: { value: CancellationResponsibility; label: string }[] = [
  { value: "agent", label: "אני (הסוכן)" },
  { value: "new_company", label: "החברה החדשה" },
  { value: "client", label: "הלקוח" },
];

/** One shared id per holding regardless of which action kind is chosen for it — switching between נייד/שינוי/ביטול on the same holding replaces the same entry instead of creating orphaned duplicates. */
function holdingActionId(polisaNumber: string) {
  return `action-${polisaNumber}`;
}

function Select({
  value,
  options,
  onChange,
  placeholder,
}: {
  value?: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-9 w-full rounded-lg border border-line bg-white px-2 text-[17px] outline-none focus:border-cyan-500/60",
        value ? "text-slate-900" : "text-slate-400",
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function ResponsibilityPicker({
  value,
  onChange,
}: {
  value?: CancellationResponsibility;
  onChange: (v: CancellationResponsibility) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[15px] text-slate-500">באחריות מי ביטול הפוליסה הקיימת</div>
      <div className="flex flex-wrap gap-1.5">
        {RESPONSIBILITY.map((r) => (
          <button
            key={r.value}
            onClick={() => onChange(r.value)}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-[16px] transition",
              value === r.value
                ? "border-violet-500/50 bg-violet-500/10 text-violet-800"
                : "border-line bg-white text-slate-500 hover:border-slate-400",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Target fields for "transfer"/"new" — a different company/track than today. */
function TargetFields({
  draft,
  onChange,
}: {
  draft: Pick<ProductAction, "targetCompany" | "targetTrack" | "monthlyPremium">;
  onChange: (patch: Partial<ProductAction>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Select
        value={draft.targetCompany}
        options={COMPANIES}
        placeholder="חברה יעד"
        onChange={(v) => onChange({ targetCompany: v })}
      />
      <Select
        value={draft.targetTrack}
        options={TRACKS}
        placeholder="מסלול יעד"
        onChange={(v) => onChange({ targetTrack: v })}
      />
      <input
        type="number"
        dir="ltr"
        value={draft.monthlyPremium ?? ""}
        onChange={(e) =>
          onChange({
            monthlyPremium: e.target.value ? Number(e.target.value) : undefined,
          })
        }
        placeholder="פרמיה חודשית ₪"
        className="h-9 rounded-lg border border-line bg-white px-2 text-[17px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500/60"
      />
    </div>
  );
}

/** Fields for "modify" — same company, changed sum insured/premium. */
function ModifyFields({
  draft,
  onChange,
}: {
  draft: Pick<ProductAction, "beforeSum" | "afterSum" | "beforePremium" | "monthlyPremium">;
  onChange: (patch: Partial<ProductAction>) => void;
}) {
  const num = (v: string) => (v === "" ? undefined : Number(v));
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-lg bg-slate-50 p-2">
        <div className="mb-1.5 text-[14px] font-medium text-slate-500">מצב לפני שינוי</div>
        <div className="space-y-1.5">
          <input
            type="number"
            dir="ltr"
            value={draft.beforeSum ?? ""}
            onChange={(e) => onChange({ beforeSum: num(e.target.value) })}
            placeholder="סכום ביטוח ₪"
            className="h-8 w-full rounded-md border border-line bg-white px-2 text-[16px] text-slate-900 outline-none placeholder:text-slate-400"
          />
          <input
            type="number"
            dir="ltr"
            value={draft.beforePremium ?? ""}
            onChange={(e) => onChange({ beforePremium: num(e.target.value) })}
            placeholder="עלות חודשית ₪"
            className="h-8 w-full rounded-md border border-line bg-white px-2 text-[16px] text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>
      <div className="rounded-lg bg-cyan-50 p-2">
        <div className="mb-1.5 text-[14px] font-medium text-cyan-700">מצב אחרי שינוי</div>
        <div className="space-y-1.5">
          <input
            type="number"
            dir="ltr"
            value={draft.afterSum ?? ""}
            onChange={(e) => onChange({ afterSum: num(e.target.value) })}
            placeholder="סכום ביטוח ₪"
            className="h-8 w-full rounded-md border border-cyan-200 bg-white px-2 text-[16px] text-slate-900 outline-none placeholder:text-slate-400"
          />
          <input
            type="number"
            dir="ltr"
            value={draft.monthlyPremium ?? ""}
            onChange={(e) => onChange({ monthlyPremium: num(e.target.value) })}
            placeholder="עלות חודשית ₪"
            className="h-8 w-full rounded-md border border-cyan-200 bg-white px-2 text-[16px] text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>
    </div>
  );
}

const KIND_META: Record<
  Exclude<ProductActionKind, "new">,
  { icon: typeof ArrowLeftRight; label: string }
> = {
  transfer: { icon: ArrowLeftRight, label: "נייד" },
  modify: { icon: Pencil, label: "שנה כיסויים" },
  cancel: { icon: Ban, label: "בטל" },
};

/** One existing Mislaka holding — decide: leave as-is, נייד, שנה כיסויים, or בטל. */
function HoldingRow({ client, holding }: { client: Client; holding: PolisaSummary }) {
  const save = useClients((s) => s.saveProductAction);
  const remove = useClients((s) => s.removeProductAction);
  const id = holdingActionId(holding.polisa_number);
  const existing = client.productActions?.find((a) => a.id === id);
  const [open, setOpen] = useState(Boolean(existing));
  const [draft, setDraft] = useState<ProductAction>(
    existing ?? {
      id,
      productType: holding.product_type,
      kind: "transfer",
      sourceCompany: holding.manufacturer,
      sourcePolisaNumber: holding.polisa_number,
      sourceBalance: holding.balance,
      createdAt: "",
    },
  );

  const isComplete = (a: ProductAction) => {
    if (a.kind === "transfer") return Boolean(a.targetCompany && a.targetTrack && a.cancellationResponsibility);
    if (a.kind === "cancel") return Boolean(a.cancellationResponsibility);
    if (a.kind === "modify") return Boolean(a.afterSum != null || a.monthlyPremium != null);
    return false;
  };

  const patch = (p: Partial<ProductAction>) => {
    const next = { ...draft, ...p };
    setDraft(next);
    if (isComplete(next)) void save(client.id, next).catch(() => {});
  };

  const pickKind = (kind: Exclude<ProductActionKind, "new">) => {
    const base: ProductAction = {
      id,
      productType: holding.product_type,
      kind,
      sourceCompany: holding.manufacturer,
      sourcePolisaNumber: holding.polisa_number,
      sourceBalance: holding.balance,
      createdAt: "",
    };
    if (kind === "modify") {
      // same company/track — required by the server for record-keeping, not user-editable here
      base.targetCompany = holding.manufacturer;
      base.targetTrack = holding.track;
      base.beforeSum = undefined;
    }
    setDraft(base);
    setOpen(true);
  };

  const closeAndClear = () => {
    setOpen(false);
    if (existing) void remove(client.id, id).catch(() => {});
    setDraft({
      id,
      productType: holding.product_type,
      kind: "transfer",
      sourceCompany: holding.manufacturer,
      sourcePolisaNumber: holding.polisa_number,
      sourceBalance: holding.balance,
      createdAt: "",
    });
  };

  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[17px] font-medium text-slate-800">
            {holding.manufacturer} · {holding.product_type}
          </div>
          <div className="text-[15px] text-slate-500">
            צבירה: {formatCurrency(holding.balance ?? 0)}
            {holding.track ? ` · ${holding.track}` : ""}
          </div>
        </div>
        {!open ? (
          <div className="flex shrink-0 items-center gap-1">
            {(["transfer", "modify", "cancel"] as const).map((k) => {
              const meta = KIND_META[k];
              const Icon = meta.icon;
              return (
                <button
                  key={k}
                  onClick={() => pickKind(k)}
                  title={meta.label}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1.5 text-[15px] font-medium text-slate-600 hover:bg-cyan-50 hover:text-cyan-700"
                >
                  <Icon className="size-3.5" /> {meta.label}
                </button>
              );
            })}
          </div>
        ) : (
          <button
            onClick={closeAndClear}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="בטל פעולה"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && draft.kind !== "new" && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          {draft.kind === "transfer" && (
            <>
              <div className="text-[15px] text-slate-500">
                מנייד מ־<span className="font-medium text-slate-700">{holding.manufacturer}</span> אל:
              </div>
              <TargetFields draft={draft} onChange={patch} />
              {hasCalculatorSupport(draft.productType, draft.targetCompany) && (
                <PremiumSuggestButton draft={draft} onApply={(p) => patch({ monthlyPremium: p })} />
              )}
              <ResponsibilityPicker
                value={draft.cancellationResponsibility}
                onChange={(v) => patch({ cancellationResponsibility: v })}
              />
            </>
          )}
          {draft.kind === "modify" && (
            <ModifyFields draft={draft} onChange={patch} />
          )}
          {draft.kind === "cancel" && (
            <ResponsibilityPicker
              value={draft.cancellationResponsibility}
              onChange={(v) => patch({ cancellationResponsibility: v })}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** A standalone new policy that has no matching Mislaka holding. */
function NewProductCard({ client, onClose }: { client: Client; onClose: () => void }) {
  const save = useClients((s) => s.saveProductAction);
  const remove = useClients((s) => s.removeProductAction);
  const [id] = useState(() => `new-${crypto.randomUUID().slice(0, 8)}`);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<ProductAction>({
    id,
    productType: "",
    kind: "new",
    createdAt: "",
  });

  const patch = (p: Partial<ProductAction>) => {
    const next = { ...draft, ...p };
    setDraft(next);
    if (next.productType && next.targetCompany && next.targetTrack) {
      setSaved(true);
      // Once fully filled, this draft becomes a persisted action and is
      // taken over by ExistingNewCard (rendered from client.productActions)
      // — close the draft so the two don't render side by side.
      void save(client.id, next)
        .then(onClose)
        .catch(() => {});
    }
  };

  return (
    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[16px] font-medium text-emerald-700">
          מוצר חדש (ללא זכות קיימת)
        </span>
        <button
          onClick={() => {
            // Only something already persisted (all required fields were
            // filled at some point) needs an actual delete call — otherwise
            // there's nothing on the server to remove.
            if (saved) void remove(client.id, id).catch(() => {});
            onClose();
          }}
          className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="mb-2">
        <Select
          value={draft.productType}
          options={PRODUCT_TYPES}
          placeholder="סוג המוצר"
          onChange={(v) => patch({ productType: v })}
        />
      </div>
      <TargetFields draft={draft} onChange={patch} />
      {hasCalculatorSupport(draft.productType, draft.targetCompany) && (
        <div className="mt-2">
          <PremiumSuggestButton draft={draft} onApply={(p) => patch({ monthlyPremium: p })} />
        </div>
      )}
    </div>
  );
}

/**
 * Shows a "חשב פרמיה" button when the calculator has placeholder-tariff
 * coverage for this product/company — see domain/premiumCalculator.ts for
 * the explicit disclaimer that these are estimates, not real insurer rates.
 */
function PremiumSuggestButton({
  draft,
  onApply,
}: {
  draft: Pick<ProductAction, "productType" | "targetCompany" | "sourceBalance">;
  onApply: (premium: number) => void;
}) {
  const discounts = useSettings((s) => s.settings?.discounts ?? EMPTY_DISCOUNTS);
  const result = calculatePremium(
    {
      productType: draft.productType,
      company: draft.targetCompany,
      sumInsured: draft.sourceBalance,
    },
    discounts,
  );
  if (!result) return null;
  return (
    <button
      type="button"
      onClick={() => onApply(result.monthlyPremium)}
      className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed border-cyan-400/50 bg-cyan-50/50 px-2.5 py-1.5 text-[15px] text-cyan-700 hover:bg-cyan-100/60"
      title="אומדן בלבד — מבוסס על טבלת תעריפים לדוגמה, לא תעריף רשמי מהחברה"
    >
      חשב פרמיה (אומדן)
      {result.appliedDiscount ? (
        <>
          <span className="line-through opacity-60">
            {formatCurrency(result.baseMonthlyPremium)}
          </span>
          → {formatCurrency(result.monthlyPremium)}/חודש (הנחת {result.appliedDiscount.name}{" "}
          {result.appliedDiscount.percent}%)
        </>
      ) : (
        <>→ {formatCurrency(result.monthlyPremium)}/חודש</>
      )}
    </button>
  );
}

export function ProductActionsPanel({ client }: { client: Client }) {
  const holdings = client.mislaka?.polisot ?? [];
  const newActions = (client.productActions ?? []).filter((a) => a.kind === "new");
  const [addingNew, setAddingNew] = useState(false);
  const loadSettings = useSettings((s) => s.load);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4">
      <div className="mb-3 flex items-center gap-2 text-base font-semibold text-cyan-700">
        <Sparkles className="size-3.5" /> ניוד ופתיחת מוצרים — לכל מוצר בנפרד
      </div>
      <p className="mb-3 text-[15px] text-slate-500">
        עבור כל מוצר קיים בחר אם לנייד, לשנות כיסויים, לבטל, או להשאיר ללא
        שינוי. ניתן גם לפתוח מוצר חדש שלא קיים היום.
      </p>

      <div className="space-y-2">
        {holdings.map((h) => (
          <HoldingRow key={h.polisa_number} client={client} holding={h} />
        ))}
        {newActions.map((a) => (
          <ExistingNewCard key={a.id} client={client} action={a} />
        ))}
        {addingNew && (
          <NewProductCard client={client} onClose={() => setAddingNew(false)} />
        )}
      </div>

      <button
        onClick={() => setAddingNew(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-cyan-500/40 px-3 py-1.5 text-[16px] text-cyan-700 hover:bg-cyan-500/10"
      >
        <Plus className="size-3.5" /> הוסף פתיחת מוצר חדש
      </button>
    </div>
  );
}

function ExistingNewCard({ client, action }: { client: Client; action: ProductAction }) {
  const save = useClients((s) => s.saveProductAction);
  const remove = useClients((s) => s.removeProductAction);
  const [draft, setDraft] = useState(action);

  const patch = (p: Partial<ProductAction>) => {
    const next = { ...draft, ...p };
    setDraft(next);
    void save(client.id, next).catch(() => {});
  };

  return (
    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[16px] font-medium text-emerald-700">
          מוצר חדש · {draft.productType}
        </span>
        <button
          onClick={() => void remove(client.id, action.id).catch(() => {})}
          className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-500"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <TargetFields draft={draft} onChange={patch} />
    </div>
  );
}
