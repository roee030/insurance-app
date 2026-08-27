import { motion } from "motion/react";
import { Clock, AlertTriangle, Phone } from "lucide-react";
import type { Client } from "@/domain/types";
import { hoursInStage, isStuck, STAGES } from "@/domain/pipeline";
import { Avatar } from "./Avatar";
import { OwnerChip } from "./StageBadge";
import { cn } from "@/lib/utils";

export function ClientCard({
  client,
  onClick,
  selected,
}: {
  client: Client;
  onClick: () => void;
  selected?: boolean;
}) {
  const meta = STAGES[client.stage];
  const stuck = isStuck(client);
  const hrs = Math.round(hoursInStage(client));

  return (
    <motion.button
      layout
      onClick={onClick}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 350, damping: 25, mass: 0.8 }}
      className={cn(
        "group w-full rounded-xl border border-line bg-surface p-3 text-right transition-colors hover:border-zinc-600/80 cursor-pointer",
        selected && "border-emerald-500/50 ring-1 ring-emerald-500/30",
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar name={`${client.firstName} ${client.lastName}`} size={38} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">
            {client.firstName} {client.lastName}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Phone className="size-3" />
            <span dir="ltr">{client.mobile}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <OwnerChip owner={meta.owner} />
        <div
          className={cn(
            "inline-flex items-center gap-1 text-[11px]",
            stuck ? "text-amber-600" : "text-slate-500",
          )}
        >
          {stuck ? (
            <AlertTriangle className="size-3" />
          ) : (
            <Clock className="size-3" />
          )}
          {hrs < 1 ? "הרגע" : `${hrs} ש׳ בשלב`}
        </div>
      </div>

      {(client.productActions?.length ?? 0) > 0 && (
        <div className="mt-2 truncate rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-500">
          {client.productActions!.length === 1
            ? `${client.productActions![0].targetCompany} · ${client.productActions![0].productType}`
            : `${client.productActions!.length} מוצרים בטיפול`}
        </div>
      )}
    </motion.button>
  );
}
