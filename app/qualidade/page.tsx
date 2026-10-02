import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// A aba "Qualidade" foi unida a "Decisões" (Decisões & Qualidade).
// Mantemos a rota para links/atalhos antigos, redirecionando para a aba unificada.
export default function QualidadePage() {
  redirect("/decisoes");
}
