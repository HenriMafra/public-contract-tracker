# Banco de dados — Supabase / Postgres

## O projeto Supabase deste produto

Este repositório (`mapper-contratos`, produto "full") usa o projeto Supabase **FULL**:

| | Projeto FULL (este repo) |
|---|---|
| Ref | `abhlinzbzinanxzyqtmz` |
| Usado por | Worker `mapper-full` (produção real) |
| Volume | ~196 mil oportunidades, ~2M+ contratos |
| Região | `us-east-2` (AWS Ohio) — **atenção**: foi movido pra fora do Brasil porque a Cloudflare tinha roteamento degradado até `sa-east-1` (ver comentário sobre Smart Placement em `wrangler.jsonc`) |

Existe um **segundo** projeto Supabase (`hgczpdwhjqaqiravorrg`), usado pelo produto irmão "Registro de Oportunidade" — repositório e Worker diferentes. **Nunca misture as credenciais dos dois projetos.** Um problema conhecido (ver `docs/PROBLEMAS_CONHECIDOS.md`) é justamente a suspeita de que o secret do Worker esteja apontando para o projeto errado.

Credenciais reais nunca ficam neste repo — configure `.env.local` a partir de `.env.example`.

## Tabelas principais

| Tabela | O que guarda |
|---|---|
| `orgaos` | Órgãos públicos (prefeituras, ministérios, autarquias...) — CNPJ, UF, esfera |
| `fornecedores` | Empresas que ganharam contratos (CNPJ, nome) |
| `contratos` | Contratos brutos coletados (de qualquer fonte — PNCP ou não) |
| `rodadas` | "Fotografias" da base — ver conceito de rodada em `docs/ARQUITETURA.md` (leitura obrigatória) |
| `oportunidades` | Contratos classificados como relevantes pra TI, com score comercial, ligados a uma rodada |
| `oportunidade_historico` | Histórico de score/status de cada oportunidade por rodada |
| `perfis` | Usuários do sistema (nome, e-mail, role, ativo) — ligado a `auth.users` do Supabase Auth |
| `atlas_chunks` | Fila de trabalho da coleta PNCP nacional (pool oportunista, gerenciada pelo repo `atlas-pncp-pilot`) |
| `atlas_orgao_backfill` | Fila de correção histórica por órgão (ver `docs/PROBLEMAS_CONHECIDOS.md`) |

`contratos.contrato_key` é a chave natural de deduplicação — pra contratos do PNCP, é o `numeroControlePNCP` (número de controle oficial do PNCP); pra fontes não-PNCP, é prefixado com o nome da fonte (ex.: `CIASC-SC|...`) pra nunca colidir com chaves do PNCP.

## Esquema exato das 6 tabelas centrais

Extraído direto do `information_schema` do banco de produção (`abhlinzbzinanxzyqtmz`)
em 2026-07-13 — reflete o schema REAL, não uma versão idealizada. Se
divergir do que você vê no banco no futuro, confie no banco, não neste
arquivo, e atualize esta seção.

### `orgaos`
```
id                        bigint       PK, nextval(orgaos_id_seq)
orgao_key                 text         NOT NULL  (chave natural de dedup)
cnpj_orgao                text
nome_orgao                text
nome_padronizado          text
uf                        text
municipio                 text
poder                     text
esfera                    text
unidade_compradora        text
segmento_presumido        text
fonte_primeira_ocorrencia text
sigla                     text
created_at                timestamptz  default CURRENT_TIMESTAMP
updated_at                timestamptz  default CURRENT_TIMESTAMP
```

### `fornecedores`
```
id                     bigint       PK, nextval(fornecedores_id_seq)
forn_key               text         NOT NULL  (chave natural de dedup — ver PROBLEMAS_CONHECIDOS.md, bug do forn_key nulo)
cnpj_fornecedor         text
nome_fornecedor         text
nome_padronizado        text
possivel_concorrente    boolean      default false
concorrente_conhecido   boolean      default false
grau_ameaca             text
categorias_detectadas   text
total_contratos         integer      default 0
valor_total_mapeado     numeric      default 0
created_at              timestamptz  default CURRENT_TIMESTAMP
updated_at              timestamptz  default CURRENT_TIMESTAMP
```

