import { useState } from "react";
import { motion } from "motion/react";
import { LayoutGrid } from "lucide-react";
import { StatsRow } from "@/components/StatsRow";
import { KanbanBoard } from "@/components/KanbanBoard";
import { ClientModal } from "@/components/ClientModal";
import { useClients } from "@/store/useClients";

export function DashboardPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const openClient = useClients((s) =>
    openId ? s.clients.find((c) => c.id === openId) : undefined,
  );

  return (
    <main className="mx-auto max-w-[1600px] space-y-5 p-4 lg:p-6">
      <StatsRow />

      <div>
        <div className="mb-3 flex items-center gap-2">
          <LayoutGrid className="size-4 text-slate-500" />
          <h1 className="text-sm font-semibold tracking-tight text-slate-800">
            צנרת לקוחות
          </h1>
          <span className="text-xs text-slate-400">
            — לחץ על לקוח לפתיחת הכרטיס המלא
          </span>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        >
          <KanbanBoard onOpen={setOpenId} />
        </motion.div>
      </div>

      {openClient && (
        <ClientModal client={openClient} onClose={() => setOpenId(null)} />
      )}
    </main>
  );
}
