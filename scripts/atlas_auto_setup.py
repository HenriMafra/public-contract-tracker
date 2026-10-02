# -*- coding: utf-8 -*-
"""
ATLAS B2G — Orquestrador de automação total (zero-touch).
  python scripts/atlas_auto_setup.py --mode full      # tudo (cloud se houver credencial; senão fallback local)
  python scripts/atlas_auto_setup.py --mode local     # SQLite/local, sem nuvem
  python scripts/atlas_auto_setup.py --mode cloud      # Supabase real (+ --resume)
  python scripts/atlas_auto_setup.py --mode validate   # só validar
  python scripts/atlas_auto_setup.py --mode repair      # corrigir problemas comuns
Cada etapa chama um script atlas_* dedicado (relatórios próprios) e agrega no checklist mestre.
"""
import os, sys, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import atlas_common as C

PY = C.python_exe()
def S(name): return os.path.join(C.SCRIPTS_DIR, name)

def step(R, label, argv, timeout=None, critical=False):
    print(f"\n>>> {label}")
    code, out = C.run([PY] + argv, cwd=C.ONLINE_ROOT, timeout=timeout, echo=False)
    tail = "\n".join([l for l in out.strip().splitlines() if l.strip()][-3:])
    if code == 0:
        R.add("ok", label, tail.replace("\n", " | ")[:160] or "ok")
    elif code == 2:  # pausa controlada (falta credencial)
        R.add("warn", label, "pausa: " + (tail.replace("\n", " | ")[:160] or "credencial necessária"))
    else:
        R.add("fail", label, tail.replace("\n", " | ")[:160] or f"código {code}")
    return code

def local_sqlite_url(cfg):
    p = os.path.join(C.ONLINE_ROOT, cfg.get("local", {}).get("sqlite_path", "_localtest/atlas_local.sqlite"))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return "sqlite:///" + p.replace("\\", "/")

def npm_install_if_needed(R, force=False):
    if force or not os.path.isdir(os.path.join(C.ONLINE_ROOT, "node_modules")):
        code, _ = C.run(["npm", "install"], cwd=C.ONLINE_ROOT, timeout=600)
        R.add("ok" if code == 0 else "fail", "Dependências Node (npm install)", "ok" if code == 0 else "falhou")
    else:
        R.add("ok", "Dependências Node", "node_modules presente")

def decide_target(cfg, env):
    """Retorna ('cloud', DATABASE_URL) se houver Supabase real; senão ('local', sqlite_url) se permitido."""
    url = env.get("NEXT_PUBLIC_SUPABASE_URL"); svc = env.get("SUPABASE_SERVICE_ROLE_KEY"); db = env.get("DATABASE_URL")
    if not C.is_placeholder(url) and not C.is_placeholder(svc) and not C.is_placeholder(db):
        return "cloud", db
    if cfg.get("supabase", {}).get("fallback_to_local", True):
        return "local", local_sqlite_url(cfg)
    return "none", None