### `contratos`
```
id                          bigint       PK, nextval(contratos_id_seq)
contrato_key                text         NOT NULL  (chave natural de dedup — numeroControlePNCP ou "FONTE|..." p/ não-PNCP)
id_pncp                     text
numero_contrato             text
numero_processo             text
fonte                       text         default 'PNCP'
link_fonte                  text
orgao_id                    bigint       FK -> orgaos.id
fornecedor_id                bigint       FK -> fornecedores.id
objeto_original              text
objeto_normalizado           text
categoria_principal           text        (preenchido por classifica_ti(), ver atlas-pncp-pilot)
subcategoria                 text
fabricante                   text
palavras_chave_encontradas   text
valor_total                  numeric      default 0
valor_mensal_estimado        numeric
data_assinatura               date
inicio_vigencia                date
fim_vigencia                   date
dias_ate_vencimento             integer   (calculado por status_contrato(), ver atlas-pncp-pilot)
status_contrato                  text
situacao_pncp                     text
modalidade                        text
created_at                        timestamptz  default CURRENT_TIMESTAMP
updated_at                        timestamptz  default CURRENT_TIMESTAMP
```

### `rodadas`
```
id                bigint       PK, nextval(rodadas_id_seq)
data_rodada       date         NOT NULL  (campo usado pra determinar "a rodada atual" — ver ARQUITETURA.md)
tag               text         default ''
tipo              text         default 'semanal'
config_hash       text
config_json       jsonb
inicio_execucao   timestamptz
fim_execucao      timestamptz
status_execucao   text         default 'concluida'
total_coletado    integer      default 0
total_ti          integer      default 0
total_oportunidades integer    default 0
total_criticas    integer      default 0
valor_total_mapeado numeric    default 0
caminho_pacote    text
observacoes       text
created_at        timestamptz  default CURRENT_TIMESTAMP
```

### `oportunidades`
```
id                            bigint       PK, nextval(oportunidades_id_seq)
op_key                        text         NOT NULL  (chave: "<contrato_key>|<tipo_oportunidade>")
contrato_id                   bigint       FK -> contratos.id
orgao_id                      bigint       FK -> orgaos.id
fornecedor_id                 bigint       FK -> fornecedores.id
rodada_id                     bigint       FK -> rodadas.id  (CRÍTICO — ver ARQUITETURA.md)
id_oportunidade                text
tipo_oportunidade              text        ("Renovação / nova licitação" | "Renovação antecipada" | "Relacionamento / expansão" | "Relacionamento (validar dados)" | "Substituição de concorrente")
janela_comercial                text       ("Ataque imediato" | "Preparação comercial" | "Monitoramento")
urgencia_comercial              text       (faixa de prioridade: "Máxima" | "Alta" | "Média" | "Baixa")
score_comercial                  integer   (0-100, calculado por score_oportunidade())
prioridade                       text      (mesmo valor de urgencia_comercial, campo duplicado historicamente)
explicacao_score                  text
motivo_prioridade                  text
argumento_comercial_sugerido        text
proxima_acao_recomendada             text
responsavel_sugerido                  text
responsavel_atribuido                  text
carteira_sugerida                       text  (normalmente a UF do órgão)
fabricante                               text
status_comercial                          text default 'Novo'
status_validacao                           text default 'Pendente'
necessita_revisao                           boolean default false
observacoes_revisao                          text
data_primeira_ocorrencia                      date
data_ultima_ocorrencia                         date
status_na_rodada                                text  ("Nova" | outros valores de transição entre rodadas)
created_at                                       timestamptz default CURRENT_TIMESTAMP
updated_at                                        timestamptz default CURRENT_TIMESTAMP
```

### `perfis`
```
user_id         uuid         PK, FK -> auth.users.id
role             text        NOT NULL default 'Vendedor'  (valores reais: Administrador | Diretoria | Account Manager | Sales Engineer | Intern — ver lib/permissions/index.ts; "Vendedor" é só o default de coluna, legado)
nome              text
uf                 text
vendedor_nome        text
ativo                  boolean default true
created_at              timestamptz default now()
updated_at               timestamptz default now()
```

## Exemplo real de gravação de oportunidade (payload interno)

