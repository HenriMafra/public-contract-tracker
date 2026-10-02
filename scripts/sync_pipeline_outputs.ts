/**
 * Sobe os artefatos da rodada mais recente (ATLAS_PIPELINE_DIR/outputs/rodadas/<última>)
 * para os buckets de Storage do Supabase. Use após uma rodada com --write-db.
 *   npx tsx scripts/sync_pipeline_outputs.ts [--rodada <pasta>]
 * Requer NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + ATLAS_PIPELINE_DIR.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

function loadEnv() {
  const p = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(p)) for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const bucketDe = (f: string): string =>
  /\.xlsx$|vendedores.*\.csv$|lista_ataque.*\.csv$/.test(f) ? "exports"
  : /relatorio|calibracao|mapa_distrib/.test(f) ? "relatorios"
  : /Prototipo.*\.html$|dados_reais.*\.js$/.test(f) ? "prototipos"
  : /log/.test(f) ? "logs"
  : /\.zip$/.test(f) ? "rodadas" : "rodadas";

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pipe = process.env.ATLAS_PIPELINE_DIR;
  if (!url || !key || !pipe) { console.error("Defina NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e ATLAS_PIPELINE_DIR."); process.exit(1); }
  const rodadasDir = path.join(pipe, "outputs", "rodadas");
  const argRod = process.argv.indexOf("--rodada");
  let alvo = argRod >= 0 ? process.argv[argRod + 1] : "";
  if (!alvo) {
    const dirs = fs.readdirSync(rodadasDir).filter((d) => /\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse();
    const prod = dirs.find((d) => d.startsWith("PRODUCAO_")) || dirs[0];
    alvo = path.join(rodadasDir, prod);
  }
  if (!fs.existsSync(alvo)) { console.error("Rodada não encontrada:", alvo); process.exit(1); }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const nomeRodada = path.basename(alvo);
  let ok = 0;
  for (const f of fs.readdirSync(alvo)) {
    const full = path.join(alvo, f);
    if (!fs.statSync(full).isFile()) continue;
    const bucket = bucketDe(f);
    const buf = fs.readFileSync(full);
    const { error } = await sb.storage.from(bucket).upload(`${nomeRodada}/${f}`, buf, { upsert: true });
    if (error) console.warn(`  ! ${bucket}/${f}: ${error.message}`);
    else { ok++; console.log(`  -> ${bucket}/${nomeRodada}/${f}`); }
  }
  console.log(`Concluído: ${ok} arquivo(s) enviados de ${nomeRodada}.`);
}
main();
