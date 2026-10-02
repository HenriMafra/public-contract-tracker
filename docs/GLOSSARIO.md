# Glossário — termos de domínio

Este produto é de nicho (inteligência comercial B2G — business-to-
government). Um dev que nunca trabalhou com contratações públicas vai
esbarrar em termos que não são óbvios. Este glossário traduz cada um.

## Termos do negócio (contratações públicas)

- **PNCP** — Portal Nacional de Contratações Públicas
  (`pncp.gov.br`). Portal oficial do governo federal onde órgãos públicos
  publicam contratos, licitações e atas. É a **fonte primária de dados**
  do sistema. Tem uma API pública de consulta (`/api/consulta/v1/...`).
- **Órgão** — qualquer entidade pública compradora: prefeitura, ministério,
  autarquia, secretaria, empresa estatal, etc. Tabela `orgaos`.
- **Contrato** — um contrato público já firmado entre um órgão e um
  fornecedor. Tabela `contratos`. É o dado bruto coletado.
- **Fornecedor** — a empresa que ganhou/executa um contrato. Pode ser a
  própria ENTERPRISECORE, um concorrente, ou uma empresa qualquer. Tabela
  `fornecedores`.
- **Esfera** — nível federativo do órgão: federal, estadual ou municipal.
- **Poder** — Executivo, Legislativo ou Judiciário.
- **Modalidade** — o tipo de processo de contratação (pregão, dispensa,
  inexigibilidade, etc.).
- **Vigência** — período em que o contrato está ativo
  (`inicio_vigencia` → `fim_vigencia`). O fim da vigência é o gatilho
  comercial principal: contrato vencendo = oportunidade de renovação.
- **Licitação / Edital** — processo de compra ainda ABERTO (o órgão ainda
  vai comprar), diferente do contrato (já fechado). Tabela `editais` /
  página `/licitacoes`.

## Termos do produto (criados pelo sistema)

- **Oportunidade** — um contrato que o sistema classificou como
  relevante para TI e transformou em algo "trabalhável" pelo comercial,
  com score, prioridade e ações sugeridas. Tabela `oportunidades`. É o
  produto final do pipeline. **Contrato = dado bruto; Oportunidade = dado
  qualificado.**
- **Rodada** — uma "fotografia" completa da base num momento. Cada vez que
  o pipeline roda, gera uma nova rodada. **As telas principais só mostram
  a rodada mais recente** — conceito crítico, já causou bug grave, leia
  `docs/ARQUITETURA.md` e `docs/PROBLEMAS_CONHECIDOS.md` antes de mexer em
  ingestão. Tabela `rodadas`.
- **Score comercial** — nota de 0 a 100 que prioriza a oportunidade,
  calculada pelo pipeline Python a partir de urgência (dias até vencer),
  valor, categoria, concorrência e qualidade do dado. Coluna
  `oportunidades.score_comercial`.
- **Prioridade / Urgência** — faixa derivada do score: Máxima / Alta /
  Média / Baixa. Colunas `prioridade` e `urgencia_comercial`.
- **Classificação de TI** — o pipeline usa ~236 palavras-chave para
  decidir se um contrato é relevante para o negócio da ENTERPRISECORE (tecnologia)
  e em qual categoria. Contratos não-TI são ignorados.
- **Janela comercial** — o momento de agir: "Ataque imediato",
  "Preparação comercial" ou "Monitoramento", conforme quanto falta pro
  contrato vencer.

## Termos das telas (nomes comerciais)

O time comercial usa nomes de "campanha militar" para as telas — não são
termos técnicos, é a linguagem do produto:

| Nome na tela | Rota | O que realmente é |
|---|---|---|
| **Lista de Ataque** | `/lista-ataque` | Fila priorizada de oportunidades a trabalhar |
| **Painel Tático** | `/meus-contratos` | Oportunidades atribuídas ao vendedor logado |
| **Terreno Conquistado** | `/base` | Contratos onde a ENTERPRISECORE já é a fornecedora |
| **Radar** | `/radar` | Visões cruzadas (por órgão, concorrente, oportunidade) |

## Siglas de infraestrutura

- **RO** — "Registro de Oportunidade": o produto IRMÃO (repositório
  `mapper-registro-oportunidade`), não confundir com este. Aqui neste
  repo, "oportunidade" é a entidade do pipeline; lá, "RO" é o formulário
  de registro manual.
- **ENTERPRISECORE** — a empresa cliente/dona do sistema (Enterprise IT Group).
- **RLS** — Row Level Security (segurança em nível de linha do Postgres).
- **Worker** — o Cloudflare Worker onde o Next.js roda em produção.
- **`atlas-pncp-pilot`** — o repositório Python que faz a coleta e
  alimenta o banco 24/7. "Atlas" e "B2G" são nomes internos do sistema
  como um todo (o produto comercial é "MAPPER").
