import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guard";
import { listForUser, unreadCount } from "@/lib/notifications/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const p = new URL(req.url).searchParams;
  const items = await listForUser(user, {
    onlyUnread: p.get("unread") === "1",
    limit: Math.min(Number(p.get("limit") || "50"), 200),
    tipo: p.get("tipo") || undefined,
    nivel: p.get("nivel") || undefined,
    lida: p.get("lida") === "1" ? true : p.get("lida") === "0" ? false : undefined,
    q: p.get("q") || undefined,
  });
  const unread = await unreadCount(user);
  return NextResponse.json({ ok: true, items, unread });
}
