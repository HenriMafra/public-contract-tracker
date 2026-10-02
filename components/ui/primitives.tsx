import * as React from "react";
import { cn } from "@/lib/utils/format";
import { TableScroll } from "./TableScroll";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("bg-surface border border-line rounded-xl shadow-soft", className)}>{children}</div>;
}
export function CardPad({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-4 sm:p-5", className)}>{children}</div>;
}
export function StatCard({ label, value, sub, accent = "text-fg" }: { label: string; value: React.ReactNode; sub?: string; accent?: string }) {
  return (
    <div className="bg-surface border border-line rounded-xl shadow-soft p-5">
      <div className="text-xs uppercase tracking-wider text-muted font-semibold">{label}</div>
      <div className={cn("text-2xl font-bold mt-1.5 tracking-tight whitespace-nowrap truncate", accent)} title={typeof value === "string" ? value : undefined}>{value}</div>
      {sub && <div className="text-xs text-muted mt-1.5">{sub}</div>}
    </div>
  );
}
export function Badge({ children, className, tone }: { children: React.ReactNode; className?: string; tone?: string }) {
  const tones: Record<string, string> = {
    slate: "bg-surface2 text-muted", green: "bg-green-500/15 text-green-600 dark:text-green-400",
    red: "bg-red-500/15 text-red-600 dark:text-red-400", amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    navy: "bg-brand/10 text-brand",
  };
  const tc = tone ? tones[tone] || tones.slate : (className || tones.slate);
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tc, tone ? className : "")}>{children}</span>;
}
export function Button({ children, variant = "primary", className, ...p }: any) {
  const v: Record<string, string> = {
    primary: "bg-brand text-white hover:bg-brand-600",
    ghost: "bg-surface border border-line text-fg hover:bg-surface2",
    danger: "bg-red-600 text-white hover:bg-red-700",
    dark: "bg-navy text-white hover:bg-navy-800",
  };
  return (
    <button {...p} className={cn("inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed", v[variant], className)}>
      {children}
    </button>
  );
}
export function Input({ className, ...p }: any) {
  return <input {...p} className={cn("h-9 w-full rounded-lg border border-line bg-surface text-fg px-3 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand", className)} />;
}
export function Select({ className, children, ...p }: any) {
  return <select {...p} className={cn("h-9 w-full rounded-lg border border-line bg-surface text-fg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand", className)}>{children}</select>;
}
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  // Barra de rolagem horizontal fixa no topo + cabeçalho fixo (ver TableScroll).
  return <TableScroll head={head}>{children}</TableScroll>;
}
export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-center text-muted py-10 px-4 border border-dashed border-line rounded-xl bg-surface">{children}</div>;
}
export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-[22px] font-bold tracking-tight text-fg">{title}</h1>
      {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
    </div>
  );
}
