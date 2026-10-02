"use client";
import { useState } from "react";
import { Button, Card, CardPad } from "@/components/ui/primitives";
import { RefreshCw, FlaskConical, Database, MonitorPlay } from "lucide-react";

export function RunControls({ canTest, canProd, canProdDb, canLoadDb, dbConfigured }: {
  canTest: boolean; canProd: boolean; canProdDb: boolean; canLoadDb: boolean; dbConfigured: boolean;
}) {
  const [busy, setBusy] = useState("");
  const [res, setRes] = useState<any>(null);
  const [conf, setConf] = useState(false);

  async function run(label: string, body: any) {
    setBusy(label); setRes(null);
    try {
      const r = await fetch("/api/run-pipeline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      setRes({ ok: r.ok, ...j });
    } catch (e: any) { setRes({ ok: false, error: "Erro de rede: " + e?.message }); }
    finally { setBusy(""); }
  }

  const podeAtualizar = canProdDb && dbConfigured;

  return (
    <div className="space-y-4">
      {/* PRINCIPAL: Atualizar tudo (varredura dos últimos 6 anos) */}
      <Card className="border-brand/40">
        <CardPad>
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand/15 text-brand grid place-items-center shrink-0"><RefreshCw size={22} /></div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-extrabold text-fg">Atualizar tudo</div>
              <p className="text-sm text-muted mt-0.5">
                Faz a varredura completa dos <b className="text-fg">últimos 6 anos</b> de contratos (DF + GO, TI) no PNCP e atualiza o site.
                Roda em segundo plano (leva algumas horas) — acompanhe o andamento em <b className="text-fg">Admin → Jobs</b>. A janela avança sozinha a cada ano.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="text-xs text-muted inline-flex items-center gap-1.5 select-none">
                  <input type="checkbox" checked={conf} onChange={(e) => setConf(e.target.checked)} disabled={!podeAtualizar} /> confirmo que quero atualizar tudo
                </label>
                <Button disabled={!podeAtualizar || !conf || !!busy} onClick={() => run("atualizar", { mode: "producao", writeDb: true, confirm: true })}>
                  {busy === "atualizar" ? "Iniciando…" : "🔄 Atualizar tudo agora"}
                </Button>
              </div>
              {!dbConfigured && <p className="text-xs text-amber-600 mt-2">Banco não configurado (DATABASE_URL).</p>}
              {!canProdDb && <p className="text-xs text-muted mt-2">Seu perfil não pode disparar esta ação (somente Administrador).</p>}
            </div>
          </div>
        </CardPad>
      </Card>

      {/* SECUNDÁRIAS */}
      <Card><CardPad>
        <div className="font-bold text-fg mb-3">Outras ações</div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="ghost" disabled={!canTest || !!busy} onClick={() => run("teste", { mode: "teste" })}>
            <FlaskConical size={15} /> {busy === "teste" ? "Executando…" : "Teste rápido"}
          </Button>
          <Button variant="ghost" disabled={!canLoadDb || !!busy} onClick={() => run("loaddb", { action: "load_db" })}>
            <Database size={15} /> Recarregar última rodada no banco
          </Button>
          <Button variant="ghost" disabled={!canTest || !!busy} onClick={() => run("proto", { action: "update_prototype" })}>
            <MonitorPlay size={15} /> Atualizar protótipo
          </Button>
        </div>
        <p className="text-xs text-muted mt-2">Dica: o sistema também roda a varredura completa sozinho toda semana — este botão é para quando você quiser atualizar na hora.</p>
      </CardPad></Card>

      {res && (
        <Card><CardPad>
          <div className={"font-bold " + (res.ok ? "text-emerald-600" : "text-red-600")}>{res.ok ? "✅ Iniciado" : "❌ Falhou"}</div>
          {res.message && <p className="text-sm mt-1">{res.message}</p>}
          {res.error && <p className="text-sm text-red-600 mt-1">{res.error}</p>}
          {res.jobId && <p className="text-xs text-muted mt-1">Job #{res.jobId} — acompanhe em Admin → Jobs.</p>}
          {res.output && <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-3 mt-2 overflow-x-auto max-h-64">{res.output}</pre>}
        </CardPad></Card>
      )}
    </div>
  );
}
