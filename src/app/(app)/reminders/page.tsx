"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import { AlarmClock, Bell, BellOff, BellRing, Check, Clock, Plus, Repeat, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { friendlyDate, relativeLabel, toTimeString } from "@/lib/date";
import { offsetLabel, REMINDER_PRESETS } from "@/lib/reminders";
import type { Reminder } from "@/lib/types";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { Menu } from "@/components/ui/overlay";
import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { useEditor } from "@/components/editor/editor-provider";
import { notificationsSupported, requestNotificationPermission } from "@/components/shell/reminder-engine";

const SOURCE_HREF: Record<string, (id: string) => string> = {
  task: (id) => `/tasks?open=${id}`,
  deadline: (id) => `/deadlines?open=${id}`,
  event: (id) => `/events?open=${id}`,
  application: (id) => `/applications?open=${id}`,
  study_session: (id) => `/study?open=${id}`,
};

export default function RemindersPage() {
  const { data, update, remove } = useData();
  const now = useNow(30_000);
  const editor = useEditor();
  const [permission, setPermission] = useState<string>("default");
  useEffect(() => setPermission(notificationsSupported() ? Notification.permission : "unsupported"), []);

  const { groups, past } = useMemo(() => {
    const active = data.reminders.filter((r) => !r.done && !r.fired_at).sort((a, b) => a.remind_at.localeCompare(b.remind_at));
    const g = { Today: [] as Reminder[], Tomorrow: [] as Reminder[], "This week": [] as Reminder[], Later: [] as Reminder[] };
    for (const r of active) {
      const d = differenceInCalendarDays(new Date(r.remind_at), now);
      if (d <= 0) g.Today.push(r);
      else if (d === 1) g.Tomorrow.push(r);
      else if (d <= 7) g["This week"].push(r);
      else g.Later.push(r);
    }
    const past = data.reminders.filter((r) => r.done || r.fired_at).sort((a, b) => b.remind_at.localeCompare(a.remind_at)).slice(0, 30);
    return { groups: g, past };
  }, [data.reminders, now]);

  const snooze = (r: Reminder, mins: number) =>
    update("reminders", r.id, { remind_at: new Date(Math.max(Date.now(), new Date(r.remind_at).getTime()) + mins * 60000).toISOString(), fired_at: null, done: false });

  const Row = ({ r, faded }: { r: Reminder; faded?: boolean }) => {
    const at = new Date(r.remind_at);
    const source = r.source_type && r.source_id ? SOURCE_HREF[r.source_type]?.(r.source_id) : null;
    return (
      <div className={cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2", faded && "opacity-60")}>
        <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", faded ? "bg-surface-2 text-subtle" : "bg-amber-500/10 text-amber-600 dark:text-amber-400")}>
          {r.repeat !== "none" ? <Repeat className="h-4 w-4" /> : faded ? <BellOff className="h-4 w-4" /> : <AlarmClock className="h-4 w-4" />}
        </div>
        <button onClick={() => !r.source_id && editor.open("reminder", { id: r.id })} className="min-w-0 flex-1 text-left">
          <div className={cn("truncate text-[14px] font-medium", r.done && "line-through")}>{r.title}</div>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-subtle">
            <span className="tabular">
              {friendlyDate(at, now)} · {toTimeString(at)}
            </span>
            {r.offset_minutes != null && <span>{offsetLabel(r.offset_minutes)}</span>}
            {r.repeat !== "none" && <span className="capitalize">Repeats {r.repeat}</span>}
            {source && (
              <Link href={source} onClick={(e) => e.stopPropagation()} className="capitalize hover:text-fg">
                ↗ {r.source_type?.replace("_", " ")}
              </Link>
            )}
          </div>
        </button>
        {!faded && <Badge className="hidden sm:inline-flex">{relativeLabel(at, now)}</Badge>}
        <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          {!faded && (
            <Menu
              trigger={(p) => (
                <Button {...p} size="icon-sm" variant="ghost" aria-label="Snooze">
                  <Clock />
                </Button>
              )}
              items={[
                { label: "Snooze 10 minutes", onSelect: () => snooze(r, 10) },
                { label: "Snooze 1 hour", onSelect: () => snooze(r, 60) },
                { label: "Snooze until tomorrow", onSelect: () => snooze(r, 1440) },
              ]}
            />
          )}
          <Button size="icon-sm" variant="ghost" aria-label={r.done ? "Restore" : "Done"} onClick={() => update("reminders", r.id, { done: !r.done })}>
            <Check />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => remove("reminders", r.id, { label: "Reminder" })}>
            <Trash2 />
          </Button>
        </div>
      </div>
    );
  };

  const total = Object.values(groups).reduce((n, g) => n + g.length, 0);

  return (
    <Page>
      <PageHeader
        title="Reminders"
        description={`${total} scheduled`}
        actions={
          <Button variant="primary" size="sm" onClick={() => editor.open("reminder")}>
            <Plus /> Reminder
          </Button>
        }
      />

      {permission !== "granted" && (
        <Card className="mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <BellRing className="h-5 w-5 shrink-0 text-accent" />
          <div className="flex-1 text-sm">
            <div className="font-medium">Browser notifications are {permission === "denied" ? "blocked" : permission === "unsupported" ? "not supported here" : "off"}</div>
            <div className="text-muted">
              {permission === "denied"
                ? "Allow notifications for this site in your browser settings to get pop-up reminders."
                : "Reminders still show inside LifeOS; enable notifications to see them even when this tab is in the background."}
            </div>
          </div>
          {permission === "default" && (
            <Button size="sm" variant="primary" onClick={async () => setPermission(await requestNotificationPermission())}>
              Enable
            </Button>
          )}
        </Card>
      )}

      <Card className="mb-6 p-4">
        <div className="mb-2 text-[13px] font-semibold">Reminder presets</div>
        <p className="mb-3 text-xs text-muted">Pick these when creating any deadline, task, event, application or study session — LifeOS schedules them for you.</p>
        <div className="flex flex-wrap gap-1.5">
          {REMINDER_PRESETS.map((p) => (
            <Badge key={p.minutes} className="h-6 px-2">
              <Bell className="h-3 w-3" /> {p.label}
            </Badge>
          ))}
          <Badge className="h-6 px-2">+ custom</Badge>
        </div>
      </Card>

      {total === 0 && past.length === 0 ? (
        <EmptyState
          icon={<Bell />}
          title="No reminders yet"
          description="Remind yourself about anything — once, or on repeat."
          action={
            <Button variant="primary" onClick={() => editor.open("reminder")}>
              <Plus /> Add reminder
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {(Object.keys(groups) as (keyof typeof groups)[]).map((g) =>
            groups[g].length ? (
              <section key={g}>
                <h2 className="mb-2 px-1 text-[13px] font-semibold">{g}</h2>
                <Card className="p-1.5">
                  {groups[g].map((r) => (
                    <Row key={r.id} r={r} />
                  ))}
                </Card>
              </section>
            ) : null,
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-[13px] font-semibold text-subtle">Delivered & done</h2>
              <Card className="p-1.5">
                {past.map((r) => (
                  <Row key={r.id} r={r} faded />
                ))}
              </Card>
            </section>
          )}
        </div>
      )}
    </Page>
  );
}
