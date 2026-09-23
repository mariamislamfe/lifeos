"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useEditor } from "@/components/editor/editor-provider";

interface ShellContextValue {
  paletteOpen: boolean;
  setPaletteOpen(v: boolean): void;
  captureOpen: boolean;
  setCaptureOpen(v: boolean): void;
  notificationsOpen: boolean;
  setNotificationsOpen(v: boolean): void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

function isTyping(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const editor = useEditor();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (mod && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setCaptureOpen(true);
        return;
      }
      if (mod || e.altKey || isTyping(e) || document.querySelector('[role="dialog"]')) return;
      if (e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.key === "c") {
        e.preventDefault();
        setCaptureOpen(true);
      } else if (e.key === "n") {
        e.preventDefault();
        editor.open("task");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor]);

  const value = useMemo(
    () => ({ paletteOpen, setPaletteOpen, captureOpen, setCaptureOpen, notificationsOpen, setNotificationsOpen }),
    [paletteOpen, captureOpen, notificationsOpen],
  );
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside <ShellProvider>");
  return ctx;
}
