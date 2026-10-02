import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { Table, PageTitle, Empty, Badge } from "@/components/ui/primitives";
import { supabaseServer } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const user = await requireUser();
  if (!can(user.role, "view_logs")) return <Shell user={user}><Forbidden /></Shell>;
  let logs: any[] = [];
  try {
    const sb = supabaseServer();
    const { data } = await sb.from("logs_execucao").select("nivel,mensagem,detalhes_json,created_at,rodada_id").order("id", { ascending: false }).limit(300);
    logs = data || [];
  } catch {}
  return (
    <Shell user={user}>
      <PageTitle title="Logs Técnicos" subtitle="Logs de execução do pipeline e da carga no banco." />
      {logs.length === 0 ? <Empty>Sem logs no banco.</Empty> : (
        <Table head={["Quando", "Nível", "Rodada", "Mensagem", "Detalhes"]}>
          {logs.map((l: any, i: number) => (
            <tr key={i} className="border-b border-line">
              <td className="px-3 py-1.5 whitespace-nowrap text-muted">{fmtDate(l.created_at)}</td>
              <td className="px-3 py-1.5"><Badge className={l.nivel === "ERRO" ? "bg-red-100 text-red-800" : "bg-surface2 text-fg"}>{l.nivel}</Badge></td>
              <td className="px-3 py-1.5">{l.rodada_id}</td>
              <td className="px-3 py-1.5">{l.mensagem}</td>
              <td className="px-3 py-1.5 text-xs text-muted max-w-[320px] truncate">{typeof l.detalhes_json === "string" ? l.detalhes_json : JSON.stringify(l.detalhes_json)}</td>
            </tr>
          ))}
        </Table>
      )}
    </Shell>
  );
}
