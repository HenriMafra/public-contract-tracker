import { requireUser } from "@/lib/auth/guard";
import { MfaGate } from "@/components/auth/MfaGate";

export const dynamic = "force-dynamic";

// 2º fator OBRIGATÓRIO: quem tem fator digita o código; quem não tem cadastra na hora.
export default async function MfaPage() {
  await requireUser();
  return <MfaGate />;
}
