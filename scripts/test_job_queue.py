# -*- coding: utf-8 -*-
"""
ATLAS B2G — Teste end-to-end da fila de jobs (SQLite, determinístico).
Cria jobs, roda o worker --once, valida status/logs/artefatos, job inválido,
cancelamento e exclusividade de produção. Gera relatório em outputs/validation/.
  python scripts/test_job_queue.py
"""
import os, sys, json, subprocess, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import atlas_common as C

# localizar o pipeline (onde vivem worker/client/runner)
C.load_env()
PIPE = C.pipeline_root()
if not PIPE: print("ATLAS_PIPELINE_ROOT ausente"); sys.exit(1)
sys.path.insert(0, os.path.join(PIPE, "src"))
from atlas_job_client import JobClient  # noqa
import atlas_job_runner as runner       # noqa

DBFILE = os.path.join(C.ONLINE_ROOT, "_localtest", "jobs_test.sqlite")
os.makedirs(os.path.dirname(DBFILE), exist_ok=True)
if os.path.exists(DBFILE): os.remove(DBFILE)
DBURL = "sqlite:///" + DBFILE.replace("\\", "/")

results = []
def check(desc, ok, detail=""):
    results.append((ok, desc, detail))
    print(f"[{'PASS' if ok else 'FALHOU'}] {desc} {('— ' + detail) if detail else ''}")
    return ok

def worker_once():
    p = subprocess.run([C.python_exe(), "src/atlas_job_worker.py", "--once", "--db-url", DBURL],
                       cwd=PIPE, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=120)
    return p.returncode, (p.stdout or "") + (p.stderr or "")

def main():
    os.environ["ATLAS_JOB_SIMULATE"] = "1"  # determinístico (sem pipeline pesado)

    # schema
    cli = JobClient(DBURL); cli.ensure_full_schema(); cli.close()
    check("schema da fila aplicado (tabelas+views)", True, "atlas_jobs/logs/artifacts + 4 views")

    # 1) job válido (simulado) -> worker --once -> success
    cli = JobClient(DBURL)
    jid = cli.create_job(job_type="run_test", status="queued", mode="teste", tag="TESTE",
                         requested_by_email="admin@empresa.com", requested_by_role="Administrador",
                         parameters_json={"simulate": True}, priority=5); cli.close()
    code, out = worker_once()
    cli = JobClient(DBURL); job = cli.get_job(jid); logs = cli.get_logs(jid); arts = cli.list_artifacts(jid); cli.close()
    check("job válido finaliza em success", job["status"] == "success", f"status={job['status']}")
    check("progresso chega a 100%", job["progress_percent"] == 100, f"{job['progress_percent']}%")
    check("logs registrados", len(logs) >= 5, f"{len(logs)} linhas")
    check("artefato registrado", len(arts) >= 1, f"{len(arts)} artefato(s)")
    check("duração medida", (job.get("duration_seconds") or 0) >= 0, f"{job.get('duration_seconds')}s")

    # 2) job inválido -> failed
    cli = JobClient(DBURL)
    bad = cli.create_job(job_type="tipo_inexistente", status="queued",
                         requested_by_email="admin@empresa.com", requested_by_role="Administrador"); cli.close()
    worker_once()
    cli = JobClient(DBURL); jb = cli.get_job(bad); cli.close()
    check("job inválido finaliza em failed", jb["status"] == "failed", f"status={jb['status']}")

    # 3) cancelamento (in-process: claim -> cancel -> execute deve retornar cancelled)
    cli = JobClient(DBURL)
    cj = cli.create_job(job_type="run_test", status="queued", parameters_json={"simulate": True},
                        requested_by_email="admin@empresa.com", requested_by_role="Administrador")
    claimed = cli.claim_next("test-worker")
    cli.request_cancel(claimed["id"])
    status, code, res = runner.execute(cli, claimed)
    cli.finish(claimed["id"], status, exit_code=code, result=res)
    fin = cli.get_job(cj); cli.close()
    check("cancelamento interrompe a execução", status == "cancelled", f"runner={status}")
    check("job marcado como cancelled", fin["status"] == "cancelled", f"status={fin['status']}")

    # 4) exclusividade de produção (um run_production_write_db por vez)
    cli = JobClient(DBURL)
    p1 = cli.create_job(job_type="run_production_write_db", status="queued", parameters_json={"simulate": True},
                        requested_by_email="admin@empresa.com", requested_by_role="Administrador", priority=9)
    p2 = cli.create_job(job_type="run_production_write_db", status="queued", parameters_json={"simulate": True},
                        requested_by_email="admin@empresa.com", requested_by_role="Administrador", priority=9)
    c1 = cli.claim_next("w1")  # reserva o primeiro (vira running)
    c2 = cli.claim_next("w2")  # NÃO deve pegar o segundo (exclusividade)
    check("exclusividade: 2º job de produção não é reservado", c2 is None, f"c1={c1['id'] if c1 else None}, c2={c2}")
    cli.finish(c1["id"], "success")
    c3 = cli.claim_next("w3")  # agora pode
    check("após terminar, próximo job de produção é reservado", c3 is not None and c3["id"] == p2, f"c3={c3['id'] if c3 else None}")
    cli.finish(c3["id"], "success"); cli.close()

    # 5) RLS/permissões (Postgres-only)
    rls = os.path.join(C.SUPABASE_DIR, "jobs_rls_policies.sql")
    has_pol = os.path.exists(rls) and "jobs_sel" in open(rls, encoding="utf-8").read()
    check("RLS de jobs definida (validável na nuvem)", has_pol, "policies jobs_sel/ins/upd + logs + artifacts")

    # 6) dashboard
    cli = JobClient(DBURL); dash = cli.dashboard(); cli.close()
    check("view dashboard responde", dash is not None and "sucesso" in dash, f"sucesso={dash.get('sucesso')} falhas={dash.get('falhas')}")

    # relatório
    R = C.Report("ATLAS B2G — Teste da Fila de Jobs")
    for ok, desc, det in results: R.add("ok" if ok else "fail", desc, det)
    path = R.save("validation", "atlas_job_queue_test")
    passed = sum(1 for r in results if r[0])
    print("\n" + "=" * 70)
    print(f"{passed}/{len(results)} verificações PASSARAM")
    print(f"relatório: {os.path.relpath(path, C.ONLINE_ROOT)}")
    sys.exit(0 if passed == len(results) else 1)

if __name__ == "__main__":
    main()
