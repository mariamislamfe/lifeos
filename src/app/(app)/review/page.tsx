"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, endOfDay, format } from "date-fns";
import { ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, Flag, FolderKanban, Plus, Send, Target, Timer, X } from "lucide-react";
import { cn, formatMinutes } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { uid } from "@/lib/defaults";
import { toast } from "@/lib/toast";
import { buildAgenda, projectProgress } from "@/lib/agenda";
import { combineDateTime, parseISODate, toISODate, weekStart } from "@/lib/date";
import { APPLICATION_STATUS_DOT, APPLICATION_STATUS_LABEL, ACTIVE_APPLICATION_STATUSES, color as colorOf } from "@/lib/meta";
import type { WeeklyReview } from "@/lib/types";
import { Button, Card, CheckCircle, ProgressBar, SectionHeader } from "@/components/ui/primitives";
import { Page, PageHeader } from "@/components/ui/page";
import { TaskRow } from "@/components/items/item-rows";

export default function ReviewPage() {
  const { data, create, update } = useData();
  const now = useNow(60_000);
  const [offset, setOffset] = useState(0);
  const start = addDays(weekStart(now), offset * 7);
  const end = endOfDay(addDays(start, 6));
  const nextStart = addDays(start, 7);
  const startIso = toISODate(start);
  const endIso = toISODate(end);

  const r = useMemo(() => {
    const inWeek = (iso: string | null) => !!iso && iso >= startIso && iso <= endIso;
    const completed = data.tasks.filter((t) => t.status === "done" && t.completed_at && new Date(t.completed_at) >= start && new Date(t.completed_at) <= end && !t.parent_id);
    const incomplete = data.tasks.filter((t) => t.status !== "done" && !t.parent_id && inWeek(t.due_date));
    const overdue = [
      ...data.tasks.filter((t) => t.status !== "done" && !t.parent_id && t.due_date && combineDateTime(t.due_date, t.due_time ?? "23:59") < now).map((t) => ({ id: t.id, title: t.title, href: `/tasks?open=${t.id}` })),
      ...data.deadlines.filter((d) => d.status !== "done" && new Date(d.due_at) < now).map((d) => ({ id: d.id, title: d.title, href: `/deadlines?open=${d.id}` })),
    ];
    const study = data.study_sessions.filter((s) => s.completed && inWeek(s.date)).reduce((n, s) => n + (s.actual_minutes ?? s.planned_minutes), 0);
    const nextWeekEnd = endOfDay(addDays(nextStart, 6));
    const upcomingDeadlines = data.deadlines
      .filter((d) => d.status !== "done" && new Date(d.due_at) >= now && new Date(d.due_at) <= nextWeekEnd)
      .sort((a, b) => a.due_at.localeCompare(b.due_at));
    const events = buildAgenda(data, start, end).filter((i) => i.kind === "event");
    return { completed, incomplete, overdue, study, upcomingDeadlines, events };
  }, [data, start, end, startIso, endIso, now, nextStart]);

  const review = data.weekly_reviews.find((w) => w.week_start === startIso);
  const ensureReview = async (patch: Partial<WeeklyReview>) => {
    if (review) return update("weekly_reviews", review.id, patch);
    await create("weekly_reviews", { week_start: startIso, next_week_items: [], ...patch });
  };

  const [item, setItem] = useState("");
  const items = review?.next_week_items ?? [];
  const activeProjects = data.projects.filter((p) => p.status === "active");
  const apps = data.applications.filter((a) => ACTIVE_APPLICATION_STATUSES.includes(a.status));

  return (
    <Page wide>
      <PageHeader
        title="Weekly review"
        description={`${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`}
        actions={
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => setOffset((o) => o - 1)} aria-label="Previous week">
              <ChevronLeft />
            </Button>
            <Button size="sm" variant={offset === 0 ? "subtle" : "secondary"} onClick={() => setOffset(0)}>
              This week
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setOffset((o) => o + 1)} aria-label="Next week" disabled={offset >= 0}>
              <ChevronRight />
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<CheckCircle2 className="text-emerald-500" />} label="Completed" value={r.completed.length} />
        <Stat icon={<CircleDashed className="text-amber-500" />} label="Still open" value={r.incomplete.length} />
        <Stat icon={<Timer className="text-accent" />} label="Study time" value={formatMinutes(r.study)} />
        <Stat icon={<Flag className="text-rose-500" />} label="Overdue" value={r.overdue.length} />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeader title="Completed this week" icon={<CheckCircle2 />} count={r.completed.length} />
          <div className="max-h-80 overflow-y-auto px-2 pb-2">
            {r.completed.length ? r.completed.map((t) => <TaskRow key={t.id} task={t} now={now} />) : <p className="px-3 pb-3 text-sm text-subtle">Nothing completed yet — there&apos;s still time.</p>}
          </div>
        </Card>
        <Card>
          <SectionHeader title="Didn't get to" icon={<CircleDashed />} count={r.incomplete.length} />
          <div className="max-h-80 overflow-y-auto px-2 pb-2">
            {r.incomplete.length === 0 && <p className="px-3 pb-3 text-sm text-subtle">Everything planned is done. 👏</p>}
            {r.incomplete.map((t) => (
              <div key={t.id} className="flex items-center">
                <div className="min-w-0 flex-1">
                  <TaskRow task={t} now={now} />
                </div>
                <Button size="sm" variant="ghost" onClick={() => update("tasks", t.id, { due_date: toISODate(nextStart) })} title="Move to next week">
                  Next week <ArrowRight />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <SectionHeader title="Deadlines ahead" icon={<Flag />} />
          <div className="px-4 pb-4">
            {r.upcomingDeadlines.length === 0 && <p className="text-sm text-subtle">None in the next two weeks.</p>}
            {r.upcomingDeadlines.map((d) => (
              <Link key={d.id} href={`/deadlines?open=${d.id}`} className="flex items-center justify-between gap-2 py-1.5 text-sm hover:text-accent">
                <span className="truncate">{d.title}</span>
                <span className="tabular shrink-0 text-xs text-subtle">{format(new Date(d.due_at), "EEE d")}</span>
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeader title="Projects" icon={<FolderKanban />} />
          <div className="flex flex-col gap-3 px-4 pb-4">
            {activeProjects.length === 0 && <p className="text-sm text-subtle">No active projects.</p>}
            {activeProjects.map((p) => {
              const pct = projectProgress(p, data);
              return (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="tabular text-xs text-subtle">{pct}%</span>
                  </div>
                  <ProgressBar value={pct} barClassName={colorOf(p.color).bar} />
                </Link>
              );
            })}
          </div>
        </Card>
        <Card>
          <SectionHeader title="Applications" icon={<Send />} />
          <div className="px-4 pb-4">
            {apps.length === 0 && <p className="text-sm text-subtle">None in progress.</p>}
            {apps.map((a) => (
              <Link key={a.id} href={`/applications?open=${a.id}`} className="flex items-center gap-2 py-1.5 text-sm hover:text-accent">
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", APPLICATION_STATUS_DOT[a.status])} />
                <span className="truncate">{a.name}</span>
                <span className="ml-auto shrink-0 text-xs text-subtle">{APPLICATION_STATUS_LABEL[a.status]}</span>
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeader title="Events this week" icon={<CalendarDays />} />
          <div className="px-4 pb-4">
            {r.events.length === 0 && <p className="text-sm text-subtle">No events.</p>}
            {r.events.map((e) => (
              <Link key={e.key} href={e.href} className="flex items-center justify-between gap-2 py-1.5 text-sm hover:text-accent">
                <span className="truncate">{e.title}</span>
                <span className="tabular shrink-0 text-xs text-subtle">{format(e.start, "EEE HH:mm")}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {r.overdue.length > 0 && (
        <Card className="mb-5 border-rose-500/20">
          <SectionHeader title="Overdue — decide: do, reschedule or drop" icon={<Flag />} count={r.overdue.length} />
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            {r.overdue.map((o) => (
              <Link key={o.id} href={o.href} className="rounded-lg bg-rose-500/[0.07] px-2.5 py-1 text-xs text-rose-700 ring-1 ring-rose-500/15 hover:bg-rose-500/10 dark:text-rose-300">
                {o.title}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* NEXT WEEK */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-5">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-accent uppercase">
            <Target className="h-3.5 w-3.5" /> Next week
          </div>
          <div className="font-display text-3xl italic">
            {format(nextStart, "MMM d")} – {format(addDays(nextStart, 6), "MMM d")}
          </div>
          <label className="mt-4 block text-xs font-medium text-muted">Main focus</label>
          <DebouncedInput
            key={`focus-${startIso}`}
            initial={review?.next_week_focus ?? ""}
            onSave={(v) => ensureReview({ next_week_focus: v || null })}
            placeholder="If I only achieve one thing next week, it's…"
            className="mt-1.5 w-full bg-transparent text-lg font-medium outline-none placeholder:text-subtle"
          />
          <div className="mt-5 flex flex-col gap-0.5">
            {items.map((it) => (
              <div key={it.id} className="group flex items-center gap-3 rounded-xl px-1 py-1.5 hover:bg-surface-2">
                <CheckCircle checked={it.done} onChange={() => ensureReview({ next_week_items: items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)) })} />
                <span className={cn("flex-1 text-sm", it.done && "text-subtle line-through")}>{it.text}</span>
                <button
                  onClick={async () => {
                    await create("tasks", { title: it.text, due_date: toISODate(nextStart) });
                    toast("Added as a task", { tone: "success", description: `${it.text} · ${format(nextStart, "EEE, MMM d")}` });
                  }}
                  className="rounded-md px-2 py-0.5 text-xs text-subtle opacity-0 group-hover:opacity-100 hover:bg-surface hover:text-fg"
                >
                  → Task
                </button>
                <button onClick={() => ensureReview({ next_week_items: items.filter((x) => x.id !== it.id) })} className="text-subtle opacity-0 group-hover:opacity-100 hover:text-rose-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!item.trim()) return;
                ensureReview({ next_week_items: [...items, { id: uid(), text: item.trim(), done: false }] });
                setItem("");
              }}
              className="flex items-center gap-3 px-1 py-1.5"
            >
              <Plus className="h-4 w-4 text-subtle" />
              <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Add something to next week's plan" className="h-7 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle" />
            </form>
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-[13px] font-semibold">Reflection</div>
          <p className="mt-0.5 text-xs text-subtle">What went well? What got in the way? What will you change?</p>
          <DebouncedTextarea
            key={`reflection-${startIso}`}
            initial={review?.reflection ?? ""}
            onSave={(v) => ensureReview({ reflection: v || null })}
            placeholder="A few honest lines…"
          />
          <p className="mt-2 text-[11px] text-subtle">Saved automatically · {parseISODate(startIso) && format(start, "'Week of' MMM d")}</p>
        </Card>
      </div>
    </Page>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card className="px-4 py-3.5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted [&_svg]:h-4 [&_svg]:w-4">
        {icon}
        {label}
      </div>
      <div className="tabular mt-1 text-[26px] leading-tight font-semibold tracking-tight">{value}</div>
    </Card>
  );
}

function useDebouncedSave(onSave: (v: string) => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(onSave);
  useEffect(() => {
    saveRef.current = onSave;
  });
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  return (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => saveRef.current(v), 700);
  };
}

function DebouncedInput({ initial, onSave, ...props }: { initial: string; onSave: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  const [v, setV] = useState(initial);
  const save = useDebouncedSave(onSave);
  return (
    <input
      value={v}
      onChange={(e) => {
        setV(e.target.value);
        save(e.target.value);
      }}
      {...props}
    />
  );
}

function DebouncedTextarea({ initial, onSave, placeholder }: { initial: string; onSave: (v: string) => void; placeholder?: string }) {
  const [v, setV] = useState(initial);
  const save = useDebouncedSave(onSave);
  return (
    <textarea
      value={v}
      onChange={(e) => {
        setV(e.target.value);
        save(e.target.value);
      }}
      placeholder={placeholder}
      className="mt-3 min-h-[200px] w-full resize-y rounded-xl bg-surface-2/60 p-3 text-sm leading-relaxed outline-none placeholder:text-subtle"
    />
  );
}
