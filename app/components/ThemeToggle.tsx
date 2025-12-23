"use client";
import React from "react";

export default function ThemeToggle() {
  const [dark, setDark] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    try {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const stored = localStorage.getItem('theme-mode');
      const initial = stored ? stored === 'dark' : systemPrefersDark;
      setDark(initial);
      document.documentElement.classList.toggle('dark', initial);
    } catch {
      setDark(false);
    }
  }, []);

  const apply = (isDark: boolean) => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme-mode', isDark ? 'dark' : 'light');
    setDark(isDark);
  };

  const toggle = () => {
    if (dark === null) return;
    apply(!dark);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      {dark ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
}
