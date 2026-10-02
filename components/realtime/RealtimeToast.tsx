"use client";
import { useEffect, useState } from "react";
import type { ToastMsg } from "@/lib/realtime/events";

const TONE: Record<string, string> = {
  info: "border-navy", success: "border-green-500", warning: "border-amber-500", error: "border-red-500",
};

/** Container global de toasts. Ouve o evento window 'atlas-toast' (pushToast()). */
export function RealtimeToasts() {
  const [items, setItems] = useState<{ id: number; m: ToastMsg }[]>([]);
  useEffect(() => {
    let n = 0;
    const handler = (e: Event) => {
      const m = (e as CustomEvent).detail as ToastMsg;
      const id = ++n;
      setItems((p) => [...p.slice(-4), { id, m }]);
      setTimeout(() => setItems((p) => p.filter((x) => x.id !== id)), 6000);
    };
    window.addEventListener("atlas-toast", handler);
    return () => window.removeEventListener("atlas-toast", handler);
  }, []);
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 w-80 pointer-events-none">
      {items.map(({ id, m }) => (
        <div key={id} className={"bg-surface shadow-lg rounded-lg border-l-4 p-3 text-sm pointer-events-auto " + (TONE[m.tone] || TONE.info)}>
          <div className="font-semibold text-fg">{m.title}</div>
          {m.detail && <div className="text-xs text-muted mt-0.5 break-words">{m.detail}</div>}
        </div>
      ))}
    </div>
  );
}
