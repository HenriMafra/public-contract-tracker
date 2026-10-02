import { navParaRole } from "../lib/permissions";
const roles = ["Administrador", "Diretoria", "Account Manager", "Sales Engineer", "Intern"];
const TECNICO = ["Automação", "Operação", "Jobs", "Configurações", "Usuários", "Logs", "Auditoria"];
for (const r of roles) {
  const itens = navParaRole(r as any).map((n) => n.label);
  const vazaTecnico = itens.filter((l) => TECNICO.includes(l));
  console.log(`\n${r}:`);
  console.log("  menu:", itens.join(" | "));
  console.log("  vaza item técnico?", vazaTecnico.length ? "SIM -> " + vazaTecnico.join(",") : "NAO (ok)");
}
