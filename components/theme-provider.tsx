"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>{children}</NextThemesProvider>;
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Toggle light or dark theme"
      title="Toggle light or dark theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="theme-sun" aria-hidden="true" />
      <Moon className="theme-moon" aria-hidden="true" />
    </button>
  );
}
