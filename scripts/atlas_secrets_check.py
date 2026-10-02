# -*- coding: utf-8 -*-
"""
ATLAS B2G — Secrets check: procura vazamento de segredos. BLOQUEIA deploy se achar crítico.
  python scripts/atlas_secrets_check.py
Crítico: service_role/anon JWT literal em código; service_role em componente client;
.env.local rastreado pelo Git; secret em arquivo público/log. Aviso: senha hardcoded suspeita.
"""
import os, sys, re, glob, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import atlas_common as C

SKIP_DIRS = ("node_modules", ".next", ".open-next", ".vercel", ".wrangler", ".git", "_localtest", "outputs")
SRC_EXT = (".ts", ".tsx", ".js", ".mjs", ".py", ".json", ".md", ".sql", ".yml", ".yaml")
JWT_RE = re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}")
PWD_RE = re.compile(r"""(password|senha|passwd|pwd)\s*[:=]\s*["'][^"']{6,}["']""", re.I)

def iter_files():
    for root, dirs, files in os.walk(C.ONLINE_ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            if f.endswith(SRC_EXT): yield os.path.join(root, f)

def rel(p): return os.path.relpath(p, C.ONLINE_ROOT)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--strict", action="store_true"); a = ap.parse_args()
    env = C.load_env()
    R = C.Report("ATLAS B2G — Verificação de Segredos")
    critical = 0
    svc = env.get("SUPABASE_SERVICE_ROLE_KEY"); anon = env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    known = {v for v in (svc, anon) if v and not C.is_placeholder(v)}

    C.banner("Varredura de arquivos-fonte")
    jwt_hits, client_hits, pwd_hits, known_hits = [], [], [], []
    for f in iter_files():
        try: txt = open(f, encoding="utf-8", errors="replace").read()
        except Exception: continue
        rl = rel(f)
        # segredo conhecido (valor real do .env) aparecendo em código versionável
        for k in known:
            if k in txt and not rl.endswith(".env.local") and not rl.endswith(".env"):
                known_hits.append(rl)
        # JWT literal embutido em código (fora de .env e .example)
        if f.endswith((".ts", ".tsx", ".js", ".mjs", ".py")) and JWT_RE.search(txt):
            jwt_hits.append(rl)
        # service role em componente client
        head = txt[:200]
        if ('"use client"' in head or "'use client'" in head) and "SERVICE_ROLE" in txt:
            client_hits.append(rl)
        # senha hardcoded suspeita (ignora uso de env/password_env)
        if f.endswith((".ts", ".tsx", ".js", ".py")):
            for m in PWD_RE.finditer(txt):
                seg = txt[max(0, m.start() - 40):m.end() + 10]
                if "env" in seg.lower() or "password_env" in seg.lower() or "process.env" in seg or "os.environ" in seg:
                    continue
                pwd_hits.append(f"{rl}: …{m.group(0)[:24]}…")

    R.add("ok" if not known_hits else "fail", "Segredo do .env em código versionável", "nenhum" if not known_hits else ", ".join(sorted(set(known_hits))))
    critical += len(set(known_hits))
    R.add("ok" if not jwt_hits else "fail", "JWT (eyJ…) literal em código", "nenhum" if not jwt_hits else ", ".join(sorted(set(jwt_hits))))
    critical += len(set(jwt_hits))
    R.add("ok" if not client_hits else "fail", "SERVICE_ROLE em componente client", "nenhum" if not client_hits else ", ".join(sorted(set(client_hits))))
    critical += len(set(client_hits))
    R.add("ok" if not pwd_hits else "warn", "Senha hardcoded suspeita", "nenhuma" if not pwd_hits else "; ".join(pwd_hits[:5]))

    C.banner("Git / arquivos sensíveis")
    code, out = C.run(["git", "ls-files", ".env.local", ".env"], cwd=C.ONLINE_ROOT, echo=False)
    tracked = [l for l in out.splitlines() if l.strip()]
    if code != 0:
        R.add("skip", ".env rastreado pelo Git", "repositório git não inicializado")
    else:
        R.add("ok" if not tracked else "fail", ".env(.local) rastreado pelo Git", "não" if not tracked else f"RASTREADO: {tracked}")
        critical += len(tracked)
    gi = os.path.join(C.ONLINE_ROOT, ".gitignore")
    gi_ok = os.path.exists(gi) and ".env.local" in open(gi, encoding="utf-8").read()
    R.add("ok" if gi_ok else "fail", ".env.local no .gitignore", "sim" if gi_ok else "NÃO")
    if not gi_ok: critical += 1

    C.banner("Logs / relatórios (não devem conter secrets)")
    log_hits = []
    for f in glob.glob(os.path.join(C.OUTPUTS_DIR, "**", "*.md"), recursive=True) + \
             glob.glob(os.path.join(C.ONLINE_ROOT, "*.log")):
        try: txt = open(f, encoding="utf-8", errors="replace").read()
        except Exception: continue
        if JWT_RE.search(txt) or any(k in txt for k in known):
            log_hits.append(rel(f))
    R.add("ok" if not log_hits else "fail", "Secrets em logs/relatórios", "nenhum" if not log_hits else ", ".join(log_hits))
    critical += len(log_hits)

    C.banner("Resultado")
    print(C.summary_line(R) + f"  |  críticos: {critical}")
    path = R.save("security", "atlas_secrets_check")
    print(f"relatório: {os.path.relpath(path, C.ONLINE_ROOT)}")
    if critical:
        print(f"{C.ICON['fail']} BLOQUEADO: {critical} achado(s) crítico(s) — corrija antes do deploy.")
        sys.exit(1)
    print(f"{C.ICON['ok']} Nenhum segredo crítico exposto.")
    sys.exit(0)

if __name__ == "__main__":
    main()
