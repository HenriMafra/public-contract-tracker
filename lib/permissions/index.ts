export type Role =
  | "Administrador"
  | "Diretoria"
  | "Account Manager"
  | "Sales Engineer"
  | "Intern";

// Papéis oferecidos ao criar/editar usuários (UI). O ESCOPO de dados (quais órgãos
// cada um vê) é controlado por RLS + perfil_orgaos, não aqui. Aqui é só "o que pode fazer".
export const ROLES: Role[] = [
  "Administrador", "Diretoria", "Account Manager", "Sales Engineer", "Intern",
];

// Rótulos curtos para a UI
export const ROLE_LABEL: Record<string, string> = {
  "Administrador": "Administrador (acesso total)",
  "Diretoria": "Diretoria (vê tudo, leitura)",
  "Account Manager": "Account Manager (AM)",
  "Sales Engineer": "Sales Engineer (SE)",
  "Intern": "Intern (estágio, leitura)",
};

// Ações que exigem perfil Administrador + confirmação explícita
export const CRITICAL = new Set<string>([
  "run_prod", "run_prod_db", "reprocess", "archive_round", "edit_config_tecnica",
  "edit_score", "edit_concorrentes", "edit_responsaveis", "schedule", "export_full",
  "manage_users", "configure_db", "auto_setup", "reset_decisao",
]);

const ALL = new Set<string>([
  ...CRITICAL,
  "run_test", "load_db", "gen_package", "update_prototype", "open_files", "view_logs",
  "view_audit", "view_rodadas", "view_db", "view_commercial", "view_dashboards",
  "view_qualidade", "edit_config_comercial", "distribute", "assign_vendor",
  "update_status", "register_contact", "create_task", "validate_opportunity",
  "view_comissionamento", "manage_orgaos_foco",
  "ro_view", "ro_criar", "ro_executar",
  "feedback_view", "feedback_manage",
  "backlog_view", "backlog_assign",
]);

// Conjunto comercial COMPLETO: tudo que não é da área técnica/admin. Todos os cargos
// não-admin compartilham isto (o henri pediu "tire a responsabilidade de qualquer cargo").
const COMERCIAL_FULL = new Set<string>([
  "view_commercial", "view_dashboards", "view_qualidade", "view_rodadas", "open_files",
  "update_status", "register_contact", "create_task", "validate_opportunity",
  "distribute", "assign_vendor", "view_comissionamento",
  "ro_view",
  "feedback_view", // todos podem ver e criar sugestões/perguntas/bugs (gerenciar é só admin)
  "backlog_view",  // todos veem o backlog e criam tarefas para si
]);

// Intern (estágio): comercial REDUZIDO — vê a área dele, valida, registra contato, executa RO
// e cria tarefa; mas NÃO muda status, NÃO distribui, NÃO atribui vendedor e NÃO vê
// comissionamento (decisão do henri, 2026-06).
const SEM_INTERN = ["update_status", "distribute", "assign_vendor", "view_comissionamento"];
const INTERN_PERMS = new Set([...COMERCIAL_FULL].filter((p) => !SEM_INTERN.includes(p)));

// RO (Registro de Oportunidade): AM inicia (cria o processo e decide renovar/descartar);
// Intern/SE executam (registram no portal e mudam status). Todos veem; Diretoria só lê.
export const PERMS: Record<Role, Set<string>> = {
  "Administrador": new Set(ALL),                 // acesso total (inclui área técnica/admin)
  "Diretoria": new Set([...COMERCIAL_FULL, "backlog_assign", "manage_orgaos_foco"]),   // leitura + cria tarefa p/ qualquer um + edita foco de órgãos de todos
  "Account Manager": new Set([...COMERCIAL_FULL, "ro_criar", "ro_executar", "backlog_assign"]),
  "Sales Engineer": new Set([...COMERCIAL_FULL, "ro_executar"]),
  "Intern": new Set([...INTERN_PERMS, "ro_executar"]),
};

