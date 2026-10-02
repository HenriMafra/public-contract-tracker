/**
 * Cria (ou promove) um usuário Administrador no Supabase Auth + tabela perfis.
 *   npx tsx scripts/create_admin_user.ts --email admin@empresa.com --password "SenhaForte!" --role Administrador --nome "Admin"
 * Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (em .env.local ou no ambiente).
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

function loadEnv() {
  const p = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
function arg(name: string, def = "") {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 ? process.argv[i + 1] : def;
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."); process.exit(1); }
  const email = arg("email"), password = arg("password"), role = arg("role", "Administrador"), nome = arg("nome", "");
  const uf = arg("uf", ""), vendedorNome = arg("vendedor-nome", "");
  if (!email || !password) { console.error("Uso: --email <email> --password <senha> [--role <perfil>] [--nome <nome>] [--uf DF] [--vendedor-nome \"Nome\"]"); process.exit(1); }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  // cria ou localiza o usuário
  let userId: string | undefined;
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role, nome } });
  if (error) {
    if (/already/i.test(error.message)) {
      const { data: list } = await sb.auth.admin.listUsers();
      userId = list?.users?.find((u: any) => u.email === email)?.id;
      console.log("Usuário já existia — atualizando perfil.");
    } else { console.error("Erro:", error.message); process.exit(1); }
  } else userId = data.user?.id;

  if (!userId) { console.error("Não foi possível obter o user_id."); process.exit(1); }
  const perfil: Record<string, any> = { user_id: userId, role, nome, ativo: true };
  if (uf) perfil.uf = uf;
  if (vendedorNome) perfil.vendedor_nome = vendedorNome;
  const { error: e2 } = await sb.from("perfis").upsert(perfil, { onConflict: "user_id" });
  if (e2) { console.error("Erro ao gravar perfil:", e2.message); process.exit(1); }
  console.log(`OK: ${email} criado/atualizado com perfil ${role}${vendedorNome ? ` (vendedor_nome="${vendedorNome}")` : ""}.`);
}
main();
