// Build para Cloudflare com um CARIMBO DE VERSÃO ÚNICO por build.
// Fixa NEXT_PUBLIC_BUILD_STAMP no ambiente ANTES do build, para que TODAS as avaliações do
// next.config (cliente, servidor e o re-bundle do OpenNext) usem o MESMO valor. Sem isto, o
// next.config roda `Date.now()` mais de uma vez e gera carimbos diferentes p/ cliente e servidor
// → o VersionWatcher nunca casa os dois e recarrega a página em LOOP INFINITO.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

// Flag de versão do adaptador OpenNext: a partir da 1.16 ele exige Next 15+ e RECUSA o build
// sem --dangerouslyUseUnsupportedNextVersion. Nas versões anteriores (ex.: 1.15.x) essa flag
// NEM EXISTE, e passá-la quebra o build. Como o range no package.json é flutuante (^1.x),
// lemos a versão realmente instalada (direto do node_modules — o campo "exports" do pacote
// bloqueia require("@opennextjs/cloudflare/package.json"), então NÃO use require aqui) e só
// passamos a flag quando ela é necessária. (O código roda estável no Next 14, que está em
// produção — a flag só silencia a checagem do adaptador. Ver docs/DEPLOY.md.)
let flag = "";
try {
  const pkgPath = path.join(process.cwd(), "node_modules", "@opennextjs", "cloudflare", "package.json");
  const v = JSON.parse(readFileSync(pkgPath, "utf8")).version;
  const [maj, min] = v.split(".").map(Number);
  if (maj > 1 || (maj === 1 && min >= 16)) flag = " --dangerouslyUseUnsupportedNextVersion";
  console.log(`→ @opennextjs/cloudflare ${v}${flag ? " (Next 14 → usando flag de compatibilidade)" : ""}`);
} catch { console.log("→ versão do @opennextjs/cloudflare não detectada — seguindo sem flag"); }

if (!process.env.NEXT_PUBLIC_BUILD_STAMP) process.env.NEXT_PUBLIC_BUILD_STAMP = String(Date.now());
console.log("→ NEXT_PUBLIC_BUILD_STAMP =", process.env.NEXT_PUBLIC_BUILD_STAMP);
execSync("opennextjs-cloudflare build" + flag, { stdio: "inherit", env: process.env });
