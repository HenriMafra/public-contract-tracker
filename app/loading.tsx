// Skeleton global mostrado enquanto a página carrega — dá sensação de velocidade
// (aparece na hora, em vez de tela em branco). Modo "site aberto" (RO-only, 2026-06-29):
// não imita mais a sidebar antiga (Shell) — todo o site usa o frame leve (RoShell) agora.
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col" aria-hidden>
      <div className="h-14 border-b border-line bg-surface/80 flex items-center px-4 gap-3">
        <div className="h-6 w-28 rounded-lg bg-line/50 animate-pulse" />
        <div className="ml-auto h-8 w-8 rounded-full bg-line/40 animate-pulse" />
      </div>
      <div className="max-w-3xl mx-auto px-4 py-6 w-full space-y-4">
        <div className="h-7 w-72 rounded-lg bg-surface2 animate-pulse" />
        <div className="h-4 w-96 max-w-full rounded bg-surface2 animate-pulse" />
        <div className="h-72 rounded-xl bg-surface2 animate-pulse" />
      </div>
    </div>
  );
}
