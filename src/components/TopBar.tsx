import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Bell, Search, Plus, ShieldCheck, BarChart3, FileText, Settings } from "lucide-react";
import { useClients } from "@/store/useClients";
import { Button } from "./ui/Button";
import { timeAgo, cn } from "@/lib/utils";

export function TopBar({ onAdd }: { onAdd: () => void }) {
  const notifications = useClients((s) => s.notifications);
  const markRead = useClients((s) => s.markNotificationsRead);
  const navigate = useNavigate();
  const connected = useClients((s) => s.connected);
  const mislakaMode = useClients((s) => s.mislakaMode);
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-canvas/80 px-5 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-2.5">
        <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/5 ring-1 ring-emerald-500/25">
          <ShieldCheck className="size-5 text-emerald-700" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-slate-900">
            Mislaka<span className="text-emerald-600">.</span>
          </div>
          <div className="text-[10px] text-slate-500">ניהול תהליכי לקוח</div>
        </div>
        <span
          className={cn(
            "ml-1 hidden items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ring-1 sm:inline-flex",
            connected
              ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25"
              : "bg-red-500/10 text-red-600 ring-red-500/25",
          )}
          title={connected ? "מחובר לשרת" : "אין חיבור לשרת"}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              connected ? "bg-emerald-400" : "bg-red-400",
            )}
          />
          {connected ? (mislakaMode === "mock" ? "מצב הדגמה" : "מסלקה חיה") : "מנותק"}
        </span>
      </div>

      <div className="relative mr-4 hidden max-w-md flex-1 md:block">
        <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="חיפוש לקוח, ת.ז או טלפון…"
          className="h-9 w-full rounded-xl border border-line bg-surface/60 pr-9 pl-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-zinc-600"
        />
      </div>

      <div className="mr-auto flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => {
              setOpen((v) => !v);
              if (!open) markRead();
            }}
            className="relative grid size-9 place-items-center rounded-xl border border-line bg-surface/60 text-slate-700 hover:border-zinc-600"
          >
            <Bell className="size-4.5" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-emerald-950">
                {unread}
              </span>
            )}
          </button>
          <AnimatePresence>
            {open && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 380, damping: 26 }}
                  className="glass absolute left-0 z-50 mt-2 w-80 rounded-2xl border border-line bg-surface p-2 shadow-2xl"
                >
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-500">
                    התראות
                  </div>
                  <div className="max-h-80 space-y-1 overflow-y-auto">
                    {notifications.length === 0 && (
                      <div className="px-2 py-6 text-center text-xs text-slate-400">
                        אין התראות
                      </div>
                    )}
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          navigate(`/client/${n.clientId}`);
                          setOpen(false);
                        }}
                        className="flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-right hover:bg-slate-100"
                      >
                        <span
                          className={cn(
                            "mt-1.5 size-2 shrink-0 rounded-full",
                            n.kind === "mislaka_loaded"
                              ? "bg-emerald-400"
                              : n.kind === "submission_success"
                                ? "bg-green-400"
                                : "bg-red-400",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] leading-snug text-slate-800">
                            {n.message}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {timeAgo(n.at)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <Link
          to="/documents"
          className="hidden h-9 items-center gap-1.5 rounded-xl border border-line bg-surface/60 px-3 text-[13px] font-medium text-slate-700 hover:border-zinc-600 md:inline-flex"
        >
          <FileText className="size-4" /> מסמכים
        </Link>

        <Link
          to="/performance"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface/60 px-3 text-[13px] font-medium text-slate-700 hover:border-zinc-600"
        >
          <BarChart3 className="size-4" /> ביצועים
        </Link>

        <Link
          to="/settings"
          className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-surface/60 text-slate-700 hover:border-zinc-600"
          title="הגדרות"
        >
          <Settings className="size-4" />
        </Link>

        <Button size="sm" onClick={onAdd}>
          <Plus className="size-4" /> לקוח חדש
        </Button>
      </div>
    </header>
  );
}
