"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui/primitives";
import { Plus, Trash2, Check } from "lucide-react";

const PERFIS = [
  { v: "Pre-Vendas", tag: "PV", name: "Pré-Vendas", desc: "Equipe Técnica" },
  { v: "Account Manager", tag: "AM", name: "Account Manager", desc: "Gestão de contas" },
];
const MARGENS = ["Inferior a 16,79%", "De 16,80% a 19,99%", "De 20,00% a 24,99%", "De 25,00% a 29,99%", "Além da cota"];
const TIPOS = ["Vendas de produtos Check Point", "Vendas de outros Produtos", "Vendas de Solução", "Renovações"];
export const FASES = [
  "1 - Prospecção", "2 - Qualificação da Oportunidade", "3 - Desenvolvimento do Projeto",
  "4 - IRP/Proposta", "5 - Publicação/Licitação/Fechamento", "6 - Projeto Ganho", "7 - Saldo de Ata",
];

type Row = { nome: string; percentual: string; fases: string[] };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-2">{children}</div>;
}

export function ComissionamentoForm() {
  const router = useRouter();
  const [perfil, setPerfil] = useState("");
  const [nome, setNome] = useState("");
  const [bitrix, setBitrix] = useState("");
  const [margem, setMargem] = useState("");
  const [tipo, setTipo] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  const addRow = () => setRows((r) => [...r, { nome: "", percentual: "", fases: [] }]);
  const delRow = (i: number) => setRows((r) => r.filter((_, j) => j !== i));
  const setRow = (i: number, patch: Partial<Row>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const toggleFase = (i: number, f: string) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, fases: row.fases.includes(f) ? row.fases.filter((x) => x !== f) : [...row.fases, f] } : row)));

  async function submit() {
    setMsg(null);
    const comissionados = rows
      .map((r) => ({ nome: r.nome.trim(), percentual: Number(String(r.percentual).replace(",", ".")) || 0, fases: r.fases }))
      .filter((c) => c.nome && c.fases.length > 0);
    if (!perfil || !nome.trim() || !bitrix.trim() || !margem || !tipo) { setMsg({ t: "Preencha equipe, nome, ID Bitrix, margem e tipo de projeto.", ok: false }); return; }
    if (!comissionados.length) { setMsg({ t: "Adicione ao menos um comissionado com nome e ao menos uma fase.", ok: false }); return; }
    const pctRuim = rows.find((r) => r.nome.trim() && r.fases.length > 0 && !(Number(String(r.percentual).replace(",", ".")) > 0));
    if (pctRuim) { setMsg({ t: `Informe um percentual maior que zero para “${pctRuim.nome.trim()}”.`, ok: false }); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/comissionamento", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "comissionamento", perfil, nome_preenchedor: nome.trim(), id_bitrix: bitrix.trim(), comissionados, margem_projeto: margem, tipo_projeto: tipo }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Erro ao salvar.");
      setMsg({ t: "Comissionamento registrado com sucesso!", ok: true });
      setPerfil(""); setNome(""); setBitrix(""); setMargem(""); setTipo(""); setRows([]);
      router.refresh();
    } catch (e: any) { setMsg({ t: e.message || "Erro ao salvar.", ok: false }); }
    finally { setBusy(false); }
  }

  const chip = (active: boolean) =>
    `cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${active ? "border-brand bg-brand/10 text-brand font-semibold" : "border-line bg-surface text-fg hover:bg-surface2"}`;

  return (
    <div className="space-y-5">
      {/* Equipe */}
      <div>
        <SectionLabel>Qual a sua equipe?</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PERFIS.map((p) => (
            <button key={p.v} type="button" onClick={() => setPerfil(p.v)}
              className={`text-left rounded-xl border p-3 transition ${perfil === p.v ? "border-brand bg-brand/10" : "border-line bg-surface hover:bg-surface2"}`}>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-brand/15 text-brand font-bold text-sm">{p.tag}</span>
                <div>
                  <div className="font-semibold text-fg text-sm">{p.name}</div>
                  <div className="text-xs text-muted">{p.desc}</div>
                </div>
                {perfil === p.v && <Check size={18} className="ml-auto text-brand" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quem preenche */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <SectionLabel>Quem está preenchendo *</SectionLabel>
          <Input value={nome} onChange={(e: any) => setNome(e.target.value)} placeholder="Nome completo" />
        </div>
        <div>
          <SectionLabel>ID do Bitrix *</SectionLabel>
          <Input value={bitrix} onChange={(e: any) => setBitrix(e.target.value)} placeholder="Ex: 12345" />
        </div>
      </div>

      {/* Margem */}
      <div>
        <SectionLabel>Margem do Projeto * (escolha uma)</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {MARGENS.map((m) => (
            <span key={m} className={chip(margem === m)} onClick={() => setMargem(m)}>{m}</span>
          ))}
        </div>
      </div>

      {/* Tipo */}
      <div>
        <SectionLabel>Tipo de Projeto * (escolha um)</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {TIPOS.map((t) => (
            <span key={t} className={chip(tipo === t)} onClick={() => setTipo(t)}>{t}</span>
          ))}
        </div>
      </div>

      {/* Comissionados */}
      <div>
        <SectionLabel>Comissionado(s) *</SectionLabel>
        <div className="space-y-3">
          {rows.length === 0 && <div className="text-sm text-muted border border-dashed border-line rounded-lg p-3">Nenhum comissionado. Clique em “Adicionar comissionado”.</div>}
          {rows.map((row, i) => (
            <div key={i} className="rounded-xl border border-line bg-surface2/40 p-3 space-y-3">
              <div className="flex gap-2">
                <Input value={row.nome} onChange={(e: any) => setRow(i, { nome: e.target.value })} placeholder="Nome do comissionado" className="flex-1" />
                <div className="relative w-28">
                  <Input value={row.percentual} onChange={(e: any) => setRow(i, { percentual: e.target.value })} placeholder="Ex.: 10" inputMode="decimal" className="pr-6 text-right" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-sm">%</span>
                </div>
                <Button variant="ghost" onClick={() => delRow(i)} className="!px-2" title="Remover"><Trash2 size={16} /></Button>
              </div>
              <div className="text-[11px] text-muted">Fases em que atua (marque uma ou mais):</div>
              <div className="flex flex-wrap gap-1.5">
                {FASES.map((f) => (
                  <span key={f} className={`cursor-pointer rounded-md border px-2 py-1 text-xs transition ${row.fases.includes(f) ? "border-brand bg-brand/10 text-brand font-semibold" : "border-line bg-surface text-muted hover:text-fg"}`} onClick={() => toggleFase(i, f)}>{f}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Button variant="ghost" onClick={addRow} className="mt-3"><Plus size={16} /> Adicionar comissionado</Button>
      </div>

      {msg && <div className={`text-sm rounded-lg px-3 py-2 ${msg.ok ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-red-500/15 text-red-600 dark:text-red-400"}`}>{msg.t}</div>}

      <Button onClick={submit} disabled={busy} className="w-full">{busy ? "Enviando..." : "Registrar Comissionamento"}</Button>
    </div>
  );
}
