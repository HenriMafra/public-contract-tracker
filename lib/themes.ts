// Temas de COR — só o acento (--brand/--brand-600) muda; os neutros ficam sóbrios.
// Padrão "indigo" (Foco) no topo. Paletas definidas em globals.css por data-theme.
export type Tema = { id: string; label: string; grupo: string; sw: string; l: string; l6: string; d: string; d6: string };

export const TEMAS: Tema[] = [
  { id: "indigo", label: "Padrão · Foco", grupo: "Cores", sw: "#4f46e5", l: "79 70 229", l6: "67 56 202", d: "129 140 248", d6: "99 102 241" },
  { id: "enterprisecore", label: "ENTERPRISECORE (verde)", grupo: "Cores", sw: "#7cac3f", l: "124 172 63", l6: "104 143 52", d: "143 191 82", d6: "124 172 63" },
  { id: "azul", label: "Azul", grupo: "Cores", sw: "#2563eb", l: "37 99 235", l6: "29 78 216", d: "96 165 250", d6: "59 130 246" },
  { id: "teal", label: "Verde-água", grupo: "Cores", sw: "#0d9488", l: "13 148 136", l6: "15 118 110", d: "45 212 191", d6: "20 184 166" },
  { id: "floresta", label: "Verde", grupo: "Cores", sw: "#16a34a", l: "22 163 74", l6: "21 128 61", d: "74 222 128", d6: "34 197 94" },
  { id: "esmeralda", label: "Esmeralda", grupo: "Cores", sw: "#10b981", l: "16 185 129", l6: "5 150 105", d: "52 211 153", d6: "16 185 129" },
  { id: "ciano", label: "Ciano", grupo: "Cores", sw: "#0891b2", l: "8 145 178", l6: "14 116 144", d: "34 211 238", d6: "6 182 212" },
  { id: "roxo", label: "Roxo", grupo: "Cores", sw: "#9333ea", l: "147 51 234", l6: "126 34 206", d: "192 132 252", d6: "168 85 247" },
  { id: "violeta", label: "Violeta", grupo: "Cores", sw: "#7c3aed", l: "124 58 237", l6: "109 40 217", d: "167 139 250", d6: "139 92 246" },
  { id: "rosa", label: "Rosa", grupo: "Cores", sw: "#db2777", l: "219 39 119", l6: "190 24 93", d: "244 114 182", d6: "236 72 153" },
  { id: "vermelho", label: "Vermelho", grupo: "Cores", sw: "#dc2626", l: "220 38 38", l6: "185 28 28", d: "248 113 113", d6: "239 68 68" },
  { id: "laranja", label: "Laranja", grupo: "Cores", sw: "#ea580c", l: "234 88 12", l6: "194 65 12", d: "251 146 60", d6: "249 115 22" },
  { id: "ambar", label: "Âmbar", grupo: "Cores", sw: "#d97706", l: "217 119 6", l6: "180 83 9", d: "251 191 36", d6: "245 158 11" },
  { id: "grafite", label: "Grafite", grupo: "Cores", sw: "#475569", l: "71 85 105", l6: "51 65 85", d: "148 163 184", d6: "100 116 139" },
];

export const TEMA_PADRAO = "indigo";
export function temaById(id?: string | null) { return TEMAS.find((t) => t.id === id) || TEMAS[0]; }
