import { NextResponse } from "next/server";
import { getCurrentUser, type AppUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";

export async function requireApi(action: string): Promise<{ user?: AppUser; error?: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  if (!can(user.role, action)) return { error: NextResponse.json({ error: "Acesso negado. Permissão insuficiente para esta ação." }, { status: 403 }), user };
  return { user };
}