Não existe uma API HTTP pública pra isso (é sempre backend-a-backend,
do pipeline Python direto pro Postgres via `atlas_db.py`), mas pra
quem for mexer no motor de classificação, este é o formato exato que
uma oportunidade assume antes do upsert (extraído de
`atlas-pncp-pilot/src/backfill_orgao_cnpj.py`, função
`gravar_e_classificar`):

```python
{
  "op_key": "PNCP-00444232000139-2026-000123|Renovação antecipada",
  "contrato_id": 918234,
  "orgao_id": 739,
  "fornecedor_id": 5501,
  "rodada_id": 8,
  "tipo_oportunidade": "Renovação antecipada",
  "janela_comercial": "Preparação comercial",
  "urgencia_comercial": "Alta",
  "score_comercial": 78,
  "prioridade": "Alta",
  "explicacao_score": "...",
  "motivo_prioridade": "...",
  "proxima_acao_recomendada": "Contatar órgão sobre renovação",
  "carteira_sugerida": "SP",
  "status_comercial": "Novo",
  "status_validacao": "Pendente",
  "necessita_revisao": false,
  "data_primeira_ocorrencia": "2026-07-13",
  "data_ultima_ocorrencia": "2026-07-13",
  "status_na_rodada": "Nova"
}
```

## Views importantes (o frontend lê daqui, não das tabelas brutas)

- **`vw_lista_ataque_atual_lenta_bak`** / **`mv_lista_ataque_atual`** (materialized view) — a query que TUDO no frontend usa pra Lista de Ataque/Painel Tático/Terreno Conquistado. Filtra `WHERE rodada_id = (SELECT id FROM rodadas ORDER BY data_rodada DESC, id DESC LIMIT 1)`. Depois de qualquer escrita em massa em `oportunidades`, é preciso rodar `REFRESH MATERIALIZED VIEW mv_lista_ataque_atual;` pra que o site reflita os dados novos (materialized views não atualizam sozinhas).
- **`vw_historico_rodadas`** — alimenta a página `/rodadas`. Tem um bug não resolvido, ver `docs/PROBLEMAS_CONHECIDOS.md`.

## RLS (Row Level Security)

Toda tabela sensível tem RLS habilitado. O padrão mais comum é `auth.role() = 'authenticated'` (qualquer usuário logado vê) combinado com policies mais restritas em tabelas específicas (ex.: só `service_role` pode escrever em `atlas_chunks`/`atlas_orgao_backfill` — essas filas são gerenciadas só pelos workers Python do repo de coleta, nunca pelo usuário final).

Existe uma função `atlas_role()` (SECURITY DEFINER) que resolve o role do usuário logado a partir de `perfis`:
```sql
SELECT COALESCE((SELECT role FROM perfis WHERE user_id = auth.uid() AND ativo), 'anon')
```

**Técnica útil pra debugar RLS sem precisar de um token de sessão real** (simula um usuário específico direto no SQL):
```sql
BEGIN;
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"<uuid-do-usuario>","role":"authenticated"}';
SELECT * FROM alguma_tabela_com_rls;
ROLLBACK;
```

**Lembre-se**: RLS é a camada de autorização de DADOS. `lib/permissions/index.ts` é autorização de UI/funcionalidade. Uma página pode não estar bloqueada por RLS nem por permissão, e mesmo assim "sumir" pro usuário comum simplesmente porque não está listada em `NAV_RESTRITO_HREFS` — isso não é bug, é design intencional do menu enxuto.

## Como aplicar mudanças de schema

Não há um sistema de migration automatizado neste repo — os arquivos em `supabase/*.sql` são aplicados manualmente (via Supabase Dashboard SQL Editor, MCP do Supabase, ou `psql` direto com a `DATABASE_URL`). Ao criar uma tabela/coluna nova, também crie/atualize o `.sql` correspondente na pasta `supabase/` pra manter o histórico documentado, mesmo que a aplicação real tenha sido manual.

## Um cuidado operacional importante

**Nunca rode dois `CREATE INDEX CONCURRENTLY` (ou dois processos de escrita pesada na mesma tabela) ao mesmo tempo** — já causou um deadlock auto-infligido em produção. Antes de rodar um script de carga/reindex, confira que não tem outro processo do mesmo tipo já rodando.
