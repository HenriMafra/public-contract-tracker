# ATLAS B2G — Realtime & Segurança (notas)

## RLS vale no Realtime
No Supabase, o Realtime **respeita a RLS**: um cliente (anon key + sessão do usuário) só recebe
eventos `postgres_changes` das linhas que ele poderia **ler via SELECT**. Como já temos RLS em
`oportunidades`, `atlas_jobs`, `atlas_job_logs`, `atlas_job_artifacts`, `contatos`, `revisoes`,
`audit_logs`, etc., o vazamento por Realtime é prevenido na origem:

- **Vendedor** só recebe eventos de `oportunidades` com `responsavel_atribuido = seu vendedor_nome`.
- **Coordenador/Diretoria** não recebem eventos de `atlas_job_logs`/`audit_logs` (sem policy de leitura).
- **audit_logs**: só Admin (policy `audit_sel`).
- **contatos**: recortados como na RLS de leitura.

> Pré-requisito: rode `rls_policies.sql`, `jobs_rls_policies.sql` e `artifacts_storage_rls.sql`
> ANTES de confiar no Realtime. Sem RLS, a publication entregaria tudo a qualquer autenticado.

## Defesa em profundidade no frontend
Os hooks usam o evento de Realtime apenas como **gatilho** e **refazem o fetch pela API protegida**
(`/api/jobs/status`, `/api/jobs/logs`, `router.refresh()` que re-renderiza com RLS no servidor).
Assim, mesmo que um payload chegue, a renderização final passa pela autorização do servidor.

## Chaves
- O cliente usa **apenas a anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). **Nunca** a service role.
- A service role só aparece no servidor (API routes/worker). `atlas_secrets_check` bloqueia vazamento.

## Performance
- Assinaturas **por filtro** (`id=eq.`, `job_id=eq.`) — não assinamos tabelas inteiras sem necessidade.
- `REPLICA IDENTITY FULL` apenas onde o UPDATE precisa enviar a linha (4 tabelas).
- Throttle no `router.refresh()` (dashboard/lista) evita tempestade de re-render.
- Cleanup de canais no `useEffect` (sem vazamento de listeners ao trocar de página).

## Limitações
- Sem chaves reais, **não há socket** → o sistema cai para **polling** (2s jobs / 10s listas / 30s dashboard).
- `audit_logs`/`atlas_job_logs` em alto volume podem gerar muitos eventos; considere assinar por filtro
  ou desabilitar Realtime nessas tabelas se o custo crescer (basta remover da publication).
