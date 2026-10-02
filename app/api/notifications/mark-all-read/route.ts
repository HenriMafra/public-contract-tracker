import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guard";
import { markAllRead } from "@/lib/notifications/actions";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { error } = await markAllRead(user);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await audit({ usuario: (user as any).nome || (user as any).email, perfil: user.role, acao: "notif:mark_all_read", resultado: "OK" });
  return NextResponse.json({ ok: true });
}
