import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wallet,
  Activity,
} from "lucide-react";
import { useClients } from "@/store/useClients";
import { computeAgentStats } from "@/domain/analytics";
import { formatCurrency } from "@/lib/utils";

export function AgentDashboardPage() {
  const clients = useClients((s) => s.clients);
  const stats = computeAgentStats(clients);
  const maxTrend = Math.max(1, ...stats.trend.map((t) => t.closedCount));

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 lg:p-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700"
      >
        <ArrowRight className="size-4" /> חזרה לצנרת
      </Link>

      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">
          ביצועים
        </h1>
        <p className="text-xs text-slate-500">
          סיכום הפעילות שלך — החודש ובכלל
        </p>
      </div>

      {/* headline KPIs — this month */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          icon={CheckCircle2}
          label="נסגרו החודש"
          value={String(stats.monthClosedCount)}
          accent="emerald"
        />
        <Kpi
          icon={Wallet}
          label="פרמיה חודשית שנסגרה"
          value={formatCurrency(stats.monthPremium)}
          accent="cyan"
        />
        <Kpi
          icon={TrendingUp}
          label="צבירה מנוידת החודש"
          value={formatCurrency(stats.monthTransferredBalance)}
          accent="violet"
        />
        <Kpi
          icon={AlertTriangle}
          label="נכשלו החודש"
          value={String(stats.monthFailedCount)}
          accent={stats.monthFailedCount > 0 ? "red" : "emerald"}
        />
      </div>

      {/* trend */}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Activity className="size-4 text-cyan-600" /> עסקאות שנסגרו — 6 חודשים אחרונים
        </div>
        <div className="flex items-end gap-3" style={{ height: 120 }}>
          {stats.trend.map((t) => (
            <div key={t.label} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-600">
                {t.closedCount || ""}
              </span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(4, (t.closedCount / maxTrend) * 88)}px` }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
                className="w-full rounded-t-md bg-gradient-to-t from-emerald-500 to-emerald-400"
              />
              <span className="text-[10px] text-slate-400">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* pipeline health + all-time */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Activity} label="בטיפול כעת" value={String(stats.activeCount)} accent="cyan" />
        <Kpi
          icon={AlertTriangle}
          label="תקועים (SLA)"
          value={String(stats.stuckCount)}
          accent={stats.stuckCount > 0 ? "amber" : "emerald"}
        />
        <Kpi icon={CheckCircle2} label="נסגרו סה״כ" value={String(stats.totalClosedCount)} accent="emerald" />
        <Kpi
          icon={Clock}
          label="זמן טיפול ממוצע"
          value={stats.avgDaysToClose != null ? `${stats.avgDaysToClose} ימים` : "—"}
          accent="violet"
        />
      </div>
    </main>
  );
}

const ACCENT_CLS: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
  cyan: "bg-cyan-500/10 text-cyan-600 ring-cyan-500/20",
  violet: "bg-violet-500/10 text-violet-600 ring-violet-500/20",
  amber: "bg-amber-500/10 text-amber-600 ring-amber-500/20",
  red: "bg-red-500/10 text-red-600 ring-red-500/20",
};

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
  accent: keyof typeof ACCENT_CLS;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="card-shadow rounded-2xl border border-line bg-surface p-4"
    >
      <div className={`mb-2 grid size-9 place-items-center rounded-xl ring-1 ${ACCENT_CLS[accent]}`}>
        <Icon className="size-4.5" />
      </div>
      <div className="text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
        {value}
      </div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </motion.div>
  );
}
