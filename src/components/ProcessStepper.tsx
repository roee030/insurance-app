import { motion } from "motion/react";
import { Check } from "lucide-react";
import { STAGE_ORDER, STAGES, stageIndex } from "@/domain/pipeline";
import type { StageId } from "@/domain/types";
import { cn } from "@/lib/utils";
import { ACCENT } from "./accents";

/**
 * Horizontal pipeline stepper — the visual heart of "where is this client".
 * Animates the fill with a spring and marks completed / current / upcoming.
 */
export function ProcessStepper({ stage }: { stage: StageId }) {
  const current = stageIndex(stage);
  const pct = (current / (STAGE_ORDER.length - 1)) * 100;

  return (
    <div className="w-full">
      <div className="relative">
        {/* rail */}
        <div className="absolute top-4 right-0 left-0 h-[2px] bg-line" />
        {/* fill (transform-based scaleX for GPU) */}
        <motion.div
          className="absolute top-4 right-0 h-[2px] origin-right bg-gradient-to-l from-emerald-500 to-cyan-400"
          style={{ width: "100%" }}
          initial={false}
          animate={{ scaleX: pct / 100 }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
        <ol className="relative flex justify-between">
          {STAGE_ORDER.map((s, i) => {
            const meta = STAGES[s];
            const a = ACCENT[meta.accent];
            const done = i < current;
            const active = i === current;
            return (
              <li key={s} className="flex flex-col items-center gap-2">
                <motion.div
                  initial={false}
                  animate={{ scale: active ? 1.12 : 1 }}
                  transition={{ type: "spring", stiffness: 350, damping: 18 }}
                  className={cn(
                    "z-10 grid size-8 place-items-center rounded-full ring-2 transition-colors",
                    done && "bg-emerald-500 ring-emerald-400 text-emerald-950",
                    active &&
                      cn(
                        a.solid,
                        a.ring,
                        "text-white shadow-[0_0_0_4px_rgba(16,185,129,0.12)]",
                      ),
                    !done &&
                      !active &&
                      "bg-surface-2 ring-line text-slate-500",
                  )}
                >
                  {done ? (
                    <Check className="size-4" strokeWidth={3} />
                  ) : (
                    <span className="text-[13px] font-semibold">{i + 1}</span>
                  )}
                </motion.div>
                <span
                  className={cn(
                    "max-w-[68px] text-center text-[10.5px] leading-tight",
                    active ? "text-slate-900 font-medium" : "text-slate-500",
                  )}
                >
                  {meta.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
