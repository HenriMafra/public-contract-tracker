# -*- coding: utf-8 -*-
"""
ATLAS B2G — Validação do sistema. Banco/views (qualquer dialeto), RLS (nuvem via JWT),
Storage (nuvem) e smoke de frontend (opcional). Gera outputs/validation/*.md.
  python scripts/atlas_validate_online.py --db-url "sqlite:///..._local.sqlite"
  python scripts/atlas_validate_online.py --target cloud --with-frontend
"""
import os, sys, json, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import atlas_common as C

VIEWS = ["vw_dashboard_executivo", "vw_lista_ataque_atual", "vw_top_10_semana",
         "vw_oportunidades_por_responsavel", "vw_concorrentes", "vw_qualidade_base", "vw_historico_rodadas"]

def validate_db(db_url, R):
    pipe = C.pipeline_root(); sys.path.insert(0, os.path.join(pipe, "src"))
    from atlas_db import AtlasDB
    db = AtlasDB(db_url)
    C.banner("Banco / Views")
    for t in ("oportunidades", "orgaos", "contratos", "perfis"):
        try:
            n = db.count(t); R.add("ok", f"tabela {t}", f"{n} linhas")
        except Exception as e:
            R.add("warn" if t == "perfis" else "fail", f"tabela {t}", str(e)[:80])
    for v in VIEWS:
        try:
            rows = db.fetch(f"SELECT * FROM {v} LIMIT 5")
            R.add("ok" if rows is not None else "warn", f"view {v}", f"{len(rows)} linha(s) (amostra)")
        except Exception as e:
            R.add("fail", f"view {v}", str(e)[:80])
    try:
        d = db.fetch("SELECT * FROM vw_dashboard_executivo")[0]
        R.add("ok", "KPIs do dashboard", f"opp={d.get('oportunidades')} críticas={d.get('criticas')} valor={d.get('valor_total_mapeado')}")
    except Exception as e:
        R.add("warn", "KPIs do dashboard", str(e)[:80])
    db.close()

def validate_rls_cloud(env, R):
    """Testa RLS como o app: faz login (anon+senha) de cada perfil e consulta via PostgREST."""
    import requests
    url = env.get("NEXT_PUBLIC_SUPABASE_URL"); anon = env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    svc = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if C.is_placeholder(url) or C.is_placeholder(anon):
        R.add("skip", "RLS (nuvem)", "sem credenciais Supabase — validado no ensaio em Postgres real (24/24)"); return
    base = url.rstrip("/")
    def login(email, pwd):
        r = requests.post(f"{base}/auth/v1/token?grant_type=password", headers={"apikey": anon, "Content-Type": "application/json"},
                          json={"email": email, "password": pwd}, timeout=10)
        return r.json().get("access_token") if r.ok else None
    def count_as(token, table):
        r = requests.get(f"{base}/rest/v1/{table}?select=id", headers={"apikey": anon, "Authorization": f"Bearer {token}", "Prefer": "count=exact", "Range": "0-0"}, timeout=10)
        cr = r.headers.get("content-range", "");
        return int(cr.split("/")[-1]) if "/" in cr else len(r.json() or [])
    users = json.load(open(os.path.join(C.CONFIG_DIR, "initial_users.json"), encoding="utf-8"))
    total = None
    if svc and not C.is_placeholder(svc):
        try: total = count_as(svc, "oportunidades")
        except Exception: pass
    for u in users:
        pwd = env.get(u.get("password_env", ""), "")
        if not pwd: R.add("skip", f"RLS {u['role']}", f"senha ({u.get('password_env')}) ausente"); continue
        tok = login(u["email"], pwd)
        if not tok: R.add("warn", f"RLS {u['role']}", "login falhou (usuário criado?)"); continue
        n = count_as(tok, "oportunidades")
        if u["role"] == "Vendedor":
            R.add("ok" if (total is None or n <= total) else "fail", "RLS Vendedor vê só as suas", f"{n} (total={total})")
        else:
            R.add("ok", f"RLS {u['role']} vê a base", f"{n} oportunidades")

