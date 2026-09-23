"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import {
  AlarmClock,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock,
  Flag,
  FolderKanban,
  Inbox,
  Plus,
  Send,
  Sparkles,
  Sun,
} from "lucide-react";
import { addDays, differenceInMinutes, endOfDay, format, isSameDay, startOfDay } from "date-fns";
import { cn, formatMinutes, pluralize } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { agendaForDay, buildAgenda, happeningNow, projectProgress, smartAlerts, sortAgenda, upNext, type AgendaItem, type SmartAlert } from "@/lib/agenda";
import { dayProgress, friendlyDate, greeting, relativeLabel, toISODate, toTimeString, urgencyOf } from "@/lib/date";
import { ACTIVE_APPLICATION_STATUSES, APPLICATION_STATUS_DOT, APPLICATION_STATUS_LABEL, color as colorOf } from "@/lib/meta";
import { Button, Card, CheckCircle, ProgressBar, ProgressRing, SectionHeader, UrgencyBadge } from "@/components/ui/primitives";
import { EmptyState, Page } from "@/components/ui/page";
import { AgendaRow, KindIcon, useAgendaActions } from "@/components/items/item-rows";
import { useEditor } from "@/components/editor/editor-provider";
import { useShell } from "@/components/shell/shell-context";
import { notificationsSupported, requestNotificationPermission } from "@/components/shell/reminder-engine";

const ALERT_STYLE: Record<SmartAlert["tone"], string> = {
  overdue: "bg-rose-500/[0.07] text-rose-700 ring-rose-500/15 dark:text-rose-300",
  today: "bg-orange-500/[0.07] text-orange-700 ring-orange-500/15 dark:text-orange-300",
  soon: "bg-amber-500/[0.07] text-amber-800 ring-amber-500/15 dark:text-amber-200",
  info: "bg-surface-2 text-muted ring-line",
};
const ALERT_DOT: Record<SmartAlert["tone"], string> = { overdue: "bg-rose-500", today: "bg-orange-500", soon: "bg-amber-500", info: "bg-zinc-400" };

