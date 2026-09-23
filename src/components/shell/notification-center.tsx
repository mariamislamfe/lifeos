"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlarmClock, Bell, BellRing, Check, CheckCheck, Flag, AlertTriangle, CalendarClock, X } from "lucide-react";
import { differenceInCalendarDays, endOfDay, addDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { toTimeString, friendlyDate, relativeLabel, shortRelative } from "@/lib/date";
import { buildAgenda } from "@/lib/agenda";
import { nextRepeat } from "@/lib/reminders";
import { Button } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/page";
import { useShell } from "./shell-context";

type Entry = {
  key: string;
  icon: "reminder" | "deadline" | "overdue" | "event" | "fired";
  title: string;
  meta: string;
  at: Date;
  href: string;
  reminderId?: string;
  notificationId?: string;
  unread?: boolean;
};

function useEntries() {
  const { data } = useData();
  const now = useNow(60_000);
  return useMemo(() => {
    const horizon = endOfDay(addDays(now, 7));
    const entries: Entry[] = [];

    for (const r of data.reminders) {
      if (r.done) continue;
      const at = new Date(r.remind_at);
      if (at > horizon) continue;
      if (r.fired_at && r.repeat === "none") continue;
      entries.push({
        key: `r${r.id}`,
        icon: "reminder",
        title: r.title,
        meta: at < now ? `Was due ${shortRelative(at, now)}` : `Reminder · ${toTimeString(at)}`,
        at,
        href: "/reminders",
        reminderId: r.id,
      });
    }
    for (const d of data.deadlines) {
      if (d.status === "done") continue;
      const at = new Date(d.due_at);
      if (at > horizon) continue;
      entries.push({
        key: `d${d.id}`,
        icon: at < now ? "overdue" : "deadline",
        title: d.title,
        meta: at < now ? `Overdue · ${relativeLabel(at, now)}` : `Deadline · ${toTimeString(at)}`,
        at: at < now ? startOfDay(now) : at,
        href: `/deadlines?open=${d.id}`,
      });
    }
    for (const t of data.tasks) {
      if (t.status === "done" || !t.due_date || t.parent_id) continue;
      if (differenceInCalendarDays(new Date(t.due_date), now) >= 0) continue;
      entries.push({ key: `t${t.id}`, icon: "overdue", title: t.title, meta: "Overdue task", at: startOfDay(now), href: `/tasks?open=${t.id}` });
    }
    for (const item of buildAgenda(data, now, horizon)) {
      if (item.kind !== "event" && item.kind !== "class") continue;
      if (item.kind === "class" && differenceInCalendarDays(item.start, now) > 1) continue;
      entries.push({
        key: `e${item.key}`,
        icon: "event",
        title: item.title,
        meta: `${item.kind === "class" ? "Class" : "Event"} · ${item.allDay ? "All day" : toTimeString(item.start)}${item.subtitle ? ` · ${item.subtitle}` : ""}`,
        at: item.start,
        href: item.href,
      });
    }

    const fired = data.notifications
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 20)
      .map<Entry>((n) => ({
        key: `n${n.id}`,
        icon: "fired",
        title: n.title,
        meta: n.body ?? "",
        at: new Date(n.created_at),
        href: "#",
        notificationId: n.id,
        unread: !n.read_at,
      }));

    entries.sort((a, b) => a.at.getTime() - b.at.getTime());
    const groups = {
      Today: entries.filter((e) => differenceInCalendarDays(e.at, now) <= 0),
      Tomorrow: entries.filter((e) => differenceInCalendarDays(e.at, now) === 1),
      Upcoming: entries.filter((e) => differenceInCalendarDays(e.at, now) > 1),
    };
    return { groups, fired, now };
  }, [data, now]);
}

export function useNotificationCount() {
  const { data } = useData();
  const now = useNow(60_000);
  return useMemo(() => {
    const unread = data.notifications.filter((n) => !n.read_at).length;
    const overdue =
      data.deadlines.filter((d) => d.status !== "done" && new Date(d.due_at) < now).length +
      data.tasks.filter((t) => t.status !== "done" && !t.parent_id && t.due_date && differenceInCalendarDays(new Date(t.due_date), now) < 0).length;
    return unread + overdue;
  }, [data, now]);
}

