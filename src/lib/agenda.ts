import { addMinutes, differenceInCalendarDays, differenceInMinutes, endOfDay, startOfDay } from "date-fns";
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Flag,
  GraduationCap,
  Bell,
  Send,
  Users,
  type LucideIcon,
} from "lucide-react";
import { combineDateTime, dateRange, parseISODate, relativeLabel, toISODate } from "./date";
import { ACTIVE_APPLICATION_STATUSES, EVENT_KIND_LABEL, COURSE_KIND_LABEL, type ColorName } from "./meta";
import type { Collections, Priority, Project, TableName } from "./types";

export type AgendaKind = "class" | "event" | "study" | "task" | "deadline" | "reminder" | "milestone" | "application";

export const KIND_META: Record<AgendaKind, { label: string; color: ColorName; icon: LucideIcon }> = {
  class: { label: "University", color: "sky", icon: GraduationCap },
  event: { label: "Event", color: "violet", icon: Users },
  study: { label: "Study", color: "emerald", icon: BookOpen },
  task: { label: "Task", color: "iris", icon: CheckCircle2 },
  deadline: { label: "Deadline", color: "rose", icon: Flag },
  reminder: { label: "Reminder", color: "amber", icon: Bell },
  milestone: { label: "Milestone", color: "teal", icon: CalendarClock },
  application: { label: "Application", color: "pink", icon: Send },
};

export interface AgendaItem {
  key: string;
  kind: AgendaKind;
  id: string;
  table: TableName | null;
  title: string;
  subtitle?: string;
  category: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  color: ColorName;
  priority?: Priority;
  done: boolean;
  href: string;
  /** Whether the item can be rescheduled by dragging on the calendar. */
  movable: boolean;
}

export interface AgendaOptions {
  reminders?: boolean;
  done?: boolean;
}

function inRange(d: Date, from: Date, to: Date) {
  return d.getTime() >= from.getTime() && d.getTime() <= to.getTime();
}

