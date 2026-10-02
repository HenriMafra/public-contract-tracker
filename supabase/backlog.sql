-- BACKLOG (estilo Trello): quadro compartilhado de tarefas. Colunas (listas), cartões,
-- membros, etiquetas, checklist, prazo, comentários. RLS ON sem policy → só service-role
-- (as rotas server-side acessam; nada exposto à API pública).
create table if not exists public.backlog_cards (
  id            bigserial primary key,
  titulo        text not null,
  descricao     text,
  coluna        text not null default 'a_fazer',        -- a_fazer | fazendo | revisao | feito
  prioridade    text,                                    -- baixa | media | alta
  etiquetas     jsonb not null default '[]'::jsonb,      -- string[]
  checklist     jsonb not null default '[]'::jsonb,      -- [{ texto, feito }]
  responsaveis  jsonb not null default '[]'::jsonb,      -- [{ id, nome }] (membros)
  prazo         date,
  origem        text not null default 'manual',          -- manual | ro
  ro_processo_id bigint,
  ordem         double precision not null default 0,     -- ordenação dentro da coluna
  criado_por    text,
  criado_por_id text,
  arquivado     boolean not null default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists idx_backlog_coluna on public.backlog_cards (arquivado, coluna, ordem);
alter table public.backlog_cards enable row level security;

create table if not exists public.backlog_comentarios (
  id         bigserial primary key,
  card_id    bigint not null references public.backlog_cards(id) on delete cascade,
  autor      text,
  texto      text not null,
  created_at timestamptz default now()
);
create index if not exists idx_backlog_com on public.backlog_comentarios (card_id);
alter table public.backlog_comentarios enable row level security;
