"use client";
import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import { KanbanSquare, Check } from "lucide-react";

const COLS = [{ k: "a_fazer", l: "A fazer" }, { k: "fazendo", l: "Fazendo" }, { k: "revisao", l: "Em revisão" }, { k: "feito", l: "Feito" }];

/** Botão "Enviar este contrato para o meu Backlog (Trello)" — cria um cartão vinculado ao contrato. */
export function EnviarBacklog({ oppId, titulo }: { oppId: number; titulo: string }) {
  const [open, setOpen] = useState(false);
  const [coluna, setColuna] = useState("a_fazer");
  const [etiqueta, setEtiqueta] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar() {
    setBusy(true); setErro("");
    try {
      const r = await fetch("/api/backlog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        action: "create", titulo: titulo || "Contrato", coluna, oportunidade_id: oppId, origem: "contrato",
        etiquetas: etiqueta.trim() ? [etiqueta.trim()] : [],
        descricao: "Contrato enviado da Lista de Ataque para acompanhamento no backlog.",
      }) });
      if (r.ok) { setDone(true); setOpen(false); } else { const j = await r.json().catch(() => ({})); setErro(j.error || "Falha ao enviar."); }
    } catch { setErro("Erro de rede."); } finally { setBusy(false); }
  }

  if (done) return <div className="text-sm text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5"><Check size={15} /> Enviado ao Backlog · <a href="/backlog" className="underline font-semibold">abrir</a></div>;
  return (
    <div>
      {!open ? (
        <Button variant="ghost" onClick={() => setOpen(true)}><KanbanSquare size={15} /> Enviar para o meu Backlog</Button>
      ) : (
        <div className="rounded-lg border border-line bg-surface2/40 p-3 space-y-2">
          <div className="text-xs font-semibold text-muted">Criar um cartão no Backlog para este contrato (vai para você):</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted">Coluna</label>
              <select value={coluna} onChange={(e) => setColuna(e.target.value)} className="h-9 w-full rounded-lg border border-line bg-surface text-fg px-2 text-sm">{COLS.map((c) => <option key={c.k} value={c.k}>{c.l}</option>)}</select>
            </div>
            <div>
              <label className="text-xs text-muted">Etiqueta (opcional)</label>
              <input value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} placeholder="ex.: Analisando" className="h-9 w-full rounded-lg border border-line bg-surface text-fg px-2 text-sm" />
            </div>
          </div>
          {erro && <div className="text-xs text-red-600">{erro}</div>}
          <div className="flex gap-2">
            <Button className="h-8" disabled={busy} onClick={enviar}>{busy ? "Enviando…" : "Enviar"}</Button>
            <button onClick={() => setOpen(false)} className="text-xs text-muted hover:text-fg px-2">cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
