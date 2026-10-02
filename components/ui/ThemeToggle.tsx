"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  function toggle() {
    const el = document.documentElement;
    const d = !el.classList.contains("dark");
    el.classList.toggle("dark", d);
    try { localStorage.setItem("atlas-theme", d ? "dark" : "light"); } catch {}
    setDark(d);
  }
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
      className="w-9 h-9 grid place-items-center rounded-lg border border-line text-muted hover:text-fg hover:bg-surface2 transition"
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
