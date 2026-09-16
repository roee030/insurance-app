import type { Client } from "@/domain/types";
import { STAGES } from "@/domain/pipeline";
import { ACCENT } from "./accents";
import { cn, timeAgo } from "@/lib/utils";

export function Timeline({ client }: { client: Client }) {
  const events = [...client.history].reverse();
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 text-base font-semibold text-slate-700">ציר זמן</div>
      <ol className="space-y-0">
        {events.map((e, i) => {
          const meta = STAGES[e.stage];
          const a = ACCENT[meta.accent];
          const last = i === events.length - 1;
          return (
            <li key={e.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "mt-1 size-2.5 shrink-0 rounded-full ring-4 ring-surface",
                    a.dot,
                  )}
                />
                {!last && <span className="w-px flex-1 bg-line" />}
              </div>
              <div className={cn("pb-4", last && "pb-0")}>
                <div className="text-[17px] font-medium text-slate-800">
                  {meta.label}
                </div>
                {e.note && (
                  <div className="text-[15px] text-slate-500">{e.note}</div>
                )}
                <div className="text-[15px] text-slate-400">{timeAgo(e.at)}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
