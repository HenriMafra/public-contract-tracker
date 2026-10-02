# 📑 Public Contract Tracker — Gestão de Ciclo de Vida & Pipeline de Renovação de Contratos Públicos

Sistema de inteligência comercial e gestão tática de **Contratos Públicos e Atas de Registro de Preços (ARP)** vigentes no Brasil, extraindo dados do PNCP (Portal Nacional de Contratações Públicas) e diários oficiais para **prever janelas de prorrogação e alertar equipes de vendas com antecedência estratégica**.

---

## 📌 Que Problema Resolve?

No setor de compras governamentais (Lei 14.133/2021 e Lei 8.666/1993), contratos de serviços contínuos possuem vigência de 12 a 60 meses. O momento ideal para uma empresa concorrente apresentar prova de conceito (PoC) ou demonstrar novas soluções para o órgão licitante é **entre 6 e 9 meses antes do término do contrato atual**, antes da publicação do novo edital.

Empresas perdem negócios porque só descobrem a nova licitação quando o edital é publicado, tendo apenas 15 dias úteis para responder.

O **Public Contract Tracker** resolve isso transformando o acervo de contratos públicos em um **pipeline comercial proativo de ataque**:
1. Monitora o cronômetro regressivo de vigência de cada contrato.
2. Identifica contratos que já atingiram o limite máximo legal de renovação (obrigando nova licitação).
3. Organiza os certames em um painel Kanban comercial com notas de acompanhamento técnico.

---

## ⚙️ Diferencial Técnico

- **Heurística de Previsão de Renovação:**
  Classifica contratos em status de risco:
  - 🟢 *Vigente Confortável* (> 180 dias de vigência).
  - 🟡 *Janela de Ataque Pré-Edital* (90 a 180 dias restantes).
  - 🔴 *Crítico / Licitação Iminente* (< 90 dias restantes).
- **Filtros Paramétricos por Órgão, UF e Valor:**
  Capacidade de ordenar contratos por volume financeiro total (R$) ou saldo remanescente empenhado.

---

## 🏗️ Stack Tecnológica

- **Framework:** Next.js 14 (App Router), TypeScript, Tailwind CSS.
- **Banco de Dados:** Supabase / PostgreSQL com índices otimizados para busca textual e filtros por data.
- **Deploy:** Vercel ou Cloudflare Pages (OpenNext).

---

## 🚀 Como Executar Localmente

```bash
# 1. Clone o repositório
git clone https://github.com/HenriMafra/public-contract-tracker.git
cd public-contract-tracker

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local

# 4. Inicie o servidor
npm run dev
```

---

## 📄 Licença

Distribuído sob a licença **MIT**. Desenvolvido por **Henri Mafra**.
