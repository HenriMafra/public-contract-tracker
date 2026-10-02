import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guard";
import { isAdmin } from "@/lib/notifications/rules";
import { createNotifications } from "@/lib/notifications/actions";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Criação manual/sistema — restrita a Admin (worker/sistema usam a service role direto no banco).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Apenas Administrador cria notificações manuais." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const rows = Array.isArray(body.rows) ? body.rows : (body.tipo ? [body] : []);
  if (!rows.length || !rows.every((r: any) => r.tipo && r.titulo))
    return NextResponse.json({ error: "cada notificação exige tipo e titulo" }, { status: 400 });
  const { ids, error } = await createNotifications(rows.map((r: any) => ({ ...r, criada_por: (user as any).email })));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await audit({ usuario: (user as any).nome || (user as any).email, perfil: user.role, acao: "notif:create", detalhes: `${ids.length} notificação(ões)`, resultado: "OK" });
  return NextResponse.json({ ok: true, ids });
}
