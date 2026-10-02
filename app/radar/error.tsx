"use client";
export default function RadarError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="p-10 text-center">
      <div className="text-5xl mb-3">📡</div>
      <h2 className="text-lg font-bold text-fg">Não foi possível carregar o Radar</h2>
      <p className="text-muted mt-1 text-sm">{error?.message || "Erro ao consultar as views. Confirme o Supabase/.env e as RLS."}</p>
      <button onClick={reset} className="mt-4 inline-flex items-center h-9 px-4 rounded-lg text-sm font-semibold bg-brand text-white hover:bg-brand-600">Tentar novamente</button>
    </div>
  );
}
