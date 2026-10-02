import { redirect } from "next/navigation";

// Radar aposentado (2026-06): a "Visão geral" virou o Dashboard e a lista virou a Lista de
// Ataque. Mantemos a rota como redirect pra não quebrar links/bookmarks antigos.
export default function RadarAposentado() {
  redirect("/dashboard");
}
