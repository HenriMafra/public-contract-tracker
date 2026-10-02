"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Search, Check, Loader2, Star, X } from "lucide-react";

type Org = { nome: string; uf: string; n: number };

/** Picker reutilizável: o usuário escolhe os órgãos (orgao_padronizado) que acompanha.
 *  A lista vem do view `vw_lista_ataque_atual` direto no navegador → a RLS já escopa
 *  aos órgãos que ele pode ver. Usado no onboarding (após o tour) e na Conta. */
export function OrgaoFocoPicker({
  open, onClose, initial = [], onSaved, targetUserId, titulo,
}: { open: boolean; onClose: () => void; initial?: string[]; onSaved?: (sel: string[]) => void; targetUserId?: string; titulo?: string }) {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set(initial));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (open) { setSel(new Set(initial)); setQ(""); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open]);

  useEffect(() => {
    if (!open) return; let alive = true;
    (async () => {
      setLoading(true); setErr("");
      try {
        const sb = supabaseBrowser();
        const map = new Map<string, Org>();
        const PAGE = 50000;
        for (let i = 0; i < 8; i++) {
          const { data, error } = await sb.from("vw_lista_ataque_atual")
            .select("orgao_padronizado,uf").range(i * PAGE, i * PAGE + PAGE - 1);
          if (error || !data || !data.length) break;
          for (const r of data as any[]) {
            const nome = r.orgao_padronizado; if (!nome) continue;
            const cur = map.get(nome);
            if (cur) cur.n++; else map.set(nome, { nome, uf: r.uf || "—", n: 1 });
          }
          if (data.length < PAGE) break;
        }
        if (alive) setOrgs(Array.from(map.values()).sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, "pt-BR")));
      } catch { if (alive) setErr("Não consegui carregar os órgãos. Tente novamente."); }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [open]);

  const filtered = useMemo(() => {
    const nq = q.trim().toLowerCase();
    return nq ? orgs.filter((o) => o.nome.toLowerCase().includes(nq) || o.uf.toLowerCase().includes(nq)) : orgs;
  }, [orgs, q]);

  const toggle = (n: string) => setSel((s) => { const x = new Set(s); x.has(n) ? x.delete(n) : x.add(n); return x; });

  async function salvar(skip = false) {
    setBusy(true); setErr("");
    const orgaos = skip ? [] : [...sel];
    try {
      const r = await fetch("/api/meus-orgaos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgaos, skip, target_user_id: targetUserId }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || "Falha ao salvar."); setBusy(false); return; }
      onSaved?.(orgaos); onClose();
    } catch { setErr("Erro de rede."); }
    setBusy(false);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/55" onClick={() => !busy && onClose()} />
      <div className="relative w-full max-w-2xl bg-surface border border-line rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <button onClick={() => !busy && onClose()} className="absolute right-3 top-3 text-muted hover:text-fg" aria-label="Fechar"><X size={18} /></button>
        <div className="p-5 border-b border-line">
          <div className="flex items-start gap-2.5">
            <span className="inline-grid place-items-center w-9 h-9 rounded-lg bg-brand text-white shrink-0"><Star size={18} /></span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-fg">{titulo || "Quais órgãos você acompanha?"}</h2>
              <p className="text-xs text-muted leading-relaxed">Marque os órgãos pelos quais você é responsável. Na <b>Lista de Ataque</b> eles já vêm filtrados por padrão (você troca para “Todos” quando quiser). Dá para mudar depois em <b>Minha Conta</b>.</p>
            </div>
          </div>
          <div className="relative mt-3">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar órgão ou UF…"
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-line bg-surface text-fg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
            <span className="text-muted"><b className="text-fg">{sel.size}</b> selecionado(s)</span>
            <button onClick={() => setSel((s) => new Set([...s, ...filtered.map((o) => o.nome)]))} className="text-brand hover:underline">marcar os visíveis ({filtered.length})</button>
            {sel.size > 0 && <button onClick={() => setSel(new Set())} className="text-muted hover:text-fg">limpar seleção</button>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? <div className="py-12 text-center text-muted inline-flex w-full items-center justify-center gap-2"><Loader2 className="animate-spin" size={20} /> carregando órgãos…</div>
            : err ? <div className="py-8 text-center text-red-600 text-sm">{err}</div>
            : filtered.length === 0 ? <div className="py-8 text-center text-muted text-sm">Nenhum órgão encontrado{q ? ` para “${q}”` : ""}.</div>
            : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filtered.slice(0, 600).map((o) => {
                  const on = sel.has(o.nome);
                  return (
                    <button key={o.nome} onClick={() => toggle(o.nome)}
                      className={"flex items-center gap-2 text-left rounded-lg border px-2.5 py-2 text-sm transition " + (on ? "border-brand bg-brand/5" : "border-line hover:border-brand/50")}>
                      <span className={"inline-grid place-items-center w-4 h-4 rounded border shrink-0 " + (on ? "bg-brand border-brand text-white" : "border-line")}>{on && <Check size={12} />}</span>
                      <span className="min-w-0 flex-1"><span className="font-medium text-fg block truncate">{o.nome}</span><span className="text-[11px] text-muted">{o.uf} · {o.n} oportunidade(s)</span></span>
                    </button>
                  );
                })}
                {filtered.length > 600 && <div className="col-span-full text-xs text-muted text-center py-2">Mostrando os 600 mais relevantes — refine a busca para ver outros.</div>}
              </div>
            )}
        </div>

        <div className="p-4 border-t border-line flex items-center justify-between gap-2">
          <button onClick={() => salvar(true)} disabled={busy} className="text-sm text-muted hover:text-fg disabled:opacity-50">Pular — ver todos por enquanto</button>
          <button onClick={() => salvar(false)} disabled={busy}
            className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 inline-flex items-center gap-2">
            {busy && <Loader2 size={15} className="animate-spin" />} Salvar{sel.size > 0 ? ` (${sel.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