export function can(role: Role | undefined, action: string): boolean {
  if (!role) return false;
  return PERMS[role]?.has(action) ?? false;
}
export function isCritical(action: string): boolean {
  return CRITICAL.has(action);
}
export const ACESSO_NEGADO = "Acesso negado. Esta área exige perfil Administrador.";

// Navegação: rota -> { label, action exigida (ou null = qualquer logado) }
export const NAV: { href: string; label: string; action: string | null; group?: string }[] = [
  { href: "/dashboard", label: "Dashboard", action: "view_dashboards" },
  { href: "/lista-ataque", label: "Lista de Ataque", action: "view_commercial" },
  { href: "/decisoes", label: "Decisões & Qualidade", action: "view_commercial" },
  { href: "/meus-contratos", label: "Painel Tático", action: "view_commercial" },
  { href: "/base", label: "Terreno Conquistado", action: "view_commercial" },
  { href: "/licitacoes", label: "Licitações", action: "view_commercial" },
  { href: "/backlog", label: "Backlog (tarefas)", action: "backlog_view" },
  { href: "/comissionamento", label: "Comissionamento", action: "view_comissionamento" },
  { href: "/orgaos-equipe", label: "Órgãos da equipe", action: "manage_orgaos_foco" },
  { href: "/distribuicao", label: "Distribuição", action: "distribute" },
  { href: "/fornecedores", label: "Fornecedores", action: "view_commercial" },
  { href: "/rodadas", label: "Atualizações da base", action: "view_rodadas" },
  { href: "/relatorios", label: "Relatórios", action: "open_files" },
  { href: "/feedback", label: "Sugestões & Bugs", action: "feedback_view" },
  { href: "/notificacoes", label: "Notificações", action: null },
  { href: "/ferramentas", label: "Ferramentas", action: null },
  { href: "/conta", label: "Minha Conta", action: null },
  { href: "/como-usar", label: "Como usar (ajuda)", action: null },
  { href: "/faq", label: "Perguntas frequentes", action: null },
  { href: "/admin/automacao", label: "Automação", action: "auto_setup", group: "Admin" },
  { href: "/admin/operacao", label: "Operação", action: "run_test", group: "Admin" },
  { href: "/admin/jobs", label: "Jobs", action: "view_rodadas", group: "Admin" },
  { href: "/admin/configuracoes", label: "Configurações", action: "edit_config_comercial", group: "Admin" },
  { href: "/admin/usuarios", label: "Usuários", action: "manage_users", group: "Admin" },
  { href: "/admin/logs", label: "Logs", action: "view_logs", group: "Admin" },
  { href: "/admin/auditoria", label: "Auditoria", action: "view_audit", group: "Admin" },
];

// MENU ENXUTO PARA NÃO-ADMIN (pedido 2026-07-02): quem não é Administrador só vê estes itens —
// Dashboard, Decisões & Qualidade, Ferramentas, Fornecedores, Notificações, Como usar e
// Perguntas frequentes ficam ESCONDIDOS pra todo mundo que não for Administrador (as rotas
// continuam existindo por URL direta, só não aparecem no menu). Administrador continua vendo
// o menu completo. Pra mudar, edite esta lista.
const NAV_RESTRITO_HREFS = new Set([
  "/lista-ataque", "/meus-contratos", "/base",
]);
// Itens sem "action" (qualquer logado) que ficam visíveis mesmo no menu enxuto.
const NAV_RESTRITO_ACTION_NULL = new Set(["/conta"]);

export function navParaRole(role: Role) {
  const isAdmin = role === "Administrador";
  // Menu (pedido 2026-07-02): Administrador vê TUDO; todos os demais perfis veem só o menu
  // enxuto (4 abas do dia a dia + Ferramentas/Conta) — Dashboard, Fornecedores, Notificações,
  // Como usar e Perguntas frequentes ficam escondidos pra quem não é Administrador.
  const base = isAdmin ? NAV : NAV.filter((n) => NAV_RESTRITO_HREFS.has(n.href) || NAV_RESTRITO_ACTION_NULL.has(n.href));
  return base
    .filter((n) => {
      if (n.group === "Admin") return isAdmin; // área técnica: só Administrador
      return n.action === null || can(role, n.action);
    });
}
