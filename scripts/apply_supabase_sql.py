# -*- coding: utf-8 -*-
"""
ATLAS B2G Online — Aplica os SQLs no Supabase (ou em qualquer Postgres) via psycopg2.
NÃO precisa de psql instalado. Lê a DATABASE_URL de --db-url, do ambiente ou de .env.local.

  python scripts/apply_supabase_sql.py
  python scripts/apply_supabase_sql.py --db-url "postgresql://postgres:SENHA@db.xxx.supabase.co:5432/postgres"
  python scripts/apply_supabase_sql.py --files schema seed rls storage     (padrão = os 4)

Ordem canônica: schema -> seed -> rls -> storage. Idempotente.
"""
import os, sys, re, argparse
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SUPA = os.path.join(ROOT, "supabase")
FILES = {
    "schema":  os.path.join(SUPA, "schema_atlas_b2g.sql"),
    "seed":    os.path.join(SUPA, "seed_atlas_b2g.sql"),
    "rls":     os.path.join(SUPA, "rls_policies.sql"),
    "storage": os.path.join(SUPA, "storage_policies.sql"),
}

def load_env_local():
    p = os.path.join(ROOT, ".env.local")
    if not os.path.exists(p): return
    for line in open(p, encoding="utf-8"):
        m = re.match(r"^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$", line)
        if m and not os.environ.get(m.group(1)):
            os.environ[m.group(1)] = m.group(2).strip().strip('"').strip("'")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db-url")
    ap.add_argument("--files", nargs="*", default=["schema", "seed", "rls", "storage"])
    a = ap.parse_args()
    load_env_local()
    db_url = a.db_url or os.environ.get("DATABASE_URL")
    if not db_url or "SUA_SENHA" in db_url or not db_url.startswith("postgres"):
        print("ERRO: DATABASE_URL ausente/placeholder. Passe --db-url ou preencha .env.local."); sys.exit(1)

    import psycopg2
    safe = re.sub(r":[^:@]+@", ":***@", db_url)
    print(f"[apply] conectando em {safe}")
    con = psycopg2.connect(db_url); con.autocommit = True
    cur = con.cursor()
    for key in a.files:
        path = FILES[key]
        sql = open(path, encoding="utf-8").read()
        try:
            cur.execute(sql)
            print(f"[apply] OK  {key:8} ({os.path.basename(path)})")
        except Exception as e:
            print(f"[apply] ERRO em {key}: {e}"); con.close(); sys.exit(2)

    # auditoria do que existe agora
    cur.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
    tabs = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM information_schema.views WHERE table_schema='public'")
    views = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM pg_policies WHERE schemaname IN ('public','storage')")
    pols = cur.fetchone()[0]
    try:
        cur.execute("SELECT COUNT(*) FROM storage.buckets"); buckets = cur.fetchone()[0]
    except Exception: buckets = "n/d"
    print("-" * 60)
    print(f"[resultado] tabelas(public)={tabs} | views(public)={views} | policies(public+storage)={pols} | buckets={buckets}")
    con.close()
    print("[apply] concluído.")

if __name__ == "__main__":
    main()
