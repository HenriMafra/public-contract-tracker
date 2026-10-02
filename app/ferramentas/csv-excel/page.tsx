import { requireUser } from "@/lib/auth/guard";
import { Shell } from "@/components/layout/Shell";
import { Card, CardPad, PageTitle } from "@/components/ui/primitives";
import { CsvParaExcel } from "@/components/ferramentas/CsvParaExcel";

export const dynamic = "force-dynamic";

export default async function CsvExcelPage() {
  const user = await requireUser();
  return (
    <Shell user={user}>
      <PageTitle title="Conversor CSV → Excel" subtitle="Transforme qualquer CSV em uma planilha Excel (.xlsx) formatada — tudo no seu navegador, nada é enviado para servidores." />
      <Card>
        <CardPad>
          <CsvParaExcel />
        </CardPad>
      </Card>
      <Card className="mt-4">
        <CardPad>
          <div className="font-bold text-fg mb-2 text-sm">O que ele faz</div>
          <ul className="text-sm text-muted space-y-1 list-disc pl-5">
            <li>Detecta o separador (vírgula, ponto e vírgula, tabulação ou barra) — ou escolha manualmente.</li>
            <li>Lê acentuação corretamente (UTF-8 e Windows-1252) e respeita aspas e quebras dentro de células.</li>
            <li>Converte <b>números</b> (1.234,56) e <b>datas</b> (dd/mm/aaaa) para o tipo certo, mas mantém como texto campos como CPF, CNPJ, CEP, telefone e códigos (para não perder zeros à esquerda).</li>
            <li>Gera o Excel com <b>cabeçalho fixo, filtro automático, larguras ajustadas, bordas e zebra</b>, além de uma aba <b>Resumo</b>.</li>
            <li>Aceita <b>vários arquivos de uma vez</b> (cada um vira uma aba) e também colar o conteúdo direto.</li>
          </ul>
        </CardPad>
      </Card>
    </Shell>
  );
}
