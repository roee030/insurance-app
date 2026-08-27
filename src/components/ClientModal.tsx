import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { X, Maximize2, CreditCard, Phone } from "lucide-react";
import type { Client } from "@/domain/types";
import { ClientDetail } from "./ClientDetail";
import { Avatar } from "./Avatar";
import { StageBadge } from "./StageBadge";

export function ClientModal({
  client,
  onClose,
}: {
  client: Client;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.8 }}
        className="card-shadow relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-surface"
      >
        {/* sticky identity header — stays visible while the body scrolls */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={`${client.firstName} ${client.lastName}`} size={44} />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
                {client.firstName} {client.lastName}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <CreditCard className="size-3" />
                  <span dir="ltr">{client.personId}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3" />
                  <span dir="ltr">{client.mobile}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden sm:block">
              <StageBadge stage={client.stage} />
            </div>
            <Link
              to={`/client/${client.id}`}
              className="hidden items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200/70 hover:text-slate-800 md:inline-flex"
            >
              <Maximize2 className="size-3" /> דף מלא
            </Link>
            <button
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <ClientDetail client={client} hideHeader />
        </div>
      </motion.div>
    </motion.div>
  );
}
