import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
// supabaseAdminFull: este endpoint usa .auth.admin (o PostgrestClient padrao nao tem auth)
import { supabaseAdminFull as supabaseAdmin } from "@/lib/supabase/admin";
import { createUserRetry } from "@/lib/supabase/createUserRetry";
import { audit } from "@/lib/audit";
import { ROLES } from "@/lib/permissions";
export const dynamic = "force-dynamic";

const ADMIN = "Administrador";
/** Quantos administradores ATIVOS existem no sistema (service role: ignora RLS). */
async function activeAdminCount(sb: any): Promise<number> {
  const { count } = await sb.from("perfis").select("user_id", { count: "exact", head: true }).eq("role", ADMIN).eq("ativo", true);
  return count || 0;
}
async function getPerfil(sb: any, user_id: string): Promise<{ role: string; ativo: boolean } | null> {
  const { data } = await sb.from("perfis").select("role, ativo").eq("user_id", user_id).maybeSingle();
  return data ? { role: data.role, ativo: data.ativo !== false } : null;
}
/** Trava: impede deixar o sistema sem nenhum admin ativo. Retorna mensagem de erro ou null. */
async function travaUltimoAdmin(sb: any, user_id: string, motivo: string): Promise<string | null> {
  const alvo = await getPerfil(sb, user_id);
  if (alvo?.role === ADMIN && alvo.ativo && (await activeAdminCount(sb)) <= 1)
    return `Não é possível ${motivo} o último administrador ativo do sistema. Promova outro administrador a Administrador antes — assim você nunca fica trancado para fora.`;
  return null;
}

