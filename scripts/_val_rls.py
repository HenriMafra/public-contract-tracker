# -*- coding: utf-8 -*-
# Validação milimétrica da RLS por órgão. Cria usuários de teste, loga como cada um
# (JWT real) e confirma o escopo. Limpa tudo no final.
import os, json, urllib.request, urllib.error, pathlib, psycopg2

ENV = pathlib.Path(__file__).resolve().parents[1] / ".env.local"
cfg = {}
for line in ENV.read_text(encoding="utf-8", errors="replace").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1); cfg[k.strip()] = v.strip().strip('"').strip("'")
URL = cfg["NEXT_PUBLIC_SUPABASE_URL"]; ANON = cfg["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
SR = cfg["SUPABASE_SERVICE_ROLE_KEY"]; DBURL = cfg["DATABASE_URL"]
PWD = "ValRls#2026xyz"

def req(method, path, headers, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(URL + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            t = resp.read().decode("utf-8", "replace")
            return resp.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")

def admin_h(): return {"apikey": SR, "Authorization": "Bearer " + SR, "Content-Type": "application/json"}
def create_user(email):
    s, j = req("POST", "/auth/v1/admin/users", admin_h(), {"email": email, "password": PWD, "email_confirm": True})
    return j.get("id") if isinstance(j, dict) else None
def delete_user(uid): req("DELETE", "/auth/v1/admin/users/" + uid, admin_h())
def signin(email):
    s, j = req("POST", "/auth/v1/token?grant_type=password", {"apikey": ANON, "Content-Type": "application/json"}, {"email": email, "password": PWD})
    return j.get("access_token") if isinstance(j, dict) else None
def ver_orgaos(token):
    s, j = req("GET", "/rest/v1/vw_lista_ataque_atual?select=orgao_padronizado&limit=20000", {"apikey": ANON, "Authorization": "Bearer " + token})
    if not isinstance(j, list): return None, j
    return sorted(set((r.get("orgao_padronizado") or "—") for r in j)), len(j)
def pode_atualizar(token, opp_id):
    s, j = req("PATCH", f"/rest/v1/oportunidades?id=eq.{opp_id}", {"apikey": ANON, "Authorization": "Bearer " + token, "Content-Type": "application/json", "Prefer": "return=representation"}, {"observacoes_revisao": "val-rls"})
    return s in (200, 204) and isinstance(j, list) and len(j) > 0

cn = psycopg2.connect(DBURL); cn.autocommit = True; c = cn.cursor()
# 2 órgãos com oportunidades na rodada atual
c.execute("""SELECT o.id, o.nome_padronizado, op.id, count(*) OVER (PARTITION BY o.id)
             FROM oportunidades op JOIN orgaos o ON o.id=op.orgao_id
             WHERE op.rodada_id=(SELECT max(rodada_id) FROM oportunidades)
             ORDER BY count(*) OVER (PARTITION BY o.id) DESC""")
rows = c.fetchall()
orgA = next((r for r in rows), None)
orgB = next((r for r in rows if r[0] != orgA[0]), None)
print(f"Órgão A: id={orgA[0]} '{orgA[1]}' ({orgA[3]} opps) | Órgão B: id={orgB[0]} '{orgB[1]}' ({orgB[3]} opps)")
oppA = orgA[2]  # uma oportunidade do órgão A (para teste de escrita)

users = {"am": ("val.am@rls.local", "Account Manager", [orgA[0]]),
         "se": ("val.se@rls.local", "Sales Engineer", [orgB[0]]),
         "intern": ("val.intern@rls.local", "Intern", [orgA[0]]),
         "dir": ("val.dir@rls.local", "Diretoria", [])}
ids = {}
for k, (email, role, orgs) in users.items():
    delete_user_existing = None
    uid = create_user(email)
    if not uid:  # já existe? tenta achar
        c.execute("SELECT user_id FROM perfis p JOIN auth.users u ON u.id=p.user_id WHERE u.email=%s", (email,))
        r = c.fetchone(); uid = r[0] if r else None
    ids[k] = uid
    c.execute("INSERT INTO perfis (user_id,role,nome,ativo) VALUES (%s,%s,%s,true) ON CONFLICT (user_id) DO UPDATE SET role=EXCLUDED.role,ativo=true", (uid, role, "VAL " + k))
    c.execute("DELETE FROM perfil_orgaos WHERE user_id=%s", (uid,))
    for oid in orgs: c.execute("INSERT INTO perfil_orgaos (user_id,orgao_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (uid, oid))
print("usuários de teste criados/configurados.\n")

print("=== ESCOPO (o que cada um VÊ) ===")
res = {}
for k, (email, role, orgs) in users.items():
    tok = signin(email)
    if not tok: print(f"  {k}: FALHA no login"); continue
    orgaos, n = ver_orgaos(tok)
    res[k] = (orgaos, n, tok)
    amostra = orgaos[:3] if isinstance(orgaos, list) else orgaos
    print(f"  {k:7s} ({role:16s}): {n} opps | {len(orgaos) if isinstance(orgaos,list) else '?'} órgão(s) distintos | ex: {amostra}")

print("\n=== ASSERÇÕES ===")
def ok(b): return "OK ✅" if b else "FALHOU ❌"
A, B = orgA[1], orgB[1]
am_orgs = res["am"][0]; se_orgs = res["se"][0]; intern_orgs = res["intern"][0]; dir_orgs = res["dir"][0]
print("  AM vê só o órgão A:           ", ok(am_orgs == [A]))
print("  SE vê só o órgão B:           ", ok(se_orgs == [B]))
print("  Intern vê só o órgão A:       ", ok(intern_orgs == [A]))
print("  AM NÃO vê o órgão B:          ", ok(B not in am_orgs))
print("  Diretoria vê MUITOS órgãos:   ", ok(isinstance(dir_orgs, list) and len(dir_orgs) > 5))
print("  AM PODE atualizar (órgão A):  ", ok(pode_atualizar(res["am"][2], oppA)))
print("  Intern NÃO pode atualizar:    ", ok(not pode_atualizar(res["intern"][2], oppA)))

print("\n=== limpando usuários de teste ===")
for k, uid in ids.items():
    if uid: delete_user(uid); c.execute("DELETE FROM perfis WHERE user_id=%s", (uid,))
print("limpeza concluída.")
cn.close()