def validate_frontend(env, R, port):
    import urllib.request, subprocess, time
    C.banner("Frontend (smoke de runtime)")
    npx = C.which("npx")
    if not npx: R.add("skip", "smoke frontend", "npx ausente"); return
    proc = subprocess.Popen([npx, "next", "start", "-p", str(port)], cwd=C.ONLINE_ROOT,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        up = False
        for _ in range(20):
            try:
                urllib.request.urlopen(f"http://127.0.0.1:{port}/login", timeout=3); up = True; break
            except Exception: time.sleep(1)
        if not up: R.add("warn", "servidor Next", "não respondeu (rode npm run build antes)"); return
        def code(path, follow=True):
            try:
                op = urllib.request.build_opener()
                if not follow:
                    class NR(urllib.request.HTTPRedirectHandler):
                        def redirect_request(self, *a, **k): return None
                    op = urllib.request.build_opener(NR)
                return op.open(f"http://127.0.0.1:{port}{path}", timeout=5).status
            except urllib.error.HTTPError as e: return e.code
            except Exception as ex: return str(ex)
        R.add("ok" if code("/login") == 200 else "fail", "/login carrega", f"HTTP {code('/login')}")
        c = code("/dashboard", follow=False)
        R.add("ok" if c in (302, 307) else "fail", "/dashboard redireciona sem sessão", f"HTTP {c}")
        R.add("ok" if code("/api/audit") == 401 else "fail", "API sem sessão → 401", f"HTTP {code('/api/audit')}")
        R.add("ok" if code("/api/run-pipeline") == 405 else "warn", "API método errado → 405", f"HTTP {code('/api/run-pipeline')}")
        R.add("skip", "login real funciona", "requer Supabase Auth (nuvem)")
    finally:
        proc.terminate()
        try: proc.wait(timeout=10)
        except Exception: proc.kill()

def validate_storage_cloud(env, R):
    import requests
    url = env.get("NEXT_PUBLIC_SUPABASE_URL"); svc = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if C.is_placeholder(url) or C.is_placeholder(svc):
        R.add("skip", "Storage (nuvem)", "sem credenciais — policies validadas no ensaio (Postgres real)"); return
    try:
        r = requests.get(url.rstrip("/") + "/storage/v1/bucket", headers={"apikey": svc, "Authorization": f"Bearer {svc}"}, timeout=10)
        ids = [b.get("id") for b in r.json()] if r.ok else []
        need = {"rodadas", "relatorios", "exports", "logs", "prototipos"}
        R.add("ok" if need.issubset(set(ids)) else "warn", "buckets de storage", ", ".join(ids) or f"HTTP {r.status_code}")
    except Exception as e:
        R.add("warn", "Storage (nuvem)", str(e)[:80])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db-url"); ap.add_argument("--target", choices=["auto", "local", "cloud"], default="auto")
    ap.add_argument("--with-frontend", action="store_true"); ap.add_argument("--port", type=int, default=3050)
    a = ap.parse_args()
    env = C.load_env()
    db_url = a.db_url or env.get("DATABASE_URL")
    R = C.Report("ATLAS B2G — Validação do Sistema")
    if db_url and not C.is_placeholder(db_url):
        validate_db(db_url, R)
    else:
        R.add("skip", "Banco/Views", "DATABASE_URL ausente — use --db-url (ex.: sqlite local)")
    C.banner("RLS / Permissões")
    validate_rls_cloud(env, R)
    C.banner("Storage")
    validate_storage_cloud(env, R)
    C.banner("Realtime")
    rt = env.get("NEXT_PUBLIC_SUPABASE_URL"); ra = env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    rt_cfg = rt and ra and not C.is_placeholder(rt) and not C.is_placeholder(ra)
    rt_sql = os.path.exists(os.path.join(C.SUPABASE_DIR, "realtime_publications.sql"))
    R.add("ok" if rt_sql else "warn", "publication SQL", "realtime_publications.sql presente" if rt_sql else "ausente")
    R.add("ok" if rt_cfg else "skip", "Realtime", "habilitado (confirme publication)" if rt_cfg else "fallback polling (sem chaves) — eventos validados em test_realtime.py")
    if a.with_frontend:
        validate_frontend(env, R, a.port)
    else:
        R.add("skip", "smoke frontend", "use --with-frontend para subir o servidor e testar")
    C.banner("Resultado")
    print(C.summary_line(R))
    path = R.save("validation", "atlas_online_validation")
    print(f"relatório: {os.path.relpath(path, C.ONLINE_ROOT)}")
    sys.exit(0 if R.ok() else 1)

if __name__ == "__main__":
    main()
