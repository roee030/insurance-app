import { motion } from "motion/react";
import { Users, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useClients } from "@/store/useClients";
import { isStuck, isTerminal } from "@/domain/pipeline";
import { cn } from "@/lib/utils";

function Stat({
  icon: Icon,
  label,
  value,
  accent,
  delay,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26, delay }}
      className="glass relative overflow-hidden rounded-2xl border border-line bg-surface/60 p-4"
    >
      <div className="micro-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative flex items-center gap-3">
        <div
          className={cn(
            "grid size-10 place-items-center rounded-xl ring-1",
            accent,
          )}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {value}
          </div>
          <div className="text-[11px] text-slate-500">{label}</div>
        </div>
      </div>
    </motion.div>
  );
}

export function StatsRow() {
  const clients = useClients((s) => s.clients);
  const active = clients.filter((c) => !isTerminal(c.stage)).length;
  const stuck = clients.filter(isStuck).length;
  const done = clients.filter((c) => isTerminal(c.stage)).length;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        icon={Users}
        label="לקוחות פעילים"
        value={active}
        accent="bg-cyan-500/10 text-cyan-700 ring-cyan-500/20"
        delay={0}
      />
      <Stat
        icon={Clock}
        label="ממתינים לתגובה"
        value={clients.filter((c) => c.stage === "sms_sent" || c.stage === "signature").length}
        accent="bg-amber-500/10 text-amber-600 ring-amber-500/20"
        delay={0.05}
      />
      <Stat
        icon={AlertTriangle}
        label="תקועים (SLA)"
        value={stuck}
        accent="bg-red-500/10 text-red-600 ring-red-500/20"
        delay={0.1}
      />
      <Stat
        icon={CheckCircle2}
        label="הושלמו"
        value={done}
        accent="bg-emerald-500/10 text-emerald-700 ring-emerald-500/20"
        delay={0.15}
      />
    </div>
  );
}
