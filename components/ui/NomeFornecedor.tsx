import * as React from "react";

/**
 * Mostra o nome do fornecedor. Quando é a ENTERPRISECORE (a própria empresa de quem acessa),
 * destaca o trecho "ENTERPRISECORE" em AZUL CLARO — para o usuário bater o olho e ver onde a
 * ENTERPRISECORE já é a fornecedora atual.
 */
export function NomeFornecedor({ name, className }: { name?: string | null; className?: string }) {
  const n = (name || "—").toString();
  if (!/enterprisecore/i.test(n)) return <span className={className}>{n}</span>;
  const partes = n.split(/(enterprisecore)/i);
  return (
    <span className={className}>
      {partes.map((p, i) =>
        /^enterprisecore$/i.test(p)
          ? <span key={i} className="text-sky-500 dark:text-sky-400 font-bold">{p}</span>
          : <React.Fragment key={i}>{p}</React.Fragment>
      )}
    </span>
  );
}
