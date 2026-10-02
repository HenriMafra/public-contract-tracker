# -*- coding: utf-8 -*-
"""
ATLAS B2G — Cria/configura o projeto Supabase via Management API (e CLI como apoio).
Requer SUPABASE_ACCESS_TOKEN (e SUPABASE_DB_PASSWORD para criar). Gera/atualiza .env.local.
NUNCA imprime segredos completos. Suporta --resume (após copiar chave manual, se preciso).
  python scripts/atlas_create_supabase_project.py
  python scripts/atlas_create_supabase_project.py --resume
Códigos de saída: 0 sucesso · 2 falta credencial (pausa controlada) · 1 erro.
"""
import os, sys, time, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import atlas_common as C

API = "https://api.supabase.com/v1"

def upsert_env_local(updates):
    p = os.path.join(C.ONLINE_ROOT, ".env.local")
    lines = open(p, encoding="utf-8").read().splitlines() if os.path.exists(p) else []
    keys = set(updates)
    out, seen = [], set()
    for ln in lines:
        m = ln.split("=", 1)
        if len(m) == 2 and m[0].strip() in keys:
            k = m[0].strip(); out.append(f"{k}={updates[k]}"); seen.add(k)
        else:
            out.append(ln)
    for k, v in updates.items():
        if k not in seen: out.append(f"{k}={v}")
    open(p, "w", encoding="utf-8").write("\n".join(out) + "\n")

def need(msg, R, path_prefix="diagnostics"):
    R.add("warn", "credencial necessária", msg)
    print(f"\n{C.ICON['warn']} {msg}")
    R.save(path_prefix, "atlas_create_supabase_project")
    sys.exit(2)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--resume", action="store_true")
    ap.add_argument("--name", default="atlas-b2g"); ap.add_argument("--region", default="sa-east-1")
    a = ap.parse_args()
    env = C.load_env()
    R = C.Report("ATLAS B2G — Criação/Configuração do Projeto Supabase")
    token = env.get("SUPABASE_ACCESS_TOKEN")

    # Caminho A: já existe projeto configurado por chaves → nada a criar
    if not C.is_placeholder(env.get("NEXT_PUBLIC_SUPABASE_URL")) and not C.is_placeholder(env.get("SUPABASE_SERVICE_ROLE_KEY")) and not a.resume:
        R.add("ok", "projeto existente detectado", "URL + service_role presentes — usando o projeto já configurado")
        R.save("diagnostics", "atlas_create_supabase_project"); print(C.summary_line(R)); sys.exit(0)

    if C.is_placeholder(token):
        need("Defina SUPABASE_ACCESS_TOKEN no .env (https://supabase.com/dashboard/account/tokens) "
             "para criar/configurar o projeto automaticamente. Sem ele, crie o projeto no painel, "
             "cole as 4 chaves em .env.local e rode: python scripts/atlas_auto_setup.py --mode cloud --resume", R)

    import requests
    H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    ref = env.get("SUPABASE_PROJECT_REF")

    # organizações
    r = requests.get(f"{API}/organizations", headers=H, timeout=20)
    if not r.ok: R.add("fail", "listar organizações", f"HTTP {r.status_code} — token válido?"); R.save("diagnostics", "atlas_create_supabase_project"); sys.exit(1)
    orgs = r.json(); org_id = env.get("SUPABASE_ORG_ID") or (orgs[0]["id"] if orgs else None)
    R.add("ok" if org_id else "fail", "organização", org_id or "nenhuma encontrada")
    if not org_id: sys.exit(1)

    # criar projeto, se necessário
    if not ref:
        dbpass = env.get("SUPABASE_DB_PASSWORD")
        if C.is_placeholder(dbpass):
            need("Defina SUPABASE_DB_PASSWORD no .env para criar o projeto (senha do banco).", R)
        r = requests.post(f"{API}/projects", headers=H, json={
            "organization_id": org_id, "name": a.name, "region": a.region,
            "db_pass": dbpass, "plan": "free"}, timeout=60)
        if not r.ok: R.add("fail", "criar projeto", f"HTTP {r.status_code}: {r.text[:120]}"); R.save("diagnostics", "atlas_create_supabase_project"); sys.exit(1)
        ref = r.json().get("id") or r.json().get("ref")
        R.add("ok", "projeto criado", f"ref={ref} (região {a.region})")
        # aguarda ficar saudável
        for _ in range(40):
            s = requests.get(f"{API}/projects/{ref}", headers=H, timeout=20)
            st = s.json().get("status") if s.ok else "?"
            if st in ("ACTIVE_HEALTHY", "ACTIVE"): break
            time.sleep(6)
        R.add("ok", "provisionamento", st)
    else:
        R.add("ok", "projeto", f"usando ref existente: {ref}")

    url = f"https://{ref}.supabase.co"
    # chaves de API
    k = requests.get(f"{API}/projects/{ref}/api-keys", headers=H, timeout=20)
    anon = svc = None
    if k.ok:
        for item in k.json():
            if item.get("name") == "anon": anon = item.get("api_key")
            if item.get("name") == "service_role": svc = item.get("api_key")
    if not anon or not svc:
        R.add("warn", "chaves de API", "a API não retornou anon/service_role automaticamente")
        need(f"Projeto criado (ref={ref}). Copie anon e service_role em "
             f"Settings → API do painel, cole em .env.local e rode: "
             f"python scripts/atlas_auto_setup.py --mode cloud --resume", R)

    dbpass = env.get("SUPABASE_DB_PASSWORD", "")
    dburl = f"postgresql://postgres:{dbpass}@db.{ref}.supabase.co:5432/postgres" if dbpass else env.get("DATABASE_URL", "")
    upsert_env_local({
        "NEXT_PUBLIC_SUPABASE_URL": url,
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": anon,
        "SUPABASE_SERVICE_ROLE_KEY": svc,
        "SUPABASE_PROJECT_REF": ref,
        **({"DATABASE_URL": dburl} if dburl else {}),
    })
    R.add("ok", "URL do projeto", url)
    R.add("ok", "anon key", "gravada (" + C.mask(anon) + ")")
    R.add("ok", "service_role key", "gravada (" + C.mask(svc) + ") — só servidor")
    R.add("ok", ".env.local atualizado", "Supabase configurado automaticamente")
    path = R.save("diagnostics", "atlas_create_supabase_project")
    print(C.summary_line(R)); print(f"relatório: {os.path.relpath(path, C.ONLINE_ROOT)}")
    sys.exit(0)

if __name__ == "__main__":
    main()
