# Mapa de rotas e APIs — Contratos

Inventário completo das páginas e endpoints, extraído direto do sistema
de arquivos (`app/**/page.tsx` e `app/api/**/route.ts`). Índice pra achar
rápido "onde mexo pra alterar X". A coluna "Perfil" indica a permissão
exigida (ver `lib/permissions/index.ts`); lembre que quem não é
Administrador só vê 4 itens no menu, mesmo tendo permissão — as demais
rotas existem por URL direta (ver `docs/ARQUITETURA.md`).

## Páginas — área comercial

| Rota | Arquivo | O que é |
|---|---|---|
| `/` | `app/page.tsx` | Raiz — redireciona conforme login |
| `/login` · `/definir-senha` · `/mfa` | idem | Autenticação (login, 1º acesso, 2º fator) |
| `/dashboard` | `app/dashboard/page.tsx` | Visão executiva (hoje parcialmente vazia — ver PROBLEMAS_CONHECIDOS.md) |
| `/lista-ataque` | `app/lista-ataque/page.tsx` | **Tela central** — oportunidades priorizadas por score, prontas pra trabalhar |
| `/meus-contratos` | `app/meus-contratos/page.tsx` | Painel Tático — oportunidades atribuídas ao vendedor logado |
| `/base` | `app/base/page.tsx` | Terreno Conquistado — contratos onde a ENTERPRISECORE já é fornecedora |
| `/decisoes` | `app/decisoes/page.tsx` | Decisões & Qualidade — fluxo de validação das oportunidades |
| `/qualidade` | `app/qualidade/page.tsx` | Métricas de qualidade da base |
| `/licitacoes` | `app/licitacoes/page.tsx` | Licitações/editais (fonte separada de contratos) |
| `/oportunidades/[id]` | `app/oportunidades/[id]/page.tsx` | Ficha detalhada de uma oportunidade |
| `/orgaos/[id]` | `app/orgaos/[id]/page.tsx` | Ficha de um órgão público |
| `/orgaos-equipe` | `app/orgaos-equipe/page.tsx` | Órgãos de foco por membro da equipe (ver bug em PROBLEMAS_CONHECIDOS.md) |
| `/fornecedores` | `app/fornecedores/page.tsx` | Fornecedores/concorrentes mapeados |
| `/distribuicao` | `app/distribuicao/page.tsx` | Distribuição de oportunidades entre vendedores |
| `/backlog` | `app/backlog/page.tsx` | Backlog de tarefas |
| `/comissionamento` | `app/comissionamento/page.tsx` | Comissionamento (não confundir com o app standalone homônimo) |
| `/condicionamento` | `app/condicionamento/page.tsx` | Condicionamento comercial |
| `/relatorios` | `app/relatorios/page.tsx` | Relatórios/exportações |
| `/rodadas` | `app/rodadas/page.tsx` | Histórico de rodadas de coleta (bug conhecido — ver PROBLEMAS_CONHECIDOS.md) |
| `/radar` · `/radar/orgao/[id]` · `/radar/concorrente/[id]` · `/radar/oportunidade/[id]` | `app/radar/` | Radar comercial — visões cruzadas por órgão/concorrente/oportunidade |
| `/feedback` | `app/feedback/page.tsx` | Sugestões & bugs (canal interno) |
| `/ferramentas` · `/ferramentas/[slug]` · `/ferramentas/csv-excel` | `app/ferramentas/` | Utilitários (PDF, CSV→Excel, etc.) |
| `/notificacoes` · `/conta` · `/como-usar` · `/faq` | idem | Notificações, conta, ajuda |

## Páginas — área Admin (só Administrador)

| Rota | O que é |
|---|---|
| `/admin/automacao` | Configuração de automação/auto-setup |
| `/admin/operacao` | Operação (disparar coleta de teste/produção) |
| `/admin/jobs` · `/admin/jobs/[id]` | Fila de jobs e detalhe de um job |
| `/admin/configuracoes` | Configurações comerciais (score, concorrentes, responsáveis) |
| `/admin/usuarios` | Gestão de usuários |
| `/admin/logs` · `/admin/auditoria` | Logs de execução e trilha de auditoria |

