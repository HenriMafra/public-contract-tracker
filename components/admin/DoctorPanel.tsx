"use client";
import { useState } from "react";
import { Card, CardPad, Button } from "@/components/ui/primitives";
import { Wrench, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";

type Item = { item: string; status: string; detalhe: string };

const STATUS: Record<string, { cls: string; Icon: any; rotulo: string }> = {
  ok: { cls: "text-emerald-600 dark:text-emerald-400", Icon: CheckCircle2, rotulo: "OK" },
  corrigido: { cls: "text-blue-600 dark:text-blue-400", Icon: Wrench, rotulo: "Corrigido" },
  alerta: { cls: "text-amber-600 dark:text-amber-400", Icon: AlertTriangle, rotulo: "Atenção" },
  erro: { cls: "text-red-600 dark:text-red-400", Icon: XCircle, rotulo: "Erro" },
};

export function DoctorPanel() {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Item[] | null>(null);
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true); setErr(""); setReport(null);
    try {
      const r = await fetch("/api/admin/doctor", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (r.ok) setReport(j.report || []);
      else setErr(j.error || "Falha ao rodar.");
    } catch { setErr("Erro de rede."); }
    finally { setBusy(false); }
  }

  const c = { corrigido: 0, alerta: 0, erro: 0, ok: 0 } as Record<string, number>;
  (report || []).forEach((i) => { c[i.status] = (c[i.status] || 0) + 1; });

  return (
    <Card><CardPad>
      <div className="flex items-start gap-2 mb-1">
        <Wrench size={18} className="text-brand shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-fg">Auto-resolver (verificar e consertar tudo)</div>
          <p className="text-xs text-muted mt-0.5">
            Roda uma bateria de verificações no banco e <b>corrige sozinho</b> o que dá pra corrigir
            (libera jobs travados, recria views quebradas, garante colunas, preenche siglas, limpa órfãos, atualiza estatísticas…).
            Roda na <b>nuvem</b> — pode rodar sempre que algo parecer estranho. É seguro.
          </p>
        </div>
      </div>
      <Button disabled={busy} onClick={run} className="mt-2">
        {busy ? <><Loader2 size={15} className="animate-spin" /> Verificando e corrigindo…</> : <><Wrench size={15} /> Reprocessar / Auto-resolver</>}
      </Button>

      {err && <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-3">{err}</div>}

      {report && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2 text-xs mb-2">
            {c.corrigido > 0 && <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold">{c.corrigido} corrigido(s)</span>}
            {c.alerta > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">{c.alerta} atenção</span>}
            {c.erro > 0 && <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 font-semibold">{c.erro} erro(s)</span>}
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">{c.ok} OK</span>
          </div>
          <div className="rounded-xl border border-line divide-y divide-line">
            {report.map((i, k) => {
              const s = STATUS[i.status] || STATUS.ok;
              return (
                <div key={k} className="flex items-center gap-2.5 px-3 py-2 text-sm">
                  <s.Icon size={15} className={s.cls + " shrink-0"} />
                  <span className="text-fg font-medium flex-1">{i.item}</span>
                  <span className="text-xs text-muted text-right">{i.detalhe}</span>
                  <span className={"text-xs font-semibold w-20 text-right " + s.cls}>{s.rotulo}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted mt-2">Os itens em <b className="text-amber-600 dark:text-amber-400">Atenção</b> normalmente dependem da coleta na nuvem rodar (ex.: poucos editais abertos) — rode a coleta em Operação. Itens em <b className="text-red-600 dark:text-red-400">Erro</b> me avise que eu trato.</p>
        </div>
      )}
    </CardPad></Card>
  );
}
