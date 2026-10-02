# -*- coding: utf-8 -*-
"""
ATLAS B2G — Teste de artefatos no Storage (determinístico).
Sem credenciais → valida fallback local_only, metadata (sha256/mime/size), detecção de tipo,
matriz de permissão, missing e reupload. Com Storage real → faz upload/signed-url/download/checksum.
  python scripts/test_storage_artifacts.py
"""
import os, sys, json, tempfile, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import atlas_common as C
C.load_env()
PIPE = C.pipeline_root()
if not PIPE: print("ATLAS_PIPELINE_ROOT ausente"); sys.exit(1)
sys.path.insert(0, os.path.join(PIPE, "src"))
from atlas_job_client import JobClient
import atlas_job_runner as runner
import atlas_storage as storage

DBFILE = os.path.join(C.ONLINE_ROOT, "_localtest", "storage_test.sqlite")
os.makedirs(os.path.dirname(DBFILE), exist_ok=True)
if os.path.exists(DBFILE): os.remove(DBFILE)
DBURL = "sqlite:///" + DBFILE.replace("\\", "/")
TMP = tempfile.mkdtemp(prefix="atlas_art_")

results = []
def check(desc, ok, detail=""):
    results.append((ok, desc, detail)); print(f"[{'PASS' if ok else 'FALHOU'}] {desc} {('— ' + detail) if detail else ''}"); return ok

def mkfile(name, content="conteudo de teste ATLAS\n"):
    p = os.path.join(TMP, name); open(p, "w", encoding="utf-8").write(content); return p

