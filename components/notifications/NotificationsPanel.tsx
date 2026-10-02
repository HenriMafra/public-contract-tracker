"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardPad, Select, Input, Button, Empty } from "@/components/ui/primitives";
import { NotificationItem } from "./NotificationItem";
import { useNotificationsRealtime } from "@/lib/realtime/subscriptions";

const TIPOS = ["", "job_success", "job_failed", "artifact_available", "opportunity_critical", "opportunity_assigned", "review_required", "weekly_summary", "system_alert"];
const NIVEIS = ["", "info", "success", "warning", "error", "critical"];

function bucket(created?: string): string {
  if (!created) return "Antigas";
  const c = new Date(created.replace(" ", "T")); const now = new Date();
  if (c.toDateString() === now.toDateString()) return "Hoje";
  if ((now.getTime() - c.getTime()) / 86400000 < 7) return "Esta semana";
  return "Antigas";
}

export function NotificationsPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [f, setF] = useState<{ tipo: string; nivel: string; lida: string; q: string }>({ tipo: "", nivel: "", lida: "", q: "" });

  const refetch = useCallback(() => {
    const p = new URLSearchParams({ limit: "200" });
    if (f.tipo) p.set("tipo", f.tipo);
    if (f.nivel) p.set("nivel", f.nivel);
    if (f.lida) p.set("lida", f.lida);
    if (f.q) p.set("q", f.q);
    fetch("/api/notifications/list?" + p.toString()).then((r) => r.json()).then((j) => { if (j.ok) setItems(j.items || []); }).catch(() => {});
  }, [f]);
  useEffect(() => { refetch(); }, [refetch]);
  useNotificationsRealtime(() => refetch(), true);

  async function markAll() { await fetch("/api/notifications/mark-all-read", { method: "POST" }); refetch(); }
  async function markOne(id: number) {
    await fetch("/api/notifications/mark-read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    refetch();
  }

  const groups = ["Hoje", "Esta semana", "Antigas"];
  const byGroup = (g: string) => items.filter((n) => bucket(n.created_at) === g);

  return (
    <div className="space-y-4">
      <Card><CardPad>
        <div className="grid md:grid-cols-5 gap-2 items-end">
          <div><label className="text-xs text-muted">Tipo</label><Select value={f.tipo} onChange={(e: any) => setF({ ...f, tipo: e.target.value })}>{TIPOS.map((t) => <option key={t} value={t}>{t || "todos"}</option>)}</Select></div>
          <div><label className="text-xs text-muted">Nível</label><Select value={f.nivel} onChange={(e: any) => setF({ ...f, nivel: e.target.value })}>{NIVEIS.map((t) => <option key={t} value={t}>{t || "todos"}</option>)}</Select></div>
          <div><label className="text-xs text-muted">Status</label><Select value={f.lida} onChange={(e: any) => setF({ ...f, lida: e.target.value })}><option value="">todas</option><option value="0">não lidas</option><option value="1">lidas</option></Select></div>
          <div><label className="text-xs text-muted">Busca</label><Input value={f.q} onChange={(e: any) => setF({ ...f, q: e.target.value })} placeholder="título…" /></div>
          <Button variant="ghost" onClick={markAll}>✓ Marcar todas como lidas</Button>
        </div>
      </CardPad></Card>

      {items.length === 0 ? <Empty>Nenhuma notificação para os filtros atuais.</Empty> :
        groups.map((g) => byGroup(g).length === 0 ? null : (
          <Card key={g}><CardPad>
            <div className="font-bold text-fg mb-2">{g} <span className="text-muted font-normal">({byGroup(g).length})</span></div>
            <div className="space-y-1">{byGroup(g).map((n) => <NotificationItem key={n.id} n={n} onRead={markOne} />)}</div>
          </CardPad></Card>
        ))}
    </div>
  );
}
