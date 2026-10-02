# -*- coding: utf-8 -*-
"""
ATLAS B2G — Doctor: diagnóstico completo do ambiente (com --fix).
  python scripts/atlas_doctor.py            # só diagnostica
  python scripts/atlas_doctor.py --fix      # tenta corrigir o que puder (pip/npm)
Gera outputs/diagnostics/atlas_doctor_report_TIMESTAMP.md. Sai !=0 só em falha CRÍTICA.
"""
import os, sys, json, platform, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import atlas_common as C

PY_REQUIRED = {"psycopg2": "psycopg2-binary", "requests": "requests", "openpyxl": "openpyxl"}
PY_OPTIONAL = {"pandas": "pandas", "streamlit": "streamlit", "bcrypt": "bcrypt",
               "passlib": "passlib", "dotenv": "python-dotenv"}

def can_import(mod):
    try:
        __import__(mod); return True
    except Exception:
        return False

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fix", action="store_true", help="instala deps Python ausentes (leve, local)")
    ap.add_argument("--install-clis", action="store_true", help="tenta instalar CLIs globais (supabase/vercel)")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    env = C.load_env()
    R = C.Report("ATLAS B2G — Diagnóstico de Ambiente (Doctor)")
    critical = 0

    # ---------------- Sistema ----------------
    C.banner("Sistema")
    R.add("ok", "Sistema operacional", f"{platform.system()} {platform.release()} ({platform.machine()})")
    writable = os.access(C.ONLINE_ROOT, os.W_OK)
    R.add("ok" if writable else "fail", "Permissão de escrita no projeto", C.ONLINE_ROOT)
    if not writable: critical += 1
    tz = (env.get("TZ") or "America/Sao_Paulo")
    R.add("info", "Timezone (config)", tz)

    # ---------------- Python ----------------
    C.banner("Python")
    pyv = sys.version.split()[0]
    R.add("ok" if sys.version_info >= (3, 9) else "warn", "Python", f"{pyv} ({C.python_exe()})")
    R.add("ok" if can_import("pip") else "warn", "pip", "disponível" if can_import("pip") else "ausente")
    R.add("ok" if can_import("venv") else "warn", "venv", "disponível" if can_import("venv") else "ausente")
    for mod, pkg in PY_REQUIRED.items():
        if can_import(mod):
            R.add("ok", f"py:{mod}", "instalado")
        elif a.fix:
            print(f"  → instalando {pkg}…"); code, _ = C.pip_install([pkg])
            R.add("ok" if (code == 0 and can_import(mod)) else "fail", f"py:{mod}", "instalado via --fix" if code == 0 else "falha ao instalar")
            if code != 0 or not can_import(mod): critical += 1
        else:
            R.add("warn", f"py:{mod}", f"ausente (rode --fix ou: pip install {pkg})")
    for mod, pkg in PY_OPTIONAL.items():
        R.add("ok" if can_import(mod) else "skip", f"py:{mod} (opcional)", "instalado" if can_import(mod) else f"ausente ({pkg})")

    # ---------------- Node ----------------
    C.banner("Node / npm")
    node = C.which("node"); npm = C.which("npm")
    if node:
        code, out = C.run(["node", "-v"], echo=False); R.add("ok", "Node", out.strip())
    else:
        R.add("fail", "Node", "não encontrado — instale Node 18+ (https://nodejs.org)"); critical += 1
    if npm:
        code, out = C.run(["npm", "-v"], echo=False); R.add("ok", "npm", out.strip())
    else:
        R.add("fail", "npm", "não encontrado"); critical += 1
    R.add("ok" if os.path.isdir(os.path.join(C.ONLINE_ROOT, "node_modules")) else "warn",
          "node_modules", "presente" if os.path.isdir(os.path.join(C.ONLINE_ROOT, "node_modules")) else "ausente (npm install)")

    # ---------------- CLIs ----------------
    C.banner("CLIs")
    for name, hint in [("git", "git-scm.com"), ("docker", "Docker Desktop"), ("psql", "PostgreSQL client (opcional)")]:
        found = C.which(name)
        R.add("ok" if found else ("skip" if name in ("docker", "psql") else "warn"), f"CLI: {name}",
              found or f"ausente ({hint})")
    for name, npmpkg in [("supabase", "supabase"), ("vercel", "vercel")]:
        found = C.which(name)
        if found:
            R.add("ok", f"CLI: {name}", found)
        elif a.install_clis and npm:
            print(f"  → tentando instalar {name} via npm -g…")
            code, out = C.run(["npm", "i", "-g", npmpkg], timeout=240)
            found2 = C.which(name)
            R.add("ok" if found2 else "warn", f"CLI: {name}",
                  "instalado via --fix" if found2 else "não instalado (sem permissão global? use npx)")
        else:
            R.add("skip", f"CLI: {name}", f"ausente — instale com: npm i -g {npmpkg} (ou use npx)")

    # ---------------- Projeto ----------------
    C.banner("Projeto")
    pipe = C.pipeline_root()
    if pipe and os.path.isdir(pipe):
        need = ["src/load_weekly_to_db.py", "src/atlas_weekly_runner.py", "config/atlas_config_producao.json"]
        miss = [f for f in need if not os.path.exists(os.path.join(pipe, f))]
        R.add("ok" if not miss else "fail", "Pipeline ATLAS", pipe if not miss else f"faltam: {miss}")
        if miss: critical += 1
    else:
        R.add("fail", "Pipeline ATLAS", f"ATLAS_PIPELINE_ROOT inválido: {pipe}"); critical += 1
    for key, p in C.SQL_FILES.items():
        R.add("ok" if os.path.exists(p) else "fail", f"SQL: {key}", os.path.basename(p) if os.path.exists(p) else "AUSENTE")
        if not os.path.exists(p): critical += 1
    for f in ["config/atlas_auto_config.json", "config/initial_users.json", ".env.example"]:
        R.add("ok" if os.path.exists(os.path.join(C.ONLINE_ROOT, f)) else "warn", f, "presente" if os.path.exists(os.path.join(C.ONLINE_ROOT, f)) else "ausente")
    R.add("ok" if os.path.exists(os.path.join(C.ONLINE_ROOT, ".env.local")) else "warn", ".env.local",
          "presente" if os.path.exists(os.path.join(C.ONLINE_ROOT, ".env.local")) else "ausente (gerar no go-live)")

    # ---------------- Supabase ----------------
    C.banner("Supabase")
    url = env.get("NEXT_PUBLIC_SUPABASE_URL"); anon = env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    svc = env.get("SUPABASE_SERVICE_ROLE_KEY"); dburl = env.get("DATABASE_URL")
    tok = env.get("SUPABASE_ACCESS_TOKEN")
    R.add("ok" if not C.is_placeholder(url) else "warn", "URL do projeto", url if not C.is_placeholder(url) else "placeholder")
    R.add("ok" if (anon and looks(anon)) else "warn", "anon key", "presente (JWT)" if (anon and looks(anon)) else "ausente/placeholder")
    R.add("ok" if (svc and looks(svc)) else "warn", "service_role key", C.mask(svc) if (svc and looks(svc)) else "ausente/placeholder")
    R.add("ok" if tok and not C.is_placeholder(tok) else "skip", "SUPABASE_ACCESS_TOKEN", C.mask(tok) if tok and not C.is_placeholder(tok) else "ausente (criação automática de projeto desabilitada)")
    R.add("ok" if dburl and not C.is_placeholder(dburl) else "warn", "DATABASE_URL", "presente" if dburl and not C.is_placeholder(dburl) else "ausente/placeholder")
    # conectividade
    if url and not C.is_placeholder(url) and anon and not C.is_placeholder(anon):
        try:
            import requests
            h = {"apikey": anon}
            r = requests.get(url.rstrip("/") + "/auth/v1/health", headers=h, timeout=8)
            R.add("ok" if r.ok else "warn", "Supabase Auth /health", f"HTTP {r.status_code}")
            r2 = requests.get(url.rstrip("/") + "/rest/v1/", headers={"apikey": anon, "Authorization": f"Bearer {anon}"}, timeout=8)
            R.add("ok" if (r2.ok or r2.status_code == 404) else "warn", "Supabase REST", f"HTTP {r2.status_code}")
        except Exception as e:
            R.add("warn", "Conectividade Supabase", f"falhou: {e}")
    else:
        R.add("skip", "Conectividade Supabase", "pulada (sem chaves reais)")

    # ---------------- Storage ----------------
    C.banner("Storage de artefatos")
    if pipe and os.path.isdir(pipe):
        sys.path.insert(0, os.path.join(pipe, "src"))
        try:
            import atlas_storage as _st
            if _st.is_storage_configured():
                res = _st.ensure_buckets()
                bk = res.get("buckets", {}) if isinstance(res, dict) else {}
                R.add("ok", "Storage configurado", "buckets: " + (", ".join(f"{k}={v}" for k, v in bk.items()) or "ok"))
            else:
                R.add("skip", "Storage", "sem URL/service_role — artefatos ficam local_only (fallback)")
        except Exception as e:
            R.add("warn", "Storage (módulo atlas_storage)", str(e)[:80])
    else:
        R.add("skip", "Storage", "pipeline ausente — não foi possível checar")

    # ---------------- Realtime ----------------
    C.banner("Realtime")
    rt_cfg = url and anon and not C.is_placeholder(url) and not C.is_placeholder(anon)
    rt_sql = os.path.join(C.SUPABASE_DIR, "realtime_publications.sql")
    R.add("ok" if os.path.exists(rt_sql) else "warn", "realtime_publications.sql", "presente" if os.path.exists(rt_sql) else "ausente")
    R.add("ok" if rt_cfg else "skip", "Realtime", "habilitado (anon/URL ok) — confirme a publication no Supabase" if rt_cfg else "sem chaves → frontend usa POLLING (fallback)")

    # ---------------- Notificações ----------------
    C.banner("Notificações")
    for key in ("notifications_schema.sql", "notifications_rls_policies.sql"):
        ok = os.path.exists(os.path.join(C.SUPABASE_DIR, key))
        R.add("ok" if ok else "warn", key, "presente" if ok else "ausente")
    notif_py = pipe and os.path.exists(os.path.join(pipe, "src", "atlas_notifications.py"))
    R.add("ok" if notif_py else "warn", "src/atlas_notifications.py", "presente" if notif_py else "ausente")

    # ---------------- Radar Comercial ----------------
    C.banner("Radar Comercial")
    radar_files = ["app/radar/page.tsx", "app/radar/oportunidade/[id]/page.tsx",
                   "app/radar/orgao/[id]/page.tsx", "app/radar/concorrente/[id]/page.tsx",
                   "lib/radar/queries.ts", "lib/radar/filters.ts", "components/radar/RadarAttackList.tsx"]
    miss_r = [f for f in radar_files if not os.path.exists(os.path.join(C.ONLINE_ROOT, f))]
    R.add("ok" if not miss_r else "warn", "Radar (páginas/componentes)", "completos" if not miss_r else f"faltam: {miss_r}")

    # ---------------- Segurança ----------------
    C.banner("Segurança")
    gi = os.path.join(C.ONLINE_ROOT, ".gitignore")
    gi_ok = os.path.exists(gi) and ".env.local" in open(gi, encoding="utf-8").read()
    R.add("ok" if gi_ok else "fail", ".env.local no .gitignore", "sim" if gi_ok else "NÃO — adicione!")
    if not gi_ok: critical += 1
    # service role exposta em código client?
    leak = scan_service_role_in_client(svc)
    R.add("ok" if not leak else "fail", "service_role fora do client", "ok" if not leak else f"EXPOSTA em {leak}")
    if leak: critical += 1
    # service role em variável NEXT_PUBLIC_?
    pub_leak = [k for k in env if k.startswith("NEXT_PUBLIC_") and svc and not C.is_placeholder(svc) and env[k] == svc]
    R.add("ok" if not pub_leak else "fail", "service_role não em NEXT_PUBLIC_*", "ok" if not pub_leak else f"EXPOSTA em {pub_leak}")
    if pub_leak: critical += 1

    # ---------------- Resultado ----------------
    C.banner("Resultado")
    print(C.summary_line(R) + f"  |  falhas críticas: {critical}")
    path = R.save("diagnostics", "atlas_doctor_report")
    print(f"relatório: {os.path.relpath(path, C.ONLINE_ROOT)}")
    if a.json:
        print(json.dumps({"counts": R.counts(), "critical": critical}, ensure_ascii=False))
    sys.exit(1 if critical else 0)

def looks(v): return C.looks_jwt(v)

def scan_service_role_in_client(svc):
    """Procura a service_role hardcoded em componentes client ('use client')."""
    import glob
    if not svc or C.is_placeholder(svc):
        # procura padrão de uso indevido do nome em arquivos client
        svc = None
    for base in ("app", "components", "lib"):
        for f in glob.glob(os.path.join(C.ONLINE_ROOT, base, "**", "*.tsx"), recursive=True) + \
                 glob.glob(os.path.join(C.ONLINE_ROOT, base, "**", "*.ts"), recursive=True):
            try: txt = open(f, encoding="utf-8").read()
            except Exception: continue
            head = txt[:200]
            if '"use client"' in head or "'use client'" in head:
                if "SERVICE_ROLE" in txt or (svc and svc in txt):
                    return os.path.relpath(f, C.ONLINE_ROOT)
    return None

if __name__ == "__main__":
    main()
