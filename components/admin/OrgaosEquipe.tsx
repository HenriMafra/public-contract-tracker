"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardPad, Input } from "@/components/ui/primitives";
import { OrgaoFocoPicker } from "@/components/onboarding/OrgaoFocoPicker";
import { Search, Star, Pencil } from "lucide-react";
import { ROLE_LABEL } from "@/lib/permissions";
import { semAcento } from "@/lib/utils/format";

type U = { user_id: string; nome: string; role: string; ativo: boolean; foco: string[] };

export function OrgaosEquipe({ users }: { users: U[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<{ id: string; nome: string; foco: string[] } | null>(null);

  const nq = semAcento(q);
  const lista = users.filter((u) => !nq || semAcento(`${u.nome} ${ROLE_LABEL[u.role] || u.role}`).includes(nq));

  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
        <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Buscar pessoa ou cargo…" className="pl-8" />
      </div>

      <div className="space-y-2">
        {lista.map((u) => (
          <Card key={u.user_id}><CardPad>
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-fg truncate">{u.nome} {!u.ativo && <span className="text-[11px] text-red-500 font-normal">(inativo)</span>}</div>
                <div className="text-xs text-muted">
                  {ROLE_LABEL[u.role] || u.role} · <Star size={11} className="inline -mt-0.5 text-brand" />{" "}
                  {u.foco.length ? `${u.foco.length} órgão(s) de foco` : "sem foco (vê todos)"}
                </div>
              </div>
              <button onClick={() => setEdit({ id: u.user_id, nome: u.nome, foco: u.foco })}
                className="text-sm inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand/40 text-brand hover:bg-brand/5 font-semibold shrink-0">
                <Pencil size={14} /> Editar órgãos
              </button>
            </div>
          </CardPad></Card>
        ))}
        {lista.length === 0 && <Card><CardPad><div className="text-sm text-muted text-center py-4">Ninguém encontrado.</div></CardPad></Card>}
      </div>

      <OrgaoFocoPicker
        open={!!edit}
        onClose={() => setEdit(null)}
        initial={edit?.foco || []}
        targetUserId={edit?.id}
        titulo={edit ? `Órgãos de foco — ${edit.nome}` : undefined}
        onSaved={() => { setEdit(null); router.refresh(); }}
      />
    </div>
  );
}