def run_mode(mode, resume):
    cfg = C.load_auto_config(); env = C.load_env()
    R = C.Report(f"ATLAS B2G — Setup Automático (--mode {mode})")
    C.banner(f"ATLAS B2G — Setup Automático: modo {mode}")

    # 1) Doctor (com --fix em full/repair; --install-clis se o config pedir, em full)
    if mode in ("full", "repair", "local", "cloud"):
        dargs = [S("atlas_doctor.py")]
        if mode in ("full", "repair"): dargs.append("--fix")
        if mode == "full" and cfg.get("automation", {}).get("install_clis", False): dargs.append("--install-clis")
        code = step(R, "Ambiente (doctor)", dargs, timeout=600)
        if code == 1 and mode != "repair":
            R.note("Doctor reportou falha crítica — rode `--mode repair` ou corrija e tente de novo.")

    if mode == "validate":
        cfg_db = env.get("DATABASE_URL"); url = cfg_db if cfg_db and not C.is_placeholder(cfg_db) else local_sqlite_url(cfg)
        step(R, "Secrets-check", [S("atlas_secrets_check.py")])
        step(R, "Validação (banco/views/RLS)", [S("atlas_validate_online.py"), "--db-url", url], timeout=600)
        step(R, "Fila de jobs (teste e2e)", [S("test_job_queue.py")], timeout=300)
        step(R, "Storage/artefatos (teste)", [S("test_storage_artifacts.py")], timeout=300)
        step(R, "Realtime (teste/fallback)", [S("test_realtime.py")], timeout=300)
        step(R, "Notificações (teste)", [S("test_notifications.py")], timeout=300)
        step(R, "Radar Comercial (teste)", [S("test_radar.py")], timeout=300)
        return finish(R)

    # 2) Dependências
    if cfg.get("automation", {}).get("run_node_install", True):
        npm_install_if_needed(R, force=(mode == "repair"))

    # 3) Supabase (criar/configurar se token; senão usar existente; senão fallback local)
    if mode in ("full", "cloud"):
        if not C.is_placeholder(env.get("SUPABASE_ACCESS_TOKEN")):
            args = [S("atlas_create_supabase_project.py")] + (["--resume"] if resume else [])
            step(R, "Supabase (criar/configurar)", args, timeout=600)
            env = C.load_env()  # recarrega .env.local possivelmente atualizado
        else:
            R.add("skip", "Supabase (criar projeto)", "sem SUPABASE_ACCESS_TOKEN — usando projeto existente/fallback")

    target, db_url = decide_target(cfg, env) if mode in ("full", "cloud") else ("local", local_sqlite_url(cfg))
    if mode == "cloud" and target != "cloud":
        R.add("warn", "Alvo nuvem", "credenciais Supabase ausentes — crie o projeto/cole as chaves e rode `--mode cloud --resume`")
        return finish(R)
    R.add("ok" if target != "none" else "fail", "Alvo de banco", f"{target}: " + (db_url.split('@')[-1] if db_url and not db_url.startswith('sqlite') else (db_url or '—')))

    # 4) Aplicar SQL
    if cfg.get("automation", {}).get("apply_sql", True) and db_url:
        step(R, "SQL aplicado", [S("atlas_apply_sql.py"), "--db-url", db_url], timeout=300)

    # 5) Usuários (só nuvem; SQLite não tem Supabase Auth/perfis)
    if mode in ("full", "cloud") and target == "cloud":
        if cfg.get("automation", {}).get("create_admin", True):
            step(R, "Usuário ADM criado", [S("atlas_create_users.py"), "--from", os.path.join("config", "initial_users.json")], timeout=300)
    else:
        R.add("skip", "Usuário ADM", "modo local (SQLite) — usuários ficam no Supabase Auth (nuvem)")

    # 6) Build do frontend
    if cfg.get("automation", {}).get("run_build", True):
        code, _ = C.run(["npm", "run", "build"], cwd=C.ONLINE_ROOT, timeout=600)
        R.add("ok" if code == 0 else "fail", "Build do frontend", "ok" if code == 0 else "falhou")

    # 7) Carregar rodada real
    if cfg.get("automation", {}).get("load_initial_data", True) and db_url:
        no_init = "--no-init" if target == "cloud" else "--no-init"  # schema já aplicado nos dois casos
        step(R, "Dados reais carregados", [S("atlas_load_data.py"), "--latest", "--db-url", db_url, no_init, "--test-idempotency"], timeout=900)

    # 8) Validação (views sempre; RLS na nuvem)
    if db_url:
        vargs = [S("atlas_validate_online.py"), "--db-url", db_url]
        if cfg.get("frontend", {}).get("run_smoke_test", False) and mode == "full":
            vargs.append("--with-frontend")
        step(R, "Views/RLS validados", vargs, timeout=600)

    # 8b) Fila de jobs — teste end-to-end (worker pega job simulado e finaliza)
    step(R, "Fila de jobs (worker e2e)", [S("test_job_queue.py")], timeout=300)
    # 8c) Storage/artefatos — metadata, fallback local_only, reupload, permissões
    step(R, "Storage/artefatos (teste)", [S("test_storage_artifacts.py")], timeout=300)
    # 8d) Realtime — publication + fallback por polling (eventos observáveis)
    step(R, "Realtime (teste/fallback)", [S("test_realtime.py")], timeout=300)
    # 8e) Notificações — persistência, visibilidade por perfil, marcação, preferências
    step(R, "Notificações (teste)", [S("test_notifications.py")], timeout=300)
    # 8f) Radar Comercial — views, fichas, filtros sobre dados reais
    step(R, "Radar Comercial (teste)", [S("test_radar.py")], timeout=300)

    # 9) Agendamento (só full/cloud reais; local não agenda)
    if mode in ("full", "cloud") and target == "cloud" and cfg.get("automation", {}).get("create_scheduler", True) and cfg.get("scheduler", {}).get("enabled", True):
        sc = cfg.get("scheduler", {})
        step(R, "Agendamento criado", [S("atlas_schedule.py"), "--weekly", "--day", sc.get("day", "MON"), "--time", sc.get("time", "08:00")])
    else:
        R.add("skip", "Agendamento", "criado apenas em go-live de nuvem (rode atlas_schedule.py --weekly)")

    # 10) Secrets-check final
    step(R, "Secrets-check", [S("atlas_secrets_check.py")])
    return finish(R)

def finish(R):
    C.banner("CHECKLIST FINAL")
    for s in R.steps:
        ic = C.ICON.get(s.status, C.ICON["info"])
        print(f"{ic} {s.label}")
    print("\n" + C.summary_line(R))
    path = R.save("reports", "atlas_go_live_report")
    print(f"relatório de go-live: {os.path.relpath(path, C.ONLINE_ROOT)}")
    return 0 if R.ok() else 1

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["full", "local", "cloud", "validate", "repair"], default="full")
    ap.add_argument("--resume", action="store_true")
    a = ap.parse_args()
    sys.exit(run_mode(a.mode, a.resume))

if __name__ == "__main__":
    main()
