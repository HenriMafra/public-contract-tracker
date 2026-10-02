"use client";
import Link from "next/link";
import { useEffect } from "react";
import { X } from "lucide-react";
import { NotificationItem } from "./NotificationItem";
import type { Notif } from "@/lib/notifications/types";

export function NotificationDropdown({ items, onMarkAll, onMarkOne, onClose }: {
  items: Notif[]; onMarkAll: () => void; onMarkOne: (id: number) => void; onClose: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <>
      <div className="absolute right-0 mt-2 w-[22rem] max-w-[92vw] bg-surface rounded-xl shadow-xl border border-line z-50">
        <div className="flex items-center justify-between p-2.5 border-b border-line">
          <span className="font-bold text-fg text-sm">Notificações</span>
          <div className="flex items-center gap-3">
            <button onClick={onMarkAll} className="text-xs text-muted hover:underline">marcar todas</button>
            <button onClick={onClose} className="text-muted hover:text-fg" aria-label="Fechar"><X size={15} /></button>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto p-1 space-y-1">
          {items.length === 0 ? <div className="text-xs text-muted p-6 text-center">sem notificações</div> :
            items.map((n) => <NotificationItem key={n.id} n={n} onRead={onMarkOne} compact />)}
        </div>
        <div className="p-2 border-t border-line text-center">
          <Link href="/notificacoes" className="text-brand text-sm font-semibold hover:underline" onClick={onClose}>ver todas (texto completo) →</Link>
        </div>
      </div>
    </>
  );
}
