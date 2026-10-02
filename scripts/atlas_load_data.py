# -*- coding: utf-8 -*-
"""
ATLAS B2G — Carrega uma rodada real no banco e valida. Suporta Postgres e SQLite.
  python scripts/atlas_load_data.py --latest --test-idempotency
  python scripts/atlas_load_data.py --rodada "<pasta>" --db-url "sqlite:///_localtest/atlas_local.sqlite"
"""
import os, sys, glob, re, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import atlas_common as C

def latest_round(pipe):
    rd = os.path.join(pipe, "outputs", "rodadas")
    if not os.path.isdir(rd): return None
    dirs = [d for d in glob.glob(os.path.join(rd, "*")) if os.path.isdir(d)
            and glob.glob(os.path.join(d, "atlas_lista_ataque_comercial_*.csv"))]
    if not dirs: return None
    # prioriza PRODUCAO_*, depois data mais recente
    dirs.sort(key=lambda d: (os.path.basename(d).startswith("PRODUCAO_"), os.path.basename(d)))
    return dirs[-1]

def db_counts(db_url):
    pipe = C.pipeline_root(); sys.path.insert(0, os.path.join(pipe, "src"))
    from atlas_db import AtlasDB
    db = AtlasDB(db_url)
    res = {t: db.count(t) for t in ("orgaos", "fornecedores", "contratos", "oportunidades",
                                    "oportunidade_historico", "revisoes", "rodadas")}
    links = db.fetch("SELECT COUNT(*) AS n FROM contratos WHERE link_fonte IS NOT NULL AND link_fonte<>''")
    res["contratos_com_link"] = links[0]["n"] if links else 0
    db.close()
    return res

def load(pipe, rodada, db_url, no_init):
    args = [C.python_exe(), "src/load_weekly_to_db.py", "--rodada", rodada, "--db-url", db_url]
    if no_init: args.append("--no-init")
    return C.run(args, cwd=pipe, timeout=600)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rodada"); ap.add_argument("--latest", action="store_true")
    ap.add_argument("--db-url"); ap.add_argument("--no-init", action="store_true")
    ap.add_argument("--test-idempotency", action="store_true")
    a = ap.parse_args()
    env = C.load_env()
    pipe = C.pipeline_root()
    if not pipe: print(f"{C.ICON['fail']} ATLAS_PIPELINE_ROOT ausente."); sys.exit(1)
    db_url = a.db_url or env.get("DATABASE_URL")
    if not db_url or C.is_placeholder(db_url):
        print(f"{C.ICON['fail']} DATABASE_URL ausente/placeholder. Passe --db-url."); sys.exit(1)
    rodada = a.rodada or (latest_round(pipe) if a.latest or True else None)
    if not rodada or not os.path.isdir(rodada):
        print(f"{C.ICON['fail']} rodada não encontrada: {rodada}"); sys.exit(1)

    R = C.Report("ATLAS B2G — Carga de Dados Reais")
    C.banner("Carga")
    print(f"  rodada: {os.path.basename(rodada)}")
    print(f"  alvo:   {db_url if db_url.startswith('sqlite') else db_url.split('@')[-1]}")
    code, out = load(pipe, rodada, db_url, a.no_init)
    tail = "\n".join(out.strip().splitlines()[-4:])
    R.add("ok" if code == 0 else "fail", "carga executada", tail.replace("\n", " | ") if code == 0 else f"código {code}")
    if code != 0:
        print(out[-1500:]); R.save("validation", "atlas_load_data"); sys.exit(1)

    counts = db_counts(db_url)
    R.add("ok" if counts["oportunidades"] > 0 else "fail", "oportunidades", str(counts["oportunidades"]))
    R.add("ok" if counts["orgaos"] > 0 else "warn", "órgãos", str(counts["orgaos"]))
    R.add("ok" if counts["contratos"] > 0 else "warn", "contratos", str(counts["contratos"]))
    R.add("ok" if counts["oportunidade_historico"] > 0 else "warn", "histórico (snapshots)", str(counts["oportunidade_historico"]))
    R.add("ok", "revisões (fila)", str(counts["revisoes"]))
    pct = (counts["contratos_com_link"] / counts["contratos"] * 100) if counts["contratos"] else 0
    R.add("ok" if pct >= 50 else "warn", "links PNCP preservados", f"{counts['contratos_com_link']}/{counts['contratos']} ({pct:.0f}%)")

    if a.test_idempotency:
        C.banner("Teste de idempotência (carregar 2x)")
        before = counts
        code2, _ = load(pipe, rodada, db_url, no_init=True)
        after = db_counts(db_url)
        same = all(after[k] == before[k] for k in ("orgaos", "contratos", "oportunidades", "oportunidade_historico"))
        R.add("ok" if (code2 == 0 and same) else "fail", "idempotente (sem duplicar)",
              f"antes={before['oportunidades']}/{before['contratos']} depois={after['oportunidades']}/{after['contratos']}")

    path = R.save("validation", "atlas_load_data")
    print(C.summary_line(R)); print(f"relatório: {os.path.relpath(path, C.ONLINE_ROOT)}")
    sys.exit(0 if R.ok() else 1)

if __name__ == "__main__":
    main()