export function buildAgenda(data: Collections, from: Date, to: Date, opts: AgendaOptions = {}): AgendaItem[] {
  const items: AgendaItem[] = [];
  const includeDone = opts.done ?? true;
  const courseById = new Map(data.courses.map((c) => [c.id, c]));

  // Weekly university schedule, expanded into concrete occurrences.
  const days = dateRange(from, Math.max(1, differenceInCalendarDays(to, from) + 1));
  for (const day of days) {
    const iso = toISODate(day);
    for (const c of data.courses) {
      if (c.day_of_week !== day.getDay()) continue;
      const start = combineDateTime(iso, c.start_time);
      if (!inRange(start, from, to)) continue;
      items.push({
        key: `class:${c.id}:${iso}`,
        kind: "class",
        id: c.id,
        table: "courses",
        title: c.name,
        subtitle: [COURSE_KIND_LABEL[c.kind], c.location].filter(Boolean).join(" · "),
        category: "University",
        start,
        end: combineDateTime(iso, c.end_time),
        allDay: false,
        color: (c.color as ColorName) ?? "sky",
        done: false,
        href: "/university",
        movable: false,
      });
    }
  }

  for (const e of data.events) {
    const start = new Date(e.start_at);
    if (!inRange(start, from, to)) continue;
    const course = e.course_id ? courseById.get(e.course_id) : undefined;
    items.push({
      key: `event:${e.id}`,
      kind: "event",
      id: e.id,
      table: "events",
      title: e.title,
      subtitle: [EVENT_KIND_LABEL[e.kind], e.location ?? (e.meeting_url ? "Online" : null)].filter(Boolean).join(" · "),
      category: e.kind === "exam" ? "Exam" : EVENT_KIND_LABEL[e.kind],
      start,
      end: e.all_day ? null : addMinutes(start, e.duration_minutes),
      allDay: e.all_day,
      color: e.kind === "exam" ? "rose" : course ? ((course.color as ColorName) ?? "violet") : "violet",
      done: false,
      href: `/events?open=${e.id}`,
      movable: true,
    });
  }

  for (const s of data.study_sessions) {
    const start = combineDateTime(s.date, s.start_time);
    if (!inRange(s.start_time ? start : endOfDay(start), from, to) && !inRange(start, from, to)) continue;
    if (!includeDone && s.completed) continue;
    items.push({
      key: `study:${s.id}`,
      kind: "study",
      id: s.id,
      table: "study_sessions",
      title: s.topic ? `${s.subject} — ${s.topic}` : `Study ${s.subject}`,
      subtitle: s.subtopic ?? undefined,
      category: "Study",
      start,
      end: s.start_time ? addMinutes(start, s.planned_minutes) : null,
      allDay: !s.start_time,
      color: "emerald",
      priority: s.priority,
      done: s.completed,
      href: `/study?open=${s.id}`,
      movable: true,
    });
  }

  for (const t of data.tasks) {
    if (!t.due_date || t.parent_id) continue;
    const start = combineDateTime(t.due_date, t.due_time);
    if (!inRange(start, startOfDay(from), to)) continue;
    if (!t.due_time && startOfDay(start).getTime() < startOfDay(from).getTime()) continue;
    if (!includeDone && t.status === "done") continue;
    items.push({
      key: `task:${t.id}`,
      kind: "task",
      id: t.id,
      table: "tasks",
      title: t.title,
      subtitle: t.category ?? undefined,
      category: t.category ?? "Task",
      start,
      end: null,
      allDay: !t.due_time,
      color: "iris",
      priority: t.priority,
      done: t.status === "done",
      href: `/tasks?open=${t.id}`,
      movable: true,
    });
  }

  const deadlineAppIds = new Set(data.deadlines.map((d) => d.application_id).filter(Boolean));
  for (const d of data.deadlines) {
    const start = new Date(d.due_at);
    if (!inRange(start, from, to)) continue;
    if (!includeDone && d.status === "done") continue;
    items.push({
      key: `deadline:${d.id}`,
      kind: "deadline",
      id: d.id,
      table: "deadlines",
      title: d.title,
      subtitle: d.category ?? undefined,
      category: d.category ?? "Deadline",
      start,
      end: null,
      allDay: false,
      color: "rose",
      priority: d.priority,
      done: d.status === "done",
      href: `/deadlines?open=${d.id}`,
      movable: true,
    });
  }

  for (const a of data.applications) {
    if (!a.deadline_at || deadlineAppIds.has(a.id)) continue;
    if (!ACTIVE_APPLICATION_STATUSES.slice(0, 3).includes(a.status)) continue;
    const start = new Date(a.deadline_at);
    if (!inRange(start, from, to)) continue;
    items.push({
      key: `application:${a.id}`,
      kind: "application",
      id: a.id,
      table: "applications",
      title: `${a.name} deadline`,
      subtitle: a.organization ?? undefined,
      category: "Application",
      start,
      end: null,
      allDay: false,
      color: "pink",
      done: false,
      href: `/applications?open=${a.id}`,
      movable: false,
    });
  }

  const projectById = new Map(data.projects.map((p) => [p.id, p]));
  for (const m of data.milestones) {
    if (!m.due_date) continue;
    const start = parseISODate(m.due_date);
    if (!inRange(start, startOfDay(from), to)) continue;
    if (!includeDone && m.done) continue;
    items.push({
      key: `milestone:${m.id}`,
      kind: "milestone",
      id: m.id,
      table: "milestones",
      title: m.title,
      subtitle: projectById.get(m.project_id)?.name,
      category: "Milestone",
      start,
      end: null,
      allDay: true,
      color: "teal",
      done: m.done,
      href: `/projects/${m.project_id}`,
      movable: true,
    });
  }

  for (const p of data.projects) {
    if (!p.deadline || !["active", "planned", "paused"].includes(p.status)) continue;
    const start = parseISODate(p.deadline);
    if (!inRange(start, startOfDay(from), to)) continue;
    items.push({
      key: `project:${p.id}`,
      kind: "milestone",
      id: p.id,
      table: "projects",
      title: `${p.name} due`,
      subtitle: "Project deadline",
      category: "Project",
      start,
      end: null,
      allDay: true,
      color: (p.color as ColorName) ?? "teal",
      done: false,
      href: `/projects/${p.id}`,
      movable: false,
    });
  }

  if (opts.reminders) {
    for (const r of data.reminders) {
      if (r.done) continue;
      const start = new Date(r.remind_at);
      if (!inRange(start, from, to)) continue;
      items.push({
        key: `reminder:${r.id}`,
        kind: "reminder",
        id: r.id,
        table: "reminders",
        title: r.title,
        category: "Reminder",
        start,
        end: null,
        allDay: false,
        color: "amber",
        done: r.done,
        href: `/reminders`,
        movable: true,
      });
    }
  }

  return sortAgenda(items);
}

export function sortAgenda(items: AgendaItem[]) {
  return items.sort((a, b) => {
    const da = startOfDay(a.start).getTime();
    const db = startOfDay(b.start).getTime();
    if (da !== db) return da - db;
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return a.start.getTime() - b.start.getTime();
  });
}

export function agendaForDay(data: Collections, day: Date, opts?: AgendaOptions) {
  return buildAgenda(data, startOfDay(day), endOfDay(day), opts);
}

/** Things that are happening right now (a class in progress, a meeting running…). */
export function happeningNow(items: AgendaItem[], now: Date) {
  return items.filter((i) => !i.allDay && i.end && i.start <= now && i.end > now && !i.done);
}

export interface UpNextItem {
  item: AgendaItem;
  label: string;
}

