"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Card, CardPad, Badge } from "@/components/ui/primitives";
import { ROLES, ROLE_LABEL } from "@/lib/permissions";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Search, Trash2, Check, Eye, ShieldCheck, MapPin } from "lucide-react";

type Orgao = { id: number; nome: string; uf: string };

// Localizações (filiais ENTERPRISECORE → UF). Vazio = vê tudo.
const FILIAIS: { uf: string; label: string }[] = [
  { uf: "DF", label: "Brasília (Matriz)" },
  { uf: "GO", label: "Goiânia / Goiás" },
  { uf: "CE", label: "Fortaleza / Ceará" },
  { uf: "SP", label: "São Paulo" },
  { uf: "MT", label: "Cuiabá / Mato Grosso" },
  { uf: "PR", label: "Curitiba / Paraná" },
  { uf: "PE", label: "Recife / Pernambuco" },
  { uf: "AM", label: "Manaus / Amazonas" },
  { uf: "RS", label: "Porto Alegre / Rio Grande do Sul" },
];
const LABEL_UF: Record<string, string> = Object.fromEntries(FILIAIS.map((f) => [f.uf, f.label]));

function LocationPicker({ inicial, ufsComDados, onSalvar, onCancelar, busy }: {
  inicial: string[]; ufsComDados: Set<string>; onSalvar: (ufs: string[]) => void; onCancelar: () => void; busy: boolean;
}) {
  const [sel, setSel] = useState<Set<string>>(new Set(inicial));
  const todas = sel.size === 0;
  function toggle(uf: string) { const s = new Set(sel); s.has(uf) ? s.delete(uf) : s.add(uf); setSel(s); }
  return (
    <div className="mt-2 rounded-lg border border-line bg-surface2/40 p-3">
      <div className="text-xs text-muted mb-2">
        Escolha o que esta pessoa enxerga. <b className="text-fg">“Todas” = vê tudo</b> (todas as UFs). Se marcar uma ou mais localizações, ela passa a ver <b className="text-fg">só os órgãos daquelas UFs</b>.
      </div>
      {/* Opção TODAS (vê tudo) — padrão */}
      <button type="button" onClick={() => setSel(new Set())}
        className={"w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border mb-2 text-sm text-left " + (todas ? "border-brand bg-brand/10 font-semibold text-fg" : "border-line bg-surface hover:bg-surface2 text-muted")}>
        <span className={"h-4 w-4 rounded-full border flex items-center justify-center shrink-0 " + (todas ? "border-brand bg-brand" : "border-line")}>{todas && <Check size={11} className="text-white" />}</span>
        <span>Todas as localizações <span className="font-normal text-muted">(vê tudo — padrão)</span></span>
      </button>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
        {FILIAIS.map((f) => (
          <label key={f.uf} className={"flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer text-sm " + (sel.has(f.uf) ? "border-brand bg-brand/10" : "border-line bg-surface hover:bg-surface2")}>
            <input type="checkbox" checked={sel.has(f.uf)} onChange={() => toggle(f.uf)} className="h-4 w-4 accent-brand" />
            <span className="text-fg truncate">{f.label}</span>
            <span className="ml-auto text-xs shrink-0 font-mono text-muted">{f.uf}</span>
            {!ufsComDados.has(f.uf) && <span className="text-[10px] text-amber-600 dark:text-amber-400 shrink-0">sem dados ainda</span>}
          </label>
        ))}
      </div>
      {[...sel].some((uf) => !ufsComDados.has(uf)) && (
        <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-md px-2.5 py-1.5 mt-2">
          ⚠️ Você marcou localização(ões) <b>sem dados ainda</b> — essa pessoa verá a tela vazia até a coleta chegar nessa UF.
        </div>
      )}
      <div className="flex items-center gap-2 mt-2">
        <Button className="h-8" disabled={busy} onClick={() => {
          const semDados = [...sel].filter((uf) => !ufsComDados.has(uf));
          if (semDados.length && !confirm(`As localizações ${semDados.join(", ")} ainda não têm dados — a pessoa verá a tela vazia até a coleta chegar. Salvar mesmo assim?`)) return;
          onSalvar([...sel]);
        }}><Check size={14} /> Salvar</Button>
        <button className="text-xs text-muted hover:text-fg" onClick={onCancelar}>cancelar</button>
        <span className="ml-auto text-xs text-muted">{todas ? "vê tudo" : `${sel.size} ${sel.size === 1 ? "localização" : "localizações"}`}</span>
      </div>
    </div>
  );
}

