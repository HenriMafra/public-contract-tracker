import { requireUser } from "@/lib/auth/guard";
import { Shell } from "@/components/layout/Shell";
import { Card, CardPad, PageTitle, Badge } from "@/components/ui/primitives";
import { ContaSenha } from "@/components/ContaSenha";
import { MfaCard } from "@/components/conta/MfaCard";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ThemePicker } from "@/components/ui/ThemePicker";
import { FontScale } from "@/components/ui/FontScale";
import { MeusOrgaosCard } from "@/components/conta/MeusOrgaosCard";
import { supabaseServer } from "@/lib/supabase/server";
import { ROLE_LABEL } from "@/lib/permissions";

export const dynamic = "force-dynamic";
const SCOPED = ["Account Manager"]; // só AM tem foco por órgão/UF

export default async function ContaPage() {
  const user = await requireUser();
  let foco: string[] = [];
  let ufs: string[] = [];
  const scoped = SCOPED.includes(user.role);
  if (scoped) {
    try {
      const sb = supabaseServer();
      const { data: p } = await sb.from("perfis").select("orgaos_foco").eq("user_id", user.id).single();
      foco = Array.isArray(p?.orgaos_foco) ? (p!.orgaos_foco as string[]) : [];
      const { data: pu } = await sb.from("perfil_ufs").select("uf").eq("user_id", user.id);
      ufs = (pu || []).map((r: any) => r.uf).filter(Boolean);
    } catch { /* ignore */ }
  }

  const Linha = ({ k, v }: { k: string; v: any }) => (
    <div className="flex justify-between gap-3 py-2 border-b border-line last:border-0 text-sm">
      <span className="text-muted">{k}</span><span className="font-semibold text-fg text-right">{v}</span>
    </div>
  );

  return (
    <Shell user={user}>
      <PageTitle title="Minha Conta" subtitle="Seus dados, sua senha e suas preferências." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card><CardPad>
          <div className="font-bold text-fg mb-2">Seus dados</div>
          <Linha k="Nome" v={user.nome || "—"} />
          <Linha k="E-mail" v={user.email} />
          <Linha k="Papel" v={ROLE_LABEL[user.role] || user.role} />
          <div className="mt-3">
            <div className="text-xs uppercase text-muted font-semibold mb-1.5">{scoped ? "Sua região (definida pelo admin)" : "Abrangência"}</div>
            {scoped ? (
              ufs.length ? <div className="flex flex-wrap gap-1.5">{ufs.map((n) => <Badge key={n}>{n}</Badge>)}</div>
                : <p className="text-sm text-fg">Você enxerga <b>todas as regiões</b>.</p>
            ) : <p className="text-sm text-fg">Você enxerga <b>todos os órgãos</b>.</p>}
          </div>
        </CardPad></Card>

        <div className="space-y-4">
          {scoped && <MeusOrgaosCard foco={foco} ufs={ufs} />}
          <ContaSenha />
          <MfaCard />
          <Card><CardPad>
            <div className="font-bold text-fg mb-2">Aparência</div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Tema claro / escuro</span>
              <ThemeToggle />
            </div>
          </CardPad></Card>
        </div>
      </div>

      <Card className="mt-4"><CardPad>
        <div className="font-bold text-fg mb-1">Tema de cores</div>
        <p className="text-xs text-muted mb-3">Escolha a paleta que você prefere usar — fica salva pra você. Combina com o claro/escuro.</p>
        <ThemePicker />
      </CardPad></Card>

      <Card className="mt-4"><CardPad>
        <div className="font-bold text-fg mb-1">Acessibilidade — tamanho do texto</div>
        <p className="text-xs text-muted mb-3">Aumenta a fonte e os blocos do site inteiro (bom pra quem tem visão cansada). Fica salvo.</p>
        <FontScale />
      </CardPad></Card>
    </Shell>
  );
}
