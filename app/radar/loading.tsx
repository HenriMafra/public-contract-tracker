export default function RadarLoading() {
  return (
    <div className="p-5 space-y-4 animate-pulse">
      <div className="h-28 rounded-xl bg-slate-200" />
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-slate-100" />)}
      </div>
      <div className="h-10 rounded-lg bg-slate-100" />
      <div className="h-72 rounded-xl bg-slate-100" />
    </div>
  );
}
