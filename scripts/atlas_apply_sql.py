# -*- coding: utf-8 -*-
"""
ATLAS B2G — Aplica os SQLs no banco. Postgres/Supabase: schema+seed+rls+storage (psycopg2).
SQLite (modo local): schema+seed traduzidos (rls/storage são Postgres-only → pulados).
  python scripts/atlas_apply_sql.py --db-url "postgresql://..."     (ou lê DATABASE_URL)
  python scripts/atlas_apply_sql.py --db-url "sqlite:///_localtest/atlas_local.sqlite"
"""
import os, sys, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import atlas_common as C

def apply_postgres(db_url, R):
    import psycopg2
    con = psycopg2.connect(db_url); con.autocommit = True; cur = con.cursor()
    for key in ("schema", "seed", "rls", "storage", "jobs", "jobs_rls", "artifacts", "artifacts_rls",
                "notifications", "notifications_rls", "realtime"):
        sql = open(C.SQL_FILES[key], encoding="utf-8").read()
        try:
            cur.execute(sql); R.add("ok", f"aplicado: {key}", os.path.basename(C.SQL_FILES[key]))
        except Exception as e:
            R.add("fail", f"aplicado: {key}", str(e)[:160]); con.close(); return False
    cur.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'"); tabs = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM information_schema.views WHERE table_schema='public'"); views = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM pg_policies WHERE schemaname IN ('public','storage')"); pols = cur.fetchone()[0]
    try:
        cur.execute("SELECT COUNT(*) FROM storage.buckets"); buckets = cur.fetchone()[0]
    except Exception: buckets = 0
    R.add("ok" if tabs >= 15 else "warn", "tabelas (public)", str(tabs))
    R.add("ok" if views >= 8 else "warn", "views (public)", str(views))
    R.add("ok" if pols >= 20 else "warn", "policies (public+storage)", str(pols))
    R.add("ok" if buckets >= 5 else "warn", "buckets de storage", str(buckets))
    con.close()
    return True

def apply_sqlite(db_url, R):
    pipe = C.pipeline_root()
    if not pipe: R.add("fail", "pipeline", "ATLAS_PIPELINE_ROOT ausente (necessário p/ tradução SQLite)"); return False
    sys.path.insert(0, os.path.join(pipe, "src"))
    try:
        from atlas_db import AtlasDB
    except Exception as e:
        R.add("fail", "import atlas_db", str(e)); return False
    db = AtlasDB(db_url)
    db.init_schema(C.SQL_FILES["schema"], C.SQL_FILES["seed"])
    R.add("ok", "aplicado: schema+seed (SQLite traduzido)", "via atlas_db._to_sqlite")
    # fila de jobs + notificações (schemas portáveis)
    for key in ("jobs", "notifications"):
        db.con.executescript(db._to_sqlite(open(C.SQL_FILES[key], encoding="utf-8").read())); db.con.commit()
    R.add("ok", "aplicado: jobs + notifications (SQLite)", "atlas_jobs/logs/artifacts + notificacoes + views")
    R.add("skip", "rls/storage/realtime/*_rls", "Postgres/Supabase-only — pulados no modo local (SQLite)")
    tabs = db.fetch("SELECT name FROM sqlite_master WHERE type='table'")
    views = db.fetch("SELECT name FROM sqlite_master WHERE type='view'")
    R.add("ok" if len(tabs) >= 15 else "warn", "tabelas (sqlite)", str(len(tabs)))
    R.add("ok" if len(views) >= 8 else "warn", "views (sqlite)", str(len(views)))
    db.close()
    return True

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--db-url"); a = ap.parse_args()
    env = C.load_env()
    db_url = a.db_url or env.get("DATABASE_URL")
    if not db_url or C.is_placeholder(db_url):
        print(f"{C.ICON['fail']} DATABASE_URL ausente/placeholder. Passe --db-url."); sys.exit(1)
    dialect = "sqlite" if db_url.startswith("sqlite") else "postgres"
    R = C.Report(f"ATLAS B2G — Aplicação de SQL ({dialect})")
    C.banner(f"Aplicando SQL ({dialect})")
    print(f"  alvo: {db_url if dialect=='sqlite' else db_url.split('@')[-1]}")
    ok = apply_sqlite(db_url, R) if dialect == "sqlite" else apply_postgres(db_url, R)
    path = R.save("diagnostics", f"atlas_apply_sql_{dialect}")
    print(C.summary_line(R)); print(f"relatório: {os.path.relpath(path, C.ONLINE_ROOT)}")
    sys.exit(0 if ok and R.ok() else 1)

if __name__ == "__main__":
    main()
