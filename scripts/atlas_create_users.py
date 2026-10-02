# -*- coding: utf-8 -*-
"""
ATLAS B2G — Cria usuários iniciais no Supabase Auth + tabela perfis (idempotente).
Senhas vêm de variáveis de ambiente (password_env); NUNCA do JSON, NUNCA logadas.
  python scripts/atlas_create_users.py --from config/initial_users.json
  python scripts/atlas_create_users.py --dry-run          (valida config sem credenciais)
"""
import os, sys, json, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import atlas_common as C

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="src", default=os.path.join("config", "initial_users.json"))
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    env = C.load_env()
    src = a.src if os.path.isabs(a.src) else os.path.join(C.ONLINE_ROOT, a.src)
    if not os.path.exists(src): print(f"{C.ICON['fail']} arquivo não encontrado: {src}"); sys.exit(1)
    users = json.load(open(src, encoding="utf-8"))
    R = C.Report("ATLAS B2G — Criação de Usuários Iniciais")
    url = env.get("NEXT_PUBLIC_SUPABASE_URL"); svc = env.get("SUPABASE_SERVICE_ROLE_KEY")

    C.banner("Conferência de configuração")
    for u in users:
        pe = u.get("password_env", "")
        has_pwd = bool(env.get(pe) or os.environ.get(pe))
        ok_role = u.get("role") in C.ROLES
        R.add("ok" if (has_pwd and ok_role) else "warn", f"{u['email']} ({u.get('role')})",
              ("senha OK" if has_pwd else f"defina {pe}") + ("" if ok_role else " · papel inválido!"))

    if a.dry_run or C.is_placeholder(url) or C.is_placeholder(svc):
        C.banner("Modo verificação (sem aplicar)")
        if a.dry_run:
            R.add("skip", "execução", "--dry-run: nada foi criado")
        else:
            R.add("skip", "execução", "credenciais Supabase ausentes — defina URL + SERVICE_ROLE e rode sem --dry-run")
        path = R.save("diagnostics", "atlas_create_users")
        print(C.summary_line(R)); print(f"relatório: {os.path.relpath(path, C.ONLINE_ROOT)}")
        sys.exit(0)

    import requests
    base = url.rstrip("/"); H = {"apikey": svc, "Authorization": f"Bearer {svc}", "Content-Type": "application/json"}
    def find_user(email):
        r = requests.get(f"{base}/auth/v1/admin/users", headers=H, params={"page": 1, "per_page": 200}, timeout=15)
        if not r.ok: return None
        for x in r.json().get("users", []):
            if x.get("email") == email: return x.get("id")
        return None
    def audit(usuario, perfil, acao, resultado, detalhe=""):
        try: requests.post(f"{base}/rest/v1/audit_logs", headers={**H, "Prefer": "return=minimal"},
                           json={"usuario": usuario, "perfil": perfil, "acao": acao, "resultado": resultado, "detalhes": detalhe, "local": "atlas_create_users"}, timeout=10)
        except Exception: pass

    C.banner("Criando usuários (Supabase Auth + perfis)")
    for u in users:
        email = u["email"]; role = u["role"]; pe = u.get("password_env", "")
        pwd = env.get(pe) or os.environ.get(pe)
        if not pwd: R.add("warn", email, f"sem senha ({pe}) — pulado"); continue
        # cria no Auth (ou localiza se já existe)
        r = requests.post(f"{base}/auth/v1/admin/users", headers=H,
                          json={"email": email, "password": pwd, "email_confirm": True, "user_metadata": {"role": role, "nome": u.get("nome", "")}}, timeout=20)
        uid = None
        if r.ok:
            uid = r.json().get("id")
        else:
            uid = find_user(email)
            if not uid: R.add("fail", email, f"Auth falhou: HTTP {r.status_code}"); continue
        # upsert perfil (service role ignora RLS)
        perfil = {"user_id": uid, "role": role, "nome": u.get("nome", ""), "ativo": True}
        if u.get("uf"): perfil["uf"] = u["uf"]
        if u.get("vendedor_nome"): perfil["vendedor_nome"] = u["vendedor_nome"]
        pr = requests.post(f"{base}/rest/v1/perfis", headers={**H, "Prefer": "resolution=merge-duplicates,return=minimal"}, json=perfil, timeout=15)
        ok = pr.status_code in (200, 201, 204)
        R.add("ok" if ok else "fail", email, f"{role} — {'criado/atualizado' if ok else 'perfil falhou HTTP ' + str(pr.status_code)}")
        audit("automation", role, "criar_usuario", "OK" if ok else "ERRO", email)

    path = R.save("diagnostics", "atlas_create_users")
    print(C.summary_line(R)); print(f"relatório: {os.path.relpath(path, C.ONLINE_ROOT)}")
    sys.exit(0 if R.ok() else 1)

if __name__ == "__main__":
    main()
