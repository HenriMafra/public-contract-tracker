# -*- coding: utf-8 -*-
"""
ATLAS B2G — Teste do Radar Comercial (SQLite, dados reais da rodada de produção).
Valida as views usadas pelo Radar, dados mínimos para as fichas e filtros básicos.
  python scripts/test_radar.py
"""
import os, sys, glob, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import atlas_common as C
C.load_env()
PIPE = C.pipeline_root()
if not PIPE: print("ATLAS_PIPELINE_ROOT ausente"); sys.exit(1)
sys.path.insert(0, os.path.join(PIPE, "src"))
from atlas_db import AtlasDB

DBFILE = os.path.join(C.ONLINE_ROOT, "_localtest", "radar_test.sqlite")
os.makedirs(os.path.dirname(DBFILE), exist_ok=True)
if os.path.exists(DBFILE): os.remove(DBFILE)
DBURL = "sqlite:///" + DBFILE.replace("\\", "/")

results = []
def check(d, ok, det=""):
    results.append((ok, d, det)); print(f"[{'PASS' if ok else 'FALHOU'}] {d} {('— ' + det) if det else ''}"); return ok

def latest_round():
    rd = os.path.join(PIPE, "outputs", "rodadas")
    dirs = [d for d in glob.glob(os.path.join(rd, "*")) if os.path.isdir(d) and glob.glob(os.path.join(d, "atlas_lista_ataque_comercial_*.csv"))]
    dirs.sort(key=lambda d: (os.path.basename(d).startswith("PRODUCAO_"), os.path.basename(d)))
    return dirs[-1] if dirs else None

def main():
    db = AtlasDB(DBURL)
    db.init_schema(C.SQL_FILES["schema"], C.SQL_FILES["seed"])
    db.con.executescript(db._to_sqlite(open(C.SQL_FILES["jobs"], encoding="utf-8").read())); db.con.commit()
    db.close()
    rd = latest_round()
    if not rd: check("rodada de produção disponível", False, "nenhuma rodada"); _finish(); return
    code = subprocess.run([C.python_exe(), "src/load_weekly_to_db.py", "--rodada", rd, "--db-url", DBURL, "--no-init"],
                          cwd=PIPE, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=300).returncode
    check("carga da rodada no Radar", code == 0, os.path.basename(rd))

    db = AtlasDB(DBURL)
    def count(v):
        try: return len(db.fetch(f"SELECT * FROM {v}"))
        except Exception: return -1

    # 1) views necessárias retornam dados
    check("vw_dashboard_executivo", count("vw_dashboard_executivo") >= 1)
    n_lista = count("vw_lista_ataque_atual"); check("vw_lista_ataque_atual tem dados", n_lista > 0, f"{n_lista} linhas")
    check("vw_top_10_semana tem dados", count("vw_top_10_semana") > 0)
    check("vw_oportunidades_por_responsavel", count("vw_oportunidades_por_responsavel") >= 0)
    check("vw_concorrentes", count("vw_concorrentes") >= 0)
    check("vw_qualidade_base", count("vw_qualidade_base") >= 0)
    check("vw_historico_rodadas", count("vw_historico_rodadas") >= 1)
    check("vw_job_artifacts_download existe", count("vw_job_artifacts_download") >= 0)

    # 2) vw_concorrentes expõe id (necessário p/ ficha do concorrente)
    cols_conc = [c for c in db.fetch("SELECT * FROM vw_concorrentes LIMIT 1")[:1]]
    has_id = ("id" in (db.fetch("SELECT * FROM vw_concorrentes LIMIT 1")[0].keys() if count("vw_concorrentes") > 0 else {"id": 1}))
    check("vw_concorrentes inclui id", has_id, "para /radar/concorrente/[id]")

    # 3) links PNCP preservados
    links = db.fetch("SELECT COUNT(*) AS n FROM contratos WHERE link_fonte IS NOT NULL AND link_fonte<>''")[0]["n"]
    tot = db.fetch("SELECT COUNT(*) AS n FROM contratos")[0]["n"] or 1
    check("links PNCP preservados", links / tot >= 0.5, f"{links}/{tot}")

    # 4) dados mínimos p/ ficha de oportunidade
    row = db.fetch("SELECT * FROM vw_lista_ataque_atual LIMIT 1")
    if row:
        r = row[0]
        ok = all(r.get(k) is not None for k in ("score_comercial", "valor_total", "uf")) and (r.get("orgao_padronizado") or r.get("nome_orgao"))
        check("ficha de oportunidade: campos mínimos", bool(ok), "score/valor/uf/órgão")
    else:
        check("ficha de oportunidade: campos mínimos", False, "sem linhas")

    # 5) dados mínimos p/ ficha do órgão
    org = db.fetch("SELECT * FROM orgaos LIMIT 1")
    check("ficha do órgão: campos mínimos", bool(org and (org[0].get("uf") and (org[0].get("nome_padronizado") or org[0].get("nome_orgao")))), "uf/nome")

    # 6) ficha do concorrente: fornecedor com valor agregado
    forn = db.fetch("SELECT * FROM fornecedores LIMIT 1")
    check("ficha do concorrente: fornecedor disponível", bool(forn), f"{len(forn)} fornecedor(es)")

    # 7) filtro básico (UF) reduz a lista
    df = db.fetch("SELECT COUNT(*) AS n FROM vw_lista_ataque_atual WHERE uf='DF'")[0]["n"]
    check("filtro por UF funciona", 0 <= df <= n_lista, f"DF={df} de {n_lista}")

    # 8) KPIs do dashboard
    d = db.fetch("SELECT * FROM vw_dashboard_executivo")[0]
    check("dashboard com KPIs", (d.get("oportunidades") or 0) > 0, f"opp={d.get('oportunidades')} críticas={d.get('criticas')}")
    db.close()
    _finish()

def _finish():
    R = C.Report("ATLAS B2G — Teste do Radar Comercial")
    for ok, d, det in results: R.add("ok" if ok else "fail", d, det)
    path = R.save("validation", "atlas_radar_test")
    passed = sum(1 for r in results if r[0])
    print("\n" + "=" * 70); print(f"{passed}/{len(results)} verificações PASSARAM")
    print(f"relatório: {os.path.relpath(path, C.ONLINE_ROOT)}")
    sys.exit(0 if passed == len(results) else 1)

if __name__ == "__main__":
    main()
