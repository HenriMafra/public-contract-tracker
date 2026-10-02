# -*- coding: utf-8 -*-
"""
ATLAS B2G — Agendamento da rodada semanal. Windows (schtasks) ou Linux (cron).
  python scripts/atlas_schedule.py --weekly --day MON --time 08:00   # cria/atualiza
  python scripts/atlas_schedule.py --list | --test | --remove | --pause | --resume
A tarefa chama scripts/atlas_run_weekly.ps1, que lê o .env em runtime (segredo fora da tarefa).
"""
import os, sys, platform, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import atlas_common as C

TASK = "ATLAS_B2G_Weekly"
WRAPPER = os.path.join(C.SCRIPTS_DIR, "atlas_run_weekly.ps1")
DAYS = {"MON": "MON", "TUE": "TUE", "WED": "WED", "THU": "THU", "FRI": "FRI", "SAT": "SAT", "SUN": "SUN"}

def win(action, day="MON", t="08:00"):
    tr = f'powershell -ExecutionPolicy Bypass -File "{WRAPPER}"'
    if action == "create":
        return C.run(["schtasks", "/Create", "/TN", TASK, "/TR", tr, "/SC", "WEEKLY", "/D", DAYS.get(day, "MON"), "/ST", t, "/F"], echo=True)
    if action == "list":   return C.run(["schtasks", "/Query", "/TN", TASK, "/V", "/FO", "LIST"], echo=True)
    if action == "test":   return C.run(["schtasks", "/Run", "/TN", TASK], echo=True)
    if action == "remove": return C.run(["schtasks", "/Delete", "/TN", TASK, "/F"], echo=True)
    if action == "pause":  return C.run(["schtasks", "/Change", "/TN", TASK, "/DISABLE"], echo=True)
    if action == "resume": return C.run(["schtasks", "/Change", "/TN", TASK, "/ENABLE"], echo=True)
    return 1, "ação desconhecida"

def linux(action, day="MON", t="08:00"):
    # cron: dom_da_semana 0=Dom..1=Seg
    cron_dow = {"SUN": 0, "MON": 1, "TUE": 2, "WED": 3, "THU": 4, "FRI": 5, "SAT": 6}.get(day, 1)
    hh, mm = (t.split(":") + ["00"])[:2]
    sh = f'cd "{C.pipeline_root()}" && {C.python_exe()} src/atlas_weekly_runner.py --config config/atlas_config_producao.json --tag PRODUCAO --write-db'
    line = f"{mm} {hh} * * {cron_dow} {sh}  # {TASK}"
    if action == "create":
        code, cur = C.run(["bash", "-lc", "crontab -l 2>/dev/null"], echo=False)
        keep = "\n".join(l for l in cur.splitlines() if TASK not in l)
        newcron = (keep + "\n" + line + "\n").strip() + "\n"
        return C.run(["bash", "-lc", f"printf '%s' {sh_quote(newcron)} | crontab -"], echo=True)
    if action == "list":   return C.run(["bash", "-lc", "crontab -l 2>/dev/null | grep ATLAS_B2G_Weekly || echo '(nenhuma)'"], echo=True)
    if action == "remove": return C.run(["bash", "-lc", f"crontab -l 2>/dev/null | grep -v {TASK} | crontab -"], echo=True)
    return 0, "no Linux use --create/--list/--remove (pause/test: gerencie via cron/systemd)"

def sh_quote(s): return "'" + s.replace("'", "'\\''") + "'"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weekly", action="store_true"); ap.add_argument("--day", default="MON"); ap.add_argument("--time", default="08:00")
    for f in ("list", "test", "remove", "pause", "resume"): ap.add_argument("--" + f, action="store_true")
    a = ap.parse_args()
    is_win = platform.system() == "Windows"
    drv = win if is_win else linux
    action = "create" if a.weekly else next((f for f in ("list", "test", "remove", "pause", "resume") if getattr(a, f)), None)
    if not action: print("informe --weekly (criar) ou --list/--test/--remove/--pause/--resume"); sys.exit(1)
    if action == "create" and not os.path.exists(WRAPPER):
        print(f"{C.ICON['fail']} wrapper ausente: {WRAPPER}"); sys.exit(1)
    code, out = drv(action, a.day, a.time)
    print(out.strip()[:1200])
    label = {"create": f"agendado ({a.day} {a.time})", "list": "consulta", "test": "execução manual",
             "remove": "removido", "pause": "pausado", "resume": "reativado"}[action]
    print(f"\n{C.ICON['ok'] if code == 0 else C.ICON['warn']} {TASK}: {label} (código {code})")
    sys.exit(0 if code == 0 else 1)

if __name__ == "__main__":
    main()
