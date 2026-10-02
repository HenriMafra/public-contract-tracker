# Problemas conhecidos — o que já foi corrigido e o que ainda está aberto

> Leia isto antes de investigar um bug "novo" — boa chance de já ter sido diagnosticado (ou até já corrigido) e você só precisa confirmar o estado atual, não reinvestigar do zero.

## ✅ CORRIGIDO — "rodada shadowing" (o bug mais grave já encontrado)

**Sintoma**: Lista de Ataque, Painel Tático e Terreno Conquistado ficaram praticamente vazios em produção, mesmo com o banco tendo dados.

**Causa raiz**: as três telas leem só da rodada mais recente por data (ver conceito de "rodada" em `docs/ARQUITETURA.md` — leitura obrigatória). O script `pos_processar_nao_pncp.py` (no repositório separado `atlas-pncp-pilot`, roda depois de cada coleta não-PNCP, a cada 6h) estava criando uma rodada NOVA a cada execução, com a data de hoje — como "hoje" sempre vence por data, isso escondeu as ~196 mil oportunidades da rodada real do PNCP, deixando visíveis só as poucas centenas de oportunidades das fontes não-PNCP.

**Correção aplicada**:
- Dados: as rodadas acidentais foram mescladas de volta na rodada correta via SQL direto.
- Código: `pos_processar_nao_pncp.py` agora **sempre reaproveita** a rodada mais recente existente, só cria uma rodada nova se a tabela `rodadas` estiver completamente vazia. Commit `694a89a` no repo `atlas-pncp-pilot`.

**Se isso acontecer de novo**: qualquer script novo que grave em `oportunidades` — neste repo ou no `atlas-pncp-pilot` — precisa seguir o mesmo padrão: **nunca criar rodada "por conta própria"** sem checar e reaproveitar a atual primeiro.

## ✅ CORRIGIDO — sub-coleta nacional do PNCP (IMBEL e outros órgãos de alto volume)

**Sintoma**: órgãos de alto volume de contratação tinham só uma fração minúscula dos contratos reais no banco. Exemplo confirmado: IMBEL tinha 30 contratos no banco vs. 2.999 reais no PNCP (~1% de cobertura).

**Causa raiz**: a coleta nacional varre o PNCP por janela de tempo (sem filtro de órgão), com um teto de páginas por execução. O volume nacional mensal de contratos estoura esse teto muito antes de cobrir todos os órgãos — órgãos de alto volume individual acabam sub-representados.

**Correção aplicada** (2026-07-13, no repo `atlas-pncp-pilot`): criado um mecanismo de backfill por órgão via `cnpjOrgao` (parâmetro da API do PNCP que filtra por um único órgão, sem teto de páginas). Tabela nova neste banco: `atlas_orgao_backfill` (fila com status, prioridade, contratos antes/depois).

**Validado**: IMBEL foi de 30 para 2.098 contratos únicos, gerando 70 novas oportunidades de TI.

**Status em 2026-07-13**: o worker de fila foi escrito e testado (IMBEL), mas ainda precisa processar os outros ~5.733 órgãos — isso é esperado levar dias, dado o rate-limit agressivo do PNCP. Confira o progresso com:
```sql
SELECT status, count(*) FROM atlas_orgao_backfill GROUP BY status;
```

## 🔴 ABERTO — página `/rodadas` aparece vazia

**Sintoma**: a página "Atualizações da base" (`/rodadas`) mostra "Nenhuma rodada registrada", mesmo com a tabela `rodadas` tendo linhas e a query direta (com RLS simulado pra um usuário real) retornando resultado normalmente.

**O que já foi descartado como causa**:
- Permissão: `view_rodadas` está liberada pra todo perfil não-admin
- RLS: policy `auth.role() = 'authenticated'` confirmada suficiente via simulação SQL direta
- Cache do PostgREST: `NOTIFY pgrst, 'reload schema'` não resolveu
- Sessão: logout/login não resolveu
- Bundle: confirmado que o JS deployado referencia a view certa

**Impacto real**: baixo — é uma página informativa, não crítica pro fluxo comercial. Além disso, como não está na `NAV_RESTRITO_HREFS` (ver `lib/permissions/index.ts`), nenhum usuário não-Administrador sequer vê essa página no menu.

**Próximo passo sugerido pra quem for investigar**: comparar a query exata que o Next.js roda (via `lib/queries/views.ts`, função `getHistoricoRodadas()`) linha a linha com a simulação SQL manual — suspeita não confirmada é alguma diferença sutil de cliente Supabase (anon key vs sessão real) que não foi possível reproduzir via SQL puro.

## 🔴 SUSPEITO (não confirmado) — página `/orgaos-equipe` aparece vazia

**Sintoma**: página mostra "Ninguém encontrado" mesmo com a tabela `perfis` tendo dezenas de linhas reais.

**Hipótese não confirmada**: a página usa `supabaseAdmin()` (client com `SUPABASE_SERVICE_ROLE_KEY`, que ignora RLS) envolvido num `try/catch` que engole o erro silenciosamente. A suspeita é que o secret `SUPABASE_SERVICE_ROLE_KEY` configurado no Worker de produção esteja **errado** (possivelmente ainda apontando pra chave do projeto RO, não do FULL) — mas isso não pôde ser confirmado programaticamente, porque não existe ferramenta que leia o VALOR de um secret já configurado no Cloudflare, só a lista de nomes (`wrangler secret list`).

**Ação necessária**: alguém com acesso ao dashboard Supabase do projeto FULL (`abhlinzbzinanxzyqtmz` > Settings > API) precisa comparar a `service_role key` de lá com o que está configurado como secret no Worker de produção, e corrigir se divergente:
```
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name <nome-do-worker>
```

## 🟡 COSMÉTICO — fornecedores duplicados

Alguns fornecedores aparecem cadastrados várias vezes com pequenas variações de nome (maiúscula/minúscula, acentuação, espaço). Não afeta cálculo de score nem funcionalidade, é qualidade de dado. Deprioritizado — só vale a pena resolver se houver tempo sobrando.

## 🟡 LIMITAÇÃO AMBIENTAL — TERRACAP e SENAC-PR retornam 403

Os coletores desses dois sites (no repo `atlas-pncp-pilot`) recebem HTTP 403 quando rodam a partir do IP da VM Oracle Cloud, mesmo enviando headers de navegador completos — confirmado que é bloqueio por reputação de IP de datacenter, não por header. Baixo impacto. Resolver exigiria proxy residencial — não vale o esforço no momento.

## Views ausentes (Dashboard Executivo)

`vw_dashboard_executivo`, `vw_top_10_semana`, `vw_oportunidades_por_responsavel` não existem no projeto FULL (`abhlinzbzinanxzyqtmz`) — a página `/dashboard` fica silenciosamente vazia pra quem acessa. Não investigado a fundo porque, como não-Administrador não vê essa página no menu, o impacto prático é baixo. Se for priorizar, comece checando se essas views existem no projeto RO e simplesmente precisam ser recriadas no FULL.

## Lembrete geral de debugging

`lib/queries/views.ts` tem uma função helper `q()` que **engole erros silenciosamente** (retorna array vazio em caso de erro). Se uma página aparece vazia sem nenhum erro visível no console do navegador, esse é o primeiro lugar a checar — coloque um `console.error` temporário ali antes de investigar mais fundo.
