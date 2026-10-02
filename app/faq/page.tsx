import { requireUser } from "@/lib/auth/guard";
import { Shell } from "@/components/layout/Shell";
import { PageTitle } from "@/components/ui/primitives";
import { FaqView } from "@/components/help/FaqView";

export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const user = await requireUser();
  return (
    <Shell user={user}>
      <PageTitle title="Perguntas frequentes (FAQ)" subtitle="Tudo o que costuma gerar dúvida no MAPPER, explicado de forma direta. Busque por palavra ou navegue pelas categorias." />
      <FaqView />
    </Shell>
  );
}
