// Nomes de canais e tabelas que emitem eventos (ver supabase/realtime_publications.sql)
export const RT_TABLES = {
  jobs: "atlas_jobs",
  jobLogs: "atlas_job_logs",
  artifacts: "atlas_job_artifacts",
  rodadas: "rodadas",
  oportunidades: "oportunidades",
  historico: "oportunidade_historico",
  tarefas: "tarefas",
  contatos: "contatos",
  revisoes: "revisoes",
  audit: "audit_logs",
} as const;

export const ch = {
  jobs: () => "atlas:jobs",
  job: (id: string | number) => `atlas:job:${id}`,
  logs: (id: string | number) => `atlas:logs:${id}`,
  artifacts: (id: string | number) => `atlas:artifacts:${id}`,
  dashboard: () => "atlas:dashboard",
  oportunidades: () => "atlas:oportunidades",
  oportunidade: (id: string | number) => `atlas:oportunidade:${id}`,
  responsavel: (r: string | number) => `atlas:responsavel:${r}`,
  auditoria: () => "atlas:auditoria",
};

// Intervalos de fallback (polling) por contexto
export const POLL = {
  jobRunning: 2000,
  jobsList: 4000,
  logs: 2000,
  dashboard: 30000,
  lista: 10000,
  idle: 10000,
};
