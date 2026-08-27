import { useParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Inbox } from "lucide-react";
import { useClients } from "@/store/useClients";
import { ClientDetail } from "@/components/ClientDetail";

export function ClientProfilePage() {
  const { id } = useParams();
  const client = useClients((s) => s.clients.find((c) => c.id === id));

  if (!client) {
    return (
      <div className="mx-auto grid max-w-md place-items-center gap-3 p-16 text-center text-slate-500">
        <Inbox className="size-8 opacity-50" />
        <p className="text-sm">הלקוח לא נמצא.</p>
        <Link to="/" className="text-sm text-emerald-600 hover:underline">
          חזרה לצנרת
        </Link>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-4 lg:p-6">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700"
      >
        <ArrowRight className="size-4" /> חזרה לצנרת
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
      >
        <ClientDetail client={client} />
      </motion.div>
    </main>
  );
}
