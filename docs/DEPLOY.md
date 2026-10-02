# Deploy — Cloudflare Workers

## Aviso importante sobre este repositório

Este repositório é uma **cópia de referência/desenvolvimento**, extraída do monorepo `atlas-b2g-online`. O deploy de **produção real** deste produto continua sendo feito a partir do repositório original `atlas-b2g-online`, para o Worker Cloudflare **`mapper-full`**. Este repo NÃO substitui aquele deploy neste momento — ele existe para o time de desenvolvimento trabalhar numa base de código limpa (sem o módulo RO, que é outro produto). Se e quando este repositório se tornar a fonte oficial de deploy, atualize este aviso e o pipeline de CI/CD correspondente.

O `wrangler.jsonc` deste repo usa o nome de Worker `mapper-contratos-standalone`, propositalmente diferente de `mapper-full`, para não haver risco de sobrescrever o Worker de produção real por engano a partir daqui.

## Resumo

```bash
npm run doctor       # preflight do .env.local (não escreve nada)
npm run build:cf     # build para Cloudflare — USE ESTE, não o comando cru (ver abaixo)
npm run deploy:cf    # deploy não-interativo (lê CLOUDFLARE_API_TOKEN do .env.local)
```

## ⚠️ Não rode `opennextjs-cloudflare build` direto

O comando cru quebra de duas formas — os scripts `build:cf`/`deploy:cf`
resolvem ambas:

1. **Loop infinito de reload**: o `next.config.mjs` gera um carimbo de
   versão com `Date.now()`. Se rodar mais de uma vez (cliente vs.
   servidor), os carimbos divergem, o `VersionWatcher` acha que há versão
   nova e recarrega a página em loop. O `scripts/build-cf.mjs` fixa o
   carimbo uma vez antes do build.
2. **Recusa de versão do Next**: o projeto está no Next 14, mas o
   `@opennextjs/cloudflare` (>= 1.16) exige Next 15+ e recusa sem a flag
   `--dangerouslyUseUnsupportedNextVersion`. Os scripts já passam a flag.
   O código roda estável no Next 14 (é o que está em produção) — a flag
   só silencia a checagem do adaptador. Ver "Dívida técnica" no fim.

## Passo a passo (build + deploy)

1. **Configure o `.env.local`** com os valores REAIS do projeto Supabase **FULL** (`abhlinzbzinanxzyqtmz`) — ver `.env.example`. Os valores `NEXT_PUBLIC_*` ficam **embutidos no build** (Next.js faz isso em build time, não é uma env var lida em runtime pelo Worker) — se você buildar com os valores errados, o site aponta pro banco errado até o próximo build+deploy correto. Rode `npm run doctor` pra validar tudo antes.

2. **Limpe builds antigos** (evita pegar artefato parcial de um build anterior que falhou no meio):
   ```
   rm -rf .next .open-next
   ```

3. **Build**:
   ```
   npm run build:cf
   ```
   Não trunque isso com um timeout curto — o build genuíno demora alguns minutos; matar no meio deixa `.open-next/worker.js` num estado parcial/errado sem erro óbvio.

4. **Deploy**:
   ```
   npm run deploy:cf
   ```
   (equivale a `opennextjs-cloudflare deploy --dangerouslyUseUnsupportedNextVersion`, carregando o token do `.env.local`.)

5. **Confirme em produção**: abra a URL do Worker (`https://<nome-do-worker>.<sua-conta>.workers.dev`) numa aba anônima e confira no DevTools (Network > algum JS de `_next/static/chunks/app/layout-*.js`) se o hash do arquivo mudou — às vezes o edge da Cloudflare demora 10-20s pra propagar, então se parecer que não atualizou, espere um pouco e recarregue de novo antes de assumir que o deploy falhou.

## Dívida técnica conhecida: Next 14 → Next 15

A flag `--dangerouslyUseUnsupportedNextVersion` é uma ponte, não solução
permanente. Recomendação: quando houver janela, migrar de Next 14 para
Next 15 (suportado oficialmente pelo OpenNext) e remover a flag dos
scripts. Sem urgência — roda estável no Next 14 — mas é a direção certa.
O produto irmão `mapper-registro-oportunidade` está na mesma situação
(mesma base de origem); idealmente migram juntos.

## Secrets do Worker (não confundir com `NEXT_PUBLIC_*`)

Variáveis que NÃO podem ir pro bundle do frontend (senha de banco, service role key) são configuradas como **secret do Worker**, não como env var de build:

```
npx wrangler secret put DATABASE_URL --name <nome-do-worker>
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name <nome-do-worker>
```

Pra ver quais secrets existem (sem ver o valor):
```
npx wrangler secret list --name <nome-do-worker>
```

**Atenção**: um dos problemas conhecidos deste produto (ver `docs/PROBLEMAS_CONHECIDOS.md`) é a suspeita de que o secret `SUPABASE_SERVICE_ROLE_KEY` do Worker de produção real (`mapper-full`, no repo original) possa estar apontando pra chave do projeto RO em vez do FULL. Ao configurar secrets em qualquer Worker novo, confira manualmente no dashboard Supabase (projeto FULL > Settings > API) que a chave é a certa antes de colar.

## Domínio custom / roteamento

Não configurado nesta fase — os Workers rodam nos subdomínios padrão `*.workers.dev`. Se for adicionar domínio próprio, isso é feito no dashboard Cloudflare (DNS + Worker Routes), fora do escopo deste repo.
