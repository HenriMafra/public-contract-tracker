# -*- coding: utf-8 -*-
"""
ATLAS B2G — Biblioteca comum da camada de automação.
Centraliza: paths, carga de .env, MÁSCARA de segredos, execução de comandos,
detecção de CLIs, checklist/relatórios. Importada por todos os scripts atlas_*.
NUNCA imprime segredos completos; nunca grava secrets em logs/relatórios.
"""
import os, sys, re, json, shutil, subprocess, datetime, platform

try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

# ---------------------------------------------------------------- paths
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
ONLINE_ROOT = os.path.dirname(SCRIPTS_DIR)
SUPABASE_DIR = os.path.join(ONLINE_ROOT, "supabase")
CONFIG_DIR = os.path.join(ONLINE_ROOT, "config")
OUTPUTS_DIR = os.path.join(ONLINE_ROOT, "outputs")
SQL_FILES = {
    "schema":   os.path.join(SUPABASE_DIR, "schema_atlas_b2g.sql"),
    "seed":     os.path.join(SUPABASE_DIR, "seed_atlas_b2g.sql"),
    "rls":      os.path.join(SUPABASE_DIR, "rls_policies.sql"),
    "storage":  os.path.join(SUPABASE_DIR, "storage_policies.sql"),
    "jobs":     os.path.join(SUPABASE_DIR, "jobs_schema.sql"),
    "jobs_rls": os.path.join(SUPABASE_DIR, "jobs_rls_policies.sql"),
    "artifacts":     os.path.join(SUPABASE_DIR, "artifacts_storage_schema.sql"),
    "artifacts_rls": os.path.join(SUPABASE_DIR, "artifacts_storage_rls.sql"),
    "realtime":      os.path.join(SUPABASE_DIR, "realtime_publications.sql"),
    "notifications":     os.path.join(SUPABASE_DIR, "notifications_schema.sql"),
    "notifications_rls": os.path.join(SUPABASE_DIR, "notifications_rls_policies.sql"),
}
ROLES = ["Administrador", "Operador de Inteligência", "Coordenador Comercial", "Vendedor", "Diretoria"]

# ---------------------------------------------------------------- ícones / cores
WIN = platform.system() == "Windows"
ICON = {"ok": "[✓]", "fail": "[✗]", "warn": "[▲]", "skip": "[ ]", "info": "[•]"}

def now_stamp():
    return datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

def human_now():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# ---------------------------------------------------------------- .env
SECRET_HINTS = ("KEY", "TOKEN", "PASSWORD", "SECRET", "SERVICE_ROLE", "DATABASE_URL", "ANON")
PLACEHOLDERS = ("placeholder", "seu-projeto", "sua_senha", "sua_anon", "sua_service",
                "seu_", "sua ", "your-", "changeme", "xxxx")

def is_secret_name(name: str) -> bool:
    n = name.upper()
    return any(h in n for h in SECRET_HINTS)

def mask(value: str) -> str:
    if value is None: return "(vazio)"
    v = str(value)
    if v == "": return "(vazio)"
    if len(v) <= 8: return "***"
    return v[:4] + "…" + v[-4:]

def is_placeholder(v) -> bool:
    if not v: return True
    return any(p in str(v).lower() for p in PLACEHOLDERS)

def looks_jwt(v) -> bool:
    return bool(re.match(r"^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.", v or ""))

def load_env(extra_paths=None):
    """Carrega .env e .env.local (sem sobrescrever variáveis já no ambiente)."""
    paths = [os.path.join(ONLINE_ROOT, ".env"), os.path.join(ONLINE_ROOT, ".env.local")]
    if extra_paths: paths += list(extra_paths)
    merged = {}
    for p in paths:
        if not os.path.exists(p): continue
        for line in open(p, encoding="utf-8"):
            m = re.match(r"^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$", line)
            if not m: continue
            k, val = m.group(1), m.group(2).strip().strip('"').strip("'")
            merged[k] = val
            if not os.environ.get(k):
                os.environ[k] = val
    # também expõe o que já estava no ambiente
    for k in list(os.environ.keys()):
        if k not in merged and (is_secret_name(k) or k.startswith("ATLAS_") or k.startswith("NEXT_PUBLIC_") or k.startswith("SUPABASE")):
            merged[k] = os.environ[k]
    return merged

def env(key, default=None):
    return os.environ.get(key, default)

def pipeline_root():
    p = os.environ.get("ATLAS_PIPELINE_ROOT") or os.environ.get("ATLAS_PIPELINE_DIR")
    return p

def python_exe():
    return os.environ.get("ATLAS_PYTHON") or sys.executable or "python"

