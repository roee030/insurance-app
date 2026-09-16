import { cn } from "@/lib/utils";
import { STAGES } from "@/domain/pipeline";
import type { StageId } from "@/domain/types";
import { ACCENT } from "./accents";

export function StageBadge({
  stage,
  className,
}: {
  stage: StageId;
  className?: string;
}) {
  const meta = STAGES[stage];
  const a = ACCENT[meta.accent];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-base font-medium ring-1",
        a.bg,
        a.text,
        a.ring,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", a.dot)} />
      {meta.label}
    </span>
  );
}

export function OwnerChip({ owner }: { owner: "agent" | "client" | "done" }) {
  const map = {
    agent: { label: "אצלך", cls: "text-cyan-700 bg-cyan-500/10 ring-cyan-500/20" },
    client: {
      label: "אצל הלקוח",
      cls: "text-amber-600 bg-amber-500/10 ring-amber-500/20",
    },
    done: {
      label: "הושלם",
      cls: "text-green-700 bg-green-500/10 ring-green-500/20",
    },
  }[owner];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[15px] font-medium ring-1",
        map.cls,
      )}
    >
      {map.label}
    </span>
  );
}
