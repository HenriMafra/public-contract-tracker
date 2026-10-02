import { Card, CardPad } from "./primitives";
import { ChevronDown } from "lucide-react";

/** Card com cabeçalho clicável que recolhe/expande o conteúdo (nativo, sem JS).
 *  A setinha .chev gira via CSS em globals.css. Começa aberto por padrão. */
export function CollapsibleCard({ title, children, icon, defaultOpen = true, className }: {
  title: React.ReactNode; children: React.ReactNode; icon?: React.ReactNode; defaultOpen?: boolean; className?: string;
}) {
  return (
    <Card className={className}><CardPad>
      <details open={defaultOpen}>
        <summary className="flex items-center gap-2 cursor-pointer select-none">
          {icon}
          <span className="font-bold text-fg">{title}</span>
          <ChevronDown size={18} className="chev text-muted ml-auto shrink-0" />
        </summary>
        <div className="mt-3">{children}</div>
      </details>
    </CardPad></Card>
  );
}
