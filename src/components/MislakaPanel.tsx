import { motion } from "motion/react";
import { ShieldCheck, TrendingUp } from "lucide-react";
import type { MislakaResult } from "@/domain/types";
import { formatDate, formatCurrency as fmt, cn } from "@/lib/utils";

export function MislakaPanel({
  data,
  detailed = false,
}: {
  data: MislakaResult;
  detailed?: boolean;
}) {
  const total = data.polisot.reduce((s, p) => s + (p.balance ?? 0), 0);
  const totalDeposits = data.polisot.reduce((s, p) => s + (p.balance ?? 0), 0);
  const avgFee =
    totalDeposits > 0
      ? data.polisot.reduce(
          (s, p) => s + (p.feeAccumulation ?? 0) * (p.balance ?? 0),
          0,
        ) / totalDeposits
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-base font-semibold text-emerald-700">
          <ShieldCheck className="size-4" /> נתוני מסלקה שהתקבלו
        </div>
        <span className="text-[15px] text-emerald-600/70">
          התקבל {formatDate(data.receivedAt)}
        </span>
      </div>

      {/* totals */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Metric label="סה״כ צבירה" value={fmt(total)} accent />
        <Metric label="מוצרים" value={String(data.polisot.length)} />
        <Metric
          label="דמי ניהול ממוצע"
          value={`${avgFee.toFixed(2)}%`}
        />
      </div>

      <div className="space-y-1.5">
        {data.polisot.map((p, i) => (
          <div
            key={i}
            className="rounded-lg bg-slate-100 px-3 py-2 text-base"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <span className="font-medium text-slate-800">
                  {p.manufacturer}
                </span>
                <span className="text-slate-500"> · {p.product_type}</span>
                <span
                  className={cn(
                    "mr-2 rounded px-1 py-0.5 text-[14px]",
                    p.polisa_status === "active"
                      ? "bg-emerald-500/15 text-emerald-700"
                      : "bg-zinc-500/15 text-slate-500",
                  )}
                >
                  {p.polisa_status === "active" ? "פעילה" : p.polisa_status}
                </span>
              </div>
              <span className="shrink-0 tabular-nums text-emerald-700">
                {fmt(p.balance)}
              </span>
            </div>
            {detailed && (
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[15px] text-slate-500">
                {p.track && (
                  <span className="inline-flex items-center gap-1">
                    <TrendingUp className="size-3" /> {p.track}
                  </span>
                )}
                {p.feeAccumulation != null && (
                  <span>דמי ניהול מצבירה: {p.feeAccumulation}%</span>
                )}
                {p.feeDeposit != null && (
                  <span>מהפקדה: {p.feeDeposit}%</span>
                )}
                <span dir="ltr" className="text-slate-400">
                  {p.polisa_number}
                </span>
              </div>
            )}
          </div>
        ))}
        {data.mislakaNumber && (
          <div className="pt-1 text-[14px] text-slate-400">
            מס׳ מסלקה: <span dir="ltr">{data.mislakaNumber}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg bg-slate-100 px-2.5 py-2 text-center">
      <div
        className={cn(
          "text-lg font-semibold tabular-nums",
          accent ? "text-emerald-700" : "text-slate-800",
        )}
      >
        {value}
      </div>
      <div className="text-[14px] text-slate-500">{label}</div>
    </div>
  );
}
