import { redirect } from "next/navigation";

// Ficha canônica de órgão vive em /orgaos/[id]. Redirect p/ não quebrar links.
export default function RadarOrgaoAposentado({ params }: { params: { id: string } }) {
  redirect(`/orgaos/${params.id}`);
}
