import { requireUser } from "@/lib/auth/guard";
import { Shell } from "@/components/layout/Shell";
import { PageTitle } from "@/components/ui/primitives";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";

export const dynamic = "force-dynamic";

export default async function NotificacoesPage() {
  const user = await requireUser();
  return (
    <Shell user={user}>
      <PageTitle title="Notificações" subtitle="Avisos do que importa pra você: contratos atribuídos a você, novidades nos seus órgãos e ações da equipe. Marque como lidas e ajuste o que quer receber." />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><NotificationsPanel /></div>
        <div><NotificationPreferences role={user.role} /></div>
      </div>
    </Shell>
  );
}
