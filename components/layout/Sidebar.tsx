"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/format";
import { Logo, LogoMark } from "@/components/ui/Logo";
import {
  LayoutDashboard, Radar, Target, Briefcase, Building2, Percent, ClipboardList,
  Share2, Truck, BadgeCheck, History, FileText, Bell, Wrench, UserRound, HelpCircle,
  Bot, ServerCog, ListChecks, Settings, Users, ScrollText, ShieldCheck, Circle, Gavel, KanbanSquare, BookOpen,
  PanelLeftClose, PanelLeftOpen, Pin, PinOff, Archive, ArchiveRestore, ChevronDown, RotateCcw,
  GripVertical, ArrowUpDown, Check,
} from "lucide-react";

type Item = { href: string; label: string; group?: string };

const ICON: Record<string, any> = {
  "/dashboard": LayoutDashboard, "/radar": Radar, "/lista-ataque": Target, "/decisoes": ClipboardList, "/meus-contratos": Briefcase,
  "/base": Building2, "/licitacoes": Gavel, "/backlog": KanbanSquare, "/comissionamento": Percent, "/condicionamento": ClipboardList,
  "/distribuicao": Share2, "/fornecedores": Truck, "/qualidade": BadgeCheck, "/rodadas": History,
  "/relatorios": FileText, "/notificacoes": Bell, "/ferramentas": Wrench, "/conta": UserRound,
  "/como-usar": HelpCircle, "/faq": BookOpen, "/admin/automacao": Bot, "/admin/operacao": ServerCog, "/admin/jobs": ListChecks,
  "/admin/configuracoes": Settings, "/admin/usuarios": Users, "/admin/logs": ScrollText, "/admin/auditoria": ShieldCheck,
};
const KA = "mapper_sb_arquivados", KF = "mapper_sb_fixados", KC = "mapper_sidebar_collapsed", KH = "mapper_hint_ctx", KO = "mapper_sb_order";

