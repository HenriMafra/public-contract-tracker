# -*- coding: utf-8 -*-
"""
ATLAS B2G — Deploy automatizado. Alvos: local-server (PM2), docker, vercel.
  python scripts/atlas_deploy.py --target local-server
  python scripts/atlas_deploy.py --target docker
  python scripts/atlas_deploy.py --target vercel
Sempre roda secrets-check antes (bloqueia se houver segredo crítico). Use --dry-run para só planejar.
"""
import os, sys, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import atlas_common as C

def gate_secrets(R):
    code, out = C.run([C.python_exe(), os.path.join(C.SCRIPTS_DIR, "atlas_secrets_check.py")], echo=False)
    R.add("ok" if code == 0 else "fail", "secrets-check (porta de segurança)", "sem segredos críticos" if code == 0 else "BLOQUEADO — corrija segredos")
    return code == 0

def ensure_build(R, dry):
    R.add("info", "build", "npm ci && npm run build")
    if dry: return True
    code, _ = C.run(["npm", "ci"], cwd=C.ONLINE_ROOT, timeout=600)
    if code != 0: code, _ = C.run(["npm", "install"], cwd=C.ONLINE_ROOT, timeout=600)
    bcode, _ = C.run(["npm", "run", "build"], cwd=C.ONLINE_ROOT, timeout=600)
    R.add("ok" if bcode == 0 else "fail", "build Next.js", "ok" if bcode == 0 else "falhou")
    return bcode == 0

def deploy_local(R, port, dry):
    if not ensure_build(R, dry): return False
    pm2 = C.which("pm2")
    runner = ["pm2"] if pm2 else ["npx", "pm2"]
    R.add("info", "process manager", "pm2" if pm2 else "npx pm2 (pm2 não global)")
    if dry:
        R.add("skip", "start", f"{' '.join(runner)} start npm --name atlas-b2g -- start (porta {port})"); return True
    code, out = C.run(runner + ["start", "npm", "--name", "atlas-b2g", "--", "start"], cwd=C.ONLINE_ROOT, env_extra={"PORT": str(port)}, timeout=120)
    C.run(runner + ["save"], echo=False)
    R.add("ok" if code == 0 else "warn", "pm2 start", "iniciado" if code == 0 else "verifique pm2")
    return code == 0

def deploy_docker(R, port, dry):
    if not C.which("docker"): R.add("fail", "docker", "CLI ausente — instale Docker Desktop"); return False
    code, _ = C.run(["docker", "info"], echo=False, timeout=20)
    R.add("ok" if code == 0 else ("warn" if dry else "fail"), "docker daemon", "ativo" if code == 0 else "inativo — inicie o Docker Desktop")
    if code != 0 and not dry: return False
    if dry:
        R.add("skip", "build+up", "docker compose up --build -d"); return True
    bcode, _ = C.run(["docker", "compose", "build"], cwd=C.ONLINE_ROOT, timeout=1200)
    ucode, _ = C.run(["docker", "compose", "up", "-d"], cwd=C.ONLINE_ROOT, timeout=300)
    R.add("ok" if (bcode == 0 and ucode == 0) else "fail", "docker compose up", "no ar" if ucode == 0 else "falhou")
    return ucode == 0

def deploy_vercel(R, dry):
    env = C.load_env(); tok = env.get("VERCEL_TOKEN")
    runner = ["vercel"] if C.which("vercel") else ["npx", "vercel"]
    R.add("info", "vercel cli", "vercel" if C.which("vercel") else "npx vercel")
    if C.is_placeholder(tok):
        R.add("warn", "VERCEL_TOKEN", "ausente — faça login interativo (vercel login) ou defina VERCEL_TOKEN no .env")
    R.note("Configure as envs no projeto Vercel: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, "
           "SUPABASE_SERVICE_ROLE_KEY. Lembre: Job Runner Opção A NÃO roda em serverless → use Opção B (worker).")
    if dry or C.is_placeholder(tok):
        R.add("skip", "deploy", "vercel deploy --prod (requer token/login)"); return not C.is_placeholder(tok)
    code, out = C.run(runner + ["deploy", "--prod", "--yes", "--token", tok], cwd=C.ONLINE_ROOT, timeout=900)
    R.add("ok" if code == 0 else "fail", "vercel deploy", (out.strip().splitlines()[-1] if out.strip() else "") if code == 0 else "falhou")
    return code == 0

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", choices=["local-server", "docker", "vercel"], required=True)
    ap.add_argument("--port", type=int, default=3000); ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    C.load_env()
    R = C.Report(f"ATLAS B2G — Deploy ({a.target})")
    C.banner(f"Deploy: {a.target}" + (" (dry-run)" if a.dry_run else ""))
    if not gate_secrets(R) and not a.dry_run:
        R.save("deploy", "atlas_deploy"); print(C.summary_line(R)); sys.exit(1)
    ok = {"local-server": lambda: deploy_local(R, a.port, a.dry_run),
          "docker": lambda: deploy_docker(R, a.port, a.dry_run),
          "vercel": lambda: deploy_vercel(R, a.dry_run)}[a.target]()
    path = R.save("deploy", "atlas_deploy")
    print(C.summary_line(R)); print(f"relatório: {os.path.relpath(path, C.ONLINE_ROOT)}")
    sys.exit(0 if (ok and R.ok()) else 1)

if __name__ == "__main__":
    main()
