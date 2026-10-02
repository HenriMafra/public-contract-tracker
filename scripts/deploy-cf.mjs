// Deploy para o Cloudflare carregando o token do .env.local automaticamente.
// Assim o deploy é NÃO-INTERATIVO e permanente: basta ter no .env.local a linha
//   CLOUDFLARE_API_TOKEN="..."   (token "Edit Cloudflare Workers")
// e, se a conta tiver mais de uma, opcionalmente  CLOUDFLARE_ACCOUNT_ID="...".
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
try {
  const env = readFileSync(path.join(root, ".env.local"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*(CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID)\s*=\s*(.*)$/);
    if (m) {
      const v = m[2].trim().replace(/^["']|["']$/g, "");
      if (v) process.env[m[1]] = v;
    }
  }
} catch { /* sem .env.local — segue e avisa abaixo */ }

if (!process.env.CLOUDFLARE_API_TOKEN) {
  console.error("\n[deploy] Falta CLOUDFLARE_API_TOKEN.\n" +
    "Crie um token em: Cloudflare > (perfil) My Profile > API Tokens > Create Token > template \"Edit Cloudflare Workers\".\n" +
    "Depois cole no .env.local a linha:  CLOUDFLARE_API_TOKEN=\"seu_token\"\n");
  process.exit(1);
}

// Flag de versão do adaptador OpenNext (ver explicação em build-cf.mjs): a partir da 1.16
// exige Next 15+ e recusa sem --dangerouslyUseUnsupportedNextVersion; antes disso a flag nem
// existe. Lemos a versão instalada direto do node_modules (o "exports" do pacote bloqueia
// require do package.json) e só passamos a flag quando necessário.
const args = ["opennextjs-cloudflare", "deploy"];
try {
  const pkgPath = path.join(root, "node_modules", "@opennextjs", "cloudflare", "package.json");
  const v = JSON.parse(readFileSync(pkgPath, "utf8")).version;
  const [maj, min] = v.split(".").map(Number);
  if (maj > 1 || (maj === 1 && min >= 16)) args.push("--dangerouslyUseUnsupportedNextVersion");
} catch { /* versão não detectada — segue sem flag */ }

// Fixa o carimbo de versão (mesmo motivo do build-cf.mjs) para o deploy não entrar em loop.
if (!process.env.NEXT_PUBLIC_BUILD_STAMP) process.env.NEXT_PUBLIC_BUILD_STAMP = String(Date.now());
const r = spawnSync("npx", args, { stdio: "inherit", shell: true, env: process.env });
process.exit(r.status ?? 1);
