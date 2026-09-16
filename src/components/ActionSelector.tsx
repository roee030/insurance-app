import type { ProductAction } from "@/domain/types";
import { cn, formatCurrency } from "@/lib/utils";

const KIND_LABEL: Record<ProductAction["kind"], string> = {
  transfer: "ניוד",
  new: "מוצר חדש",
  modify: "שינוי כיסויים",
  cancel: "ביטול",
};

/**
 * Checkbox picker over a client's product actions — shared by ReportsSection
 * and ContractsSection so both offer the same "select which actions this
 * report/contract covers" UI instead of two near-identical pickers.
 * Quick-filter buttons cover the common split the SMS workflow described:
 * ניוד/שינוי/ביטול (actions on an existing policy) vs. מוצר חדש.
 */
export function ActionSelector({
  actions,
  selected,
  onChange,
}: {
  actions: ProductAction[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const selectAll = () => onChange(new Set(actions.map((a) => a.id)));
  const selectByKinds = (kinds: ProductAction["kind"][]) =>
    onChange(new Set(actions.filter((a) => kinds.includes(a.kind)).map((a) => a.id)));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={selectAll}
          className="rounded-lg border border-line bg-white px-2.5 py-1 text-[17px] text-slate-600 hover:border-cyan-500/50"
        >
          הכל
        </button>
        <button
          type="button"
          onClick={() => selectByKinds(["transfer", "modify", "cancel"])}
          className="rounded-lg border border-line bg-white px-2.5 py-1 text-[17px] text-slate-600 hover:border-cyan-500/50"
        >
          רק ניוד / שינוי / ביטול
        </button>
        <button
          type="button"
          onClick={() => selectByKinds(["new"])}
          className="rounded-lg border border-line bg-white px-2.5 py-1 text-[17px] text-slate-600 hover:border-cyan-500/50"
        >
          רק מוצרים חדשים
        </button>
      </div>
      <div className="space-y-1">
        {actions.map((a) => (
          <label
            key={a.id}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[15px]",
              selected.has(a.id)
                ? "border-cyan-500/40 bg-cyan-500/[0.06]"
                : "border-line bg-white",
            )}
          >
            <input
              type="checkbox"
              checked={selected.has(a.id)}
              onChange={() => toggle(a.id)}
              className="size-4"
            />
            <span className="flex-1 text-slate-700">
              <span className="font-medium">{a.productType}</span>
              <span className="text-slate-500"> · {KIND_LABEL[a.kind]}</span>
              {a.sourceCompany && (
                <span className="text-slate-500"> · {a.sourceCompany}</span>
              )}
            </span>
            {a.monthlyPremium != null && (
              <span className="shrink-0 text-slate-500 tabular-nums">
                {formatCurrency(a.monthlyPremium)}/חודש
              </span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
