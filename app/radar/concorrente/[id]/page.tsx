import { redirect } from "next/navigation";

// A ficha de concorrente foi consolidada na tela de Fornecedores (lista + contratos por órgão
// + ação "marcar concorrente"). Redirect p/ não quebrar links antigos.
export default function RadarConcorrenteAposentado() {
  redirect("/fornecedores");
}
