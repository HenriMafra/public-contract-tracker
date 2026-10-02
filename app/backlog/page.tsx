import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { PageTitle } from "@/components/ui/primitives";
import { BacklogBoard } from "@/components/backlog/BacklogBoard";
import { getBacklog, getUsuariosAtivos } from "@/lib/queries/backlog";

export const dynamic = "force-dynamic";

export default async function BacklogPage() {
  const user = await requireUser();
  if (!can(user.role, "backlog_view")) return <Shell user={user}><Forbidden /></Shell>;
  const [cards, usuarios] = await Promise.all([getBacklog(), getUsuariosAtivos()]);
  return (
    <Shell user={user}>
      <PageTitle
        title="Backlog (tarefas)"
        subtitle="Quadro estilo Trello — arraste os cartões entre as colunas; clique para checklist, prazo, etiquetas, membros e comentários. Diretoria e Admin podem criar uma tarefa já atribuída a uma pessoa (cai no “Minhas tarefas” dela)."
      />
      <BacklogBoard
        cards={(cards as any[]) || []}
        usuarios={(usuarios as any[]) || []}
        podeAtribuir={can(user.role, "backlog_assign")}
        podeDelegar={["Administrador", "Diretoria"].includes(user.role)}
        meId={user.id || ""}
        meNome={user.nome || user.email || ""}
      />
    </Shell>
  );
}