export function Sidebar({ items }: { items: Item[] }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [arq, setArq] = useState<string[]>([]);     // arquivados (hrefs)
  const [fix, setFix] = useState<string[]>([]);     // fixados no topo (hrefs, em ordem)
  const [ready, setReady] = useState(false);
  const [openArq, setOpenArq] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; href: string; label: string } | null>(null);
  const [hint, setHint] = useState(false); // dica de clique-direito (só 1ª vez, dispensável)
  const [order, setOrder] = useState<string[]>([]); // ordem personalizada das abas principais (hrefs)
  const [reorder, setReorder] = useState(false);    // modo "arrastar para reordenar"
  const dragHref = useRef<string | null>(null);
  const dismissHint = () => { setHint(false); try { localStorage.setItem(KH, "1"); } catch {} };

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(KC) === "1");
      setArq(JSON.parse(localStorage.getItem(KA) || "[]"));
      setFix(JSON.parse(localStorage.getItem(KF) || "[]"));
      setOrder(JSON.parse(localStorage.getItem(KO) || "[]"));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(KC, collapsed ? "1" : "0"); } catch {} }, [collapsed, ready]);
  useEffect(() => { if (ready) try { localStorage.setItem(KA, JSON.stringify(arq)); } catch {} }, [arq, ready]);
  useEffect(() => { if (ready) try { localStorage.setItem(KF, JSON.stringify(fix)); } catch {} }, [fix, ready]);
  const persistOrder = (o: string[]) => { setOrder(o); try { localStorage.setItem(KO, JSON.stringify(o)); } catch {} };
  function dropSobre(targetHref: string) {
    const from = dragHref.current; dragHref.current = null;
    if (!from || from === targetHref) return;
    const cur = principais.map((i) => i.href);
    const fi = cur.indexOf(from), ti = cur.indexOf(targetHref);
    if (fi < 0 || ti < 0) return;
    const arr = [...cur]; const [m] = arr.splice(fi, 1); arr.splice(ti, 0, m);
    persistOrder(arr);
  }
  // fecha o menu de contexto ao clicar/rolar/Esc
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    window.addEventListener("click", close); window.addEventListener("scroll", close, true); window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("click", close); window.removeEventListener("scroll", close, true); window.removeEventListener("keydown", esc); };
  }, [menu]);

  const toggleArquivar = (h: string) => {
    const arquivando = !arq.includes(h); // mostra a dica só na 1ª vez que ALGUÉM arquiva
    setArq((a) => a.includes(h) ? a.filter((x) => x !== h) : [...a, h]);
    setFix((f) => f.filter((x) => x !== h));
    if (arquivando) { try { if (localStorage.getItem(KH) !== "1") setHint(true); } catch {} }
  };
  const toggleFixar = (h: string) => { setFix((f) => f.includes(h) ? f.filter((x) => x !== h) : [...f, h]); setArq((a) => a.filter((x) => x !== h)); };

  const byHref = (h: string) => items.find((i) => i.href === h);
  const principaisBase = items.filter((i) => i.group !== "Admin" && !arq.includes(i.href) && !fix.includes(i.href));
  // aplica a ordem personalizada (hrefs salvos) e acrescenta abas novas no fim
  const principais = [
    ...(order.map((h) => principaisBase.find((i) => i.href === h)).filter(Boolean) as Item[]),
    ...principaisBase.filter((i) => !order.includes(i.href)),
  ];
  const admin = items.filter((i) => i.group === "Admin" && !arq.includes(i.href) && !fix.includes(i.href));
  const fixados = fix.map(byHref).filter(Boolean) as Item[];
  const arquivados = arq.map(byHref).filter(Boolean) as Item[];

  const ItemLink = (i: Item, pinned = false) => {
    const Icon = ICON[i.href] || Circle;
    const active = path === i.href || (i.href !== "/" && path.startsWith(i.href + "/"));
    if (reorder && !pinned && !collapsed) {
      return (
        <div key={i.href} draggable onDragStart={() => { dragHref.current = i.href; }} onDragOver={(e) => e.preventDefault()} onDrop={() => dropSobre(i.href)}
          className={cn("flex items-center gap-2 rounded-lg text-sm font-medium px-2.5 py-2 border border-dashed cursor-grab active:cursor-grabbing select-none transition",
            active ? "border-brand/50 bg-brand/5 text-fg" : "border-line bg-surface text-muted hover:text-fg")}>
          <GripVertical size={15} className="shrink-0 text-muted" />
          <Icon size={17} className="shrink-0" />
          <span className="truncate flex-1">{i.label}</span>
        </div>
      );
    }
    return (
      <Link key={i.href} href={i.href} title={collapsed ? i.label : undefined}
        onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, href: i.href, label: i.label }); }}
        className={cn("group flex items-center gap-2.5 rounded-lg text-sm font-medium transition relative",
          collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2",
          active ? "bg-brand text-white shadow-soft" : "text-muted hover:bg-surface hover:text-fg")}>
        <Icon size={18} className="shrink-0" />
        {!collapsed && <span className="truncate flex-1">{i.label}</span>}
        {!collapsed && pinned && <Pin size={12} className="opacity-50 shrink-0" />}
      </Link>
    );
  };

  return (
    <aside className={cn("shrink-0 bg-surface2 border-r border-line text-fg min-h-screen p-3 hidden md:flex md:flex-col transition-[width] duration-200", collapsed ? "w-[68px]" : "w-60")}>
      <button onClick={() => setCollapsed((c) => !c)} title={collapsed ? "Expandir menu" : "Recolher menu"}
        className={cn("flex items-center gap-2 rounded-lg text-xs font-semibold text-muted hover:bg-surface hover:text-fg transition mb-3 border border-line/60", collapsed ? "justify-center py-2" : "px-3 py-1.5")}>
        {collapsed ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={15} /> Recolher menu</>}
      </button>

      {/* Reordenar abas (arrastar) — salva por aparelho; "Padrão" volta à ordem original */}
      {!collapsed && (
        <div className="flex items-center gap-1.5 mb-2">
          <button onClick={() => setReorder((r) => !r)} title="Arrastar para reordenar as abas do menu"
            className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold py-1.5 border transition", reorder ? "bg-brand text-white border-brand" : "text-muted border-line/60 hover:bg-surface hover:text-fg")}>
            {reorder ? <><Check size={14} /> Concluir</> : <><ArrowUpDown size={14} /> Reordenar abas</>}
          </button>
          {reorder && order.length > 0 && (
            <button onClick={() => persistOrder([])} title="Voltar à ordem padrão"
              className="flex items-center gap-1 rounded-lg text-xs font-semibold py-1.5 px-2 border border-line/60 text-muted hover:bg-surface hover:text-fg transition"><RotateCcw size={13} /> Padrão</button>
          )}
        </div>
      )}
      {reorder && !collapsed && <div className="text-[11px] text-muted px-1 mb-1.5 leading-snug">Arraste as abas para a ordem que preferir. Clique em <b>Concluir</b> ao terminar.</div>}

      {/* Fixados no topo */}
      {fixados.length > 0 && (<><nav className="space-y-1">{fixados.map((i) => ItemLink(i, true))}</nav>
        {!collapsed ? <div className="h-px bg-line my-2.5 mx-1" /> : <div className="h-px bg-line my-2 mx-2" />}</>)}

      <nav className="space-y-1">{principais.map((i) => ItemLink(i))}</nav>

      {admin.length > 0 && (<>
        {collapsed ? <div className="my-3 mx-2 h-px bg-line" /> : (
          <div className="flex items-center gap-2 mt-5 mb-2 px-1">
            <Settings size={15} className="text-brand shrink-0" /><span className="text-sm font-bold text-fg tracking-tight">Administração</span><span className="flex-1 h-px bg-line ml-1" />
          </div>)}
        <nav className="space-y-1">{admin.map((i) => ItemLink(i))}</nav>
      </>)}

      {/* Arquivados (expansível, restaurável) */}
      {arquivados.length > 0 && !collapsed && (
        <div className="mt-4">
          <button onClick={() => setOpenArq((o) => !o)} className="flex items-center gap-2 w-full text-xs uppercase tracking-wider text-muted font-bold px-1 hover:text-fg transition">
            <Archive size={13} /> Arquivados ({arquivados.length}) <ChevronDown size={13} className={cn("ml-auto transition-transform", openArq && "rotate-180")} />
          </button>
          {openArq && (
            <nav className="space-y-0.5 mt-1.5">
              {arquivados.map((i) => {
                const Icon = ICON[i.href] || Circle;
                return (
                  <div key={i.href} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted hover:bg-surface group">
                    <Icon size={15} className="shrink-0 opacity-70" /><span className="truncate flex-1">{i.label}</span>
                    <button onClick={() => toggleArquivar(i.href)} title="Restaurar para o menu" className="opacity-0 group-hover:opacity-100 text-brand hover:scale-110 transition"><ArchiveRestore size={14} /></button>
                  </div>
                );
              })}
            </nav>
          )}
        </div>
      )}

      {!collapsed && (
        <div className="mt-auto pt-4 px-3 space-y-2">
          {hint && (
            <div className="rounded-lg border border-brand/30 bg-brand/10 p-3">
              <div className="text-xs text-fg leading-snug">✓ <b>Arquivado!</b> Some do menu e vai para a seção <b>“Arquivados”</b> (lá você restaura). Para fixar no topo ou arquivar qualquer item, clique nele com o <b>botão direito</b>.</div>
              <button onClick={dismissHint} className="mt-2 text-xs font-semibold text-brand hover:underline">Entendi — não mostrar de novo</button>
            </div>
          )}
          <div className="text-xs text-muted">developed by Henri Mafra</div>
        </div>
      )}

      {/* Menu de contexto (botão direito) */}
      {menu && (
        <div className="fixed z-50 min-w-[180px] rounded-lg border border-line bg-surface shadow-lg py-1 text-sm" style={{ left: Math.min(menu.x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 200), top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <div className="px-3 py-1.5 text-xs text-muted font-semibold truncate border-b border-line mb-1">{menu.label}</div>
          <button onClick={() => { toggleFixar(menu.href); setMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-fg hover:bg-surface2 transition">
            {fix.includes(menu.href) ? <><PinOff size={15} /> Desafixar do topo</> : <><Pin size={15} /> Fixar no topo</>}
          </button>
          <button onClick={() => { toggleArquivar(menu.href); setMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-fg hover:bg-surface2 transition">
            {arq.includes(menu.href) ? <><ArchiveRestore size={15} /> Restaurar</> : <><Archive size={15} /> Arquivar</>}
          </button>
          <Link href={menu.href} onClick={() => setMenu(null)} className="w-full flex items-center gap-2 px-3 py-2 text-fg hover:bg-surface2 transition">Abrir</Link>
          {(arq.length > 0 || fix.length > 0 || order.length > 0) && (
            <button onClick={() => { setArq([]); setFix([]); persistOrder([]); setMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-muted hover:bg-surface2 hover:text-fg transition border-t border-line mt-1">
              <RotateCcw size={14} /> Restaurar menu padrão
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
