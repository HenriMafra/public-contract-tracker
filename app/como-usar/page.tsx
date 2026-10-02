import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { Shell } from "@/components/layout/Shell";
import { Card, CardPad, PageTitle, Badge } from "@/components/ui/primitives";
import {
  Radar, Swords, Briefcase, FileText, RefreshCw, CalendarClock, ClipboardList,
  Filter, Download, ExternalLink, UserPlus, Search, CheckCircle2, XCircle, Server, Info,
  Building2, Gavel, Truck, Percent, Wrench, Handshake, Bell, Palette, Pin, KanbanSquare,
} from "lucide-react";

export const dynamic = "force-dynamic";

function Secao({ icon, titulo, children }: { icon: any; titulo: string; children: React.ReactNode }) {
  const Icon = icon;
  return (
    <Card>
      <CardPad>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-lg bg-brand/15 text-brand grid place-items-center shrink-0"><Icon size={18} /></div>
          <h2 className="text-lg font-extrabold text-fg">{titulo}</h2>
        </div>
        <div className="space-y-2.5 text-sm text-fg leading-relaxed">{children}</div>
      </CardPad>
    </Card>
  );
}
function QC({ q, children }: { q: string; children: React.ReactNode }) {
  return <p><b className="text-fg">{q}:</b> <span className="text-muted">{children}</span></p>;
}

