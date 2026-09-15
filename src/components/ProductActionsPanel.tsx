import { useState } from "react";
import { ArrowLeftRight, Plus, Sparkles, Trash2, X } from "lucide-react";
import type { Client, PolisaSummary, ProductAction } from "@/domain/types";
import { useClients } from "@/store/useClients";
import { cn, formatCurrency } from "@/lib/utils";

const PRODUCT_TYPES = [
  "פנסיה מקיפה",
  "ביטוח מנהלים",
  "ביטוח חיים",
  "ביטוח בריאות",
  "קרן השתלמות",
  "גמל להשקעה",
];
const COMPANIES = [
  "מגדל",
  "הראל",
  "כלל",
  "הפניקס",
  "מנורה מבטחים",
  "אלטשולר שחם",
  "מור",
];
const TRACKS = [
  "מסלול כללי",
  "מסלול מניות עד 50",
  "מסלול אג״ח",
  "מסלול מותאם גיל",
  "מושלם פלטינום",
];

function transferId(polisaNumber: string) {
  return `transfer-${polisaNumber}`;
}

function Select({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-9 w-full rounded-lg border border-line bg-white px-2 text-[13px] outline-none focus:border-cyan-500/60",
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

/** Editable target fields for one product action — shared by both card types. */
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
        className="h-9 rounded-lg border border-line bg-white px-2 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500/60"
      />
    </div>
  );
}

/** One existing Mislaka holding — decide: leave as-is, or ניוד to a new company. */
function HoldingRow({
  client,
  holding,
}: {
  client: Client;
  holding: PolisaSummary;
}) {
  const save = useClients((s) => s.saveProductAction);
  const remove = useClients((s) => s.removeProductAction);
  const id = transferId(holding.polisa_number);
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
      targetCompany: "",
      targetTrack: "",
      monthlyPremium: undefined,
      createdAt: "",
    },
  );

  const patch = (p: Partial<ProductAction>) => {
    const next = { ...draft, ...p };
    setDraft(next);
    if (next.targetCompany && next.targetTrack) {
      void save(client.id, next).catch(() => {});
    }
  };

  const cancel = () => {
    setOpen(false);
    if (existing) void remove(client.id, id).catch(() => {});
    setDraft({ ...draft, targetCompany: "", targetTrack: "" });
  };

  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-slate-800">
            {holding.manufacturer} · {holding.product_type}
          </div>
          <div className="text-[11px] text-slate-500">
            צבירה: {formatCurrency(holding.balance ?? 0)}
            {holding.track ? ` · ${holding.track}` : ""}
          </div>
        </div>
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-cyan-50 px-2.5 py-1.5 text-[12px] font-medium text-cyan-700 hover:bg-cyan-100"
          >
            <ArrowLeftRight className="size-3.5" /> נייד
          </button>
        ) : (
          <button
            onClick={cancel}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="בטל ניוד"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="mb-2 text-[11px] text-slate-500">
            מנייד מ־<span className="font-medium text-slate-700">{holding.manufacturer}</span> אל:
          </div>
          <TargetFields draft={draft} onChange={patch} />
        </div>
      )}
    </div>
  );
}

/** A standalone new policy that has no matching Mislaka holding. */
function NewProductCard({ client }: { client: Client }) {
  const save = useClients((s) => s.saveProductAction);
  const remove = useClients((s) => s.removeProductAction);
  const [id] = useState(() => `new-${crypto.randomUUID().slice(0, 8)}`);
  const [draft, setDraft] = useState<ProductAction>({
    id,
    productType: "",
    kind: "new",
    targetCompany: "",
    targetTrack: "",
    monthlyPremium: undefined,
    createdAt: "",
  });

  const patch = (p: Partial<ProductAction>) => {
    const next = { ...draft, ...p };
    setDraft(next);
    if (next.productType && next.targetCompany && next.targetTrack) {
      void save(client.id, next).catch(() => {});
    }
  };

  return (
    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-medium text-emerald-700">
          מוצר חדש (ללא זכות קיימת)
        </span>
        <button
          onClick={() => void remove(client.id, id).catch(() => {})}
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
    </div>
  );
}

export function ProductActionsPanel({ client }: { client: Client }) {
  const holdings = client.mislaka?.polisot ?? [];
  const newActions = (client.productActions ?? []).filter(
    (a) => a.kind === "new",
  );
  const [addingNew, setAddingNew] = useState(false);

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-cyan-700">
        <Sparkles className="size-3.5" /> ניוד ופתיחת מוצרים — לכל מוצר בנפרד
      </div>
      <p className="mb-3 text-[11px] text-slate-500">
        עבור כל מוצר קיים בחר האם לנייד אותו לחברה אחרת, או השאר ללא שינוי.
        ניתן גם לפתוח מוצר חדש שלא קיים היום.
      </p>

      <div className="space-y-2">
        {holdings.map((h) => (
          <HoldingRow key={h.polisa_number} client={client} holding={h} />
        ))}
        {newActions.map((a) => (
          <ExistingNewCard key={a.id} client={client} action={a} />
        ))}
        {addingNew && <NewProductCard client={client} />}
      </div>

      <button
        onClick={() => setAddingNew(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-cyan-500/40 px-3 py-1.5 text-[12px] text-cyan-700 hover:bg-cyan-500/10"
      >
        <Plus className="size-3.5" /> הוסף פתיחת מוצר חדש
      </button>
    </div>
  );
}

function ExistingNewCard({
  client,
  action,
}: {
  client: Client;
  action: ProductAction;
}) {
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
        <span className="text-[12px] font-medium text-emerald-700">
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
