"use client";
import * as React from "react";

/**
 * Tabela com CABEÇALHO FIXO no topo da área de rolagem (sticky) e rolagem
 * horizontal nativa (barra embaixo + Shift+roda do mouse). Mantém a MESMA API
 * do <Table> antigo (head: string[]). O cabeçalho tem fundo opaco e fica
 * claramente ACIMA das linhas; as linhas rolam por baixo dele.
 *
 * (A antiga barra flutuante de rolagem no topo foi removida — ela sobrepunha
 * as informações da tabela.)
 */
export function TableScroll({
  head,
  children,
  maxHClass = "max-h-[72vh]",
}: {
  head: React.ReactNode[];
  children: React.ReactNode;
  maxHClass?: string;
}) {
  return (
    <div className={"relative overflow-auto rounded-xl border border-line bg-surface " + maxHClass}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-20">
          <tr className="shadow-[0_4px_6px_-3px_rgba(0,0,0,0.18)]">
            {head.map((h, i) => (
              <th
                key={i}
                className="text-left text-xs uppercase tracking-wider text-muted font-semibold px-3 py-3 bg-surface2 border-b-2 border-line whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
