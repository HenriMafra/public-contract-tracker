"use client";
import { useState } from "react";
import { Button, Card, CardPad } from "@/components/ui/primitives";
import { ChevronDown, ShieldCheck, Wrench } from "lucide-react";

type R = { ok: boolean; action?: string; output?: string; error?: string; jobId?: number; message?: string };

export function AutoSetupPanel({ dbConfigured }: { dbConfigured: boolean }) {
  const [busy, setBusy] = useState("");
  const [res, setRes] = useState<R | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function call(action: string, critical = false) {
    if (critical && !confirm) { setRes({ ok: false, error: "Marque “confirmo” (no bloco de Instalação) para ações críticas." }); return; }
    setBusy(action); setRes(null);
    try {
      const r = await fetch("/api/auto-setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, confirm, fix: action === "doctor" }) });
      const j = await r.json().catch(() => ({}));
      setRes({ ok: r.ok, ...j });
    } catch (e: any) { setRes({ ok: false, error: "Erro de rede: " + e?.message }); }
    finally { setBusy(""); }
  }

  // Linha: botão à esquerda + explicação em português ao lado.
  const Row = ({ a, label, desc, variant, critical }: { a: string; label: string; desc: string; variant?: any; critical?: boolean }) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 p-2.5 rounded-lg border border-line bg-surface2/30">
      <div className="sm:w-60 shrink-0">
        <Button variant={variant} className="w-full justify-center" disabled={!!busy || (critical && !confirm)} onClick={() => call(a, critical)}>
          {busy === a ? "Executando…" : label}
        </Button>
      </div>
      <p className="text-xs text-muted leading-snug">{desc}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="text-sm bg-brand/10 text-fg border border-brand/20 rounded-xl px-4 py-3">
        ⚙️ Cada ação vira um <b>job</b> executado pelo <b>worker</b> (o programa que roda na máquina com os scripts). Acompanhe em{" "}
        <a href="/admin/jobs" className="text-brand font-semibold hover:underline">Jobs</a>. <b>Se o worker estiver desligado, o job fica parado “na fila”.</b>
      </div>

      {/* DIAGNÓSTICO — seguro, pode usar à vontade */}
      <Card><CardPad>
        <div className="flex items-center gap-2 mb-1"><ShieldCheck size={16} className="text-emerald-500" /><span className="font-bold text-fg">Diagnóstico & Validação</span><span className="text-xs font-bold uppercase tracking-wide text-emerald-600 bg-emerald-500/10 rounded-full px-2 py-0.5">seguro</span></div>
        <p className="text-xs text-muted mb-3">Só verificam e geram relatório — <b>nunca alteram seus dados</b>. Comece pelo primeiro se desconfiar de algo.</p>
        <div className="space-y-2">
          <Row a="validate" label="✅ Verificar sistema" desc="Check-up geral: banco, telas, segurança (RLS) e conexão. É o teste principal — comece por aqui." />
          <Row a="doctor" label="🩺 Rodar doctor (conserta)" variant="ghost" desc="Diagnostica o ambiente e conserta probleminhas pequenos automaticamente." />
          <Row a="secrets" label="🔒 Conferir chaves" variant="ghost" desc="Confere se as chaves/senhas estão configuradas corretamente (sem expor nenhuma)." />
          <Row a="test_queue" label="🧵 Testar fila + worker" variant="ghost" desc="Confirma que a fila de jobs e o worker estão processando (útil se botões ficam “na fila”)." />
          <Row a="test_storage" label="🗂️ Testar arquivos (Storage)" variant="ghost" desc="Confirma que o envio dos relatórios baixáveis está funcionando." />
          <Row a="test_realtime" label="📡 Testar tempo real" variant="ghost" desc="Confirma as atualizações ao vivo (barra de progresso, sininho)." />
          <Row a="test_notifications" label="🔔 Testar notificações" variant="ghost" desc="Confirma que as notificações chegam aos usuários." />
          <Row a="test_radar" label="📊 Testar Radar" variant="ghost" desc="Confirma que o painel de dados (Radar) está devolvendo informação." />
        </div>
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-line">
          <a href="/admin/jobs" className="inline-flex items-center h-9 px-4 rounded-lg text-sm font-semibold bg-surface border border-line text-fg hover:bg-surface2">📋 Ver histórico de jobs</a>
          <a href="/radar" className="inline-flex items-center h-9 px-4 rounded-lg text-sm font-semibold bg-surface border border-line text-fg hover:bg-surface2">📊 Abrir o Radar</a>
        </div>
      </CardPad></Card>

      {/* INSTALAÇÃO — avançado, já feito; recolhido por padrão */}
      <Card><CardPad>
        <details>
          <summary className="list-none cursor-pointer flex items-center gap-2 select-none">
            <ChevronDown size={16} className="text-muted" />
            <Wrench size={16} className="text-amber-500" />
            <span className="font-bold text-fg">Instalação do sistema</span>
            <span className="text-xs font-bold uppercase tracking-wide text-amber-600 bg-amber-500/10 rounded-full px-2 py-0.5">avançado · já feito</span>
          </summary>
          <div className="mt-3">
            <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-3">
              ⚠️ Isto <b>monta o sistema do zero</b> — e ele já está instalado e no ar. <b>Só use para reinstalar</b> ou se eu pedir. Reexecutar pode sobrescrever dados.
            </div>
            <label className="text-xs text-fg block mb-3 font-medium">
              <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="align-middle mr-1.5" /> confirmo que entendo (libera os botões críticos abaixo)
            </label>
            <div className="space-y-2">
              <Row a="setup_full" label="🚀 Instalar tudo (completo)" variant="danger" critical desc="Monta o sistema inteiro de uma vez: Supabase + SQL + usuários + dados + agendamento. Só para ambiente novo." />
              <Row a="setup_local" label="🧪 Ensaiar local (SQLite)" critical desc="Faz o mesmo num banco de teste local, sem tocar no banco real. Seguro para experimentar." />
              <Row a="repair" label="🛠️ Corrigir o que faltar" variant="ghost" critical desc="Roda em modo reparo: arruma o que estiver faltando, sem refazer tudo." />
              <div className="text-xs uppercase tracking-wider text-muted font-semibold pt-2 pb-0.5">Ou refazer só uma etapa:</div>
              <Row a="create_supabase" label="☁️ Configurar Supabase" critical desc="Prepara a estrutura do banco no Supabase." />
              <Row a="apply_sql" label="🗃️ Aplicar SQL" critical desc="Recria/atualiza tabelas, telas (views) e regras de segurança. Use se o esquema mudou." />
              <Row a="create_users" label="👤 Criar usuários-padrão" critical desc="Cria as contas iniciais do sistema." />
              <Row a="load_data" label="📥 Carregar dados reais" critical desc="Importa os dados para o banco (parecido com “Atualizar agora” da tela de Operação)." />
              <Row a="schedule" label="📅 Agendar atualização semanal" critical desc="Liga a atualização automática toda semana. (Já está ligada.)" />
            </div>
            {!dbConfigured && <p className="text-xs text-amber-600 mt-3">DATABASE_URL não configurado → usando SQLite local de ensaio para validar/carregar.</p>}
          </div>
        </details>
      </CardPad></Card>

      {res && (
        <Card><CardPad>
          <div className={"font-bold " + (res.ok ? "text-green-600" : "text-red-600")}>{res.ok ? "✅ Enfileirada" : "❌ Falhou"}{res.action ? ` — ${res.action}` : ""}</div>
          {res.message && <p className="text-sm text-fg mt-1">{res.message}</p>}
          {res.error && <p className="text-sm text-red-600 mt-1">{res.error}</p>}
          {res.ok && res.jobId != null && <a href="/admin/jobs" className="inline-flex items-center h-9 px-4 mt-3 rounded-lg text-sm font-semibold bg-brand text-white hover:bg-brand-600">Ver no Jobs →</a>}
          {res.output && <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-3 mt-2 overflow-x-auto max-h-96 whitespace-pre-wrap">{res.output}</pre>}
        </CardPad></Card>
      )}
    </div>
  );
}
