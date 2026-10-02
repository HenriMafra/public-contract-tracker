"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export type ConfirmOpts = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Se definido, exige digitar exatamente este texto para liberar o botão (ações irreversíveis). */
  requireText?: string;
};

/** Modal de confirmação reutilizável, alinhado ao tema. Use via o hook useConfirm() abaixo. */
export function ConfirmDialog({ open, opts, busy, onConfirm, onClose }: {
  open: boolean; opts: ConfirmOpts | null; busy?: boolean;
  onConfirm: () => void; onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  useEffect(() => { if (open) setTyped(""); }, [open, opts]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, busy, onClose]);
  if (!open || !opts) return null;
  const needText = !!opts.requireText;
  const okText = !needText || typed.trim().toLowerCase() === opts.requireText!.toLowerCase();
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={() => !busy && onClose()} />
      <div className="relative w-full max-w-md bg-surface border border-line rounded-2xl shadow-xl p-5">
        <button onClick={() => !busy && onClose()} className="absolute right-3 top-3 text-muted hover:text-fg" aria-label="Fechar"><X size={18} /></button>
        <div className="flex items-start gap-3">
          <div className={"shrink-0 rounded-full p-2 " + (opts.danger ? "bg-red-500/10 text-red-500" : "bg-brand/10 text-brand")}>
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-fg text-base">{opts.title}</h2>
            {opts.description && <div className="text-sm text-muted mt-1 leading-relaxed">{opts.description}</div>}
            {needText && (
              <div className="mt-3">
                <label className="text-xs text-muted">Para confirmar, digite <b className="text-fg">{opts.requireText}</b>:</label>
                <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && okText && !busy) onConfirm(); }}
                  className="mt-1 w-full rounded-lg border border-line bg-surface2 px-3 py-2 text-sm text-fg outline-none focus:border-brand" />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={() => !busy && onClose()} className="px-3 py-2 rounded-lg text-sm text-muted hover:text-fg hover:bg-surface2">{opts.cancelLabel || "Cancelar"}</button>
          <button onClick={onConfirm} disabled={busy || !okText}
            className={"px-4 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed " + (opts.danger ? "bg-red-600 hover:bg-red-700" : "bg-brand hover:bg-brand-600")}>
            {busy ? "Processando…" : (opts.confirmLabel || "Confirmar")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hook prático: const { confirm, dialog } = useConfirm(); chame confirm(opts, async () => {...}). */
export function useConfirm() {
  const [state, setState] = useState<{ opts: ConfirmOpts; run: () => unknown | Promise<unknown> } | null>(null);
  const [busy, setBusy] = useState(false);
  function confirm(opts: ConfirmOpts, run: () => unknown | Promise<unknown>) { setState({ opts, run }); }
  async function onConfirm() {
    if (!state) return;
    try { setBusy(true); await state.run(); } finally { setBusy(false); setState(null); }
  }
  const dialog = (
    <ConfirmDialog open={!!state} opts={state?.opts || null} busy={busy}
      onConfirm={onConfirm} onClose={() => { if (!busy) setState(null); }} />
  );
  return { confirm, dialog, confirmBusy: busy };
}
