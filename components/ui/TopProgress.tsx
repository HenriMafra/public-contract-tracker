"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Barra de progresso no topo: começa ao clicar num link interno (feedback imediato)
// e completa quando a rota muda. Sem dependências.
export function TopProgress() {
  const pathname = usePathname();
  const [w, setW] = useState(0);
  const [vis, setVis] = useState(false);
  const grow = useRef<any>(null);
  const safety = useRef<any>(null);

  function clearTimers() { if (grow.current) clearInterval(grow.current); if (safety.current) clearTimeout(safety.current); }
  function start() {
    clearTimers(); setVis(true); setW(8);
    grow.current = setInterval(() => setW((x) => (x < 90 ? x + Math.max(0.5, (90 - x) * 0.08) : x)), 200);
    safety.current = setTimeout(finish, 5000);
  }
  function finish() { clearTimers(); setW(100); setTimeout(() => { setVis(false); setW(0); }, 250); }

  useEffect(() => { finish(); /* rota mudou → concluiu */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const a = (e.target as HTMLElement)?.closest?.("a") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (!href || href.startsWith("#") || a.target === "_blank" || a.origin !== location.origin) return;
      if (a.pathname !== location.pathname) start();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!vis) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[100] h-[3px] pointer-events-none">
      <div className="h-full bg-brand rounded-r-full transition-[width] duration-200 ease-out" style={{ width: w + "%" }} />
    </div>
  );
}