export async function POST(req: Request) {
  const { user, error } = await requireApi("manage_users");
  if (error) return error;
  const b = await req.json().catch(() => ({}));
  const sb = supabaseAdmin();
  try {
    if (b.action === "create") {
      if (!b.email || !b.password || !ROLES.includes(b.role)) return NextResponse.json({ error: "Dados inválidos (email, senha, perfil)." }, { status: 400 });
      if (new TextEncoder().encode(String(b.password)).length > 72) return NextResponse.json({ error: "Senha muito longa (o servidor aceita até 72 bytes/caracteres). Use uma senha mais curta." }, { status: 400 });
      const email = String(b.email).trim().toLowerCase();
      const { data, error: e } = await createUserRetry(sb, { email, password: b.password, email_confirm: true, user_metadata: { role: b.role, nome: b.nome || "" } });
      if (e || !data?.user) return NextResponse.json({ error: e?.message || "Falha ao criar usuário." }, { status: 500 });
      await sb.from("perfis").upsert({ user_id: data.user.id, role: b.role, nome: b.nome || "", uf: b.uf || null, ativo: true }, { onConflict: "user_id" });
      // criado COM senha (login normal) → tira da allowlist de 1º acesso self-service,
      // senão o login mandaria código e ignoraria a senha (os dois fluxos conflitam).
      try { await sb.from("usuarios_autorizados").delete().eq("email", email); } catch {}
      // órgãos atribuídos já na criação (opcional)
      if (Array.isArray(b.orgao_ids) && b.orgao_ids.length) {
        const ids = Array.from(new Set(b.orgao_ids.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n))));
        if (ids.length) await sb.from("perfil_orgaos").insert(ids.map((orgao_id: number) => ({ user_id: data.user.id, orgao_id })));
      }
      await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "manage_users", detalhes: `criou ${b.email} (${b.role})` });
      return NextResponse.json({ ok: true, user_id: data.user.id, message: `Usuário ${b.email} criado.` });
    }
    if (b.action === "invite") {
      // CONVITE DE 1º ACESSO: cria a conta SEM senha de admin (uma aleatória que ninguém
      // conhece) e gera um link/código de "recovery". A própria pessoa define a senha em
      // /definir-senha e, no 1º acesso, o middleware força o cadastro do 2º fator (MFA).
      const email = String(b.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !ROLES.includes(b.role))
        return NextResponse.json({ ok: false, email, error: "E-mail ou perfil inválido." }, { status: 400 });
      // senha aleatória forte (12+, com maiúscula/minúscula/dígito/símbolo) — NUNCA é exibida nem logada
      const randPw = "Aa1!" + crypto.randomUUID(); // ~40 chars; senha do bcrypt tem limite de 72 bytes
      let userId: string | null = null; let jaExistia = false;
      const { data: cu, error: ce } = await createUserRetry(sb, { email, password: randPw, email_confirm: true, user_metadata: { role: b.role, nome: b.nome || "" } });
      if (ce) {
        if (/already|registered|exists|duplicate/i.test(ce.message || "")) {
          jaExistia = true;
          try { const { data: l } = await sb.auth.admin.listUsers(); userId = (l?.users || []).find((u: any) => (u.email || "").toLowerCase() === email)?.id || null; } catch {}
        } else {
          return NextResponse.json({ ok: false, email, error: ce.message }, { status: 500 });
        }
      } else {
        userId = cu?.user?.id || null;
      }
      if (userId) await sb.from("perfis").upsert({ user_id: userId, role: b.role, nome: b.nome || "", uf: null, ativo: true }, { onConflict: "user_id" });
      // Autoriza na allowlist (fluxo de 1º acesso self-service no login). O link abaixo é o plano B.
      await sb.from("usuarios_autorizados").upsert({ email, role: b.role, nome: b.nome || "", ativo: true, senha_definida: false, user_id: userId }, { onConflict: "email" });
      const origin = req.headers.get("origin") || new URL(req.url).origin;
      const { data: link, error: le } = await sb.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: `${origin}/definir-senha` } });
      if (le || !link) return NextResponse.json({ ok: false, email, error: le?.message || "Conta criada, mas falhou ao gerar o link de 1º acesso." }, { status: 500 });
      const action_link = (link.properties as any)?.action_link || null;
      const email_otp = (link.properties as any)?.email_otp || null;
      await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "manage_users", detalhes: `convidou ${email} (${b.role})${jaExistia ? " [já existia — novo link]" : ""}` });
      return NextResponse.json({ ok: true, email, role: b.role, ja_existia: jaExistia, action_link, email_otp, message: `Convite gerado para ${email}.` });
    }
    if (b.action === "set_role") {
      if (!b.user_id || !ROLES.includes(b.role)) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
      if (b.role !== ADMIN) {
        const trava = await travaUltimoAdmin(sb, b.user_id, "rebaixar");
        if (trava) return NextResponse.json({ error: trava }, { status: 409 });
      }
      await sb.from("perfis").update({ role: b.role, updated_at: new Date().toISOString() }).eq("user_id", b.user_id);
      await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "manage_users", detalhes: `perfil ${b.user_id} → ${b.role}` });
      return NextResponse.json({ ok: true, message: "Perfil atualizado." });
    }
    if (b.action === "set_active") {
      if (!b.user_id) return NextResponse.json({ error: "user_id obrigatório." }, { status: 400 });
      if (!b.ativo) {
        if (b.user_id === user!.id) return NextResponse.json({ error: "Você não pode desativar a própria conta (isso te trancaria para fora). Peça a outro administrador." }, { status: 409 });
        const trava = await travaUltimoAdmin(sb, b.user_id, "desativar");
        if (trava) return NextResponse.json({ error: trava }, { status: 409 });
      }
      await sb.from("perfis").update({ ativo: !!b.ativo, updated_at: new Date().toISOString() }).eq("user_id", b.user_id);
      await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "manage_users", detalhes: `${b.ativo ? "ativou" : "desativou"} ${b.user_id}` });
      return NextResponse.json({ ok: true, message: b.ativo ? "Usuário ativado." : "Usuário desativado." });
    }
    if (b.action === "set_orgaos") {
      // Define QUAIS órgãos o usuário enxerga (substitui o conjunto). A RLS faz o resto.
      if (!b.user_id || !Array.isArray(b.orgao_ids)) return NextResponse.json({ error: "user_id e orgao_ids[] obrigatórios." }, { status: 400 });
      const ids = Array.from(new Set(b.orgao_ids.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n))));
      const { error: ed } = await sb.from("perfil_orgaos").delete().eq("user_id", b.user_id);
      if (ed) return NextResponse.json({ error: ed.message }, { status: 500 });
      if (ids.length) {
        const { error: ei } = await sb.from("perfil_orgaos").insert(ids.map((orgao_id: number) => ({ user_id: b.user_id, orgao_id })));
        if (ei) return NextResponse.json({ error: ei.message }, { status: 500 });
      }
      await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "manage_users", detalhes: `órgãos de ${b.user_id}: ${ids.length} atribuído(s)`, oportunidade_id: null });
      return NextResponse.json({ ok: true, message: `${ids.length} órgão(s) atribuído(s) a este usuário.` });
    }
    if (b.action === "set_ufs") {
      // Define QUAIS localizações (UFs/estados) o usuário enxerga (substitui o conjunto).
      // Vazio = vê tudo. A RLS (atlas_orgao_liberado) faz o escopo por UF do órgão.
      if (!b.user_id || !Array.isArray(b.ufs)) return NextResponse.json({ error: "user_id e ufs[] obrigatórios." }, { status: 400 });
      const ufs = Array.from(new Set(b.ufs.map((x: any) => String(x).toUpperCase().trim()).filter((s: string) => /^[A-Z]{2}$/.test(s))));
      const { error: ed } = await sb.from("perfil_ufs").delete().eq("user_id", b.user_id);
      if (ed) return NextResponse.json({ error: ed.message }, { status: 500 });
      if (ufs.length) {
        const { error: ei } = await sb.from("perfil_ufs").insert(ufs.map((uf: string) => ({ user_id: b.user_id, uf })));
        if (ei) return NextResponse.json({ error: ei.message }, { status: 500 });
      }
      await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "manage_users", detalhes: `localizações de ${b.user_id}: ${ufs.length ? ufs.join(",") : "(vê tudo)"}` });
      return NextResponse.json({ ok: true, message: ufs.length ? `${ufs.length} localização(ões) definida(s).` : "Localizações limpas — este usuário volta a ver tudo." });
    }
    if (b.action === "delete") {
      // remove o usuário (auth + perfil + órgãos via cascade)
      if (!b.user_id) return NextResponse.json({ error: "user_id obrigatório." }, { status: 400 });
      if (b.user_id === user!.id) return NextResponse.json({ error: "Você não pode remover a própria conta (foi exatamente isso que trancou o acesso antes). Se precisar, peça a outro administrador." }, { status: 409 });
      const trava = await travaUltimoAdmin(sb, b.user_id, "remover");
      if (trava) return NextResponse.json({ error: trava }, { status: 409 });
      try { await sb.auth.admin.deleteUser(b.user_id); } catch {}
      await sb.from("perfis").delete().eq("user_id", b.user_id);
      await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "manage_users", detalhes: `removeu ${b.user_id}` });
      return NextResponse.json({ ok: true, message: "Usuário removido." });
    }
    return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro." }, { status: 500 });
  }
}
