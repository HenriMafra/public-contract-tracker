# Notas de Deploy / Operação

- **Frontend** (Next.js): pode ir para Vercel ou servidor interno. Em Vercel, o Job Runner Opção A (spawn Python) NÃO funciona (sem Python/sistema de arquivos persistente) → use Opção B (worker) ou rode o frontend num servidor interno/VM com Python.
- **Job Runner Opção A**: `/api/run-pipeline` chama `ATLAS_PYTHON src/atlas_weekly_runner.py ... --write-db` em `ATLAS_PIPELINE_DIR`. Long-running: aumente o timeout do host; em serverless há limite (300s) — para rodadas longas, use Opção B.
- **Opção B (fila)**: criar tabela `jobs(id, tipo, status, payload, criado_por, criado_em, terminado_em, resultado)`; a API insere job `pendente`; um worker Python (serviço/cron) pega, executa, grava status; o frontend faz polling em `/api/run-pipeline?job=...` (GET).
- **Agendamento semanal**: continue usando a tarefa do Windows do pacote local (segundas 08:00) com `--write-db`, OU um cron no servidor. O painel online cobre execuções manuais/sob demanda.
- **Sincronizar artefatos**: rode `npm run sync-outputs` após cada rodada (pode ser encadeado ao runner).
- **Segredos**: use o cofre de segredos do host (Vercel Env, Docker secrets). Nunca commitar `.env.local`.
