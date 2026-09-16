import { motion, AnimatePresence } from "motion/react";
import { STAGE_ORDER, STAGES } from "@/domain/pipeline";
import { useClients } from "@/store/useClients";
import { ClientCard } from "./ClientCard";
import { ACCENT } from "./accents";
import { cn } from "@/lib/utils";

export function KanbanBoard({ onOpen }: { onOpen: (id: string) => void }) {
  const clients = useClients((s) => s.clients);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STAGE_ORDER.map((stage) => {
        const meta = STAGES[stage];
        const a = ACCENT[meta.accent];
        const items = clients.filter((c) => c.stage === stage);
        return (
          <div
            key={stage}
            className="flex w-[248px] shrink-0 flex-col rounded-2xl border border-line bg-surface/50"
          >
            <div className="flex items-center justify-between gap-2 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", a.dot)} />
                <span className="text-[17px] font-semibold text-slate-800">
                  {meta.label}
                </span>
              </div>
              <span className="grid min-w-6 place-items-center rounded-full bg-slate-100 px-1.5 text-[15px] font-medium text-slate-500">
                {items.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
              <AnimatePresence mode="popLayout" initial={false}>
                {items.map((c) => (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 28,
                      mass: 0.8,
                    }}
                  >
                    <ClientCard client={c} onClick={() => onOpen(c.id)} />
                  </motion.div>
                ))}
              </AnimatePresence>
              {items.length === 0 && (
                <div className="grid h-16 place-items-center rounded-xl border border-dashed border-line/70 text-[15px] text-slate-400">
                  אין לקוחות בשלב זה
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
