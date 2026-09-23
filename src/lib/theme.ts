"use client";

import { useEffect, useState } from "react";

export type ThemePref = "light" | "dark" | "system";
export const ACCENTS = [
  { id: "iris", label: "Iris", swatch: "#5b5bd6" },
  { id: "blue", label: "Blue", swatch: "#2563eb" },
  { id: "teal", label: "Teal", swatch: "#0d9488" },
  { id: "rose", label: "Rose", swatch: "#e11d48" },
  { id: "amber", label: "Amber", swatch: "#d97706" },
  { id: "graphite", label: "Graphite", swatch: "#27272a" },
] as const;

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePref>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    let pref: ThemePref = "system";
    try {
      pref = (localStorage.getItem("lifeos:theme") as ThemePref) || "system";
    } catch {}
    setThemeState(pref);
    setResolved(document.documentElement.classList.contains("dark") ? "dark" : "light");
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      let current: ThemePref = "system";
      try {
        current = (localStorage.getItem("lifeos:theme") as ThemePref) || "system";
      } catch {}
      if (current === "system") {
        apply("system");
        setResolved(mq.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = (pref: ThemePref) => {
    try {
      localStorage.setItem("lifeos:theme", pref);
    } catch {}
    setThemeState(pref);
    apply(pref);
    setResolved(document.documentElement.classList.contains("dark") ? "dark" : "light");
  };

  return { theme, resolved, setTheme, toggle: () => setTheme(resolved === "dark" ? "light" : "dark") };
}

export function setAccent(accent: string) {
  document.documentElement.dataset.accent = accent;
  try {
    localStorage.setItem("lifeos:accent", accent);
  } catch {}
}