## Endpoints de API (server-side)

Todos validam sessão + permissão via `requireApi(<permissão>)` e a
maioria grava trilha de **auditoria**. Perfil = permissão exigida.

| Endpoint | Perfil (permissão) | O que faz |
|---|---|---|
| `POST /api/run-pipeline` | Admin (`run_*`) | Dispara o pipeline de coleta. **Não roda localmente** — em serverless/Cloudflare não há `child_process`; enfileira um job pra VM executar (ver `atlas-pncp-pilot`). |
| `POST /api/assign-opportunity` | `assign_vendor` | Atribui uma oportunidade a um vendedor |
| `POST /api/opportunity-action` | `update_status` etc. | Ações rápidas do comercial no contrato (mudar status, etc.) |
| `POST /api/validate-opportunity` | `validate_opportunity` | Valida/aprova uma oportunidade |
| `POST /api/register-contact` · `/api/orgao-contatos` | `register_contact` | Registra/gerencia contatos de órgão/oportunidade |
| `POST /api/distribute` (via ações) · `/api/meus-orgaos` | `distribute` / `manage_orgaos_foco` | Distribuição e órgãos de foco |
| `POST /api/update-config` | `edit_config_comercial` | Edita configuração comercial (score, concorrentes) |
| `POST /api/manage-user` | `manage_users` | Cria/edita usuários (usa `auth.admin`) |
| `POST /api/fornecedor` · `/api/fornecedor/mark-competitor` | comercial | Gerencia fornecedores / marca como concorrente |
| `GET /api/orgaos/search` · `/api/cnpj` | logado | Busca de órgãos / consulta de CNPJ (multifonte) |
| `GET/POST /api/jobs/*` | Admin | Fila de jobs: `create`, `status`, `logs`, `cancel`, `artifacts/{list,download,reupload}` |
| `GET/POST /api/notifications/*` | logado | Notificações: `create`, `list`, `mark-read`, `mark-all-read`, `preferences` |
| `POST /api/feedback` · `/api/backlog` | logado | Canal de feedback / backlog de tarefas |
| `POST /api/comissionamento` | comercial | Cálculo/registro de comissionamento |
| `GET /api/audit` · `/api/admin/doctor` · `/api/admin/reset` | Admin | Auditoria, diagnóstico e reset administrativo |
| `POST /api/auto-setup` | Admin | Auto-configuração inicial do ambiente |
| `GET /api/download-artifact` | Admin | Download de artefatos gerados por jobs |
| `POST /api/auth/forgot` | público | Recuperação de senha |
| `GET /api/realtime/health` · `/api/version` · `/api/ver-como` | vários | Health do Realtime / carimbo de versão / "ver como" (Admin) |

## Camadas de código por trás das rotas

| Preciso alterar... | Vá em |
|---|---|
| O que uma página busca no banco | `lib/queries/views.ts` (helper `q()` engole erros → páginas vazias silenciosas começam a investigação aqui) |
| Permissão/menu por perfil | `lib/permissions/index.ts` |
| Guard de API (sessão + permissão) | `lib/api/guard.ts` (`requireApi`) |
| Escopo por UF (vendedor só vê a própria UF) | `lib/auth/escopo.ts` |
| Clients Supabase (browser/server/admin) | `lib/supabase/` |
| Auditoria | `lib/audit/` |
| Notificações / Realtime | `lib/notifications/`, `lib/realtime/` |

> Lembrete: **score, prioridade e classificação de TI NÃO são calculados
> aqui** — vêm prontos do pipeline Python (`atlas-pncp-pilot`). Este repo
> só lê e trabalha o resultado. Ver `docs/ARQUITETURA.md`.
