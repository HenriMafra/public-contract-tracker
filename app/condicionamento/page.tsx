import { redirect } from "next/navigation";

// Condicionamento foi consolidado em Comissionamento (que abrange tudo: vários
// comissionados c/ % e fases + margem + tipo de projeto). Mantemos a rota só
// redirecionando, caso alguém tenha o link antigo.
export default function CondicionamentoPage() {
  redirect("/comissionamento");
}
