import { redirect } from "next/navigation";

// Ficha canônica de oportunidade vive em /oportunidades/[id]. Redirect p/ não quebrar links.
export default function RadarOportunidadeAposentada({ params }: { params: { id: string } }) {
  redirect(`/oportunidades/${params.id}`);
}