export default function DashboardPage() {
  const { data, profile, toggleTask } = useData();
  const now = useNow(20_000);
  const editor = useEditor();
  const { setCaptureOpen } = useShell();
  const { toggle, canToggle } = useAgendaActions();
  const today = toISODate(now);
  const name = (profile?.full_name ?? "Mariam").split(" ")[0];

  const todayItems = useMemo(() => {
    const items = agendaForDay(data, now);
    // Tasks planned for today (without a due date today) also belong on today's list.
    const planned = data.tasks
      .filter((t) => t.plan_date === today && t.due_date !== today && !t.parent_id)
      .map<AgendaItem>((t) => ({
        key: `task:${t.id}`,
        kind: "task",
        id: t.id,
        table: "tasks",
        title: t.title,
        subtitle: "Planned for today",
        category: t.category ?? "Task",
        start: startOfDay(now),
        end: null,
        allDay: true,
        color: "iris",
        priority: t.priority,
        done: t.status === "done",
        href: `/tasks?open=${t.id}`,
        movable: true,
      }));
    return sortAgenda([...items, ...planned]);
  }, [data, now, today]);

  const running = happeningNow(todayItems, now);
  const next = useMemo(() => upNext(data, now, 6), [data, now]);
  const alerts = useMemo(() => smartAlerts(data, now), [data, now]);
  const nextTimed = next.find((n) => !n.item.allDay);

  const focusTask = useMemo(() => {
    const open = data.tasks.filter((t) => t.status !== "done" && !t.parent_id);
    const must = open.filter((t) => t.plan_date === today && t.plan_bucket === "must").sort((a, b) => a.plan_order - b.plan_order);
    if (must[0]) return must[0];
    const rank = { urgent: 0, high: 1, medium: 2, low: 3 };
    return open
      .filter((t) => t.due_date && t.due_date <= today)
      .sort((a, b) => rank[a.priority] - rank[b.priority] || (a.due_time ?? "99").localeCompare(b.due_time ?? "99"))[0];
  }, [data.tasks, today]);

  const dueSoon = useMemo(
    () =>
      data.deadlines
        .filter((d) => d.status !== "done" && new Date(d.due_at) <= endOfDay(addDays(now, 7)))
        .sort((a, b) => a.due_at.localeCompare(b.due_at))
        .slice(0, 5),
    [data.deadlines, now],
  );

  const remindersToday = useMemo(
    () =>
      data.reminders
        .filter((r) => !r.done && isSameDay(new Date(r.remind_at), now))
        .sort((a, b) => a.remind_at.localeCompare(b.remind_at)),
    [data.reminders, now],
  );

  const stats = useMemo(() => {
    const tasksToday = todayItems.filter((i) => i.kind === "task");
    const weekEnd = endOfDay(addDays(now, 7));
    const nextEvent = buildAgenda(data, now, weekEnd).find((i) => (i.kind === "event" || i.kind === "class") && i.start > now);
    const studyToday = data.study_sessions.filter((s) => s.date === today && s.completed).reduce((sum, s) => sum + (s.actual_minutes ?? s.planned_minutes), 0);
    return {
      tasksDone: tasksToday.filter((t) => t.done).length,
      tasksTotal: tasksToday.length,
      deadlinesWeek: data.deadlines.filter((d) => d.status !== "done" && new Date(d.due_at) <= weekEnd).length,
      nextEvent,
      applications: data.applications.filter((a) => ACTIVE_APPLICATION_STATUSES.includes(a.status)).length,
      projects: data.projects.filter((p) => p.status === "active").length,
      studyToday,
    };
  }, [data, now, today, todayItems]);

  const activeProjects = data.projects.filter((p) => p.status === "active").slice(0, 4);
  const pipeline = ACTIVE_APPLICATION_STATUSES.map((s) => ({ status: s, count: data.applications.filter((a) => a.status === s).length })).filter((p) => p.count);
  const inbox = data.notes.filter((n) => n.inbox).length;
  const remaining = todayItems.filter((i) => !i.done && (i.allDay || (i.end ?? i.start) > now)).length;

  const summary = [
    remaining ? `${pluralize(remaining, "thing")} left today` : "your day is clear",
    stats.deadlinesWeek ? `${pluralize(stats.deadlinesWeek, "deadline")} this week` : null,
  ]
    .filter(Boolean)
    .join(" and ");

  return (
    <Page wide>
      {/* Header ----------------------------------------------------------- */}
      <header className="mb-7">
        <div className="flex items-center gap-2 text-[13px] font-medium text-subtle">
          <span>{format(now, "EEEE, MMMM d")}</span>
          <span className="h-1 w-1 rounded-full bg-line-strong" />
          <span className="tabular">{format(now, "HH:mm")}</span>
        </div>
        <h1 className="mt-1.5 font-display text-[40px] leading-[1.05] tracking-[-0.01em] sm:text-[52px]">
          {greeting(now)}, <span className="italic">{name}.</span>
        </h1>
        <p className="mt-2 text-[15px] text-muted">You have {summary}.</p>

        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-soft sm:grid-cols-3 lg:grid-cols-6">
          <SummaryCell label="Day progress" value={`${dayProgress(now)}%`}>
            <ProgressBar value={dayProgress(now)} className="mt-2 h-1" />
          </SummaryCell>
          <SummaryCell label="Tasks today" value={stats.tasksTotal ? `${stats.tasksDone}/${stats.tasksTotal}` : "—"} href="/today" />
          <SummaryCell label="Deadlines · 7d" value={String(stats.deadlinesWeek)} href="/deadlines" tone={stats.deadlinesWeek ? "warn" : undefined} />
          <SummaryCell
            label="Next event"
            value={stats.nextEvent ? toTimeString(stats.nextEvent.start) : "—"}
            sub={stats.nextEvent ? `${isSameDay(stats.nextEvent.start, now) ? "" : friendlyDate(stats.nextEvent.start, now) + " · "}${stats.nextEvent.title}` : "Nothing scheduled"}
            href="/calendar"
          />
          <SummaryCell label="Applications" value={String(stats.applications)} sub="in progress" href="/applications" />
          <SummaryCell label="Active projects" value={String(stats.projects)} href="/projects" />
        </div>
      </header>

      <NotificationPrompt />

      {/* 1 · NOW ---------------------------------------------------------- */}
      <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-accent uppercase">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            {running.length ? "Happening now" : "Up next"}
          </div>
          {running.length ? (
            <NowBlock item={running[0]} now={now} />
          ) : nextTimed ? (
            <NowBlock item={nextTimed.item} now={now} upcoming />
          ) : (
            <div className="relative mt-3">
              <div className="text-2xl font-semibold tracking-tight">Nothing scheduled</div>
              <p className="mt-1 text-sm text-muted">A clear runway. Pick one thing from your focus list and make progress.</p>
            </div>
          )}

          {alerts.length > 0 && (
            <div className="relative mt-5 flex flex-wrap gap-2">
              {alerts.slice(0, 4).map((a) => (
                <Link key={a.key} href={a.href} className={cn("group flex max-w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ring-1 transition-transform hover:-translate-y-px", ALERT_STYLE[a.tone])}>
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", ALERT_DOT[a.tone])} />
                  <span className="shrink-0 font-semibold">{a.heading}</span>
                  <span className="truncate opacity-80">{a.title}</span>
                </Link>
              ))}
              {alerts.length > 4 && (
                <span className="flex items-center px-1 text-xs text-subtle">+{alerts.length - 4} more</span>
              )}
            </div>
          )}
        </Card>

        <Card className="flex flex-col p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-subtle uppercase">
              <Sparkles className="h-3.5 w-3.5" /> Focus
            </div>
            <Link href="/today" className="text-xs text-subtle hover:text-fg">
              Plan day →
            </Link>
          </div>
          {focusTask ? (
            <div className="mt-3 flex flex-1 flex-col">
              <button onClick={() => editor.open("task", { id: focusTask.id })} className="text-left text-xl leading-snug font-semibold tracking-tight hover:text-accent">
                {focusTask.title}
              </button>
              <div className="mt-1.5 text-sm text-muted">
                {focusTask.due_date ? (focusTask.due_date < today ? "Overdue — clear this first" : focusTask.due_time ? `Due today at ${focusTask.due_time}` : "Due today") : "Your top must-do today"}
              </div>
              <div className="mt-auto flex items-center gap-2 pt-5">
                <Button variant="primary" size="sm" onClick={() => toggleTask(focusTask)}>
                  <CheckCircle2 /> Mark done
                </Button>
                <Button variant="ghost" size="sm" onClick={() => editor.open("task", { id: focusTask.id })}>
                  Open
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-1 flex-col">
              <div className="text-xl font-semibold tracking-tight">You&apos;re all caught up</div>
              <p className="mt-1 text-sm text-muted">Nothing urgent. Use the space for deep work, or plan tomorrow.</p>
              <div className="mt-auto pt-5">
                <Button size="sm" onClick={() => editor.open("task", { initial: { due_date: today } })}>
                  <Plus /> Add a task for today
                </Button>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* 2 · TODAY  +  3 · NEXT / 4 · SOON ------------------------------- */}
      <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card className="min-w-0">
          <SectionHeader
            title="Today"
            icon={<Sun />}
            count={todayItems.length}
            action={
              <div className="flex items-center gap-1">
                <Button size="icon-sm" variant="ghost" onClick={() => editor.open("task", { initial: { due_date: today } })} aria-label="Add to today">
                  <Plus />
                </Button>
                <Link href="/today" className="rounded-lg px-2 py-1 text-xs text-subtle hover:bg-surface-2 hover:text-fg">
                  Open
                </Link>
              </div>
            }
          />
          <div className="px-2 pb-2">
            {todayItems.length === 0 ? (
              <EmptyState compact icon={<Sun />} title="A blank page" description="Nothing on today's agenda yet." action={<Button size="sm" onClick={() => editor.open("task", { initial: { due_date: today } })}><Plus /> Add something</Button>} />
            ) : (
              <TodayTimeline items={todayItems} now={now} />
            )}
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <SectionHeader title="Up next" icon={<Clock />} />
            <div className="px-2 pb-2">
              {next.length === 0 ? (
                <p className="px-3 pb-3 text-sm text-subtle">Nothing coming up in the next three weeks.</p>
              ) : (
                <div className="stagger flex flex-col">
                  {next.slice(0, 5).map(({ item, label }, i) => (
                    <UpNextRow key={item.key} item={item} label={label} first={i === 0} />
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <SectionHeader
              title="Due soon"
              icon={<Flag />}
              action={
                <Link href="/deadlines" className="rounded-lg px-2 py-1 text-xs text-subtle hover:bg-surface-2 hover:text-fg">
                  All
                </Link>
              }
            />
            <div className="px-2 pb-2">
              {dueSoon.length === 0 ? (
                <p className="px-3 pb-3 text-sm text-subtle">No deadlines in the next 7 days. 🌿</p>
              ) : (
                dueSoon.map((d) => {
                  const due = new Date(d.due_at);
                  const u = urgencyOf(due, now);
                  return (
                    <button key={d.id} onClick={() => editor.open("deadline", { id: d.id })} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-surface-2">
                      <CheckCircle checked={false} onChange={() => toggle({ kind: "deadline", id: d.id, done: false } as AgendaItem)} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-medium">{d.title}</div>
                        <div className="tabular text-xs text-subtle">
                          {friendlyDate(due, now)} · {toTimeString(due)}
                        </div>
                      </div>
                      <UrgencyBadge urgency={u} label={u === "soon" || u === "upcoming" ? relativeLabel(due, now) : undefined} />
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          {remindersToday.length > 0 && (
            <Card>
              <SectionHeader title="Reminders today" icon={<BellRing />} count={remindersToday.length} />
              <div className="px-2 pb-2">
                {remindersToday.map((r) => {
                  const at = new Date(r.remind_at);
                  const item = { kind: "reminder", id: r.id, done: r.done } as AgendaItem;
                  return (
                    <div key={r.id} className="flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-surface-2">
                      {canToggle(item) && <CheckCircle checked={r.done} onChange={() => toggle(item)} />}
                      <AlarmClock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <span className="min-w-0 flex-1 truncate text-sm">{r.title}</span>
                      <span className={cn("tabular text-xs", at < now ? "text-subtle" : "text-muted")}>{toTimeString(at)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* 5 · LONG TERM ----------------------------------------------------- */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <SectionHeader
            title="Projects"
            icon={<FolderKanban />}
            action={
              <Link href="/projects" className="rounded-lg px-2 py-1 text-xs text-subtle hover:bg-surface-2 hover:text-fg">
                All
              </Link>
            }
          />
          <div className="flex flex-col gap-1 px-2 pb-3">
            {activeProjects.length === 0 ? (
              <EmptyState compact title="No active projects" description="Your next big thing starts here." action={<Button size="sm" onClick={() => editor.open("project")}>Create project</Button>} />
            ) : (
              activeProjects.map((p) => {
                const pct = projectProgress(p, data);
                return (
                  <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-surface-2">
                    <ProgressRing value={pct} size={34} stroke={3.5} barClassName={cn("stroke-current", colorOf(p.color).text)}>
                      <span className="tabular text-[10px] font-semibold text-muted">{pct}</span>
                    </ProgressRing>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium">{p.name}</div>
                      <div className="text-xs text-subtle">{p.deadline ? `Due ${friendlyDate(new Date(p.deadline + "T00:00"), now)}` : "No deadline"}</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-subtle" />
                  </Link>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader
            title="Applications"
            icon={<Send />}
            action={
              <Link href="/applications" className="rounded-lg px-2 py-1 text-xs text-subtle hover:bg-surface-2 hover:text-fg">
                Pipeline
              </Link>
            }
          />
          <div className="px-4 pb-4">
            {pipeline.length === 0 ? (
              <p className="pb-2 text-sm text-subtle">No applications in progress.</p>
            ) : (
              <>
                <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
                  {pipeline.map((p) => (
                    <div key={p.status} className={cn("h-full transition-all", APPLICATION_STATUS_DOT[p.status])} style={{ flex: p.count }} />
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {pipeline.map((p) => (
                    <div key={p.status} className="flex items-center gap-2 text-xs">
                      <span className={cn("h-1.5 w-1.5 rounded-full", APPLICATION_STATUS_DOT[p.status])} />
                      <span className="text-muted">{APPLICATION_STATUS_LABEL[p.status]}</span>
                      <span className="tabular ml-auto font-medium">{p.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>

        <Card className="md:col-span-2 xl:col-span-1">
          <SectionHeader title="Mind" icon={<Inbox />} />
          <div className="grid grid-cols-2 gap-2 px-4 pb-4">
            <button onClick={() => setCaptureOpen(true)} className="group flex flex-col items-start gap-1 rounded-xl bg-surface-2 p-3 text-left transition-colors hover:bg-surface-3">
              <Inbox className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Quick capture</span>
              <span className="text-xs text-subtle">{inbox ? `${inbox} waiting in inbox` : "Inbox zero"}</span>
            </button>
            <Link href="/study" className="group flex flex-col items-start gap-1 rounded-xl bg-surface-2 p-3 transition-colors hover:bg-surface-3">
              <CalendarClock className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">Studied today</span>
              <span className="text-xs text-subtle">{stats.studyToday ? formatMinutes(stats.studyToday) : "Not yet"}</span>
            </Link>
            <Link href="/review" className="col-span-2 flex items-center justify-between rounded-xl border border-dashed border-line-strong px-3 py-2.5 text-sm text-muted transition-colors hover:border-accent/50 hover:text-fg">
              Weekly review
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      </section>
    </Page>
  );
}

function SummaryCell({ label, value, sub, href, tone, children }: { label: string; value: string; sub?: string; href?: string; tone?: "warn"; children?: React.ReactNode }) {
  const body = (
    <>
      <div className="text-[11px] font-medium text-subtle">{label}</div>
      <div className={cn("tabular mt-0.5 text-lg font-semibold tracking-tight", tone === "warn" && "text-orange-600 dark:text-orange-400")}>{value}</div>
      {sub && <div className="truncate text-[11px] text-subtle">{sub}</div>}
      {children}
    </>
  );
  const cls = "min-w-0 bg-surface px-4 py-3 transition-colors";
  return href ? (
    <Link href={href} className={cn(cls, "hover:bg-surface-2")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function NowBlock({ item, now, upcoming }: { item: AgendaItem; now: Date; upcoming?: boolean }) {
  const total = item.end ? differenceInMinutes(item.end, item.start) : 0;
  const elapsed = differenceInMinutes(now, item.start);
  const pct = total ? Math.round((elapsed / total) * 100) : 0;
  return (
    <Link href={item.href} className="relative mt-3 flex items-start gap-4">
      <KindIcon item={item} className="mt-1 h-11 w-11 rounded-xl [&_svg]:h-5 [&_svg]:w-5" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-muted">
          {upcoming ? relativeLabel(item.start, now) : item.end ? `Ends in ${formatMinutes(differenceInMinutes(item.end, now))}` : "Now"}
          <span className="text-subtle">
            {" · "}
            {toTimeString(item.start)}
            {item.end ? `–${toTimeString(item.end)}` : ""}
          </span>
        </div>
        <div className="mt-0.5 text-2xl leading-tight font-semibold tracking-tight sm:text-[28px]">{item.title}</div>
        {item.subtitle && <div className="mt-1 truncate text-sm text-muted">{item.subtitle}</div>}
        {!upcoming && total > 0 && <ProgressBar value={pct} className="mt-4 h-1 max-w-sm" />}
      </div>
    </Link>
  );
}

function TodayTimeline({ items, now }: { items: AgendaItem[]; now: Date }) {
  // Place a "now" marker between past and upcoming timed items.
  const firstFuture = items.findIndex((i) => !i.allDay && i.start > now);
  return (
    <div className="flex flex-col">
      {items.map((item, idx) => (
        <div key={item.key}>
          {idx === firstFuture && idx > 0 && (
            <div className="flex items-center gap-2 px-2.5 py-1">
              <span className="tabular w-12 text-right text-[11px] font-semibold text-accent">{toTimeString(now)}</span>
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span className="h-px flex-1 bg-accent/40" />
            </div>
          )}
          <AgendaRow item={item} now={now} />
        </div>
      ))}
    </div>
  );
}

function UpNextRow({ item, label, first }: { item: AgendaItem; label: string; first?: boolean }) {
  const { open } = useAgendaActions();
  return (
    <Link
      href={item.href}
      onClick={(e) => {
        if (open(item)) e.preventDefault();
      }}
      className={cn("flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-surface-2", first && "bg-accent/[0.05]")}
    >
      <KindIcon item={item} />
      <div className="min-w-0 flex-1">
        <div className={cn("text-xs font-semibold", first ? "text-accent" : "text-muted")}>{label}</div>
        <div className="truncate text-[14px] font-medium">{item.title}</div>
      </div>
      <span className="tabular shrink-0 text-xs text-subtle">{item.allDay ? "" : toTimeString(item.start)}</span>
    </Link>
  );
}

function NotificationPrompt() {
  const [state, setState] = useState<NotificationPermission | "unsupported" | null>(null);
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    setState(notificationsSupported() ? Notification.permission : "unsupported");
    try {
      setHidden(localStorage.getItem("lifeos:hideNotifPrompt") === "1");
    } catch {
      setHidden(false);
    }
  }, []);
  if (hidden || state !== "default") return null;
  return (
    <div className="animate-fade-up mb-5 flex flex-col gap-3 rounded-2xl border border-accent/20 bg-accent/[0.05] px-4 py-3 sm:flex-row sm:items-center">
      <BellRing className="h-4 w-4 shrink-0 text-accent" />
      <div className="flex-1 text-sm">
        <span className="font-medium">Turn on reminders.</span> <span className="text-muted">Get a browser notification when something is coming up.</span>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setHidden(true);
            try {
              localStorage.setItem("lifeos:hideNotifPrompt", "1");
            } catch {}
          }}
        >
          Not now
        </Button>
        <Button size="sm" variant="primary" onClick={async () => setState(await requestNotificationPermission())}>
          Enable
        </Button>
      </div>
    </div>
  );
}