export default async function ComoUsarPage() {
  const user = await requireUser();
  return (
    <Shell user={user}>
      <PageTitle title="Como usar o MAPPER" subtitle="O que cada parte faz, como e quando usar. Tudo num lugar só." />

      <div className="space-y-4">
        <Card><CardPad>
          <p className="text-sm text-fg leading-relaxed">
            O <b>MAPPER</b> reúne os contratos públicos de tecnologia de <b>9 estados</b> (DF, GO, CE, SP, MT, PR, PE, AM, RS · fonte: PNCP) e transforma em uma lista de
            oportunidades comerciais — com órgão, objeto, valor, quando vence, fornecedor atual e um score de prioridade.
            A função do sistema é <b>te informar tudo de forma direta</b>; você decide quem atacar e fecha o negócio.
          </p>
        </CardPad></Card>

        <Secao icon={Radar} titulo="Radar Comercial">
          <QC q="O que é">visão geral do momento — números-chave, top oportunidades e a aba de análise com filtros.</QC>
          <QC q="Como usar">abra o <b>Radar</b> no menu. Aba <b>“Visão geral”</b> = panorama; aba <b>“Oportunidades”</b> = lista filtrável.</QC>
          <QC q="Quando usar">no dia a dia, pra ter o pulso geral e ver os destaques da semana.</QC>
        </Secao>

        <Secao icon={Swords} titulo="Lista de Ataque">
          <QC q="O que é">a tabela completa de oportunidades. Cada linha é clicável e abre o contrato.</QC>
          <QC q="Como usar">busque no topo e use os filtros de <b>múltipla escolha</b> — <b>Órgãos</b>, <b>Soluções</b>, <b>UFs</b>, <b>Urgências</b> (clique e marque vários numa janela) — mais <b>Vencimento</b> e <b>Decisão</b>. Ordene por score/valor/vencimento e escolha as <b>colunas</b> que aparecem. O botão <b>“Limpar filtros”</b> (âmbar) zera tudo.</QC>
          <QC q="Carrega tudo?">sim — <b>todas</b> as oportunidades são carregadas; a paginação (rodapé) só serve pra renderizar rápido. Clique em <b>“abrir →”</b> na linha para ver o contrato.</QC>
          <QC q="Meus órgãos">se você é AM/SE/Intern, no 1º acesso você escolhe os <b>órgãos que acompanha</b>. A Lista já abre filtrada por eles (botão <b>“★ Meus órgãos”</b>); clique em <b>“Todos”</b> pra ver o resto. Muda quando quiser em <b>Minha Conta</b>.</QC>
          <QC q="Decisões">em cada contrato (ou em massa, marcando vários) você decide: <b>Em análise</b>, <b>Validar</b>, <b>Monitorar</b> ou <b>Descartar</b>. Cada decisão tem um destino — veja a aba <b>Decisões</b>.</QC>
          <QC q="Quando usar">pra varrer e priorizar. Ex.: <b>“vence de 0 a 30 dias”</b> = urgentes; <b>“365 dias ou mais”</b> = planejamento.</QC>
        </Secao>

        <Secao icon={ClipboardList} titulo="Decisões (destino do que você decide)">
          <QC q="O que é">para onde vai cada decisão que você toma na Lista de Ataque, em 4 grupos: <b>Validadas (carteira)</b>, <b>Em análise</b>, <b>Monitoradas</b> e <b>Descartadas</b>.</QC>
          <QC q="Como usar">clique num dos 4 cartões para ver a lista daquele grupo — com <b>quem decidiu</b> e <b>quando</b>. É reversível: mudar a decisão na Lista move o item de grupo.</QC>
          <QC q="Quando usar">pra revisar o que já foi validado (sua carteira) ou conferir o que foi descartado e por quem.</QC>
        </Secao>

        <Secao icon={KanbanSquare} titulo="Backlog (tarefas, estilo Trello)">
          <QC q="O que é">um quadro de tarefas com colunas <b>A fazer · Fazendo · Em revisão · Feito</b>. Cartões com checklist, prazo, etiquetas, membros e comentários.</QC>
          <QC q="Como usar"><b>Arraste</b> os cartões entre colunas. Clique num cartão para detalhar. Crie com <b>“+ Adicionar cartão”</b>. Filtre por <b>“Minhas tarefas”</b>. <b>Diretoria/AM</b> podem atribuir a qualquer pessoa.</QC>
          <QC q="Atalho">na ficha de um contrato, use <b>“Enviar para o meu Backlog”</b> — cria um cartão já vinculado ao contrato (com “ver contrato →”).</QC>
        </Secao>

        <Secao icon={Briefcase} titulo="Meus Contratos">
          <QC q="O que é">seu funil pessoal — os contratos que <b>você assumiu</b>, organizados por andamento (prospectando, em análise, negociando, fechado).</QC>
          <QC q="Como usar">assuma um contrato (botão dentro dele) e ele aparece aqui. Atualize o andamento conforme avança.</QC>
          <QC q="Quando usar">pra acompanhar o que você está trabalhando, sem se perder no meio de tudo.</QC>
        </Secao>

        <Secao icon={Building2} titulo="Base (ENTERPRISECORE)">
          <QC q="O que é">os contratos onde a <b>própria ENTERPRISECORE</b> é a fornecedora — vigentes e os que estão a vencer.</QC>
          <QC q="Como usar">veja o que está perto de vencer pra <b>preparar a renovação</b> com antecedência (ordenado por prazo).</QC>
          <QC q="Quando usar">pra não perder renovação de cliente que já é seu, e pra montar seu portfólio/atestados.</QC>
        </Secao>

        <Secao icon={Gavel} titulo="Licitações">
          <QC q="O que é">editais públicos de TI (9 UFs) — oportunidades de <b>negócio NOVO</b> (concorrer), não só renovação.</QC>
          <QC q="Como usar">deixe <b>“só abertas”</b> pra ver o que dá pra concorrer agora (ordenado pelo <b>prazo de proposta</b>). Filtro <b>“registro de preços”</b> = oportunidades de adesão/carona. Clique “abrir” pra ir ao edital no PNCP.</QC>
          <QC q="Quando usar">pra achar licitação aberta antes do prazo fechar.</QC>
        </Secao>

        <Secao icon={Truck} titulo="Fornecedores">
          <QC q="O que é">os fornecedores que aparecem nos contratos (inclui possíveis concorrentes ⚔️).</QC>
          <QC q="Como usar">clique num fornecedor pra ver os contratos dele por órgão (drill-down).</QC>
          <QC q="Quando usar">pra mapear concorrência: quem está ganhando o quê, em quais órgãos.</QC>
        </Secao>

        <Secao icon={Percent} titulo="Comissionamento">
          <QC q="O que é">formulário de registro de comissionamento de projetos (Enterprise IT Group). <Badge tone="amber">Diretoria/Admin</Badge></QC>
          <QC q="Como usar">escolha a equipe (PV/AM), preencha nome, ID Bitrix, margem, tipo de projeto e os comissionados (cada um com % e fases). Consulte a <b>Tabela de Comissões</b> embaixo.</QC>
          <QC q="Quando usar">ao registrar a comissão de um projeto fechado.</QC>
        </Secao>

        <Secao icon={Wrench} titulo="Ferramentas">
          <QC q="O que é">central de utilitários de arquivo, <b>100% no seu navegador</b> (nada é enviado a servidor).</QC>
          <QC q="Como usar">Prontos: Juntar/Dividir/Girar PDF, Números de página, Marca d'água, Imagem→PDF, PDF→JPG e CSV→Excel. Outros aparecem como “em breve”.</QC>
          <QC q="Quando usar">quando precisar mexer num PDF/planilha sem instalar nada nem mandar arquivo pra fora.</QC>
        </Secao>

        <Secao icon={Handshake} titulo="Registro de Oportunidade (RO)">
          <QC q="O que é">o registro de oportunidade junto aos fabricantes (Check Point, Cisco, Fortinet…). O AM cria; o Intern executa.</QC>
          <QC q="Como o AM cria">assistente em 3 passos: (1) dados do DEAL — <b>CNPJ puxa empresa/endereço</b>, data por trimestre; (2) adiciona <b>fabricantes um a um</b> com seus campos; (3) <b>revisão + confirmação</b>. Gera os <b>blocos prontos pra colar no Bitrix</b> (1 tarefa por fabricante).</QC>
          <QC q="Como o Intern executa">abre cada RO, vai ao portal do fabricante, marca <b>“feito”</b> (nº ou print) → vira Pendente → muda status (Aprovado/Rejeitado/Renovado/Descartado). A cada mudança aparece o <b>checklist do Bitrix</b> para atualizar lá.</QC>
        </Secao>

        <Secao icon={Bell} titulo="Notificações">
          <QC q="O que é">avisos pra você: novos contratos no seu escopo e o que está a vencer.</QC>
          <QC q="Como usar">o sininho no topo mostra os não lidos; a aba lista tudo. Após cada coleta, cada AM recebe um resumo do que mudou nos órgãos dele.</QC>
          <QC q="Quando usar">pra não perder novidade sem precisar varrer a lista toda.</QC>
        </Secao>

        <Secao icon={Palette} titulo="Personalizar (temas e barra)">
          <QC q="Temas"><b>Minha Conta → “Tema de cores”</b>: escolha entre <b>25 temas</b> (natureza, jogos, cibersegurança, futebol, clássicos). Fica salvo. O claro/escuro é o botão ☀️/🌙 do topo.</QC>
          <QC q="Barra lateral"><b>Clique com o botão direito</b> num item do menu pra <b>Fixar no topo</b> ou <b>Arquivar</b> (sai da vista). Os arquivados ficam na seção “Arquivados” embaixo — clique pra abrir e <b>restaurar</b>. Tem “restaurar menu padrão” no menu do botão direito.</QC>
          <QC q="Quando usar">pra deixar o site do seu jeito — só o que você usa, na ordem que preferir.</QC>
        </Secao>

        <Secao icon={ClipboardList} titulo="Ao abrir um contrato">
          <p className="text-muted">No topo aparece o essencial em destaque: <b className="text-fg">Objeto</b>, <b className="text-fg">Valor</b> e <b className="text-fg">Quando vence</b>. E a barra de ações:</p>
          <ul className="space-y-1.5 mt-1">
            <li className="flex items-start gap-2"><ExternalLink size={15} className="text-brand mt-0.5 shrink-0" /><span><b>Abrir no PNCP</b> — ver o contrato oficial na fonte.</span></li>
            <li className="flex items-start gap-2"><UserPlus size={15} className="text-brand mt-0.5 shrink-0" /><span><b>Assumir contrato</b> — vira seu e aparece em “Meus Contratos”.</span></li>
            <li className="flex items-start gap-2"><Search size={15} className="text-amber-500 mt-0.5 shrink-0" /><span><b>Em análise</b> / <CheckCircle2 size={13} className="inline text-emerald-500" /> <b>Validar</b> / <XCircle size={13} className="inline text-red-500" /> <b>Descartar</b> — decida em 1 clique.</span></li>
          </ul>
          <p className="text-muted mt-1">A <b>Inteligência comercial</b> (por que priorizamos, argumento, próxima ação) fica recolhida — abra só se quiser. Toda decisão e quem assumiu fica registrada na <b>trilha de atividade</b> do contrato (quem fez o quê e quando).</p>
        </Secao>

        <Secao icon={Download} titulo="Exportar">
          <QC q="O que é">baixar o que está na tela em <b>Excel</b> (ou CSV).</QC>
          <QC q="Como usar">aplique os filtros que quiser e clique no formato — exporta exatamente o resultado filtrado.</QC>
          <QC q="Quando usar">pra levar pro Excel, mandar pro time ou cruzar com outras planilhas.</QC>
        </Secao>

        {/* AUTOMAÇÕES — o coração do "atualizar tudo" */}
        <div className="pt-2"><h2 className="text-base font-bold text-muted uppercase tracking-wider px-1">Atualizar os dados (automações)</h2></div>

        <Secao icon={RefreshCw} titulo="Atualizar tudo (botão)">
          <QC q="O que faz">faz a <b>varredura completa</b> dos contratos de TI das <b>9 UFs</b> no PNCP e atualiza o site.</QC>
          <QC q="Como usar"><b>Admin → Operação</b> → marque “confirmo” → <b>“🔄 Atualizar tudo agora”</b>. Roda em segundo plano (algumas horas) — acompanhe em <b>Admin → Jobs</b>.</QC>
          <QC q="Quando usar">quando quiser forçar uma atualização na hora (ex.: antes de uma reunião). No resto do tempo, não precisa — a automática já cuida. <Badge tone="amber">só Administrador</Badge></QC>
        </Secao>

        <Secao icon={CalendarClock} titulo="Coleta automática (na nuvem)">
          <QC q="O que faz">os dados se atualizam sozinhos, sem você fazer nada: <b>editais novos todos os dias</b> e a <b>base completa às segundas, quartas e sextas</b>.</QC>
          <QC q="Como usar"><b>não precisa fazer nada</b> — os números ficam frescos sozinhos. Veja o estado atual em <b>Admin → Operação</b>.</QC>
          <QC q="Quando usar">sempre, em background. É o que mantém o sistema atualizado sem esforço.</QC>
        </Secao>

        <Secao icon={Filter} titulo="Admin → Jobs e Automação">
          <QC q="Jobs">a fila de execuções. Veja o andamento (em fila / rodando / concluído) e os logs de cada coleta ou automação.</QC>
          <QC q="Automação">ações de manutenção e diagnóstico (verificações de banco, storage, notificações, etc.). Use se algo parecer estranho — elas dizem o que está OK.</QC>
        </Secao>

        <Secao icon={Server} titulo="Como funciona por trás (resumo)">
          <p className="text-muted">Três peças: o <b className="text-fg">site</b> (na nuvem, sempre no ar), o <b className="text-fg">banco</b> (Supabase, onde ficam os dados) e a <b className="text-fg">coleta automática na nuvem</b> (GitHub Actions) que faz as varreduras sozinha — <b>editais todo dia</b> e a <b>base completa das 9 UFs 3×/semana</b>, sem depender de nenhum PC ligado. O botão “Atualizar tudo” dispara uma coleta na hora. <b>O sistema impede duas coletas ao mesmo tempo</b>, então pode usar sem medo.</p>
        </Secao>

        {user.role === "Administrador" && (
          <>
            <div className="pt-2"><h2 className="text-base font-bold text-muted uppercase tracking-wider px-1">Área do administrador (só você vê)</h2></div>
            <Secao icon={Search} titulo="Automação">
              <QC q="O que é">ferramentas técnicas de checagem (testar banco, storage, notificações…) e manutenção.</QC>
              <QC q="Quando usar"><b>quase nunca.</b> O sistema já está montado e roda sozinho. Use só se algo parecer estranho — os testes confirmam que cada parte está OK.</QC>
            </Secao>
            <Secao icon={RefreshCw} titulo="Operação">
              <QC q="O que é">onde fica o botão <b>“Atualizar tudo”</b> (varredura completa das 9 UFs) e o “teste rápido”.</QC>
              <QC q="Quando usar">quando quiser atualizar os dados na hora (fora da atualização automática, que já acontece toda semana).</QC>
            </Secao>
            <Secao icon={Filter} titulo="Jobs">
              <QC q="O que é">a fila de execuções — cada coleta/automação vira um “job”.</QC>
              <QC q="Quando usar">para acompanhar se uma coleta está rodando, concluiu ou falhou (com os logs).</QC>
            </Secao>
            <Secao icon={UserPlus} titulo="Usuários">
              <QC q="O que é">criar pessoas (e-mail/senha/nome), definir papel e <b>quais órgãos cada uma vê</b>; também o “Ver como”.</QC>
              <QC q="Quando usar">ao montar/ajustar a equipe (AM, SE, Intern, Diretoria).</QC>
            </Secao>
            <Secao icon={ClipboardList} titulo="Configurações / Logs / Auditoria">
              <QC q="Configurações">ajustes técnicos do sistema (lista de concorrentes, parâmetros). Mexa só se souber.</QC>
              <QC q="Logs / Auditoria">registro técnico + a trilha de <b>quem fez o quê e quando</b> (segurança e rastreio).</QC>
            </Secao>
          </>
        )}

        <Card><CardPad>
          <div className="flex items-start gap-2 text-sm">
            <Info size={16} className="text-brand mt-0.5 shrink-0" />
            <p className="text-muted">Dúvida rápida? Comece pela <Link href="/lista-ataque" className="text-brand font-semibold hover:underline">Lista de Ataque</Link> (filtre e clique num contrato) e veja seu funil em <Link href="/meus-contratos" className="text-brand font-semibold hover:underline">Meus Contratos</Link>.</p>
          </div>
        </CardPad></Card>
      </div>
    </Shell>
  );
}
