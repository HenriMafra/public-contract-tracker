-- Mural de Sugestões / Perguntas / Bugs. Qualquer usuário cria; o Administrador gerencia.
-- RLS LIGADO sem policy → só o service-role (rotas server-side) acessa. Sem exposição pública.
create table if not exists public.feedback (
  id            bigserial primary key,
  tipo          text not null default 'sugestao',   -- 'sugestao' | 'pergunta' | 'bug'
  titulo        text not null,
  descricao     text,
  pagina        text,                                 -- opcional: onde o usuário estava
  autor_nome    text,
  autor_email   text,
  autor_id      text,
  status        text not null default 'aberto',       -- 'aberto' | 'em_andamento' | 'resolvido' | 'fechado'
  prioridade    text,                                 -- 'baixa' | 'media' | 'alta' (admin define)
  resposta      text,                                 -- resposta/observação do admin
  respondido_por text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists idx_feedback_status on public.feedback (status, id desc);
alter table public.feedback enable row level security;
