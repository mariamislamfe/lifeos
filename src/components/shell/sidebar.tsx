"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Inbox, Moon, Plus, Search, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { toISODate } from "@/lib/date";
import { Kbd } from "@/components/ui/primitives";
import { Menu } from "@/components/ui/overlay";
import { EDITOR_META, QUICK_ADD_KINDS, useEditor } from "@/components/editor/editor-provider";
import { NAV_FOOTER, NAV_LIFE, NAV_MAIN, NAV_TRACK, isActive, type NavItem } from "./nav";
import { useShell } from "./shell-context";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative grid h-7 w-7 place-items-center rounded-[9px] bg-accent shadow-[0_1px_0_rgb(255_255_255/0.2)_inset,0_2px_6px_-1px_var(--ring)]">
        <div className="h-3.5 w-3.5 rounded-full border-[2.5px] border-accent-fg" />
        <div className="absolute h-1 w-1 rounded-full bg-accent-fg" />
      </div>
      <span className="text-[15px] font-semibold tracking-tight">LifeOS</span>
    </div>
  );
}

export function useNavBadges() {
  const { data } = useData();
  return useMemo(() => {
    const today = toISODate(new Date());
    const now = Date.now();
    return {
      today: data.tasks.filter((t) => t.status !== "done" && !t.parent_id && (t.due_date === today || t.plan_date === today)).length,
      inbox: data.notes.filter((n) => n.inbox).length,
      overdue: data.deadlines.filter((d) => d.status !== "done" && new Date(d.due_at).getTime() < now).length,
      reminders: data.reminders.filter((r) => !r.done && new Date(r.remind_at).getTime() > now).length,
    };
  }, [data]);
}

function NavLink({ item, badges }: { item: NavItem; badges: ReturnType<typeof useNavBadges> }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const count = item.badge ? badges[item.badge] : 0;
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors duration-150",
        active ? "bg-surface text-fg shadow-soft ring-1 ring-line" : "text-muted hover:bg-surface-2 hover:text-fg",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-accent" : "text-subtle group-hover:text-muted")} strokeWidth={active ? 2.2 : 1.9} />
      <span className="flex-1 truncate">{item.label}</span>
      {count > 0 && (
        <span
          className={cn(
            "tabular min-w-5 rounded-md px-1.5 text-center text-[11px] leading-5 font-medium",
            item.badge === "overdue" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "text-subtle",
          )}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

function Group({ label, items, badges }: { label?: string; items: NavItem[]; badges: ReturnType<typeof useNavBadges> }) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && <div className="px-2.5 pt-4 pb-1.5 text-[11px] font-medium tracking-wide text-subtle uppercase">{label}</div>}
      {items.map((item) => (
        <NavLink key={item.href} item={item} badges={badges} />
      ))}
    </div>
  );
}

export function Sidebar() {
  const badges = useNavBadges();
  const { setPaletteOpen, setCaptureOpen } = useShell();
  const editor = useEditor();
  const { resolved, toggle } = useTheme();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-bg lg:flex">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/">
          <Logo />
        </Link>
        <button
          onClick={toggle}
          className="grid h-7 w-7 place-items-center rounded-lg text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          aria-label="Toggle theme"
        >
          {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex flex-col gap-1.5 px-3 pb-2">
        <div className="flex gap-1.5">
          <Menu
            align="start"
            className="w-56"
            trigger={(p) => (
              <button
                {...p}
                className="flex h-8 flex-1 items-center gap-2 rounded-lg bg-accent px-2.5 text-[13px] font-medium text-accent-fg shadow-[0_1px_0_rgb(255_255_255/0.15)_inset] transition-colors hover:bg-accent-strong"
              >
                <Plus className="h-4 w-4" strokeWidth={2.4} /> Add
              </button>
            )}
            items={QUICK_ADD_KINDS.map((k) => {
              const Icon = EDITOR_META[k].icon;
              return { label: EDITOR_META[k].label, icon: <Icon />, onSelect: () => editor.open(k), hint: k === "task" ? "N" : undefined };
            })}
          />
          <button
            onClick={() => setCaptureOpen(true)}
            title="Quick capture (C)"
            className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-muted shadow-soft transition-colors hover:text-fg"
          >
            <Inbox className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex h-8 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-subtle shadow-soft transition-colors hover:border-line-strong hover:text-muted"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Search or jump to…</span>
          <Kbd>⌘K</Kbd>
        </button>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-3">
        <Group items={NAV_MAIN} badges={badges} />
        <Group label="Life" items={NAV_LIFE} badges={badges} />
        <Group label="Track" items={NAV_TRACK} badges={badges} />
      </nav>

      <div className="border-t border-line px-3 py-2.5">
        <Group items={NAV_FOOTER} badges={badges} />
      </div>
    </aside>
  );
}
