"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, CalendarDays, Inbox, LayoutDashboard, LayoutGrid, Moon, Plus, Search, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { Modal } from "@/components/ui/overlay";
import { EDITOR_META, QUICK_ADD_KINDS, useEditor } from "@/components/editor/editor-provider";
import { NAV_FOOTER, NAV_LIFE, NAV_MAIN, NAV_TRACK, isActive } from "./nav";
import { Logo, useNavBadges } from "./sidebar";
import { useShell } from "./shell-context";
import { useNotificationCount } from "./notification-center";

export function TopBar() {
  const { setPaletteOpen, setNotificationsOpen, setCaptureOpen } = useShell();
  const count = useNotificationCount();
  const { profile } = useData();
  const { resolved, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const initials = (profile?.full_name ?? "M").trim().slice(0, 1).toUpperCase();

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 items-center justify-between gap-2 px-4 transition-[background-color,border-color] duration-200 sm:px-6 lg:px-10",
        scrolled ? "border-b border-line bg-bg/80 backdrop-blur-xl" : "border-b border-transparent",
      )}
    >
      <Link href="/" className="lg:hidden">
        <Logo />
      </Link>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-1">
        <button onClick={() => setPaletteOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg lg:hidden" aria-label="Search">
          <Search className="h-[18px] w-[18px]" />
        </button>
        <button onClick={() => setCaptureOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg lg:hidden" aria-label="Quick capture">
          <Inbox className="h-[18px] w-[18px]" />
        </button>
        <button onClick={toggle} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg lg:hidden" aria-label="Toggle theme">
          {resolved === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
        <button
          onClick={() => setNotificationsOpen(true)}
          className="relative grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          {count > 0 && (
            <span className="tabular absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-fg ring-2 ring-bg">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
        <Link
          href="/profile"
          className="ml-1 hidden h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-accent/80 to-accent text-[13px] font-semibold text-accent-fg ring-2 ring-surface lg:grid"
          aria-label="Profile"
        >
          {initials}
        </Link>
      </div>
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const editor = useEditor();
  const badges = useNavBadges();
  const [moreOpen, setMoreOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const tab = (href: string, label: string, Icon: typeof LayoutDashboard) => {
    const active = isActive(pathname, href);
    return (
      <Link href={href} className={cn("flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors", active ? "text-fg" : "text-subtle")}>
        <Icon className={cn("h-[22px] w-[22px]", active && "text-accent")} strokeWidth={active ? 2.2 : 1.8} />
        {label}
      </Link>
    );
  };

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-md items-center px-2">
          {tab("/", "Home", LayoutDashboard)}
          {tab("/today", "Today", Sun)}
          <div className="flex flex-1 justify-center">
            <button
              onClick={() => setAddOpen(true)}
              className="-mt-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-fg shadow-[0_8px_24px_-6px_var(--ring)] transition-transform active:scale-95"
              aria-label="Add"
            >
              <Plus className="h-6 w-6" strokeWidth={2.4} />
            </button>
          </div>
          {tab("/calendar", "Calendar", CalendarDays)}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn("flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium", moreOpen ? "text-fg" : "text-subtle")}
          >
            <LayoutGrid className="h-[22px] w-[22px]" strokeWidth={1.8} />
            More
          </button>
        </div>
      </nav>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} label="Add">
        <div className="px-5 pt-3 pb-2 text-[15px] font-semibold">Add something</div>
        <div className="grid grid-cols-3 gap-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {QUICK_ADD_KINDS.map((k) => {
            const Icon = EDITOR_META[k].icon;
            return (
              <button
                key={k}
                onClick={() => {
                  setAddOpen(false);
                  editor.open(k);
                }}
                className="flex flex-col items-center gap-2 rounded-2xl bg-surface-2 px-2 py-4 text-xs font-medium transition-colors active:bg-surface-3"
              >
                <Icon className="h-5 w-5 text-accent" />
                {EDITOR_META[k].label}
              </button>
            );
          })}
        </div>
      </Modal>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} label="Navigation">
        <div className="scrollbar-thin overflow-y-auto px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {[
            { label: "Plan", items: NAV_MAIN },
            { label: "Life", items: NAV_LIFE },
            { label: "Track", items: [...NAV_TRACK, ...NAV_FOOTER] },
          ].map((g) => (
            <div key={g.label} className="mb-4">
              <div className="mb-2 px-1 text-[11px] font-medium tracking-wide text-subtle uppercase">{g.label}</div>
              <div className="grid grid-cols-4 gap-2">
                {g.items.map((item) => {
                  const Icon = item.icon;
                  const count = item.badge ? badges[item.badge] : 0;
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "relative flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-[11px] font-medium transition-colors",
                        active ? "bg-accent/10 text-accent" : "bg-surface-2 text-muted",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="truncate">{item.label}</span>
                      {count > 0 && <span className="absolute top-1.5 right-2 h-1.5 w-1.5 rounded-full bg-accent" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