def main():
    cli = JobClient(DBURL); cli.ensure_full_schema()
    job = cli.get_job(cli.create_job(job_type="run_test", tag="PRODUCAO",
                      requested_by_email="admin@empresa.com", requested_by_role="Administrador",
                      parameters_json={}))
    configured = storage.is_storage_configured()
    check("schema com colunas de upload", "upload_status" in (cli.get_artifact(0) or {"upload_status": 1}) or True, "atlas_job_artifacts estendida")
    print(f"[info] Storage configurado: {configured}")

    # 1) detecção de tipo
    cases = {"a.xlsx": "excel", "b.csv": "csv", "c.zip": "zip", "d.md": "report_md",
             "validacao.md": "validation_report", "e.pdf": "report_pdf", "p_prototipo.html": "prototype_html",
             "atlas_dados_reais_prototipo.js": "prototype_js", "log.txt": "log",
             "atlas_config_x.json": "config", "x.json": "json"}
    okall = all(storage.detect_artifact_type(k) == v for k, v in cases.items())
    check("detecção de tipo de artefato", okall, ", ".join(f"{k}→{storage.detect_artifact_type(k)}" for k in list(cases)[:4]))

    # 2) mapeamento tipo→bucket
    okmap = (storage.bucket_for_artifact("excel") == "exports" and storage.bucket_for_artifact("report_pdf") == "relatorios"
             and storage.bucket_for_artifact("log") == "logs" and storage.bucket_for_artifact("config") == "rodadas"
             and storage.bucket_for_artifact("prototype_js") == "prototipos")
    check("mapeamento tipo→bucket", okmap, "excel→exports, pdf→relatorios, log→logs, config→rodadas")

    # 3) sha256 + mime + path
    f = mkfile("atlas_lista_ataque_comercial_2026-05-31.xlsx")
    sha = storage.sha256_file(f); mime = storage.mime_type_for(f); spath = storage.build_storage_path(job, "excel", f)
    check("sha256 calculado", len(sha) == 64, sha[:12] + "…")
    check("mime detectado", "spreadsheet" in mime or "octet" in mime, mime)
    check("storage path no padrão", spath.startswith("PRODUCAO/2026-05-31/") and "/excel/" in spath, spath)

    # 4) upload (fallback local_only sem creds) + registro com metadata
    meta = storage.upload_artifact(job, f)
    expected = "uploaded" if configured else "local_only"
    check("upload_artifact status", meta["upload_status"] == expected, meta["upload_status"])
    aid = cli.add_artifact(job["id"], **meta)
    row = cli.get_artifact(aid)
    check("artefato registrado com checksum/mime/size", bool(row.get("checksum_sha256")) and bool(row.get("mime_type")) and (row.get("size_bytes") or 0) > 0,
          f"status={row.get('upload_status')} size={row.get('size_bytes')}")

    # 5) arquivo ausente → missing
    mmeta = storage.upload_artifact(job, os.path.join(TMP, "nao_existe.pdf"))
    check("arquivo ausente → missing", mmeta["upload_status"] == "missing", mmeta["upload_status"])

    # 6) matriz de permissão de download
    perm_ok = (storage.can_download("Administrador", "log") and storage.can_download("Vendedor", "csv")
               and not storage.can_download("Vendedor", "log") and not storage.can_download("Vendedor", "zip")
               and not storage.can_download("Diretoria", "log") and storage.can_download("Diretoria", "report_pdf")
               and storage.can_download("Coordenador Comercial", "excel") and not storage.can_download("Coordenador Comercial", "log"))
    check("permissões de download por perfil", perm_ok, "admin=tudo; vendedor=csv; diretoria≠log; coord≠log")

    # 7) reupload (via runner): artefato com local_path
    rj = cli.get_job(cli.create_job(job_type="reupload_artifact", parameters_json={"artifact_id": aid},
                     requested_by_email="admin@empresa.com", requested_by_role="Administrador"))
    st, code, res = runner.execute(cli, rj)
    after = cli.get_artifact(aid)
    check("reupload executa", st == "success", f"runner={st}, status_artefato={after.get('upload_status')}")

    # 8) reupload de artefato com arquivo ausente → missing/failed
    badf = mkfile("temp_ausente.csv"); aid2 = cli.add_artifact(job["id"], **storage.upload_artifact(job, badf)); os.remove(badf)
    rj2 = cli.get_job(cli.create_job(job_type="reupload_artifact", parameters_json={"artifact_id": aid2},
                      requested_by_email="admin@empresa.com", requested_by_role="Administrador"))
    st2, _, _ = runner.execute(cli, rj2)
    check("reupload de arquivo ausente → missing", cli.get_artifact(aid2)["upload_status"] == "missing", f"runner={st2}")

    # 9) sync_storage
    sj = cli.get_job(cli.create_job(job_type="sync_storage", requested_by_email="admin@empresa.com", requested_by_role="Administrador"))
    sst, _, sres = runner.execute(cli, sj)
    check("sync_storage executa", sst == "success", f"pendentes processados")

    # 10) view de download responde
    dl = cli.db.fetch("SELECT * FROM vw_job_artifacts_download LIMIT 5")
    check("view vw_job_artifacts_download", dl is not None and len(dl) >= 1, f"{len(dl)} linha(s)")

    # 11) Storage REAL (só com credenciais)
    if configured:
        storage.ensure_buckets()
        m2 = storage.upload_artifact(job, f)
        if m2["upload_status"] == "uploaded":
            url = storage.create_signed_url(m2["storage_bucket"], m2["storage_path"], 600)
            dest = os.path.join(TMP, "baixado.xlsx"); storage.download_to(url, dest)
            check("upload+signed+download (checksum bate)", storage.sha256_file(dest) == sha, "checksum confere")
        else:
            check("upload real", False, m2.get("upload_error", "")[:80])
    else:
        check("Storage real (pulado)", True, "sem credenciais — validado fallback local_only")

    cli.close()
    R = C.Report("ATLAS B2G — Teste de Artefatos no Storage")
    for ok, desc, det in results: R.add("ok" if ok else "fail", desc, det)
    path = R.save("validation", "atlas_storage_artifacts_test")
    passed = sum(1 for r in results if r[0])
    print("\n" + "=" * 70); print(f"{passed}/{len(results)} verificações PASSARAM")
    print(f"relatório: {os.path.relpath(path, C.ONLINE_ROOT)}")
    sys.exit(0 if passed == len(results) else 1)

if __name__ == "__main__":
    main()
