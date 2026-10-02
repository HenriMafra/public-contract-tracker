"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Select, Input } from "@/components/ui/primitives";

export function ListaFiltros({ ufs, categorias, urgencias, atual }: {
  ufs: string[]; categorias: string[]; urgencias: string[]; atual: Record<string, string>;
}) {
  const router = useRouter();
  const [f, setF] = useState({ uf: atual.uf || "", categoria: atual.categoria || "", urgencia: atual.urgencia || "", scoreMin: atual.scoreMin || "" });
  function aplicar() {
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v) p.set(k, v as string); });
    router.push("/lista-ataque?" + p.toString());
  }
  function limpar() { setF({ uf: "", categoria: "", urgencia: "", scoreMin: "" }); router.push("/lista-ataque"); }
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4 bg-surface border border-line rounded-xl p-3">
      <Select value={f.uf} onChange={(e: any) => setF({ ...f, uf: e.target.value })}><option value="">UF (todas)</option>{ufs.map((u) => <option key={u}>{u}</option>)}</Select>
      <Select value={f.categoria} onChange={(e: any) => setF({ ...f, categoria: e.target.value })}><option value="">Categoria (todas)</option>{categorias.map((c) => <option key={c}>{c}</option>)}</Select>
      <Select value={f.urgencia} onChange={(e: any) => setF({ ...f, urgencia: e.target.value })}><option value="">Urgência (todas)</option>{urgencias.map((u) => <option key={u}>{u}</option>)}</Select>
      <Input type="number" placeholder="Score mín." value={f.scoreMin} onChange={(e: any) => setF({ ...f, scoreMin: e.target.value })} />
      <div className="flex gap-2"><Button onClick={aplicar} className="flex-1">Filtrar</Button><Button variant="ghost" onClick={limpar}>Limpar</Button></div>
    </div>
  );
}
