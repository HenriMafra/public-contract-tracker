# Arquitetura — como o MAPPER Contratos é montado por dentro

## Visão de sistema (diagrama textual)

```
┌─────────────────────────┐         ┌──────────────────────────┐
│   PNCP (API pública)     │         │  ~18 sites institucionais │
│  pncp.gov.br/api/...     │         │  (CIASC, SENAC, TCB, ...)  │
└────────────┬─────────────┘         └────────────┬───────────────┘
             │                                     │
             ▼                                     ▼
┌───────────────────────────────────────────────────────────────┐
│    atlas-pncp-pilot (Python, repo separado) — roda 24/7 em VMs   │
│  atlas_pncp_ingest.py + collectors/*.py + workers de fila       │
│  classifica_ti() + score_oportunidade() (mesmo motor pra tudo)  │
└──────────────────────────────┬──────────────────────────────────┘
                                │ escreve
                                ▼
                  ┌──────────────────────────────┐
                  │ Supabase "FULL"                │
                  │ abhlinzbzinanxzyqtmz            │
                  │ (banco de produção real)        │
                  └────────────┬────────────────────┘
                                │ lê/escreve
                                ▼
                  ┌──────────────────────────────┐
                  │ Cloudflare Worker "mapper-full" │
                  └──────────────────────────────┘
                                │
                                ▼
                       Usuário ENTERPRISECORE logado
                (Lista de Ataque, Painel Tático,
                 Terreno Conquistado, Dashboard...)
```

Este repositório (`mapper-contratos`) é **este** produto — o sistema completo de gestão comercial de contratos públicos. Existe um produto **irmão**, "Registro de Oportunidade" (RO), que vive num repositório **separado** (`mapper-registro-oportunidade`), aponta para um projeto Supabase **diferente** (`hgczpdwhjqaqiravorrg`) e é publicado num Worker Cloudflare diferente. Os dois compartilharam um monorepo no passado (`atlas-b2g-online`) mas foram separados para desenvolvimento independente. Não misture código, credenciais ou conceitos entre os dois.

## Stack técnica

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind
- **Deploy**: Cloudflare Workers via `@opennextjs/cloudflare` (adaptador que empacota um app Next.js pra rodar como Worker — NÃO é Cloudflare Pages, é Workers puro, isso importa pro comando de deploy certo)
- **Banco**: Postgres via Supabase (Auth + Postgres + Realtime + Storage)
- **Coleta**: motor Python separado (`atlas-pncp-pilot`), rodando 24/7 em VMs Oracle Cloud (Ampere/ARM, tier free), escrevendo direto no Supabase FULL. Este repo apenas **lê** o que a coleta produz — não reimplemente lógica de coleta/classificação aqui.

## Autenticação e autorização

- **Autenticação**: Supabase Auth (e-mail + senha, sem MFA — foi removido a pedido, ver comentário em `middleware.ts`)
- **`middleware.ts`** roda em toda request e decide: usuário logado? rota pública? Redireciona conforme.
- **RLS (Row Level Security)** no Postgres é a camada de autorização real dos DADOS — mesmo que alguém contorne a UI, o banco não deixa ler o que não pode.
- **`lib/permissions/index.ts`** define os 5 papéis (`Role`) e o que cada um pode fazer (`PERMS`) — isso é autorização de FUNCIONALIDADE (o que aparece no menu, quais botões existem), não de DADOS (isso é RLS). **Não altere `PERMS`, `NAV_RESTRITO_HREFS` ou `Role` sem entender o impacto** — são regras de negócio deliberadas, não bugs.
  - **Importante**: quem não é `"Administrador"` só vê um menu enxuto (Lista de Ataque, Painel Tático, Terreno Conquistado, Minha Conta) — ver `NAV_RESTRITO_HREFS`. Todas as outras páginas continuam acessíveis por URL direta (não há RLS bloqueando), só não aparecem no menu. Isso é proposital, não um bug.

