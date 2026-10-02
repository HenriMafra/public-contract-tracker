import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guard";
import { getPrefs, setPrefs } from "@/lib/notifications/actions";

export const dynamic = "force-dynamic";
const KEYS = ["notify_jobs", "notify_opportunities", "notify_assignments", "notify_reviews", "notify_artifacts", "notify_errors", "notify_weekly_summary"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const prefs = await getPrefs(user);
  return NextResponse.json({ ok: true, prefs: prefs || Object.fromEntries(KEYS.map((k) => [k, true])) });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const prefs: Record<string, boolean> = {};
  for (const k of KEYS) if (typeof body[k] === "boolean") prefs[k] = body[k];
  const { error } = await setPrefs(user, prefs);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, prefs, nota: "Alertas críticos e erros (Admin/Operador) sempre aparecem." });
}
