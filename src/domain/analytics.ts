import type { Client } from "./types";
import { isStuck, isTerminal } from "./pipeline";

/** True if `iso` falls in the same calendar month+year as `ref` (default: now). */
function isSameMonth(iso: string, ref = new Date()): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function closedAt(client: Client): string | null {
  if (client.stage !== "submitted") return null;
  return client.history.find((h) => h.stage === "submitted")?.at ?? null;
}

function dealPremium(client: Client): number {
  return (client.productActions ?? []).reduce((s, a) => s + (a.monthlyPremium ?? 0), 0);
}

function dealTransferredBalance(client: Client): number {
  return (client.productActions ?? [])
    .filter((a) => a.kind === "transfer")
    .reduce((s, a) => s + (a.sourceBalance ?? 0), 0);
}

export interface MonthPoint {
  label: string; // "אוג׳ 2026"
  year: number;
  month: number; // 0-11
  closedCount: number;
  premium: number;
}

export interface AgentStats {
  /** Deals that reached "submitted" this calendar month. */
  monthClosedCount: number;
  monthFailedCount: number;
  monthPremium: number;
  monthTransferredBalance: number;
  /** Currently being worked (not yet submitted). */
  activeCount: number;
  stuckCount: number;
  totalClosedCount: number;
  avgDaysToClose: number | null;
  /** Last 6 months, oldest first, for the trend bars. */
  trend: MonthPoint[];
}

const HEBREW_MONTHS = [
  "ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יונ׳",
  "יול׳", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳",
];

export function computeAgentStats(clients: Client[]): AgentStats {
  const now = new Date();
  const closedThisMonth = clients.filter((c) => {
    const at = closedAt(c);
    return at != null && isSameMonth(at, now);
  });

  const monthFailedCount = closedThisMonth.filter(
    (c) => c.submission?.status === "failed",
  ).length;

  const closedAll = clients.filter((c) => c.stage === "submitted");

  const daysToClose = closedAll
    .map((c) => {
      const at = closedAt(c);
      if (!at) return null;
      const ms = new Date(at).getTime() - new Date(c.createdAt).getTime();
      return ms / 86_400_000;
    })
    .filter((n): n is number => n != null);

  const trend: MonthPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const inMonth = closedAll.filter((c) => {
      const at = closedAt(c);
      return at != null && isSameMonth(at, d) && c.submission?.status !== "failed";
    });
    trend.push({
      label: `${HEBREW_MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      year: d.getFullYear(),
      month: d.getMonth(),
      closedCount: inMonth.length,
      premium: inMonth.reduce((s, c) => s + dealPremium(c), 0),
    });
  }

  return {
    monthClosedCount: closedThisMonth.length - monthFailedCount,
    monthFailedCount,
    monthPremium: closedThisMonth
      .filter((c) => c.submission?.status !== "failed")
      .reduce((s, c) => s + dealPremium(c), 0),
    monthTransferredBalance: closedThisMonth
      .filter((c) => c.submission?.status !== "failed")
      .reduce((s, c) => s + dealTransferredBalance(c), 0),
    activeCount: clients.filter((c) => !isTerminal(c.stage)).length,
    stuckCount: clients.filter(isStuck).length,
    totalClosedCount: closedAll.filter((c) => c.submission?.status !== "failed").length,
    avgDaysToClose:
      daysToClose.length > 0
        ? Math.round((daysToClose.reduce((a, b) => a + b, 0) / daysToClose.length) * 10) / 10
        : null,
    trend,
  };
}
