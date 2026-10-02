"use client";
import { useState } from "react";
import { Button, Card, CardPad } from "@/components/ui/primitives";
import { ChevronDown, RefreshCw, Settings2 } from "lucide-react";

export function JobRunControls({ canTest, canProd, canProdDb, canLoadDb, dbConfigured }: {
  canTest: boolean; canProd: boolean; canProdDb: boolean; canLoadDb: boolean; dbConfigured: boolean;
}) {
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [confProd, setConfProd] = useState(false);
  const [confProdDb, setConfProdDb] = useState(false);
  const [escopo, setEscopo] = useState("rapido"); // padrão seguro: janela curta
  const CFG: Record<string, string | undefined> = {
    tudo: undefined, // padrão = atlas_config_producao.json (6 anos)
    recente: "config/atlas_config_recente.json", // ano atual
    rapido: "config/atlas_config_rapido.json",    // últimos 120 dias
  };
  const ESCOPO_DESC: Record<string, string> = {
    rapido: "Pega só o que é novo ou mudou nos últimos 120 dias. Rápido — ideal para a rotina.",
    recente: "Repuxa o ano atual inteiro. Tempo médio.",
    tudo: "Reconstrói os 6 anos do zero. Bem lento (pode levar horas) — use raramente.",
  };

  async function create(jobType: string, body: any = {}) {
    setBusy(jobType); setErr("");
    try {
      const r = await fetch("/api/jobs/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobType, ...body }) });
      const j = await r.json();
      if (j.jobId) { window.location.href = `/admin/jobs/${j.jobId}`; return; }
      setErr(j.error || "Falha ao criar job.");
    } catch (e: any) { setErr("Erro de rede: " + e?.message); }
    finally { setBusy(""); }
  }

  // Linha: botão + explicação em português ao lado.
  const Row = ({ a, label, desc, variant, disabled, onClick }: { a: string; label: string; desc: string; variant?: any; disabled?: boolean; onClick?: () => void }) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 p-2.5 rounded-lg border border-line bg-surface2/30">
      <div className="sm:w-60 shrink-0">
        <Button variant={variant} className="w-full justify-center" disabled={!!busy || disabled} onClick={onClick || (() => create(a))}>
          {busy === a ? "Criando…" : label}
        </Button>
      </div>
      <p className="text-xs text-muted leading-snug">{desc}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="text-sm bg-amber-500/10 text-fg border border-amber-500/30 rounded-xl px-4 py-3">
        ⚠️ Estes botões <b>criam um pedido</b> que é executado pelo <b>coletor na máquina de dados</b> (onde ficam os scripts Python). O site sozinho <b>não roda</b> a coleta. Se o coletor estiver desligado, o pedido fica <b>“na fila”</b> até ele rodar de novo — e nenhum log aparece enquanto isso. No dia a dia, a <b>automação semanal</b> já mantém os dados atualizados.
      </div>

      {/* AÇÃO PRINCIPAL — atualizar os dados */}
      <Card><CardPad>
        <div className="flex items-center gap-2 mb-1"><RefreshCw size={16} className="text-brand" /><span className="font-bold text-fg">Atualizar os dados</span></div>
        <p className="text-xs text-muted mb-3">
          Puxa as informações novas do PNCP e grava no banco — é isto que <b>renova o que aparece no site</b>.
          No dia a dia a <b>automação semanal já faz isso sozinha</b>; use aqui só se quiser forçar agora.
        </p>
        {!dbConfigured && <p className="text-xs text-amber-600 mb-2">DATABASE_URL não configurado — atualização no banco desabilitada.</p>}
        <div className="rounded-lg border border-line bg-surface2/30 p-3 space-y-3">
          <p className="text-xs text-muted">As <b>máquinas de dados</b> (2 VMs, divididas) executam o pedido. <b>Incremental</b> = rápido (só o novo/mudou); <b>Completo</b> = refaz os 6 anos (lento). Os dois só <b>somam</b> à base — nunca apagam.</p>
          <label className="text-xs text-muted block"><input type="checkbox" checked={confProdDb} onChange={(e) => setConfProdDb(e.target.checked)} disabled={!canProdDb || !dbConfigured} className="align-middle mr-1" /> confirmo</label>
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={!canProdDb || !confProdDb || !dbConfigured || !!busy} onClick={() => create("run_production_write_db", { confirm: true, parameters: { kind: "incremental" } })}>
              {busy === "run_production_write_db" ? "Criando…" : "🔄 Atualizar agora (incremental)"}
            </Button>
            <Button variant="danger" disabled={!canProdDb || !confProdDb || !dbConfigured || !!busy} onClick={() => create("run_production_write_db", { confirm: true, parameters: { kind: "completo" } })}>
              {busy === "run_production_write_db" ? "…" : "🗄️ Refazer tudo (completo)"}
            </Button>
          </div>
          <p className="text-[11px] text-muted">No dia a dia a <b>automação de domingo</b> já mantém atualizado — use isto só pra forçar agora.</p>
        </div>
      </CardPad></Card>

      {/* AVANÇADO — recolhido */}
      <Card><CardPad>
        <details>
          <summary className="list-none cursor-pointer flex items-center gap-2 select-none">
            <ChevronDown size={16} className="text-muted" />
            <Settings2 size={16} className="text-muted" />
            <span className="font-bold text-fg">Opções avançadas</span>
            <span className="text-xs font-bold uppercase tracking-wide text-muted bg-surface2 rounded-full px-2 py-0.5">raramente</span>
          </summary>
          <div className="mt-3 space-y-2">
            <Row a="run_test" label="▶️ Rodar teste rápido" disabled={!canTest} desc="Roda o processo em modo teste, sem tocar no banco. Só para confirmar que tudo funciona." />
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 p-2.5 rounded-lg border border-line bg-surface2/30">
              <div className="sm:w-60 shrink-0 flex items-center gap-2">
                <label className="text-xs text-muted"><input type="checkbox" checked={confProd} onChange={(e) => setConfProd(e.target.checked)} disabled={!canProd} className="align-middle mr-1" />confirmo</label>
                <Button variant="danger" className="flex-1 justify-center" disabled={!canProd || !confProd || !!busy} onClick={() => create("run_production", { confirm: true })}>
                  {busy === "run_production" ? "Criando…" : "🚀 Gerar rodada"}
                </Button>
              </div>
              <p className="text-xs text-muted leading-snug">Gera a rodada completa (Excel, relatório, lista) <b>sem gravar no banco</b>. Depois você publica com “Publicar última rodada”.</p>
            </div>
            <Row a="load_round_to_db" label="🗄️ Publicar última rodada" disabled={!canLoadDb} desc="Grava no banco a última rodada já gerada, sem puxar do PNCP de novo. Bem mais rápido." />
            <Row a="upload_artifacts" label="📤 Enviar arquivos da rodada" disabled={!canTest} desc="Sobe Excel/PDF/protótipo da última rodada para ficarem baixáveis em Relatórios." />
            <Row a="sync_storage" label="🔄 Sincronizar Storage" disabled={!canTest} desc="Reenvia arquivos que ficaram pendentes de upload (recuperação)." />
            
            {/* NOVO COLETOR E ATUALIZADOR DE VMS */}
            <Row
              a="auto_setup_coleta"
              label="📊 Coletar Contratos (7 Órgãos)"
              disabled={!canProd}
              onClick={() => create("auto_setup", { confirm: true, parameters: { args: ["scripts/coleta_orgaos_especificos.py"] } })}
              desc="Dispara a varredura multi-fonte nas VMs da Oracle para PRF, SEST, MPM, MPF, MDA, ADASA e POSTALIS. Gera a planilha consolidada e a envia ao Storage."
            />
            <Row
              a="auto_setup_pull"
              label="🔄 Atualizar VMs (git pull)"
              disabled={!canProd}
              onClick={() => create("auto_setup", { confirm: true, parameters: { args: ["scripts/git_pull.py"] } })}
              desc="Executa o comando git pull nas VMs da Oracle para baixar a última versão do código (coletor e scripts)."
            />
          </div>
        </details>
      </CardPad></Card>

      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}
