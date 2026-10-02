"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNotificationsRealtime } from "@/lib/realtime/subscriptions";
import { NotificationDropdown } from "./NotificationDropdown";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha ao clicar em qualquer lugar fora do sino/dropdown (listener no documento —
  // robusto; o backdrop antigo ficava preso no cabeçalho por causa do backdrop-blur).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const refetch = useCallback(() => {
    fetch("/api/notifications/list?limit=8").then((r) => r.json()).then((j) => {
      if (j.ok) { setItems(j.items || []); setUnread(j.unread || 0); }
    }).catch(() => {});
  }, []);
  useEffect(() => { refetch(); }, [refetch]);
  useNotificationsRealtime(() => refetch(), true, "bell");

  const hasCrit = items.some((n) => !n.lida && (n.nivel === "critical" || n.nivel === "error"));
  async function markAll() { await fetch("/api/notifications/mark-all-read", { method: "POST" }); refetch(); }
  async function markOne(id: number) {
    await fetch("/api/notifications/mark-read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    refetch();
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative w-9 h-9 grid place-items-center rounded-full hover:bg-surface2" title="Notificações" aria-label="Notificações">
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className={"absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-xs font-bold text-white grid place-items-center " + (hasCrit ? "bg-red-600" : "bg-brand")}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && <NotificationDropdown items={items} onMarkAll={markAll} onMarkOne={markOne} onClose={() => setOpen(false)} />}
    </div>
  );
}
