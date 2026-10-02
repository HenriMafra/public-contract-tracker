import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Retorna o carimbo da versão ATUALMENTE publicada (do build do servidor).
// O navegador compara com o carimbo que ELE está rodando; se diferir, recarrega.
export async function GET() {
  return NextResponse.json(
    { stamp: process.env.NEXT_PUBLIC_BUILD_STAMP || "" },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } },
  );
}
