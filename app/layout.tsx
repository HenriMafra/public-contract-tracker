import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TopProgress } from "@/components/ui/TopProgress";
import { VersionWatcher } from "@/components/ui/VersionWatcher";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "MAPPER",
  description: "MAPPER — inteligência comercial B2G (dados públicos do PNCP). developed by Henri Mafra.",
};

// aplica o tema (claro/escuro) antes do paint, evitando flash
const themeScript = `(function(){try{var t=localStorage.getItem('atlas-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme:dark)').matches;if(d)document.documentElement.classList.add('dark');var c=localStorage.getItem('atlas-tema-cor');if(c)document.documentElement.setAttribute('data-theme',c);var f=localStorage.getItem('atlas-font');if(f)document.documentElement.style.fontSize=f+'%';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body><TopProgress /><VersionWatcher />{children}</body>
    </html>
  );
}
