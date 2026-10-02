# -*- coding: utf-8 -*-
"""
ATLAS B2G — Teste do Centro de Notificações (SQLite, determinístico).
Cria notificações, valida visibilidade por perfil (espelho da RLS), marcação como lida,
preferências e os helpers notify_* (job/opportunity). Gera relatório.
  python scripts/test_notifications.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import atlas_common as C
C.load_env()
PIPE = C.pipeline_root()
if not PIPE: print("ATLAS_PIPELINE_ROOT ausente"); sys.exit(1)
sys.path.insert(0, os.path.join(PIPE, "src"))
from atlas_notifications import NotifClient

DBFILE = os.path.join(C.ONLINE_ROOT, "_localtest", "notif_test.sqlite")
os.makedirs(os.path.dirname(DBFILE), exist_ok=True)
if os.path.exists(DBFILE): os.remove(DBFILE)
DBURL = "sqlite:///" + DBFILE.replace("\\", "/")
VEND = "Vendedor DF"

results = []
def check(d, ok, det=""):
    results.append((ok, d, det)); print(f"[{'PASS' if ok else 'FALHOU'}] {d} {('— ' + det) if det else ''}"); return ok

def main():
    nc = NotifClient(DBURL); nc.apply_schema()
    check("schema de notificações aplicado", True, "notificacoes + preferences + 4 views")

    # 1) criar para Admin, Operador e Vendedor
    n_adm = nc.create(tipo="system_alert", titulo="Alerta admin", perfil_destino="Administrador", nivel="warning")
    n_op = nc.create(tipo="review_required", titulo="Revisão", perfil_destino="Operador de Inteligência", nivel="warning")
    n_vd = nc.create(tipo="opportunity_assigned", titulo="Oportunidade sua", responsavel_destino=VEND, escopo="user", nivel="info")
    check("notificações criadas (admin/operador/vendedor)", all([n_adm, n_op, n_vd]), f"ids={n_adm},{n_op},{n_vd}")

    # 2) visibilidade por perfil (espelho da RLS)
    adm = nc.list_for(role="Administrador", is_admin=True)
    check("ADMIN vê todas", len(adm) >= 3, f"{len(adm)}")
    vd = nc.list_for(role="Vendedor", vendedor_nome=VEND)
    only_his = all(r.get("responsavel_destino") == VEND or r.get("perfil_destino") == "Vendedor" for r in vd)
    check("VENDEDOR vê só as suas", len(vd) == 1 and only_his, f"{len(vd)} (esperado 1)")
    op = nc.list_for(role="Operador de Inteligência")
    op_ok = any(r["id"] == n_op for r in op) and all(r["id"] != n_adm for r in op)
    check("OPERADOR vê do seu perfil, não as exclusivas de Admin", op_ok, f"{len(op)}")

    # 3) marcar como lida / contador
    before = nc.unread_count_for(role="Vendedor", vendedor_nome=VEND)
    nc.mark_read([n_vd])
    after = nc.unread_count_for(role="Vendedor", vendedor_nome=VEND)
    check("marcar como lida reduz não-lidas", before == 1 and after == 0, f"{before}->{after}")

    # 4) marcar todas como lidas (Admin)
    ids_adm = [r["id"] for r in nc.list_for(role="Administrador", is_admin=True, only_unread=True)]
    nc.mark_read(ids_adm)
    check("marcar todas como lidas (admin)", nc.unread_count_for(role="Administrador", is_admin=True) == 0, "0 não-lidas")

    # 5) preferências
    nc.set_pref("11111111-1111-1111-1111-111111111111", email="admin@empresa.com", role="Administrador", notify_jobs=False)
    pref = nc.get_pref("11111111-1111-1111-1111-111111111111")
    check("preferências salvas/lidas", pref is not None and pref.get("notify_jobs") in (False, 0), f"notify_jobs={pref.get('notify_jobs')}")

    # 6) helper: job success (produção) -> Admin/Operador/Diretoria
    job = {"id": 99, "job_type": "run_production_write_db", "requested_by_email": "admin@empresa.com"}
    ids = nc.notify_job_success(job, {"oportunidades": 29, "criticas": 10, "valor_total": 86909933})
    dir_sees = any(r["perfil_destino"] == "Diretoria" for r in nc.list_for(role="Diretoria"))
    check("job_success notifica Admin/Operador/Diretoria", len(ids) == 3 and dir_sees, f"{len(ids)} linhas")

    # 7) helper: job failed (produção) -> nível critical
    fids = nc.notify_job_failed({"id": 100, "job_type": "run_production"}, "erro X")
    frow = nc.list_for(role="Administrador", is_admin=True, only_unread=True)
    crit = any(r["tipo"] == "job_failed" and r["nivel"] == "critical" for r in frow)
    check("job_failed (produção) é critical p/ Admin/Operador", len(fids) == 2 and crit, f"{len(fids)} linhas")

    # 8) helper: oportunidade crítica -> Admin/Coordenador + responsável
    cids = nc.notify_opportunity_critical({"id": 7, "nome_orgao": "Min. Saúde", "categoria_principal": "Software",
                                           "score_comercial": 90, "responsavel_atribuido": VEND})
    vd2 = nc.list_for(role="Vendedor", vendedor_nome=VEND, only_unread=True)
    check("opportunity_critical chega ao responsável (vendedor)", any(r["tipo"] == "opportunity_critical" for r in vd2), f"{len(cids)} linhas")

    # 9) views
    dash = nc.dashboard()
    check("view dashboard responde", dash is not None and "total" in dash, f"total={dash.get('total')} criticas={dash.get('criticas')}")
    nc.close()

    R = C.Report("ATLAS B2G — Teste do Centro de Notificações")
    for ok, d, det in results: R.add("ok" if ok else "fail", d, det)
    path = R.save("validation", "atlas_notifications_test")
    passed = sum(1 for r in results if r[0])
    print("\n" + "=" * 70); print(f"{passed}/{len(results)} verificações PASSARAM")
    print(f"relatório: {os.path.relpath(path, C.ONLINE_ROOT)}")
    sys.exit(0 if passed == len(results) else 1)

if __name__ == "__main__":
    main()
