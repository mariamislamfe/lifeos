"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CornerDownLeft, Inbox, Moon, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { buildSearchIndex, searchEntries } from "@/lib/search";
import { Modal } from "@/components/ui/overlay";
import { Kbd } from "@/components/ui/primitives";
import { EDITOR_META, QUICK_ADD_KINDS, useEditor } from "@/components/editor/editor-provider";
import { ALL_NAV } from "./nav";
import { useShell } from "./shell-context";

interface Command {
  key: string;
  group: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
  keywords?: string;
  done?: boolean;
}

export function CommandPalette() {
  const { paletteOpen: open, setPaletteOpen, setCaptureOpen } = useShell();
  const { data } = useData();
  const editor = useEditor();
  const router = useRouter();
  const { toggle } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const close = () => setPaletteOpen(false);
  const index = useMemo(() => (open ? buildSearchIndex(data) : []), [data, open]);

  const commands = useMemo<Command[]>(() => {
    const actions: Command[] = [
      ...QUICK_ADD_KINDS.map((k) => ({
        key: `add-${k}`,
        group: "Create",
        label: `Add ${EDITOR_META[k].label.toLowerCase()}`,
        icon: EDITOR_META[k].icon,
        run: () => editor.open(k),
        keywords: `new create ${k}`,
      })),
      { key: "add-course", group: "Create", label: "Add class to timetable", icon: EDITOR_META.course.icon, run: () => editor.open("course"), keywords: "university lecture lab section" },
      { key: "capture", group: "Create", label: "Quick capture", hint: "C", icon: Inbox, run: () => setCaptureOpen(true), keywords: "inbox dump brain" },
      { key: "theme", group: "Preferences", label: "Toggle dark mode", icon: Moon, run: toggle, keywords: "theme light dark" },
    ];
    const nav: Command[] = ALL_NAV.map((n) => ({
      key: `nav-${n.href}`,
      group: "Go to",
      label: `Open ${n.label.toLowerCase()}`,
      icon: n.icon,
      run: () => router.push(n.href),
      keywords: n.label,
    }));
    return [...actions, ...nav];
  }, [editor, router, setCaptureOpen, toggle]);

  const results = useMemo<Command[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const pick = ["add-task", "add-reminder", "add-event", "add-deadline", "capture", "nav-/calendar", "nav-/projects", "nav-/applications", "nav-/today"];
      return pick.map((k) => commands.find((c) => c.key === k)!).filter(Boolean);
    }
    const tokens = q.split(/\s+/);
    const matchedCommands = commands.filter((c) => tokens.every((t) => `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(t))).slice(0, 5);
    const found = searchEntries(index, q, 30).map<Command>((e) => ({
      key: e.key,
      group: e.group,
      label: e.title,
      hint: e.subtitle,
      icon: e.icon,
      run: () => router.push(e.href),
      done: e.done,
    }));
    return [...found, ...matchedCommands];
  }, [query, commands, index, router]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const grouped = useMemo(() => {
    const map = new Map<string, { cmd: Command; idx: number }[]>();
    results.forEach((cmd, idx) => {
      if (!map.has(cmd.group)) map.set(cmd.group, []);
      map.get(cmd.group)!.push({ cmd, idx });
    });
    return [...map.entries()];
  }, [results]);

  const run = (cmd?: Command) => {
    if (!cmd) return;
    close();
    // Let the palette close before opening another modal.
    setTimeout(cmd.run, 10);
  };

  return (
    <Modal open={open} onClose={close} size="md" label="Command palette" className="sm:max-w-2xl">
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="h-[18px] w-[18px] shrink-0 text-subtle" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              run(results[active]);
            }
          }}
          placeholder="Search everything, or type a command…"
          className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
        />
        <Kbd className="hidden sm:inline-flex">Esc</Kbd>
      </div>
      <div ref={listRef} className="scrollbar-thin max-h-[60vh] overflow-y-auto p-2 sm:max-h-[420px]">
        {results.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted">
            No results for “{query}”.
            <div className="mt-1 text-xs text-subtle">Try a project, course, person or keyword.</div>
          </div>
        ) : (
          grouped.map(([group, items]) => (
            <div key={group} className="mb-1">
              <div className="px-2.5 pt-2 pb-1 text-[11px] font-medium tracking-wide text-subtle uppercase">{group}</div>
              {items.map(({ cmd, idx }) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.key}
                    data-idx={idx}
                    onMouseMove={() => setActive(idx)}
                    onClick={() => run(cmd)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                      active === idx ? "bg-surface-2" : "",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active === idx ? "text-accent" : "text-subtle")} />
                    <span className={cn("truncate text-[13px]", cmd.done && "text-subtle line-through")}>{cmd.label}</span>
                    {cmd.hint && <span className="truncate text-xs text-subtle">{cmd.hint}</span>}
                    <span className="ml-auto shrink-0">
                      {active === idx ? <CornerDownLeft className="h-3.5 w-3.5 text-subtle" /> : <ArrowRight className="h-3.5 w-3.5 text-transparent" />}
                    </span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
      <div className="hidden items-center gap-4 border-t border-line bg-surface-2/50 px-4 py-2 text-[11px] text-subtle sm:flex">
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> navigate
        </span>
        <span className="flex items-center gap-1">
          <Kbd>↵</Kbd> open
        </span>
        <span className="ml-auto flex items-center gap-1">
          <Kbd>N</Kbd> new task
          <Kbd className="ml-2">C</Kbd> capture
        </span>
      </div>
    </Modal>
  );
}
