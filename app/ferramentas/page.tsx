import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { Shell } from "@/components/layout/Shell";
import { PageTitle, Badge } from "@/components/ui/primitives";
import { TOOLS, toolHref } from "@/lib/tools/registry";
import {
  Layers, Scissors, RotateCw, Hash, Stamp, LayoutGrid, Minimize2, Image as ImageIcon,
  FileSpreadsheet, Images, FileType, FileType2, Eraser, ImageMinus, PenLine, Signature, Lock, ScanText, Wrench, ShieldCheck,
  Crop, Unlock, EyeOff, FormInput, GitCompare, Archive, ScanLine, Presentation, Sheet, Table, Code2,
} from "lucide-react";

export const dynamic = "force-dynamic";

const ICONS: Record<string, any> = {
  Layers, Scissors, RotateCw, Hash, Stamp, LayoutGrid, Minimize2, Image: ImageIcon,
  FileSpreadsheet, Images, FileType, FileType2, Eraser, ImageMinus, PenLine, Signature, Lock, ScanText,
  Crop, Unlock, EyeOff, FormInput, GitCompare, Archive, ScanLine, Presentation, Sheet, Table, Code2,
};

export default async function FerramentasHub() {
  const user = await requireUser();
  const groups = Array.from(new Set(TOOLS.map((t) => t.group)));
  return (
    <Shell user={user}>
      <PageTitle title="Ferramentas" subtitle="Central de ferramentas de arquivos — privada e 100% no seu navegador." />
      <div className="flex items-center gap-2 mb-5 text-sm text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
        <ShieldCheck size={16} className="shrink-0" />
        <span>Seus arquivos <b>nunca saem do seu computador</b> — todo o processamento acontece aqui no navegador.</span>
      </div>
      {groups.map((g) => (
        <div key={g} className="mb-6">
          <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-2">{g}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TOOLS.filter((t) => t.group === g).map((t) => {
              const Icon = ICONS[t.icon] || Wrench;
              const inner = (
                <div className={`h-full rounded-xl border p-4 transition ${t.ready ? "border-line bg-surface hover:border-brand hover:shadow-soft cursor-pointer" : "border-line bg-surface2/40 opacity-70"}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-grid place-items-center w-9 h-9 rounded-lg bg-brand/15 text-brand shrink-0"><Icon size={18} /></span>
                    <div className="font-semibold text-fg text-sm">{t.title}</div>
                    {!t.ready && <Badge tone="slate" className="ml-auto">em breve</Badge>}
                  </div>
                  <div className="text-xs text-muted leading-relaxed">{t.desc}</div>
                </div>
              );
              return t.ready
                ? <Link key={t.slug} href={toolHref(t)}>{inner}</Link>
                : <div key={t.slug}>{inner}</div>;
            })}
          </div>
        </div>
      ))}
    </Shell>
  );
}
