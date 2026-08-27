import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

const RING = [
  "from-emerald-400/30 to-emerald-600/10",
  "from-cyan-400/30 to-cyan-600/10",
  "from-amber-400/30 to-amber-600/10",
  "from-violet-400/30 to-violet-600/10",
];

export function Avatar({
  name,
  size = 40,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const idx =
    name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % RING.length;
  return (
    <div
      className={cn(
        "grid place-items-center rounded-full bg-gradient-to-br ring-1 ring-slate-200 text-slate-900 font-semibold select-none",
        RING[idx],
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </div>
  );
}
