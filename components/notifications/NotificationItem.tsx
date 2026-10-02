"use client";
import { LEVEL_TONE, TYPE_ICON, type Notif } from "@/lib/notifications/types";

export function NotificationItem({ n, onRead, compact }: { n: Notif; onRead?: (id: number) => void; compact?: boolean }) {
  return (
    <div className={"flex gap-2 p-2 rounded-lg " + (n.lida ? "opacity-60" : "bg-surface2")}>
      <div className="text-lg leading-none mt-0.5">{TYPE_ICON[n.tipo] || "🔔"}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-fg truncate">{n.titulo}</span>
          <span className={"text-xs px-1.5 py-0.5 rounded-full font-semibold " + (LEVEL_TONE[n.nivel] || "")}>{n.nivel}</span>
        </div>
        {n.mensagem && !compact && <p className="text-xs text-muted break-words">{n.mensagem}</p>}
        {n.mensagem && compact && <p className="text-xs text-muted line-clamp-3 break-words whitespace-pre-line">{n.mensagem}</p>}
        <div className="text-xs text-muted mt-0.5">{(n.created_at || "").replace("T", " ").slice(0, 16)}</div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {n.link_url && <a href={n.link_url} className="text-brand text-xs hover:underline">abrir</a>}
        {!n.lida && onRead && <button onClick={() => onRead(n.id)} className="text-muted text-xs hover:underline">marcar lida</button>}
      </div>
    </div>
  );
}