# ---------------------------------------------------------------- config
DEFAULT_CONFIG = {
    "automation": {}, "supabase": {}, "frontend": {"port": 3000, "package_manager": "npm"},
    "pipeline": {"tag": "PRODUCAO", "write_db": True}, "admin": {"email": "admin@empresa.com"},
    "scheduler": {"day": "MON", "time": "08:00"}, "local": {"sqlite_path": "_localtest/atlas_local.sqlite"},
}
def load_auto_config():
    p = os.path.join(CONFIG_DIR, "atlas_auto_config.json")
    cfg = json.loads(json.dumps(DEFAULT_CONFIG))
    if os.path.exists(p):
        try:
            user = json.load(open(p, encoding="utf-8"))
            for k, v in user.items():
                if isinstance(v, dict) and isinstance(cfg.get(k), dict): cfg[k].update(v)
                else: cfg[k] = v
        except Exception as e:
            print(f"{ICON['warn']} atlas_auto_config.json inválido ({e}); usando padrões.")
    return cfg

# ---------------------------------------------------------------- execução
def which(name):
    return shutil.which(name)

def run(cmd, cwd=None, env_extra=None, timeout=None, echo=True):
    """Executa um comando (lista). Retorna (returncode, saída combinada).
    Resolve nomes via PATH (npm/npx/git etc.). Nunca levanta exceção."""
    if isinstance(cmd, str): cmd = cmd.split()
    exe = cmd[0]
    resolved = which(exe) or exe
    full = [resolved] + cmd[1:]
    e = dict(os.environ)
    if env_extra: e.update({k: str(v) for k, v in env_extra.items()})
    if echo:
        print(f"  $ {exe} {' '.join(cmd[1:])}")
    try:
        p = subprocess.run(full, cwd=cwd, env=e, timeout=timeout, capture_output=True, text=True,
                           encoding="utf-8", errors="replace")
        return p.returncode, (p.stdout or "") + (("\n" + p.stderr) if p.stderr else "")
    except FileNotFoundError:
        return 127, f"comando não encontrado: {exe}"
    except subprocess.TimeoutExpired:
        return 124, f"timeout após {timeout}s: {exe}"
    except Exception as ex:
        return 1, f"erro ao executar {exe}: {ex}"

def pip_install(packages, upgrade=False):
    args = [python_exe(), "-m", "pip", "install", "--quiet"]
    if upgrade: args.append("--upgrade")
    args += packages
    return run(args, echo=True)

# ---------------------------------------------------------------- checklist / relatório
class Step:
    __slots__ = ("status", "label", "detail")
    def __init__(self, status, label, detail=""):
        self.status, self.label, self.detail = status, label, detail

class Report:
    """Acumula passos (checklist) e gera um .md mascarando segredos."""
    def __init__(self, title):
        self.title = title
        self.steps = []
        self.notes = []
    def add(self, status, label, detail=""):
        s = Step(status, label, detail)
        self.steps.append(s)
        ic = ICON.get(status, ICON["info"])
        line = f"{ic} {label}"
        if detail: line += f" — {detail}"
        print(line)
        return s
    def note(self, text): self.notes.append(text)
    def counts(self):
        c = {"ok": 0, "fail": 0, "warn": 0, "skip": 0, "info": 0}
        for s in self.steps: c[s.status] = c.get(s.status, 0) + 1
        return c
    def ok(self): return self.counts()["fail"] == 0
    def render_md(self):
        c = self.counts()
        out = [f"# {self.title}", "", f"_Gerado em {human_now()} — host {platform.node()} ({platform.system()})_", ""]
        out.append(f"**Resumo:** {c['ok']} OK · {c['warn']} avisos · {c['fail']} falhas · {c['skip']} pulados")
        out.append("")
        out.append("| | Item | Detalhe |")
        out.append("|---|---|---|")
        for s in self.steps:
            ic = {"ok": "✓", "fail": "✗", "warn": "▲", "skip": "—", "info": "•"}.get(s.status, "•")
            out.append(f"| {ic} | {s.label} | {s.detail} |")
        if self.notes:
            out += ["", "## Notas", ""] + [f"- {n}" for n in self.notes]
        return "\n".join(out) + "\n"
    def save(self, subdir, prefix):
        d = os.path.join(OUTPUTS_DIR, subdir)
        os.makedirs(d, exist_ok=True)
        path = os.path.join(d, f"{prefix}_{now_stamp()}.md")
        open(path, "w", encoding="utf-8").write(self.render_md())
        return path

def banner(title):
    print("\n" + "=" * 74); print(f" {title}"); print("=" * 74)

def summary_line(report):
    c = report.counts()
    return f"{c['ok']} OK · {c['warn']} avisos · {c['fail']} falhas · {c['skip']} pulados"
