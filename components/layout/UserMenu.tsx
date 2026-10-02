"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ChevronDown, LogOut, UserRound, HelpCircle, Bell, IdCard } from "lucide-react";
import { cn } from "@/lib/utils/format";

/** Menu do usuário (canto sup. direito): só o nome; abre um dropdown com cargo, atalhos e Sair (vermelho). */
export function UserMenu({ nome, email, role }: { nome: string; email: string; role: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", h); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", esc); };
  }, [open]);

  async function sair() { try { await supabaseBrowser().auth.signOut(); } catch {} router.push("/login"); router.refresh(); }
  const item = "flex items-center gap-2.5 px-3 py-2 text-sm text-fg hover:bg-surface2 transition rounded-lg";

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} title="Sua conta"
        className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg hover:bg-surface2 transition max-w-[220px]">
        <span className="text-sm font-semibold text-fg truncate">{nome || email}</span>
        <ChevronDown size={15} className={cn("text-muted transition shrink-0", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-64 bg-surface border border-line rounded-xl shadow-xl py-2 z-50">
          <div className="px-3 pb-2.5 mb-1 border-b border-line">
            <div className="font-bold text-fg truncate">{nome || "—"}</div>
            {email && <div className="text-xs text-muted truncate">{email}</div>}
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand/10 text-brand"><IdCard size={12} /> {role}</div>
          </div>
          <div className="px-1.5 space-y-0.5">
            <Link href="/conta" onClick={() => setOpen(false)} className={item}><UserRound size={16} className="text-muted" /> Minha conta</Link>
            <Link href="/notificacoes" onClick={() => setOpen(false)} className={item}><Bell size={16} className="text-muted" /> Notificações</Link>
            <Link href="/como-usar" onClick={() => setOpen(false)} className={item}><HelpCircle size={16} className="text-muted" /> Como usar (ajuda)</Link>
          </div>
          <div className="border-t border-line mt-1.5 pt-1.5 px-1.5">
            <button onClick={sair} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition rounded-lg">
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
