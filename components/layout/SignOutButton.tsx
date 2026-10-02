"use client";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();
  async function sair() {
    try { await supabaseBrowser().auth.signOut(); } catch {}
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={sair} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-red-600">
      <LogOut size={16} /> Sair
    </button>
  );
}