const ICONS = {
  reminder: { icon: AlarmClock, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  deadline: { icon: Flag, className: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  overdue: { icon: AlertTriangle, className: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  event: { icon: CalendarClock, className: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  fired: { icon: BellRing, className: "bg-accent/10 text-accent" },
};

export function NotificationCenter() {
  const { notificationsOpen: open, setNotificationsOpen } = useShell();
  const { groups, fired, now } = useEntries();
  const { data, update } = useData();
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNotificationsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setNotificationsOpen]);

  if (!mounted || !open) return null;
  const close = () => setNotificationsOpen(false);
  const total = groups.Today.length + groups.Tomorrow.length + groups.Upcoming.length;
  const unread = fired.filter((f) => f.unread).length;

  const dismissReminder = (id: string) => {
    const r = data.reminders.find((x) => x.id === id);
    if (!r) return;
    if (r.repeat !== "none") update("reminders", id, { remind_at: nextRepeat(new Date(r.remind_at), r.repeat).toISOString(), fired_at: null });
    else update("reminders", id, { done: true });
  };

  const markAllRead = () => {
    for (const n of data.notifications) if (!n.read_at) update("notifications", n.id, { read_at: new Date().toISOString() });
  };

  const row = (e: Entry) => {
    const I = ICONS[e.icon];
    const Icon = I.icon;
    return (
      <div key={e.key} className="group relative flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2">
        <div className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg", I.className)}>
          <Icon className="h-4 w-4" />
        </div>
        <Link href={e.href} onClick={close} className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-medium">{e.title}</span>
            {e.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
          </div>
          <div className="truncate text-xs text-muted">{e.meta}</div>
        </Link>
        <span className="tabular shrink-0 pt-0.5 text-[11px] text-subtle">
          {e.icon === "fired" ? shortRelative(e.at, now) : differenceInCalendarDays(e.at, now) > 1 ? friendlyDate(e.at, now) : ""}
        </span>
        {e.reminderId && (
          <button
            onClick={() => dismissReminder(e.reminderId!)}
            className="absolute top-2 right-2 hidden h-7 w-7 place-items-center rounded-lg bg-surface text-muted shadow-soft ring-1 ring-line group-hover:grid hover:text-fg"
            title="Mark done"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="animate-fade-in absolute inset-0 bg-black/20 dark:bg-black/50" onClick={close} />
      <aside className="animate-slide-in-right absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-surface shadow-pop sm:inset-y-2 sm:right-2 sm:rounded-2xl sm:border">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <Bell className="h-4 w-4 text-subtle" /> Notifications
          </div>
          <div className="flex items-center gap-1">
            {tab === "history" && unread > 0 && (
              <Button size="sm" variant="ghost" onClick={markAllRead}>
                <CheckCheck /> Mark all read
              </Button>
            )}
            <button onClick={close} className="grid h-8 w-8 place-items-center rounded-lg text-subtle hover:bg-surface-2 hover:text-fg" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex gap-1 border-b border-line px-5">
          {(["upcoming", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "-mb-px border-b-2 px-1 pb-2.5 text-[13px] font-medium transition-colors",
                tab === t ? "border-accent text-fg" : "border-transparent text-subtle hover:text-muted",
                t === "history" && "ml-4",
              )}
            >
              {t === "upcoming" ? `Upcoming · ${total}` : `Delivered${unread ? ` · ${unread}` : ""}`}
            </button>
          ))}
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-2 py-3">
          {tab === "upcoming" ? (
            total === 0 ? (
              <EmptyState compact icon={<Bell />} title="All clear" description="Nothing needs your attention this week." />
            ) : (
              (["Today", "Tomorrow", "Upcoming"] as const).map((g) =>
                groups[g].length ? (
                  <div key={g} className="mb-3">
                    <div className="px-3 pt-1 pb-1.5 text-[11px] font-medium tracking-wide text-subtle uppercase">{g}</div>
                    {groups[g].map(row)}
                  </div>
                ) : null,
              )
            )
          ) : fired.length === 0 ? (
            <EmptyState compact icon={<BellRing />} title="No notifications yet" description="Reminders appear here when they go off." />
          ) : (
            fired.map(row)
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