/** The next few things coming up — timed items after now, then upcoming all-day items. */
export function upNext(data: Collections, now: Date, limit = 5): UpNextItem[] {
  const horizon = endOfDay(new Date(now.getTime() + 21 * 86400000));
  const all = buildAgenda(data, startOfDay(now), horizon, { done: false });
  const out = all.filter((i) => {
    if (i.done) return false;
    if (i.allDay) return differenceInCalendarDays(i.start, now) >= 1;
    return i.start.getTime() > now.getTime();
  });
  return out.slice(0, limit).map((item) => ({ item, label: relativeLabel(item.start, now, item.allDay) }));
}

export type AlertTone = "overdue" | "today" | "soon" | "info";
export interface SmartAlert {
  key: string;
  tone: AlertTone;
  heading: string;
  title: string;
  href: string;
  at: Date;
}

/** Surfaces the handful of things worth interrupting for, most urgent first. */
export function smartAlerts(data: Collections, now: Date): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const todayStart = startOfDay(now);

  for (const t of data.tasks) {
    if (t.status === "done" || !t.due_date || t.parent_id) continue;
    const due = combineDateTime(t.due_date, t.due_time ?? "23:59");
    const days = differenceInCalendarDays(due, now);
    if (due < now) alerts.push({ key: `t${t.id}`, tone: "overdue", heading: "Overdue", title: t.title, href: `/tasks?open=${t.id}`, at: due });
    else if (days === 1 && (t.priority === "high" || t.priority === "urgent"))
      alerts.push({ key: `t${t.id}`, tone: "soon", heading: "Due tomorrow", title: t.title, href: `/tasks?open=${t.id}`, at: due });
  }

  for (const d of data.deadlines) {
    if (d.status === "done") continue;
    const due = new Date(d.due_at);
    const days = differenceInCalendarDays(due, now);
    const href = `/deadlines?open=${d.id}`;
    if (due < now) alerts.push({ key: `d${d.id}`, tone: "overdue", heading: "Overdue", title: d.title, href, at: due });
    else if (days === 0) alerts.push({ key: `d${d.id}`, tone: "today", heading: `Due today at ${due.toTimeString().slice(0, 5)}`, title: d.title, href, at: due });
    else if (days === 1) alerts.push({ key: `d${d.id}`, tone: "soon", heading: "Due tomorrow", title: d.title, href, at: due });
    else if (days <= 3) alerts.push({ key: `d${d.id}`, tone: "soon", heading: `Due in ${days} days`, title: d.title, href, at: due });
  }

  for (const e of data.events) {
    if (e.all_day) continue;
    const start = new Date(e.start_at);
    const mins = differenceInMinutes(start, now);
    if (mins > 0 && mins <= 180)
      alerts.push({
        key: `e${e.id}`,
        tone: "today",
        heading: `Starting ${relativeLabel(start, now).toLowerCase()}`,
        title: e.title,
        href: `/events?open=${e.id}`,
        at: start,
      });
  }

  for (const p of data.projects) {
    if (!p.deadline || !["active", "planned"].includes(p.status)) continue;
    const days = differenceInCalendarDays(parseISODate(p.deadline), todayStart);
    if (days >= 0 && days <= 7)
      alerts.push({
        key: `p${p.id}`,
        tone: days <= 1 ? "today" : "soon",
        heading: days === 0 ? "Project due today" : `Project deadline in ${days} ${days === 1 ? "day" : "days"}`,
        title: p.name,
        href: `/projects/${p.id}`,
        at: parseISODate(p.deadline),
      });
  }

  for (const a of data.applications) {
    if (!a.deadline_at || !ACTIVE_APPLICATION_STATUSES.slice(0, 3).includes(a.status)) continue;
    if (data.deadlines.some((d) => d.application_id === a.id)) continue;
    const due = new Date(a.deadline_at);
    const days = differenceInCalendarDays(due, now);
    if (due < now) continue;
    if (days <= 3)
      alerts.push({
        key: `a${a.id}`,
        tone: days === 0 ? "today" : "soon",
        heading: days === 0 ? "Application due today" : `Application due in ${days} ${days === 1 ? "day" : "days"}`,
        title: a.name,
        href: `/applications?open=${a.id}`,
        at: due,
      });
  }

  const rank: Record<AlertTone, number> = { overdue: 0, today: 1, soon: 2, info: 3 };
  return alerts.sort((a, b) => rank[a.tone] - rank[b.tone] || a.at.getTime() - b.at.getTime());
}

export function projectProgress(p: Project, data: Pick<Collections, "tasks" | "milestones">) {
  if (p.progress !== null && p.progress !== undefined) return p.progress;
  if (p.status === "completed") return 100;
  const tasks = data.tasks.filter((t) => t.project_id === p.id && !t.parent_id);
  const ms = data.milestones.filter((m) => m.project_id === p.id);
  const total = tasks.length + ms.length;
  if (!total) return 0;
  const done = tasks.filter((t) => t.status === "done").length + ms.filter((m) => m.done).length;
  return Math.round((done / total) * 100);
}
