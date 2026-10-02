import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { PageTitle } from "@/components/ui/primitives";
import { FeedbackBoard } from "@/components/feedback/FeedbackBoard";
import { getFeedback } from "@/lib/queries/feedback";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const user = await requireUser();
  if (!can(user.role, "feedback_view")) return <Shell user={user}><Forbidden /></Shell>;
  const isAdmin = can(user.role, "feedback_manage");
  const itens = await getFeedback({ userId: user.id, isAdmin });
  return (
    <Shell user={user}>
      <PageTitle
        title="Sugestões & Bugs"
        subtitle="Mande sugestões, perguntas ou bugs. É privado: só você e o administrador veem o que você envia — os outros do time não veem os seus itens."
      />
      <FeedbackBoard itens={itens as any[]} isAdmin={isAdmin} />
    </Shell>
  );
}
