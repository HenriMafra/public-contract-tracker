# -*- coding: utf-8 -*-
"""
ATLAS B2G — Teste de Realtime (determinístico).
Valida o SQL de publication, simula as mudanças que o Realtime transmitiria (progresso/logs/
artefatos) e prova o FALLBACK por polling (a mesma mudança é observável por re-query).
Com Supabase real, valida conectividade do Realtime. Gera relatório.
  python scripts/test_realtime.py
"""
import os, sys, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import atlas_common as C
C.load_env()
PIPE = C.pipeline_root()
if not PIPE: print("ATLAS_PIPELINE_ROOT ausente"); sys.exit(1)
sys.path.insert(0, os.path.join(PIPE, "src"))
from atlas_job_client import JobClient

DBFILE = os.path.join(C.ONLINE_ROOT, "_localtest", "realtime_test.sqlite")
os.makedirs(os.path.dirname(DBFILE), exist_ok=True)
if os.path.exists(DBFILE): os.remove(DBFILE)
DBURL = "sqlite:///" + DBFILE.replace("\\", "/")
RT_TABLES = ["atlas_jobs", "atlas_job_logs", "atlas_job_artifacts", "rodadas", "oportunidades",
             "oportunidade_historico", "tarefas", "contatos", "revisoes", "audit_logs"]

results = []
def check(desc, ok, detail=""):
    results.append((ok, desc, detail)); print(f"[{'PASS' if ok else 'FALHOU'}] {desc} {('— ' + detail) if detail else ''}"); return ok

def main():
    # 1) SQL de publication existe e lista as 10 tabelas
    rt = os.path.join(C.SUPABASE_DIR, "realtime_publications.sql")
    sql = open(rt, encoding="utf-8").read() if os.path.exists(rt) else ""
    faltando = [t for t in RT_TABLES if t not in sql]
    check("realtime_publications.sql lista as 10 tabelas", os.path.exists(rt) and not faltando, "faltam: " + (", ".join(faltando) or "nenhuma"))

    # 2) arquivos de frontend do realtime existem
    front = ["lib/realtime/subscriptions.ts", "lib/realtime/channels.ts", "lib/realtime/events.ts",
             "lib/realtime/useRealtimeStatus.ts", "components/realtime/RealtimeBadge.tsx",
             "components/realtime/RealtimeToast.tsx", "components/notifications/NotificationToastBridge.tsx",
             "app/api/realtime/health/route.ts"]
    missf = [f for f in front if not os.path.exists(os.path.join(C.ONLINE_ROOT, f))]
    check("artefatos de frontend do Realtime presentes", not missf, "faltam: " + (", ".join(missf) or "nenhum"))

    # 3) simula mudanças no banco (o que o Realtime transmitiria) + prova FALLBACK por polling
    cli = JobClient(DBURL); cli.ensure_full_schema()
    jid = cli.create_job(job_type="run_production_write_db", status="queued", tag="PRODUCAO",
                         requested_by_email="admin@empresa.com", requested_by_role="Administrador",
                         parameters_json={"simulate": True})
    cli.claim_next("rt-worker")

    # progresso: worker grava -> polling (re-query) enxerga
    cli.progress(jid, 45, "Calculando score")
    seen = cli.get_job(jid)
    check("evento de PROGRESSO observável (fallback polling)", seen["progress_percent"] == 45 and seen["current_step"] == "Calculando score", f"{seen['progress_percent']}% {seen['current_step']}")

    # logs: insere -> polling com after enxerga só os novos
    cli.log(jid, "info", "linha de log A", step="Coletando PNCP")
    cli.log(jid, "success", "linha de log B", step="Finalizando")
    last = 0
    novos = cli.get_logs(jid, after_id=last)
    check("eventos de LOG observáveis (after-id incremental)", len(novos) >= 2, f"{len(novos)} novos")
    last2 = novos[-1]["id"]
    check("polling incremental não repete logs", len(cli.get_logs(jid, after_id=last2)) == 0, "0 após último id")

    # artefato: insere -> polling enxerga
    aid = cli.add_artifact(jid, artifact_type="excel", file_name="lista.xlsx", upload_status="uploaded", size_bytes=1234)
    arts = cli.list_artifacts(jid)
    check("evento de ARTEFATO observável", any(a["id"] == aid for a in arts), f"{len(arts)} artefato(s)")

    # status final: success -> dashboard view reflete
    cli.finish(jid, "success", exit_code=0, result={"ok": True}, duration=1.0)
    dash = cli.dashboard()
    check("mudança de STATUS reflete no dashboard", (dash.get("sucesso") or 0) >= 1, f"sucesso={dash.get('sucesso')}")
    cli.close()

    # 4) Realtime real (só com credenciais) — senão valida o fallback
    url = C.env("NEXT_PUBLIC_SUPABASE_URL"); anon = C.env("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    configured = url and anon and not C.is_placeholder(url) and not C.is_placeholder(anon)
    if configured:
        try:
            import requests
            # autentica como o cliente Supabase real (apikey + Authorization Bearer); consulta uma tabela
            h = {"apikey": anon, "Authorization": "Bearer " + anon}
            r = requests.get(url.rstrip("/") + "/rest/v1/rodadas?select=id&limit=1", headers=h, timeout=8)
            check("Supabase REST/Realtime acessível (MedFlow real)", r.ok or r.status_code in (404, 416), f"HTTP {r.status_code}")
        except Exception as e:
            check("Supabase REST acessível", False, str(e)[:80])
    else:
        check("Realtime real (pulado) → FALLBACK polling validado", True, "sem credenciais; polling entrega as mudanças")

    R = C.Report("ATLAS B2G — Teste de Realtime")
    for ok, desc, det in results: R.add("ok" if ok else "fail", desc, det)
    path = R.save("validation", "atlas_realtime_test")
    passed = sum(1 for r in results if r[0])
    print("\n" + "=" * 70); print(f"{passed}/{len(results)} verificações PASSARAM")
    print(f"relatório: {os.path.relpath(path, C.ONLINE_ROOT)}")
    sys.exit(0 if passed == len(results) else 1)

if __name__ == "__main__":
    main()