## O conceito central: "rodada" — LEIA ISTO COM ATENÇÃO

Este é o conceito mais importante do sistema e o que mais já causou bug grave em produção.

Uma **rodada** representa uma "fotografia" completa da base de dados comercial num momento — quando o pipeline PNCP roda, ele gera uma nova rodada com todas as oportunidades daquele momento. **As telas principais do site (Lista de Ataque, Painel Tático, Terreno Conquistado) SÓ MOSTRAM A RODADA MAIS RECENTE** — a view SQL que alimenta essas telas faz `ORDER BY data_rodada DESC, id DESC LIMIT 1`.

Isso significa: **qualquer processo que crie uma rodada nova "acidental" esconde TODAS as oportunidades da rodada anterior** — mesmo que os dados antigos continuem no banco, intactos, eles somem da tela porque perderam a "corrida" pela rodada mais recente.

**Isso já aconteceu em produção** (2026-07-12/13): um script de pós-processamento dos coletores não-PNCP criava uma rodada nova a cada execução (rodando a cada 6h), e por ter data mais recente, escondeu ~196 mil oportunidades do PNCP por ~1 dia até ser corrigido. Ver `docs/PROBLEMAS_CONHECIDOS.md` para os detalhes completos.

> **REGRA DE OURO**: nenhum script novo — nem aqui, nem no repositório de coleta `atlas-pncp-pilot` — deve chamar algo equivalente a `INSERT INTO rodadas` sem antes checar se já existe uma rodada "atual" e reaproveitá-la. Isso vale para qualquer dev ou agente de IA que for "limpar" ou "simplificar" essa lógica no futuro: **não crie rodadas por conta própria.**

## Fluxo de dados, passo a passo

1. **Coleta** (fora deste repo, em `atlas-pncp-pilot`): Python busca contratos novos no PNCP e nas fontes institucionais, grava em `contratos` e `fornecedores`
2. **Classificação** (idem): `classifica_ti()` decide relevância de TI, `score_oportunidade()` calcula prioridade comercial
3. **Oportunidades**: contratos classificados como TI viram linhas em `oportunidades`, ligadas à rodada atual
4. **Frontend lê** (este repo): as páginas Next.js consultam views (`vw_*`) que já filtram pela rodada atual e aplicam RLS conforme o usuário logado
5. **Ações comerciais**: usuário muda status, registra contato, valida oportunidade — grava direto no Supabase via `lib/queries/*` (client-side) ou rotas em `app/api/*` (server-side)

## Onde procurar cada coisa no código

| Preciso mexer em... | Onde olhar |
|---|---|
| Uma página específica do site | `app/<nome-da-rota>/page.tsx` |
| Query que busca dados de uma página | `lib/queries/views.ts` — função `q()` é o helper base, ela **engole erros silenciosamente** (retorna array vazio) — se uma página aparece vazia sem erro no console, comece aqui |
| Permissão de quem vê o quê | `lib/permissions/index.ts` |
| Redirecionamento/login | `middleware.ts` |
| Notificações em tempo real | `lib/realtime/subscriptions.ts`, `components/notifications/` |
| Schema SQL / RLS | pasta `supabase/*.sql` (arquivos aplicados manualmente via Supabase Dashboard/CLI — não há migration runner automático neste repo) |
| Config de deploy Cloudflare | `wrangler.jsonc` |

## Produtos e repositórios relacionados (não fazem parte deste repo)

- **`mapper-registro-oportunidade`** — produto irmão de registro de oportunidade sem login, repositório GitHub separado, Supabase próprio (`hgczpdwhjqaqiravorrg`).
- **`atlas-pncp-pilot`** — motor de coleta e classificação em Python, repositório separado, roda 24/7 em VMs Oracle Cloud, escreve diretamente no banco Supabase FULL usado por este repo. Qualquer mudança na lógica de coleta/rodada deve ser feita lá, não aqui.
