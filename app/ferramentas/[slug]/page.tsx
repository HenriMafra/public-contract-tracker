import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { Shell } from "@/components/layout/Shell";
import { PageTitle, Card, CardPad, Empty } from "@/components/ui/primitives";
import { toolBySlug, READY_PDF_SLUGS } from "@/lib/tools/registry";
import { PdfTool } from "@/components/ferramentas/PdfTools";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ToolPage({ params }: { params: { slug: string } }) {
  const user = await requireUser();
  const tool = toolBySlug(params.slug);
  const ready = READY_PDF_SLUGS.includes(params.slug);

  return (
    <Shell user={user}>
      <Link href="/ferramentas" className="inline-flex items-center gap-1 text-sm text-brand font-semibold mb-3"><ArrowLeft size={15} /> Ferramentas</Link>
      {!tool || !ready ? (
        <>
          <PageTitle title={tool?.title || "Ferramenta indisponível"} subtitle={tool ? "Esta ferramenta ainda está em desenvolvimento." : "Ferramenta não encontrada."} />
          <Empty>Em breve. Volte para a <Link href="/ferramentas" className="text-brand font-semibold">central de Ferramentas</Link>.</Empty>
        </>
      ) : (
        <>
          <PageTitle title={tool.title} subtitle={tool.desc} />
          <Card><CardPad><PdfTool slug={params.slug} /></CardPad></Card>
        </>
      )}
    </Shell>
  );
}
