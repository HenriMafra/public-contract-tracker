"use client";
import { useEffect, useRef } from "react";

// Carimbo da versão que ESTE navegador está rodando (embutido no build).
const MINE = process.env.NEXT_PUBLIC_BUILD_STAMP || "";

/**
 * Vigia de versão: compara o carimbo rodando no navegador com o do servidor
 * (/api/version). Se houver deploy novo, recarrega a página sozinho — assim
 * ninguém fica preso numa versão antiga, mesmo com a aba aberta há horas.
 * Verifica: ao abrir, ao voltar o foco/aba, e a cada 2 min. Não recarrega
 * enquanto a pessoa está digitando (não perde o que está sendo escrito).
 */
export function VersionWatcher() {
  const reloading = useRef(false);
  useEffect(() => {
    if (!MINE) return; // sem carimbo (build antigo) → não faz nada
    let timer: any;
    async function check() {
      if (reloading.current) return;
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        const server = String(j?.stamp || "");
        if (!server || server === MINE) return; // mesma versão → nada a fazer
        // À PROVA DE LOOP: se já recarregamos para esta versão do servidor e mesmo assim os
        // carimbos não bateram, NÃO recarrega de novo (evita reload infinito por carimbo divergente).
        let last = "";
        try { last = sessionStorage.getItem("vw_reloaded_for") || ""; } catch {}
        if (last === server) return;
        // versão nova publicada: não interromper quem está digitando
        const ae = document.activeElement as HTMLElement | null;
        const editando = !!ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable);
        if (editando) return; // tenta de novo no próximo ciclo
        try { sessionStorage.setItem("vw_reloaded_for", server); } catch {}
        reloading.current = true;
        location.reload();
      } catch { /* offline/instável → ignora e tenta depois */ }
    }
    const onVis = () => { if (document.visibilityState === "visible") check(); };
    check();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", check);
    timer = setInterval(check, 120000);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", check); };
  }, []);
  return null;
}
