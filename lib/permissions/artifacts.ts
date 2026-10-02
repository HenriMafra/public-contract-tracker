// Matriz de download por perfil (espelha src/atlas_storage.py DOWNLOAD_MATRIX).
const MATRIX: Record<string, Set<string>> = {
  "Administrador": new Set(["*"]),
  "Operador de Inteligência": new Set(["excel", "csv", "zip", "report_md", "report_pdf", "validation_report", "prototype_html", "prototype_js", "log", "json", "config"]),
  "Coordenador Comercial": new Set(["excel", "csv", "zip", "report_md", "report_pdf", "prototype_html"]),
  "Vendedor": new Set(["csv", "report_pdf"]),
  "Diretoria": new Set(["report_md", "report_pdf", "validation_report", "zip", "prototype_html"]),
};

export function canDownloadArtifact(role: string | undefined, artifactType: string): boolean {
  if (!role) return false;
  const s = MATRIX[role];
  if (!s) return false;
  return s.has("*") || s.has(artifactType);
}
