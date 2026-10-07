import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function useThemeMode() {
  const [mode, setMode] = useState(() => document.documentElement.getAttribute("data-mode") || "light");
  useEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
    try { localStorage.setItem("gm_mode", mode); } catch { /* storage blocked */ }
  }, [mode]);
  return [mode, () => setMode((m) => (m === "dark" ? "light" : "dark"))];
}

export function ThemeToggle() {
  const [mode, toggle] = useThemeMode();
  return (
    <button onClick={toggle} aria-label="Toggle light/dark mode" title="Toggle theme"
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-secondary hover:bg-surface-3">
      {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
