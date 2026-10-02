// Base de perguntas da Central de Ajuda + página de FAQ. Respostas específicas (não genéricas).
// Conforme dúvidas reais aparecerem em "Sugestões & Bugs", adicione aqui.
export type Faq = { cat: string; q: string; a: string; href?: string; hrefLabel?: string; tour?: boolean };

// Ordem e rótulo das categorias (o ícone é mapeado no componente).
export const FAQ_CATS = [
  "Começar",
  "Lista de Ataque",
  "Decisões",
  "Meus órgãos & acesso",
  "Registro de Oportunidade (RO)",
  "Backlog",
  "Licitações",
  "Relatórios & exportação",
  "Conta & aparência",
  "Dados & atualização",
  "Ferramentas",
];

export const FAQ: Faq[] = [
  // ── Começar ──
  { cat: "Começar", q: "O que é o MAPPER e para que serve?", a: "É a central de inteligência comercial da ENTERPRISECORE para vender ao governo. Ele lê contratos e editais públicos (do PNCP) e mostra onde há oportunidade: contratos vencendo (para renovar/disputar) e editais abertos (para concorrer). Em vez de garimpar diários oficiais, você abre a Lista de Ataque e já vê tudo priorizado." },
  { cat: "Começar", q: "Por onde começo no dia a dia?", a: "1) Veja o Radar/Dashboard para o panorama. 2) Vá à Lista de Ataque, filtre pelos seus órgãos e abra as oportunidades urgentes. 3) Decida cada uma (Em análise / Validar / Monitorar / Descartar). 4) Nas boas, crie o RO e registre seus contatos.", href: "/lista-ataque", hrefLabel: "Abrir a Lista de Ataque" },
  { cat: "Começar", q: "Quero rever o tutorial guiado", a: "Posso te levar de novo pelo passo a passo do site, uma tela de cada vez.", tour: true },

  // ── Lista de Ataque ──
  { cat: "Lista de Ataque", q: "O que é a Lista de Ataque?", a: "A tabela central com todas as oportunidades de contrato mapeadas. Cada linha traz órgão, solução, fabricante, fornecedor atual, valor, vencimento, urgência e score. Clique em “abrir →” para ver o detalhe e decidir.", href: "/lista-ataque", hrefLabel: "Abrir" },
  { cat: "Lista de Ataque", q: "Como filtro por vários órgãos ou soluções de uma vez?", a: "Os filtros de Órgãos, Soluções, UFs e Urgências são de múltipla escolha: clique e marque vários numa janelinha. Combine com Vencimento e Decisão. O botão âmbar “Limpar filtros” zera tudo." },
  { cat: "Lista de Ataque", q: "O que significam o “score” e a “urgência”?", a: "Score é a nota de prioridade calculada pelo sistema — combina proximidade do vencimento, valor do contrato e aderência ao foco de TI. Urgência (Crítica / Alta / Média / Baixa) resume quão cedo vale agir." },
  { cat: "Lista de Ataque", q: "Como decido vários contratos de uma vez?", a: "Marque as caixinhas das linhas (ou clique em “selecionar todas as filtradas”) e use os botões de decisão que aparecem no topo — aplica a decisão em massa." },
  { cat: "Lista de Ataque", q: "Dá para escolher quais colunas aparecem?", a: "Sim, no botão “Colunas” você liga/desliga as colunas da tabela. Também dá para ordenar por score, valor ou vencimento." },

  // ── Decisões ──
  { cat: "Decisões", q: "O que significa cada decisão?", a: "Em análise = ainda avaliando. Validar = é uma boa oportunidade, entra na sua carteira. Monitorar = acompanhar sem agir agora (ex.: vence longe). Descartar = não interessa; sai da lista (reversível, nada é apagado)." },
  { cat: "Decisões", q: "Onde vejo o que já decidi?", a: "Na aba Decisões: 4 grupos (Validadas, Em análise, Monitoradas, Descartadas), cada um mostrando quem decidiu e quando.", href: "/decisoes", hrefLabel: "Abrir Decisões" },
  { cat: "Decisões", q: "Descartei sem querer — como recupero?", a: "Nada é apagado. Na Lista de Ataque, mude o filtro “Decisão” para “descartadas”, abra o contrato e escolha outra decisão. Ele volta para a lista." },

  // ── Meus órgãos & acesso ──
  { cat: "Meus órgãos & acesso", q: "O que são “Meus órgãos” e o botão ★ na Lista?", a: "São os órgãos pelos quais você é responsável. No 1º acesso o sistema pede para você escolhê-los; depois a Lista de Ataque já abre filtrada só por eles (botão “★ Meus órgãos”). Para ver os demais da sua região, clique em “Todos”." },
  { cat: "Meus órgãos & acesso", q: "Como adiciono ou removo órgãos da minha lista, sozinho?", a: "Em Minha Conta, no cartão “Meus órgãos (foco)”, clique em “editar”: marque ou desmarque os órgãos numa janela de busca e salve. Passa a valer na hora — você mesmo gerencia, sem depender do admin.", href: "/conta", hrefLabel: "Abrir Minha Conta" },
  { cat: "Meus órgãos & acesso", q: "Por que não vejo certos órgãos ou estados?", a: "Seu acesso é definido pelo administrador por região (UF) — é uma regra de segurança. Dentro da sua região, você escolhe o foco de órgãos. Para ampliar a região, fale com o administrador." },

  // ── Backlog ──
  { cat: "Backlog", q: "Para que serve o Backlog?", a: "É um quadro estilo Trello (A fazer / Fazendo / Em revisão / Feito) para as tarefas do time. A Diretoria cria tarefas para qualquer pessoa; você arrasta os cartões e usa checklist, prazo, etiquetas e responsáveis.", href: "/backlog", hrefLabel: "Abrir Backlog" },
  { cat: "Backlog", q: "Como mando um contrato para o meu backlog?", a: "Na ficha de um contrato, use “Enviar para o meu Backlog”: ele vira um cartão já com o link da oportunidade." },

  // ── Licitações ──
  { cat: "Licitações", q: "Qual a diferença entre Licitações e Lista de Ataque?", a: "Licitações = editais abertos agora, para concorrer a um negócio NOVO. Lista de Ataque = todos os contratos mapeados, com foco em renovação (quem já fornece e está vencendo).", href: "/licitacoes", hrefLabel: "Abrir Licitações" },
  { cat: "Licitações", q: "Os editais estão sempre atualizados?", a: "Sim — os editais com proposta aberta são coletados automaticamente todos os dias." },

  // ── Relatórios ──
  { cat: "Relatórios & exportação", q: "Como salvo o relatório em PDF?", a: "Abra Relatórios e clique em “Salvar / Imprimir PDF”: abre a janela de impressão; escolha “Salvar como PDF”. Sai apenas o relatório, limpo, sem o menu do site.", href: "/relatorios", hrefLabel: "Abrir Relatórios" },
  { cat: "Relatórios & exportação", q: "Como baixo os dados em Excel?", a: "Em Relatórios, botão “Baixar Excel”. Também dá para exportar direto da Lista de Ataque, respeitando os filtros que você aplicou." },
  { cat: "Relatórios & exportação", q: "O que o relatório mostra?", a: "As oportunidades ativas da sua base (exclui as descartadas): resumo executivo, prioritárias (vencendo em até 90 dias), maiores por valor, distribuição por estado, principais fabricantes e por urgência." },

  // ── Conta ──
  { cat: "Conta & aparência", q: "Como troco o tema de cores, claro/escuro ou o tamanho do texto?", a: "Em Minha Conta: tema claro/escuro, paleta de cores e tamanho do texto (acessibilidade). Tudo fica salvo para você.", href: "/conta", hrefLabel: "Abrir Minha Conta" },
  { cat: "Conta & aparência", q: "Como troco minha senha?", a: "Em Minha Conta, na seção de senha.", href: "/conta", hrefLabel: "Abrir Minha Conta" },

  // ── Dados ──
  { cat: "Dados & atualização", q: "De onde vêm os dados?", a: "Do PNCP (Portal Nacional de Contratações Públicas), a fonte oficial das compras do governo brasileiro." },
  { cat: "Dados & atualização", q: "Com que frequência os dados atualizam?", a: "Os editais são atualizados diariamente; a base completa de contratos é atualizada às segundas, quartas e sextas." },
  { cat: "Dados & atualização", q: "Quais estados o sistema cobre?", a: "9 estados: DF, GO, CE, SP, MT, PR, PE, AM e RS." },

  // ── Ferramentas ──
  { cat: "Ferramentas", q: "O que tem na aba Ferramentas?", a: "Utilitários de PDF e imagem: juntar, dividir, girar e comprimir arquivos. Tudo roda no seu navegador — nada é enviado a servidor.", href: "/ferramentas", hrefLabel: "Abrir Ferramentas" },
];
