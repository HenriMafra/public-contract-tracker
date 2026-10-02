"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Card, CardPad, Badge, Empty } from "@/components/ui/primitives";
import { Lightbulb, HelpCircle, Bug, Plus, Send, MessageSquare, User2, Clock } from "lucide-react";

const TIPO_INFO: Record<string, { label: string; Icon: any; cls: string }> = {
  sugestao: { label: "Sugestão", Icon: Lightbulb, cls: "bg-brand/10 text-brand" },
  pergunta: { label: "Pergunta", Icon: HelpCircle, cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  bug: { label: "Bug", Icon: Bug, cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
};
const STATUS_INFO: Record<string, { label: string; cls: string }> = {
  aberto: { label: "Aberto", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  em_andamento: { label: "Em andamento", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  resolvido: { label: "Resolvido", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  fechado: { label: "Fechado", cls: "bg-surface2 text-muted" },
};
const PRIO_CLS: Record<string, string> = { alta: "bg-red-500/15 text-red-600 dark:text-red-400", media: "bg-amber-500/15 text-amber-700 dark:text-amber-400", baixa: "bg-surface2 text-muted" };
const taArea = "w-full rounded-lg border border-line bg-surface text-fg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-y min-h-[72px]";

async function call(body: any) {
  const r = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: r.ok, j: await r.json().catch(() => ({})) };
}
function fmt(d: any) { try { return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }); } catch { return ""; } }

function Item({ it, isAdmin }: { it: any; isAdmin: boolean }) {
  const router = useRouter();
  const ti = TIPO_INFO[it.tipo] || TIPO_INFO.sugestao;
  const si = STATUS_INFO[it.status] || STATUS_INFO.aberto;
  const [resp, setResp] = useState(it.resposta || "");
  const [busy, setBusy] = useState(false);
  async function run(body: any) { setBusy(true); const { ok } = await call(body); setBusy(false); if (ok) router.refresh(); }

  return (
    <Card>
      <CardPad>
        <div className="flex flex-wrap items-center gap-2">
          <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold " + ti.cls}><ti.Icon size={12} /> {ti.label}</span>
          <span className="font-bold text-fg">{it.titulo}</span>
          <span className={"text-xs px-2 py-0.5 rounded-full font-semibold " + si.cls}>{si.label}</span>
          {it.prioridade && <span className={"text-xs px-2 py-0.5 rounded-full font-semibold " + (PRIO_CLS[it.prioridade] || "")}>prioridade {it.prioridade}</span>}
          <span className="ml-auto text-xs text-muted inline-flex items-center gap-1"><Clock size={12} /> {fmt(it.created_at)}</span>
        </div>
        {it.descricao && <p className="text-sm text-fg mt-2 whitespace-pre-wrap leading-relaxed">{it.descricao}</p>}
        <div className="text-xs text-muted mt-2 flex flex-wrap gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1"><User2 size={12} /> {it.autor_nome || "—"}</span>
          {it.pagina && <span>na página: <span className="text-fg">{it.pagina}</span></span>}
        </div>

        {it.resposta && (
          <div className="mt-3 rounded-lg bg-brand/5 border border-brand/20 p-2.5">
            <div className="text-xs font-semibold text-brand inline-flex items-center gap-1 mb-0.5"><MessageSquare size={12} /> Resposta {it.respondido_por ? `· ${it.respondido_por}` : ""}</div>
            <div className="text-sm text-fg whitespace-pre-wrap">{it.resposta}</div>
          </div>
        )}

        {isAdmin && (
          <div className="mt-3 border-t border-line pt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-muted">Status:</label>
              <Select className="h-8 w-auto" value={it.status} onChange={(e: any) => run({ action: "update_status", id: it.id, status: e.target.value })} disabled={busy}>
                <option value="aberto">Aberto</option><option value="em_andamento">Em andamento</option><option value="resolvido">Resolvido</option><option value="fechado">Fechado</option>
              </Select>
              <label className="text-xs text-muted ml-2">Prioridade:</label>
              <Select className="h-8 w-auto" value={it.prioridade || ""} onChange={(e: any) => run({ action: "set_prioridade", id: it.id, prioridade: e.target.value })} disabled={busy}>
                <option value="">—</option><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option>
              </Select>
            </div>
            <textarea value={resp} onChange={(e) => setResp(e.target.value)} placeholder="Escrever resposta / observação (visível a quem abriu)…" className={taArea} />
            <Button className="h-8" disabled={busy} onClick={() => run({ action: "responder", id: it.id, resposta: resp })}>{busy ? "Salvando…" : "Salvar resposta"}</Button>
          </div>
        )}
      </CardPad>
    </Card>
  );
}

export function FeedbackBoard({ itens, isAdmin }: { itens: any[]; isAdmin: boolean }) {
  const router = useRouter();
  const [tipo, setTipo] = useState("sugestao");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [pagina, setPagina] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const [fTipo, setFTipo] = useState("");
  const [fStatus, setFStatus] = useState("");

  async function enviar() {
    if (!titulo.trim()) { setMsg({ ok: false, t: "Dê um título curto ao seu item." }); return; }
    setBusy(true); setMsg(null);
    const { ok, j } = await call({ action: "create", tipo, titulo, descricao, pagina });
    setBusy(false);
    if (ok) { setTitulo(""); setDescricao(""); setPagina(""); setMsg({ ok: true, t: "Enviado! Obrigado — o time vai analisar." }); router.refresh(); }
    else setMsg({ ok: false, t: j.error || "Falha ao enviar." });
  }

  const lista = useMemo(() => itens.filter((it) => (!fTipo || it.tipo === fTipo) && (!fStatus || it.status === fStatus)), [itens, fTipo, fStatus]);
  const abertos = itens.filter((it) => it.status === "aberto" || it.status === "em_andamento").length;

  return (
    <div className="space-y-4">
      {/* Formulário de envio (qualquer usuário) */}
      <Card><CardPad>
        <div className="font-bold text-fg mb-1">Enviar sugestão, pergunta ou bug</div>
        <p className="text-xs text-muted mb-3">Conte o que achou que pode melhorar, uma dúvida, ou algo que quebrou. O time vê tudo aqui e responde.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {(["sugestao", "pergunta", "bug"] as const).map((t) => {
            const ti = TIPO_INFO[t]; const on = tipo === t;
            return (
              <button key={t} type="button" onClick={() => setTipo(t)}
                className={"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm " + (on ? "border-brand bg-brand/10 text-fg font-semibold" : "border-line bg-surface text-muted hover:bg-surface2")}>
                <ti.Icon size={14} className={on ? "text-brand" : ""} /> {ti.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><label className="block text-xs font-semibold text-muted mb-1">Título *</label><Input value={titulo} onChange={(e: any) => setTitulo(e.target.value)} placeholder="Resumo em uma linha" /></div>
          <div className="sm:col-span-2"><label className="block text-xs font-semibold text-muted mb-1">Descrição</label><textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className={taArea} placeholder="Detalhe o que aconteceu / sua ideia. Se for bug, diga o passo a passo." /></div>
          <div><label className="block text-xs font-semibold text-muted mb-1">Página/onde (opcional)</label><Input value={pagina} onChange={(e: any) => setPagina(e.target.value)} placeholder="Ex.: Lista de Ataque, Registro de Oportunidade…" /></div>
        </div>
        {msg && <div className={"text-sm px-3 py-2 rounded-lg mt-3 " + (msg.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-600")}>{msg.t}</div>}
        <div className="mt-3"><Button disabled={busy} onClick={enviar}><Send size={15} /> {busy ? "Enviando…" : "Enviar"}</Button></div>
      </CardPad></Card>

      {/* Filtros + lista */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-fg">{isAdmin ? "Itens recebidos (todos)" : "Seus envios"}</span>
        <span className="text-xs text-muted">{abertos} em aberto · {itens.length} no total{isAdmin ? "" : " · só você e o admin veem"}</span>
        <Select className="h-8 w-auto ml-auto" value={fTipo} onChange={(e: any) => setFTipo(e.target.value)}>
          <option value="">Todos os tipos</option><option value="sugestao">Sugestões</option><option value="pergunta">Perguntas</option><option value="bug">Bugs</option>
        </Select>
        <Select className="h-8 w-auto" value={fStatus} onChange={(e: any) => setFStatus(e.target.value)}>
          <option value="">Todos os status</option><option value="aberto">Aberto</option><option value="em_andamento">Em andamento</option><option value="resolvido">Resolvido</option><option value="fechado">Fechado</option>
        </Select>
      </div>

      {lista.length === 0 ? (
        <Empty>{itens.length === 0 ? "Nada enviado ainda. Seja o primeiro a sugerir algo!" : "Nenhum item com esses filtros."}</Empty>
      ) : (
        <div className="space-y-2">{lista.map((it) => <Item key={it.id} it={it} isAdmin={isAdmin} />)}</div>
      )}
    </div>
  );
}
