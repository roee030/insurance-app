import type { StageMeta } from "@/domain/pipeline";

type Accent = StageMeta["accent"];

/** Per-accent class bundles so stage color stays consistent everywhere. */
export const ACCENT: Record<
  Accent,
  { text: string; bg: string; ring: string; dot: string; solid: string }
> = {
  zinc: {
    text: "text-slate-600",
    bg: "bg-slate-500/10",
    ring: "ring-slate-500/20",
    dot: "bg-slate-400",
    solid: "bg-slate-500",
  },
  amber: {
    text: "text-amber-700",
    bg: "bg-amber-500/12",
    ring: "ring-amber-500/25",
    dot: "bg-amber-500",
    solid: "bg-amber-500",
  },
  emerald: {
    text: "text-emerald-700",
    bg: "bg-emerald-500/12",
    ring: "ring-emerald-500/25",
    dot: "bg-emerald-500",
    solid: "bg-emerald-500",
  },
  cyan: {
    text: "text-cyan-700",
    bg: "bg-cyan-500/12",
    ring: "ring-cyan-500/25",
    dot: "bg-cyan-500",
    solid: "bg-cyan-500",
  },
  violet: {
    text: "text-violet-700",
    bg: "bg-violet-500/12",
    ring: "ring-violet-500/25",
    dot: "bg-violet-500",
    solid: "bg-violet-500",
  },
  green: {
    text: "text-green-700",
    bg: "bg-green-500/12",
    ring: "ring-green-500/25",
    dot: "bg-green-500",
    solid: "bg-green-500",
  },
};
