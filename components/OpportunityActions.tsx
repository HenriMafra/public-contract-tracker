"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card, CardPad, Select } from "@/components/ui/primitives";
import { Check, AlertCircle } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";

// Detecção de erro de digitação:
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
const telDigitos = (v: string) => v.replace(/\D/g, "");
const telOk = (v: string) => { const d = telDigitos(v); return d.length >= 10 && d.length <= 13; }; // DDD + número (aceita +55)

export function OpportunityActions({ oppId, canAssign, canContact, canValidate }: {
  oppId: number; canAssign: boolean; canContact: boolean; canValidate: boolean;
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [nome, setNome] = useState(""); const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState(""); const [telefone, setTelefone] = useState("");
  const [resumo, setResumo] = useState(""); const [prox, setProx] = useState("");
  const [resp, setResp] = useState(""); const [status, setStatus] = useState("Validada");

  async function call(url: string, body: any, onOk?: () => void) {
    setBusy(true); setMsg("");
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      setMsg(r.ok ? (j.message || "Feito.") : (j.error || `Falha (${r.status})`));
      if (r.ok) { onOk?.(); router.refresh(); }
    } catch { setMsg("Erro de rede."); } finally { setBusy(false); }
  }

  // erros de digitação (campo preenchido mas malformado)
  const emailErro = email.trim() !== "" && !emailOk(email);
  const telErro = telefone.trim() !== "" && !telOk(telefone);
  const podeRegistrar = nome.trim() !== "" && !emailErro && !telErro;

  // borda conforme validação (vermelho = erro, verde = válido e preenchido)
  const borda = (erro: boolean, ok: boolean) =>
    erro ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
    : ok ? "border-emerald-500/70 focus:border-emerald-500 focus:ring-emerald-500/30" : "";

  function registrarContato() {
    const pessoa = [nome.trim(), sobrenome.trim()].filter(Boolean).join(" ");
    call("/api/register-contact", {
      oportunidade_id: oppId, pessoa_contatada: pessoa,
      email: email.trim(), telefone: telefone.trim(), resumo: resumo.trim(), proxima_acao: prox.trim(),
    }, () => { setNome(""); setSobrenome(""); setEmail(""); setTelefone(""); setResumo(""); setProx(""); });
  }

  return (
    <Card><CardPad>
      <div className="font-bold text-fg mb-3">Ações</div>
      {msg && <div className="text-sm mb-3 px-3 py-2 rounded-lg bg-surface2 text-fg">{msg}</div>}
      {canContact && (
        <div className="space-y-2.5 mb-4">
          <div className="text-xs font-semibold text-muted">Registrar contato</div>

          {/* Linha 1: Nome + Sobrenome */}
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Nome *" value={nome} onChange={(e: any) => setNome(e.target.value)} />
            <Input placeholder="Sobrenome" value={sobrenome} onChange={(e: any) => setSobrenome(e.target.value)} />
          </div>

          {/* Linha 2: E-mail + Telefone (com detecção de erro de digitação) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="relative">
                <Input type="email" inputMode="email" placeholder="E-mail" value={email} aria-invalid={emailErro}
                  onChange={(e: any) => setEmail(e.target.value)} className={"pr-8 " + borda(emailErro, email.trim() !== "" && !emailErro)} />
                {email.trim() !== "" && (emailErro
                  ? <AlertCircle size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500" />
                  : <Check size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />)}
              </div>
              {emailErro && <p className="text-xs text-red-500 mt-1">E-mail inválido — confira o <b>@</b> e o domínio.</p>}
            </div>
            <div>
              <div className="relative">
                <Input inputMode="tel" placeholder="Telefone" value={telefone} aria-invalid={telErro}
                  onChange={(e: any) => setTelefone(e.target.value)} className={"pr-8 " + borda(telErro, telefone.trim() !== "" && !telErro)} />
                {telefone.trim() !== "" && (telErro
                  ? <AlertCircle size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500" />
                  : <Check size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />)}
              </div>
              {telErro && <p className="text-xs text-red-500 mt-1">Telefone incompleto — use <b>DDD + número</b> ({telDigitos(telefone).length} díg.; precisa 10–11).</p>}
            </div>
          </div>

          {/* Resumo do que foi tratado */}
          <textarea value={resumo} onChange={(e) => setResumo(e.target.value)} rows={3}
            placeholder="Resumo do que foi tratado com essa pessoa (ex.: confirmou interesse na renovação, pediu proposta até sexta…)"
            className="w-full rounded-lg border border-line bg-surface text-fg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-y min-h-[76px]" />

          {/* Próxima ação (opcional) */}
          <Input placeholder="Próxima ação (opcional)" value={prox} onChange={(e: any) => setProx(e.target.value)} />

          <Button disabled={busy || !podeRegistrar} onClick={registrarContato}>Registrar contato</Button>
        </div>
      )}
      {canAssign && (
        <div className="space-y-2 mb-4">
          <div className="text-xs font-semibold text-muted">Atribuir responsável <span className="font-normal text-brand/70">(nome exato, como cadastrado — grafias diferentes viram pessoas diferentes)</span></div>
          <Input placeholder="Nome do responsável" value={resp} onChange={(e: any) => setResp(e.target.value)} />
          <Button variant="dark" disabled={busy || !resp} onClick={() => call("/api/assign-opportunity", { oportunidade_id: oppId, responsavel: resp })}>Atribuir</Button>
        </div>
      )}
      {canValidate && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted">Validar / revisar</div>
          <Select value={status} onChange={(e: any) => setStatus(e.target.value)}><option>Validada</option><option>Em análise</option><option>Monitoramento</option><option>Descartada</option></Select>
          <Button variant={status === "Descartada" ? "danger" : "ghost"} disabled={busy}
            onClick={() => {
              const run = () => call("/api/validate-opportunity", { oportunidade_id: oppId, status_validacao: status });
              if (status === "Descartada") confirm({ title: "Descartar esta oportunidade?", danger: true, confirmLabel: "Sim, descartar", description: <>Ela sai da Lista de Ataque (vai para “descartadas”). Não apaga nada — dá para reverter pelo filtro de decisão.</> }, run);
              else run();
            }}>
            {status === "Descartada" ? "Descartar oportunidade" : "Aplicar validação"}
          </Button>
        </div>
      )}
      {!canContact && !canAssign && !canValidate && <div className="text-sm text-muted">Seu perfil não tem ações nesta oportunidade.</div>}
      {dialog}
    </CardPad></Card>
  );
}
