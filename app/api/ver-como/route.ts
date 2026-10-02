import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { VER_COMO_COOKIE, escopoVerComo } from "@/lib/auth/verComo";
export const dynamic = "force-dynamic";

// Estado atual da pré-visualização (para o banner).
export async function GET() {
  const vc = await escopoVerComo();
  return NextResponse.json(vc ? { ativo: true, nome: vc.nome, role: vc.role } : { ativo: false });
}

// Liga/desliga a pré-visualização "Ver como" (só Administrador). Guarda o user_id alvo num cookie.
export async function POST(req: Request) {
  const { error } = await requireApi("manage_users");
  if (error) return error;
  const b = await req.json().catch(() => ({}));
  const res = NextResponse.json({ ok: true, message: b.clear || !b.user_id ? "Voltou à sua visão de administrador." : "Visão alterada." });
  if (b.clear || !b.user_id) {
    res.cookies.set(VER_COMO_COOKIE, "", { maxAge: 0, path: "/" });
  } else {
    res.cookies.set(VER_COMO_COOKIE, String(b.user_id), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600 });
  }
  return res;
}
