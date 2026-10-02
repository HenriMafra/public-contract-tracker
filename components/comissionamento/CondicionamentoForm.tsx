"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui/primitives";
import { Check } from "lucide-react";

const PERFIS = [
  { v: "Pre-Vendas", tag: "PV", name: "Pré-Vendas", desc: "Equipe Técnica" },
  { v: "Account Manager", tag: "AM", name: "Account Manager", desc: "Gestão de contas" },
];
// Condicionamento tem 7 fases (as 5 do comissionamento + Projeto Ganho + Saldo de Ata).
const FASES = [
  "1 - Prospecção", "2 - Qualificação da Oportunidade", "3 - Desenvolvimento do Projeto",
  "4 - IRP/Proposta", "5 - Publicação/Licitação/Fechamento", "6 - Projeto Ganho", "7 - Saldo de Ata",
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-2">{children}</div>;
}

export function CondicionamentoForm() {
  const router = useRouter();
  const [perfil, setPerfil] = useState("");
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [bitrix, setBitrix] = useState("");
  const [comissionado, setComissionado] = useState("");
  const [percentual, setPercentual] = useState("");
  const [fases, setFases] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  const toggleFase = (f: string) => setFases((s) => (s.includes(f) ? s.filter((x) => x !== f) : [...s, f]));

  async function submit() {
    setMsg(null);
    if (!perfil || !nome.trim() || !bitrix.trim() || !comissionado.trim()) { setMsg({ t: "Preencha equipe, nome, ID Bitrix e o comissionado.", ok: false }); return; }
    if (!fases.length) { setMsg({ t: "Selecione ao menos uma fase comissionada.", ok: false }); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/comissionamento", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "condicionamento", perfil, nome_preenchedor: nome.trim(), sobrenome_preenchedor: sobrenome.trim(), id_bitrix: bitrix.trim(), nome_comissionado: comissionado.trim(), percentual: percentual.trim() === "" ? null : Number(String(percentual).replace(",", ".")), fases_comissionadas: fases }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Erro ao salvar.");
      setMsg({ t: "Condicionamento registrado com sucesso!", ok: true });
      setPerfil(""); setNome(""); setSobrenome(""); setBitrix(""); setComissionado(""); setPercentual(""); setFases([]);
      router.refresh();
    } catch (e: any) { setMsg({ t: e.message || "Erro ao salvar.", ok: false }); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <div>
        <SectionLabel>Você é</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PERFIS.map((p) => (
            <button key={p.v} type="button" onClick={() => setPerfil(p.v)}
              className={`text-left rounded-xl border p-3 transition ${perfil === p.v ? "border-brand bg-brand/10" : "border-line bg-surface hover:bg-surface2"}`}>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-brand/15 text-brand font-bold text-sm">{p.tag}</span>
                <div><div className="font-semibold text-fg text-sm">{p.name}</div><div className="text-xs text-muted">{p.desc}</div></div>
                {perfil === p.v && <Check size={18} className="ml-auto text-brand" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><SectionLabel>Nome *</SectionLabel><Input value={nome} onChange={(e: any) => setNome(e.target.value)} placeholder="Nome" /></div>
        <div><SectionLabel>Sobrenome</SectionLabel><Input value={sobrenome} onChange={(e: any) => setSobrenome(e.target.value)} placeholder="Sobrenome" /></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><SectionLabel>ID do Bitrix *</SectionLabel><Input value={bitrix} onChange={(e: any) => setBitrix(e.target.value)} placeholder="Ex: 12345" /></div>
        <div><SectionLabel>Comissionado *</SectionLabel><Input value={comissionado} onChange={(e: any) => setComissionado(e.target.value)} placeholder="Nome do comissionado" /></div>
      </div>

      <div className="sm:max-w-[220px]">
        <SectionLabel>Percentual</SectionLabel>
        <div className="relative">
          <Input value={percentual} onChange={(e: any) => setPercentual(e.target.value)} placeholder="Ex: 15" inputMode="decimal" className="pr-7 text-right" />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted text-sm">%</span>
        </div>
      </div>

      <div>
        <SectionLabel>Fases Comissionadas *</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {FASES.map((f) => (
            <span key={f} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${fases.includes(f) ? "border-brand bg-brand/10 text-brand font-semibold" : "border-line bg-surface text-fg hover:bg-surface2"}`} onClick={() => toggleFase(f)}>{f}</span>
          ))}
        </div>
      </div>

      {msg && <div className={`text-sm rounded-lg px-3 py-2 ${msg.ok ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-red-500/15 text-red-600 dark:text-red-400"}`}>{msg.t}</div>}

      <Button onClick={submit} disabled={busy} className="w-full">{busy ? "Enviando..." : "Registrar Condicionamento"}</Button>
    </div>
  );
}
