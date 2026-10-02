import { redirect } from "next/navigation";

// force-dynamic: sem isto o Next pré-renderiza "/" como página estática e o redirect
// vira um meta-refresh client-side (mostra por 1s o skeleton global de app/loading.tsx,
// com a sidebar antiga, antes de trocar de página). Com dynamic, é um 307 HTTP real e instantâneo.
export const dynamic = "force-dynamic";

export default function Home() {
  redirect("/dashboard");
}
