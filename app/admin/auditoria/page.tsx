import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { Table, Empty, Badge } from "@/components/ui/primitives";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { supabaseServer } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const COLS = [
  { key: "created_at", label: "Quando" }, { key: "usuario", label: "Usuário" }, { key: "perfil", label: "Perfil" },
  { key: "acao", label: "Ação" }, { key: "resultado", label: "Resultado" }, { key: "detalhes", label: "Detalhes" }, { key: "erro", label: "Erro" },
];

export default async function AuditoriaPage() {
  const user = await requireUser();
  if (!can(user.role, "view_audit")) return <Shell user={user}><Forbidden /></Shell>;
  let logs: any[] = [];
  try {
    const sb = supabaseServer();
    const { data } = await sb.from("audit_logs").select("created_at,usuario,perfil,acao,resultado,duracao,detalhes,erro").order("id", { ascending: false }).limit(400);
    logs = data || [];
  } catch {}
  const cor = (r: string) => r === "ERRO" || r === "FALHA" ? "bg-red-500/15 text-red-600 dark:text-red-400"
    : r === "NEGADO" || r === "INDISPONIVEL" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
      : "bg-green-500/15 text-green-600 dark:text-green-400";
  return (
    <Shell user={user}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-fg">Auditoria</h1>
          <p className="text-sm text-muted mt-1">{logs.length} ação(ões) registrada(s) — quem fez o quê, quando e o resultado.</p>
        </div>
        <ExportButtons rows={logs} columns={COLS} filename="atlas_auditoria" />
      </div>
      {logs.length === 0 ? <Empty>Sem registros de auditoria.</Empty> : (
        <Table head={["Quando", "Usuário", "Perfil", "Ação", "Resultado", "Detalhes"]}>
          {logs.map((l: any, i: number) => (
            <tr key={i} className="border-b border-line last:border-0 hover:bg-surface2">
              <td className="px-3 py-2 whitespace-nowrap text-muted">{fmtDate(l.created_at)}</td>
              <td className="px-3 py-2">{l.usuario}</td>
              <td className="px-3 py-2 text-muted">{l.perfil}</td>
              <td className="px-3 py-2 font-medium">{l.acao}</td>
              <td className="px-3 py-2"><Badge className={cor(l.resultado)}>{l.resultado}</Badge></td>
              <td className="px-3 py-2 text-xs text-muted max-w-[360px] truncate">{l.detalhes}{l.erro ? " · " + l.erro : ""}</td>
            </tr>
          ))}
        </Table>
      )}
    </Shell>
  );
}
