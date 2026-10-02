import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guard";
import { markRead } from "@/lib/notifications/actions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ids: number[] = Array.isArray(body.ids) ? body.ids : (body.id ? [body.id] : []);
  if (!ids.length) return NextResponse.json({ error: "ids obrigatório" }, { status: 400 });
  const { error } = await markRead(user, ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, marcadas: ids.length });
}
