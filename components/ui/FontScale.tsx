"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/format";

// Escala a fonte-raiz (<html>). Como o site usa rem, fontes E blocos crescem juntos.
const OPC = [{ v: "100", l: "Normal" }, { v: "112", l: "Grande" }, { v: "125", l: "Maior" }, { v: "140", l: "Máximo" }];

export function FontScale() {
  const [v, setV] = useState("100");
  useEffect(() => { try { setV(localStorage.getItem("atlas-font") || "100"); } catch {} }, []);
  function set(p: string) {
    document.documentElement.style.fontSize = p + "%";
    try { localStorage.setItem("atlas-font", p); } catch {}
    setV(p);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {OPC.map((o) => (
        <button key={o.v} onClick={() => set(o.v)}
          className={cn("inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition",
            v === o.v ? "border-brand bg-brand/10 text-brand font-semibold" : "border-line bg-surface text-fg hover:bg-surface2")}>
          <span style={{ fontSize: `${Math.min(Number(o.v), 130) / 100}rem`, lineHeight: 1 }} className="font-bold">A</span>
          <span className="text-sm">{o.l}</span>
        </button>
      ))}
    </div>
  );
}