// Seletor de ÓRGÃOS ESPECÍFICOS (refina além da localização — ex.: o AM só nos órgãos dele).
function OrgaoPicker({ orgaos, inicial, onSalvar, onCancelar, busy }: {
  orgaos: Orgao[]; inicial: number[]; onSalvar: (ids: number[]) => void; onCancelar: () => void; busy: boolean;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<number>>(new Set(inicial));
  const filt = useMemo(() => {
    const nq = q.trim().toLowerCase();
    const base = nq ? orgaos.filter((o) => o.nome.toLowerCase().includes(nq) || (o.uf || "").toLowerCase().includes(nq)) : orgaos;
    return base.slice(0, 400);
  }, [q, orgaos]);
  function toggle(id: number) { const s = new Set(sel); s.has(id) ? s.delete(id) : s.add(id); setSel(s); }
  return (
    <div className="mt-2 rounded-lg border border-line bg-surface2/40 p-3">
      <div className="text-xs text-muted mb-2">Marque os <b className="text-fg">órgãos específicos</b> que esta pessoa pode ver. Some-se à localização (UF) — vazio nos dois = vê tudo. Digite pra filtrar.</div>
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="buscar órgão por nome ou UF…" className="pl-8 h-8" />
        </div>
        {q.trim() && filt.length > 0 && <button type="button" onClick={() => setSel((s) => new Set([...s, ...filt.map((o) => o.id)]))} className="text-xs text-brand hover:underline whitespace-nowrap">+ {filt.length} filtrados</button>}
        <button type="button" onClick={() => setSel(new Set())} className="text-xs text-muted hover:text-fg whitespace-nowrap">limpar</button>
        <span className="text-xs text-muted whitespace-nowrap"><b className="text-fg">{sel.size}</b> sel.</span>
      </div>
      <div className="max-h-56 overflow-y-auto rounded-md border border-line bg-surface divide-y divide-line">
        {filt.length === 0 ? <div className="text-xs text-muted p-3">Nenhum órgão encontrado.</div> :
          filt.map((o) => (
            <label key={o.id} className="flex items-center gap-2 px-2.5 py-1.5 text-sm hover:bg-surface2 cursor-pointer">
              <input type="checkbox" checked={sel.has(o.id)} onChange={() => toggle(o.id)} />
              <span className="truncate text-fg">{o.nome}</span>
              {o.uf && <span className="text-xs text-muted ml-auto shrink-0">{o.uf}</span>}
            </label>
          ))}
      </div>
      {orgaos.length > 400 && !q && <p className="text-xs text-muted mt-1">Mostrando 400 — use a busca pra refinar.</p>}
      <div className="flex items-center gap-2 mt-2">
        <Button className="h-8" disabled={busy} onClick={() => onSalvar([...sel])}><Check size={14} /> Salvar órgãos</Button>
        <button className="text-xs text-muted hover:text-fg" onClick={onCancelar}>cancelar</button>
      </div>
    </div>
  );
}

export function UserManager({ users, orgaos, currentUserId }: { users: any[]; orgaos: Orgao[]; currentUserId?: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ emails: "", password: "", role: "Account Manager" });
  const [cBusy, setCBusy] = useState(false);
  const [cRes, setCRes] = useState<{ email: string; ok: boolean; erro?: string }[]>([]);
  // CONVITE DE 1º ACESSO (em massa): cola e-mails, escolhe o papel, gera os links de definição de senha
  const [inv, setInv] = useState({ emails: "", role: "Account Manager" });
  const [invBusy, setInvBusy] = useState(false);
  const [invRes, setInvRes] = useState<{ email: string; ok: boolean; link?: string; otp?: string; erro?: string }[]>([]);
  const [orgOpen, setOrgOpen] = useState<string | null>(null);
  // SELEÇÃO EM MASSA (2026-07-02): marca vários usuários e ativa/desativa todos de uma vez
  const [selMode, setSelMode] = useState(false);
  const [selUsers, setSelUsers] = useState<Set<string>>(new Set());
  const [selBusy, setSelBusy] = useState(false);
  const ufsComDados = useMemo(() => new Set(orgaos.map((o) => o.uf).filter(Boolean)), [orgaos]);
  const { confirm, dialog } = useConfirm();

  // papel controlado por usuário (pra poder reverter o <select> se a confirmação for cancelada)
  const [roleByUser, setRoleByUser] = useState<Record<string, string>>({});
  useEffect(() => { setRoleByUser(Object.fromEntries(users.map((u: any) => [u.user_id, u.role]))); }, [users]);

  // quantos administradores ATIVOS existem (pra avisar quando for o último)
  const adminsAtivos = useMemo(() => users.filter((u: any) => u.role === "Administrador" && u.ativo).length, [users]);
  const ehUltimoAdmin = (u: any) => u.role === "Administrador" && u.ativo && adminsAtivos <= 1;

  function pedirTrocaPapel(u: any, novo: string) {
    const atual = roleByUser[u.user_id] ?? u.role;
    if (novo === atual) return;
    const ehVoce = u.user_id === currentUserId;
    const removeAdmin = atual === "Administrador" && novo !== "Administrador";
    confirm({
      title: `Alterar papel de ${u.nome || u.email}?`,
      danger: removeAdmin || ehVoce,
      confirmLabel: "Alterar papel",
      description: (
        <>
          De <b className="text-fg">{ROLE_LABEL[atual] || atual}</b> para <b className="text-fg">{ROLE_LABEL[novo] || novo}</b>.
          {ehVoce && <div className="mt-1.5 text-amber-600 dark:text-amber-400">⚠ Esta é a <b>sua própria conta</b> — você vai mudar o seu acesso.</div>}
          {removeAdmin && ehUltimoAdmin(u) && <div className="mt-1.5 text-red-500">⛔ Este é o <b>último administrador ativo</b>. O sistema vai bloquear para você não ficar trancado para fora.</div>}
        </>
      ),
    }, async () => {
      const { r } = await call({ action: "set_role", user_id: u.user_id, role: novo });
      setRoleByUser((m) => ({ ...m, [u.user_id]: r?.ok ? novo : atual }));
    });
  }

  function pedirDesativar(u: any) {
    confirm({
      title: `Desativar ${u.nome || u.email}?`,
      danger: true,
      confirmLabel: "Desativar",
      description: (
        <>
          A pessoa perde o acesso ao MAPPER imediatamente. Você pode reativar depois — nada é apagado.
          {ehUltimoAdmin(u) && <div className="mt-1.5 text-red-500">⛔ É o <b>último administrador ativo</b> — o sistema vai bloquear.</div>}
        </>
      ),
    }, () => call({ action: "set_active", user_id: u.user_id, ativo: false }));
  }

  function pedirRemover(u: any) {
    confirm({
      title: `Remover ${u.nome || u.email}?`,
      danger: true,
      confirmLabel: "Remover definitivamente",
      requireText: "REMOVER",
      description: (
        <>
          Isso apaga <b>login + perfil + órgãos</b> desta pessoa. <b className="text-fg">Não dá para desfazer.</b>
          {ehUltimoAdmin(u) && <div className="mt-1.5 text-red-500">⛔ É o <b>último administrador ativo</b> — o sistema vai bloquear.</div>}
        </>
      ),
    }, () => call({ action: "delete", user_id: u.user_id }));
  }

  async function call(body: any) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/manage-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      setMsg({ ok: r.ok, t: r.ok ? (j.message || "Feito.") : (j.error || "Falha.") });
      if (r.ok) router.refresh();
      return { r, j };
    } catch { setMsg({ ok: false, t: "Erro de rede." }); return { r: null, j: {} }; }
    finally { setBusy(false); }
  }

  // Nome amigável a partir do e-mail (joao.arenhart@... -> "Joao Arenhart"); o admin pode ajustar depois.
  function nomeDoEmail(email: string) {
    const local = (email.split("@")[0] || "").replace(/[._-]+/g, " ").trim();
    return local.split(" ").filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  // CRIAR EM MASSA: cola e-mails + 1 senha temporária + papel; nome puxado do e-mail. Um lote por papel.
  async function criarVarios() {
    const lista = Array.from(new Set(f.emails.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s))));
    if (!lista.length) { setMsg({ ok: false, t: "Cole ao menos um e-mail válido." }); return; }
    if (!f.password) { setMsg({ ok: false, t: "Defina a senha temporária." }); return; }
    if (new TextEncoder().encode(f.password).length > 72) { setMsg({ ok: false, t: "Senha muito longa (máx 72 caracteres)." }); return; }
    setCBusy(true); setMsg(null); setCRes([]);
    const out: { email: string; ok: boolean; erro?: string }[] = [];
    for (const email of lista) {
      try {
        const r = await fetch("/api/manage-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", email, password: f.password, nome: nomeDoEmail(email), role: f.role }) });
        const j = await r.json().catch(() => ({}));
        out.push(r.ok && j.ok ? { email, ok: true } : { email, ok: false, erro: j.error || "falha" });
      } catch { out.push({ email, ok: false, erro: "erro de rede" }); }
      setCRes([...out]);
    }
    setCBusy(false);
    const okN = out.filter((o) => o.ok).length;
    setMsg({ ok: okN > 0, t: `${okN}/${lista.length} usuário(s) criado(s) com a senha temporária.` });
    router.refresh();
  }
  // Ativa/desativa TODOS os usuários selecionados (um a um na API, com confirmação antes).
  function pedirAtivarDesativarSelecionados(ativar: boolean) {
    // nunca desativa a própria conta (mesma regra do botão individual)
    const alvos = users.filter((u: any) => selUsers.has(u.user_id) && !(u.user_id === currentUserId && !ativar));
    if (!alvos.length) { setMsg({ ok: false, t: "Nenhum usuário selecionado." }); return; }
    const pulouVoce = selUsers.has(currentUserId || "") && !ativar;
    confirm({
      title: `${ativar ? "Ativar" : "Desativar"} ${alvos.length} usuário(s)?`,
      danger: !ativar,
      confirmLabel: ativar ? "Ativar selecionados" : "Desativar selecionados",
      description: (
        <>
          <div className="max-h-40 overflow-y-auto text-xs space-y-0.5 mb-1">
            {alvos.map((u: any) => <div key={u.user_id} className="text-fg">{u.nome || u.email}</div>)}
          </div>
          {!ativar && <div className="text-amber-600 dark:text-amber-400">Eles perdem o acesso imediatamente — você pode reativar depois, nada é apagado.</div>}
          {pulouVoce && <div className="mt-1 text-amber-600 dark:text-amber-400">⚠ Sua própria conta foi <b>pulada</b> (não dá pra se desativar).</div>}
        </>
      ),
    }, async () => {
      setSelBusy(true); setMsg(null);
      let ok = 0, falha = 0;
      for (const u of alvos) {
        try {
          const r = await fetch("/api/manage-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_active", user_id: u.user_id, ativo: ativar }) });
          if (r.ok) ok++; else falha++;
        } catch { falha++; }
      }
      setSelBusy(false);
      setMsg({ ok: falha === 0, t: `${ok}/${alvos.length} usuário(s) ${ativar ? "ativado(s)" : "desativado(s)"}${falha ? ` · ${falha} falha(s)` : ""}.` });
      setSelUsers(new Set()); setSelMode(false);
      router.refresh();
    });
  }

  async function convidar() {
    const lista = Array.from(new Set(inv.emails.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s))));
    if (!lista.length) { setMsg({ ok: false, t: "Cole ao menos um e-mail válido." }); return; }
    setInvBusy(true); setMsg(null); setInvRes([]);
    const out: { email: string; ok: boolean; link?: string; otp?: string; erro?: string }[] = [];
    for (const email of lista) {
      try {
        const r = await fetch("/api/manage-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "invite", email, role: inv.role, nome: nomeDoEmail(email) }) });
        const j = await r.json().catch(() => ({}));
        out.push(r.ok && j.ok ? { email, ok: true, link: j.action_link, otp: j.email_otp } : { email, ok: false, erro: j.error || "falha" });
      } catch { out.push({ email, ok: false, erro: "erro de rede" }); }
      setInvRes([...out]);
    }
    setInvBusy(false);
    const okN = out.filter((o) => o.ok).length;
    setMsg({ ok: okN > 0, t: `${okN}/${lista.length} convite(s) gerado(s).` });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* CRIAR EM MASSA (senha temporária compartilhada) */}
      <Card><CardPad>
        <div className="font-bold text-fg mb-1">Criar usuários <span className="font-normal text-brand/70 text-sm">(em massa, com uma senha temporária)</span></div>
        <p className="text-xs text-muted mb-3">Cole os e-mails (um por linha), escolha <b className="text-fg">uma senha temporária</b> e o papel. O nome é puxado do e-mail (<i>nome.sobrenome</i> → "Nome Sobrenome"). Cada pessoa entra com essa senha, cadastra o 2º fator (MFA) e troca a senha depois em Minha Conta. Faça <b className="text-fg">um lote por papel</b>: AMs, depois Pré-vendas, depois Diretoria.</p>
        <div className="grid md:grid-cols-[1fr_auto] gap-2 items-start">
          <textarea className="min-h-[96px] rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg w-full" placeholder={"nome.sobrenome@grupoenterprisecore.com.br\noutro.nome@grupoenterprisecore.com.br"} value={f.emails} onChange={(e) => setF({ ...f, emails: e.target.value })} />
          <div className="flex md:flex-col gap-2 md:w-60">
            <Input placeholder="Senha temporária" type="text" value={f.password} onChange={(e: any) => setF({ ...f, password: e.target.value })} />
            <Select value={f.role} onChange={(e: any) => setF({ ...f, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>)}
            </Select>
            <Button disabled={cBusy || !f.emails.trim() || !f.password} onClick={criarVarios}>{cBusy ? "Criando…" : "Criar usuários"}</Button>
          </div>
        </div>
        {cRes.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {cRes.map((r) => (
              <div key={r.email} className={"text-sm rounded-lg border px-2.5 py-1.5 flex items-center gap-2 " + (r.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5")}>
                <span className="font-semibold text-fg break-all">{r.email}</span>
                {r.ok ? <Badge>{ROLE_LABEL[f.role] || f.role}</Badge> : <span className="text-xs text-red-600">{r.erro}</span>}
              </div>
            ))}
          </div>
        )}
        {msg && <div className={"text-sm mt-3 px-3 py-2 rounded-lg " + (msg.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-600")}>{msg.t}</div>}
      </CardPad></Card>

      {/* CONVIDAR (1º acesso define a senha) */}
      <Card><CardPad>
        <div className="font-bold text-fg mb-1">Convidar por e-mail <span className="font-normal text-brand/70 text-sm">(a pessoa define a própria senha no 1º acesso → cai no MFA obrigatório)</span></div>
        <p className="text-xs text-muted mb-3">Cole um ou mais e-mails (um por linha), escolha o papel e clique em Convidar. Gera o <b className="text-fg">link de 1º acesso</b> de cada um — repasse o link (ou o e-mail + código) para a pessoa. Ela define a senha e cadastra o 2º fator.</p>
        <div className="grid md:grid-cols-[1fr_auto] gap-2 items-start">
          <textarea className="min-h-[88px] rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg w-full" placeholder={"fulano@grupoenterprisecore.com.br\nbeltrano@grupoenterprisecore.com.br"} value={inv.emails} onChange={(e) => setInv({ ...inv, emails: e.target.value })} />
          <div className="flex md:flex-col gap-2 md:w-52">
            <Select value={inv.role} onChange={(e: any) => setInv({ ...inv, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>)}
            </Select>
            <Button disabled={invBusy || !inv.emails.trim()} onClick={convidar}>{invBusy ? "Gerando…" : "Convidar"}</Button>
          </div>
        </div>
        {invRes.length > 0 && (
          <div className="mt-3 space-y-2">
            {invRes.map((r) => (
              <div key={r.email} className={"rounded-lg border p-2.5 text-sm " + (r.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5")}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-fg break-all">{r.email}</span>
                  {r.ok ? <Badge>{ROLE_LABEL[inv.role] || inv.role}</Badge> : <span className="text-xs text-red-600">{r.erro}</span>}
                  {r.ok && r.link && <button className="text-xs text-brand hover:underline ml-auto" onClick={() => navigator.clipboard?.writeText(r.link!)}>copiar link</button>}
                  {r.ok && r.otp && <button className="text-xs text-brand hover:underline" onClick={() => navigator.clipboard?.writeText(`E-mail: ${r.email}\nCódigo: ${r.otp}`)}>copiar e-mail+código</button>}
                </div>
                {r.ok && r.otp && <div className="text-xs text-muted mt-1">código de 1º acesso: <span className="font-mono text-fg">{r.otp}</span> <span className="opacity-70">(use em /definir-senha se o link não abrir; expira)</span></div>}
              </div>
            ))}
            <button className="text-xs text-brand hover:underline" onClick={() => navigator.clipboard?.writeText(invRes.filter((r) => r.ok && r.link).map((r) => `${r.email}\n${r.link}`).join("\n\n"))}>copiar todos os links</button>
          </div>
        )}
      </CardPad></Card>

      {/* LISTA */}
      <Card><CardPad>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <div className="font-bold text-fg">Usuários ({users.length})</div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {selMode ? (
              <>
                <button className="text-xs text-muted hover:text-fg" onClick={() => setSelUsers(new Set(users.map((u: any) => u.user_id)))}>marcar todos</button>
                <button className="text-xs text-muted hover:text-fg" onClick={() => setSelUsers(new Set())}>limpar</button>
                <span className="text-xs text-muted"><b className="text-fg">{selUsers.size}</b> selecionado(s)</span>
                <Button className="h-7 text-xs" disabled={selBusy || selUsers.size === 0} onClick={() => pedirAtivarDesativarSelecionados(true)}>{selBusy ? "…" : "Ativar selecionados"}</Button>
                <button className="h-7 text-xs px-3 rounded-lg border border-amber-500/40 text-amber-600 hover:bg-amber-500/10 disabled:opacity-40"
                  disabled={selBusy || selUsers.size === 0} onClick={() => pedirAtivarDesativarSelecionados(false)}>{selBusy ? "…" : "Desativar selecionados"}</button>
                <button className="text-xs text-muted hover:text-fg" onClick={() => { setSelMode(false); setSelUsers(new Set()); }}>cancelar</button>
              </>
            ) : (
              <Button className="h-7 text-xs" onClick={() => setSelMode(true)}>Selecionar vários</Button>
            )}
          </div>
        </div>
        {users.length === 0 ? <div className="text-muted text-sm">Sem usuários (conecte o banco).</div> : (
          <div className="space-y-2">
            {users.map((u: any) => {
              const podeLoc = u.role !== "Administrador";
              const ehVoce = u.user_id === currentUserId;
              return (
                <div key={u.user_id}
                  className={"rounded-xl border p-3 " + (selMode && selUsers.has(u.user_id) ? "border-brand bg-brand/5 " : "border-line ") + (u.ativo ? "bg-surface" : "bg-surface2/40 opacity-70") + (selMode ? " cursor-pointer" : "")}
                  onClick={selMode ? () => setSelUsers((s) => { const n = new Set(s); n.has(u.user_id) ? n.delete(u.user_id) : n.add(u.user_id); return n; }) : undefined}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    {selMode && (
                      <input type="checkbox" className="h-4 w-4 accent-brand shrink-0" checked={selUsers.has(u.user_id)} readOnly />
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-fg text-sm truncate">
                        {u.nome || "(sem nome)"} <span className="text-muted font-normal">· {u.email}</span>
                        {ehVoce && <span className="ml-1.5 text-xs font-bold text-brand align-middle">(você)</span>}
                        {u.role === "Administrador" && u.ativo && <ShieldCheck size={12} className="inline ml-1 text-emerald-500 align-middle" />}
                      </div>
                      <div className="text-xs text-muted">{u.ativo ? "ativo" : "inativo"} · {podeLoc && (u.ufs?.length || 0) > 0 ? "vê só a(s) localização(ões) marcada(s)" : "vê tudo"}</div>
                    </div>
                    {!selMode && <div className="flex items-center gap-2 ml-auto flex-wrap">
                      <span className="text-xs text-muted">Papel:</span>
                      <select className="text-xs border border-line bg-surface rounded-lg px-2 py-1" value={roleByUser[u.user_id] ?? u.role} title="Trocar o papel (pede confirmação)"
                        onWheel={(e) => (e.currentTarget as HTMLSelectElement).blur()}
                        onChange={(e) => pedirTrocaPapel(u, e.target.value)}>
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>)}
                        {!ROLES.includes(u.role) && <option value={u.role}>{u.role} (legado)</option>}
                      </select>
                      {podeLoc && (
                        <button className={"text-xs hover:underline inline-flex items-center gap-1 " + (orgOpen === u.user_id ? "text-fg font-semibold" : "text-brand")}
                          title="Limitar esta pessoa a uma ou mais localizações (UF). Sem nada marcado = vê tudo."
                          onClick={() => setOrgOpen(orgOpen === u.user_id ? null : u.user_id)}>
                          <MapPin size={12} /> Localização
                        </button>
                      )}
                      <button className="text-xs text-brand hover:underline inline-flex items-center gap-1"
                        onClick={async () => { await fetch("/api/ver-como", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: u.user_id }) }); window.location.href = "/lista-ataque"; }}>
                        <Eye size={12} /> Ver como
                      </button>
                      {u.ativo ? (
                        <button className="text-xs text-amber-600 hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                          disabled={ehVoce} title={ehVoce ? "Você não pode desativar a própria conta." : undefined}
                          onClick={() => pedirDesativar(u)}>Desativar</button>
                      ) : (
                        <button className="text-xs text-emerald-600 hover:underline" onClick={() => call({ action: "set_active", user_id: u.user_id, ativo: true })}>Ativar</button>
                      )}
                      <button className="text-xs text-red-500 hover:underline inline-flex items-center gap-1 disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                        disabled={ehVoce} title={ehVoce ? "Você não pode remover a própria conta." : undefined}
                        onClick={() => pedirRemover(u)}>
                        <Trash2 size={12} /> Remover
                      </button>
                    </div>}
                  </div>
                  {podeLoc && (u.ufs?.length || 0) > 0 && orgOpen !== u.user_id && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {u.ufs.map((uf: string) => <Badge key={uf}>{LABEL_UF[uf] || uf}</Badge>)}
                    </div>
                  )}
                  {podeLoc && orgOpen === u.user_id && (
                    <LocationPicker inicial={u.ufs || []} ufsComDados={ufsComDados} busy={busy}
                      onCancelar={() => setOrgOpen(null)}
                      onSalvar={async (ufs) => { const { r } = await call({ action: "set_ufs", user_id: u.user_id, ufs }); if (r?.ok) setOrgOpen(null); }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardPad></Card>
      {dialog}
    </div>
  );
}
