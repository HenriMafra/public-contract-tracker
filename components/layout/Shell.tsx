import * as React from "react";
import { Sidebar } from "./Sidebar";
import { UserMenu } from "./UserMenu";
import { navParaRole } from "@/lib/permissions";
import type { AppUser } from "@/lib/auth/guard";
import { RealtimeToasts } from "@/components/realtime/RealtimeToast";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NotificationToastBridge } from "@/components/notifications/NotificationToastBridge";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { VerComoBanner } from "./VerComoBanner";
import { escopoVerComo } from "@/lib/auth/verComo";
import { Logo } from "@/components/ui/Logo";
import { HelpBot } from "@/components/help/HelpBot";


export async function Shell({ user, children }: { user: AppUser; children: React.ReactNode }) {
  // Sob "Ver como" (admin pré-visualizando), o MENU reflete o papel do alvo — preview 100% fiel.
  const vc = await escopoVerComo();
  const navRole = (vc ? vc.role : user.role) as any;
  const nav = navParaRole(navRole).map((n) => ({ href: n.href, label: n.label, group: n.group }));

  return (
    <div className="flex min-h-screen">
      <Sidebar items={nav} />
      <HelpBot />
      <RealtimeToasts />
      <NotificationToastBridge />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="relative h-14 bg-surface/80 backdrop-blur border-b border-line flex items-center px-4 sm:px-5 gap-3 sticky top-0 z-40">
          <div className="absolute left-1/2 -translate-x-1/2"><Logo size={22} mark={false} /></div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <NotificationBell />
            <UserMenu nome={user.nome || user.email || ""} email={user.email || ""} role={user.role} />
          </div>
        </header>
        <VerComoBanner />
        <main className="p-4 sm:p-6 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

export function Forbidden() {
  return (
    <div className="p-10 text-center">
      <div className="text-5xl mb-3">🔒</div>
      <h2 className="text-lg font-bold text-fg">Acesso negado</h2>
      <p className="text-muted mt-1">Esta área exige um perfil com permissão. Fale com o administrador.</p>
    </div>
  );
}
