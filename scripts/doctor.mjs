/**
 * ATLAS B2G Online — Preflight de Go-Live.
 *   npm run doctor
 * Valida .env.local, sanidade das chaves, caminho do pipeline e (se as chaves
 * forem reais) testa conectividade com o Supabase (Auth health + REST + DB).
 * Não escreve nada. Sai com código !=0 se houver FALHA bloqueante.
 */
import fs from "fs";
import path from "path";
import net from "net";

const ROOT = process.cwd();
const rows = [];
const add = (level, item, detail) => rows.push({ level, item, detail });
const PLACEHOLDERS = ["placeholder", "seu-projeto", "sua_senha", "sua_anon", "sua_service", "seu_", "sua "];
const isPlaceholder = (v) => !v || PLACEHOLDERS.some((p) => v.toLowerCase().includes(p));
const looksJwt = (v) => /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./.test(v || "");

// ---------- carrega .env.local ----------
const envPath = path.join(ROOT, ".env.local");
const env = {};
if (!fs.existsSync(envPath)) {
  add("FALHA", ".env.local", "arquivo não encontrado — copie de .env.example");
} else {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  add("OK", ".env.local", "encontrado e lido");
}

// ---------- variáveis obrigatórias ----------
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = env.DATABASE_URL;

if (isPlaceholder(url)) add("FALHA", "NEXT_PUBLIC_SUPABASE_URL", "ainda é placeholder — cole o Project URL real");
else if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)/.test(url)) add("AVISO", "NEXT_PUBLIC_SUPABASE_URL", `formato inesperado: ${url}`);
else add("OK", "NEXT_PUBLIC_SUPABASE_URL", url);

if (isPlaceholder(anon)) add("FALHA", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "ainda é placeholder — cole a anon key");
else if (!looksJwt(anon)) add("AVISO", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "não parece um JWT (eyJ...) — confira");
else add("OK", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "presente (JWT)");

if (isPlaceholder(service)) add("FALHA", "SUPABASE_SERVICE_ROLE_KEY", "ainda é placeholder — cole a service_role key (SECRETA)");
else if (!looksJwt(service)) add("AVISO", "SUPABASE_SERVICE_ROLE_KEY", "não parece um JWT — confira");
else if (service === anon) add("FALHA", "SUPABASE_SERVICE_ROLE_KEY", "IGUAL à anon key — está errada (precisa ser a service_role)");
else add("OK", "SUPABASE_SERVICE_ROLE_KEY", "presente (JWT, distinta da anon)");

// segurança: service role NÃO pode estar em variável pública
for (const k of Object.keys(env))
  if (k.startsWith("NEXT_PUBLIC_") && !isPlaceholder(service) && env[k] === service)
    add("FALHA", k, "expõe a SERVICE ROLE no frontend! remova imediatamente");

if (isPlaceholder(dbUrl)) add("AVISO", "DATABASE_URL", "vazio/placeholder — necessário só para carga (--write-db)");
else if (!/^postgres(ql)?:\/\/[^:]+:[^@]+@/.test(dbUrl)) add("AVISO", "DATABASE_URL", "sem usuário:senha@host — confira a connection string");
else add("OK", "DATABASE_URL", dbUrl.replace(/:[^:@]+@/, ":***@"));

// ---------- pipeline ----------
const pipe = env.ATLAS_PIPELINE_ROOT || env.ATLAS_PIPELINE_DIR;
if (!pipe) add("AVISO", "ATLAS_PIPELINE_ROOT", "não definido — Job Runner (Opção A) não funcionará");
else if (!fs.existsSync(pipe)) add("FALHA", "ATLAS_PIPELINE_ROOT", `pasta não existe: ${pipe}`);
else {
  const need = ["src/load_weekly_to_db.py", "src/atlas_weekly_runner.py", "config/atlas_config_producao.json"];
  const miss = need.filter((f) => !fs.existsSync(path.join(pipe, f)));
  if (miss.length) add("FALHA", "ATLAS_PIPELINE_ROOT", `faltam no pipeline: ${miss.join(", ")}`);
  else add("OK", "ATLAS_PIPELINE_ROOT", `${pipe} (runner + config presentes)`);
}

// ---------- conectividade (só se chaves reais) ----------
async function ping() {
  if (isPlaceholder(url) || isPlaceholder(anon)) {
    add("AVISO", "conectividade Supabase", "pulada (chaves ainda placeholder)");
    return;
  }
  const base = url.replace(/\/$/, "");
  // Auth health (GoTrue)
  try {
    const r = await fetch(`${base}/auth/v1/health`, { headers: { apikey: anon }, signal: AbortSignal.timeout(8000) });
    add(r.ok ? "OK" : "AVISO", "Supabase Auth /health", `HTTP ${r.status}`);
  } catch (e) { add("FALHA", "Supabase Auth /health", String(e.message || e)); }
  // PostgREST root
  try {
    const r = await fetch(`${base}/rest/v1/`, { headers: { apikey: anon, Authorization: `Bearer ${anon}` }, signal: AbortSignal.timeout(8000) });
    add(r.ok || r.status === 404 ? "OK" : "AVISO", "Supabase REST /rest/v1", `HTTP ${r.status}`);
  } catch (e) { add("FALHA", "Supabase REST /rest/v1", String(e.message || e)); }
  // tabela perfis existe? (espera 200 com array, ou 401/permission — mas conexão funciona)
  try {
    const r = await fetch(`${base}/rest/v1/perfis?select=user_id&limit=1`, { headers: { apikey: service || anon, Authorization: `Bearer ${service || anon}` }, signal: AbortSignal.timeout(8000) });
    if (r.ok) add("OK", "tabela perfis", "acessível (schema aplicado)");
    else if (r.status === 404) add("AVISO", "tabela perfis", "404 — rode os SQLs (schema/rls) antes de usar");
    else add("AVISO", "tabela perfis", `HTTP ${r.status}`);
  } catch (e) { add("AVISO", "tabela perfis", String(e.message || e)); }
}

await ping();

// ---------- relatório ----------
const ICON = { OK: "✔", AVISO: "▲", FALHA: "✘" };
console.log("\nATLAS B2G — PREFLIGHT DE GO-LIVE");
console.log("=".repeat(74));
for (const r of rows) console.log(`[${ICON[r.level] || "?"} ${r.level.padEnd(5)}] ${r.item.padEnd(32)} ${r.detail}`);
console.log("=".repeat(74));
const falhas = rows.filter((r) => r.level === "FALHA").length;
const avisos = rows.filter((r) => r.level === "AVISO").length;
console.log(`${falhas} falha(s) bloqueante(s), ${avisos} aviso(s).`);
if (falhas) { console.log("→ Corrija as FALHAS antes do go-live."); process.exit(1); }
console.log("→ Sem falhas bloqueantes. Pronto para aplicar SQL e criar o admin.");
