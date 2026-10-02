"use client";
import { useState } from "react";
import { Card, CardPad, Badge } from "@/components/ui/primitives";
import { OrgaoFocoPicker } from "@/components/onboarding/OrgaoFocoPicker";
import { Star, Pencil } from "lucide-react";

/** Card da Conta para o usuário escopado ver/editar os órgãos que acompanha (foco). */
export function MeusOrgaosCard({ foco, ufs }: { foco: string[]; ufs: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Card><CardPad>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="font-bold text-fg inline-flex items-center gap-1.5"><Star size={15} className="text-brand" /> Meus órgãos (foco)</div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"><Pencil size={13} /> {foco.length ? "editar" : "escolher"}</button>
      </div>
      <p className="text-xs text-muted mb-2.5">
        Os órgãos que você acompanha — na <b>Lista de Ataque</b> eles já vêm marcados por padrão (você troca para “Todos” quando quiser).
        {ufs.length ? <> Sua região (definida pelo admin): <b>{ufs.join(", ")}</b>.</> : <> Você enxerga <b>todas as regiões</b>.</>}
      </p>
      {foco.length
        ? <div className="flex flex-wrap gap-1.5">{foco.map((n) => <Badge key={n}>{n}</Badge>)}</div>
        : <p className="text-sm text-muted">Você ainda não escolheu — está vendo <b>todos</b> os órgãos da sua região.</p>}
      <OrgaoFocoPicker open={open} onClose={() => setOpen(false)} initial={foco} onSaved={() => { try { location.reload(); } catch {} }} />
    </CardPad></Card>
  );
}
