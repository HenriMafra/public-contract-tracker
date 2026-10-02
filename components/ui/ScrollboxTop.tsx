"use client";
import * as React from "react";

/**
 * Caixa de rolagem (vertical + horizontal) para tabelas "próprias".
 * O cabeçalho fica FIXO no topo da caixa — basta o <thead> usar `sticky top-0`
 * (com fundo opaco). A rolagem horizontal usa a barra nativa (embaixo) + Shift+roda
 * do mouse. A antiga barra flutuante no topo foi removida porque sobrepunha o conteúdo.
 */
export function ScrollboxTop({
  children,
  className = "",
  maxHClass = "max-h-[72vh]",
  boxClass,
}: {
  children: React.ReactNode;
  className?: string;
  maxHClass?: string;
  /** sobrescreve totalmente o visual da caixa (borda/fundo/raio/altura). */
  boxClass?: string;
}) {
  return (
    <div className={"relative overflow-auto " + (boxClass ?? "rounded-xl border border-line bg-surface shadow-soft " + maxHClass) + " " + className}>
      {children}
    </div>
  );
}
