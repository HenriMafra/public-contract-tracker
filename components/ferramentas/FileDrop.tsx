"use client";
import { useRef, useState } from "react";
import { UploadCloud, X, FileText } from "lucide-react";

export function FileDrop({
  accept, multiple, files, setFiles, hint,
}: {
  accept: string; multiple?: boolean; files: File[]; setFiles: (f: File[]) => void; hint?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function add(list: FileList | File[]) {
    const incoming = Array.from(list);
    setFiles(multiple ? [...files, ...incoming] : incoming.slice(0, 1));
  }
  function remove(i: number) { setFiles(files.filter((_, j) => j !== i)); }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) add(e.dataTransfer.files); }}
        onClick={() => ref.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${drag ? "border-brand bg-brand/10" : "border-line bg-surface2/40 hover:bg-surface2"}`}
      >
        <UploadCloud size={26} className="mx-auto text-brand mb-2" />
        <div className="text-sm font-semibold text-fg">Arraste {multiple ? "os arquivos" : "o arquivo"} aqui ou clique para selecionar</div>
        {hint && <div className="text-xs text-muted mt-1">{hint}</div>}
        <input ref={ref} type="file" accept={accept} multiple={multiple} className="hidden"
          onChange={(e) => { if (e.target.files?.length) add(e.target.files); e.currentTarget.value = ""; }} />
      </div>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {files.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs">
              <FileText size={14} className="text-brand" />
              <span className="font-medium text-fg max-w-[220px] truncate" title={f.name}>{f.name}</span>
              <span className="text-muted">{(f.size / 1024).toFixed(0)} KB</span>
              <button onClick={(e) => { e.stopPropagation(); remove(i); }} className="text-muted hover:text-red-500"><X size={13} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
