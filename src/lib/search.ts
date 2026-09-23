import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Compass,
  Flag,
  FolderKanban,
  GraduationCap,
  Lightbulb,
  Milestone,
  NotebookPen,
  Send,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";
import { combineDateTime, parseISODate } from "./date";
import { APPLICATION_STATUS_LABEL, APPLICATION_TYPE_LABEL, EVENT_KIND_LABEL, IDEA_STATUS_LABEL, PROJECT_STATUS_LABEL, WEEKDAYS } from "./meta";
import type { Collections } from "./types";

export interface SearchEntry {
  key: string;
  group: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  href: string;
  haystack: string;
  done?: boolean;
}

const fmt = (d: Date) => format(d, "MMM d");

export function buildSearchIndex(data: Collections): SearchEntry[] {
  const out: SearchEntry[] = [];
  const project = new Map(data.projects.map((p) => [p.id, p.name]));
  const push = (e: Omit<SearchEntry, "haystack">, extra: (string | null | undefined)[] = []) =>
    out.push({ ...e, haystack: [e.title, e.subtitle, e.group, ...extra].filter(Boolean).join(" ").toLowerCase() });

  for (const t of data.tasks)
    push(
      {
        key: `task:${t.id}`,
        group: "Tasks",
        icon: CheckSquare,
        title: t.title,
        subtitle: [t.due_date ? fmt(combineDateTime(t.due_date)) : null, t.project_id ? project.get(t.project_id) : t.category].filter(Boolean).join(" · "),
        href: `/tasks?open=${t.id}`,
        done: t.status === "done",
      },
      [t.description, t.notes, t.category],
    );
  for (const p of data.projects)
    push(
      { key: `project:${p.id}`, group: "Projects", icon: FolderKanban, title: p.name, subtitle: PROJECT_STATUS_LABEL[p.status], href: `/projects/${p.id}` },
      [p.description, p.notes],
    );
  for (const m of data.milestones)
    push({ key: `ms:${m.id}`, group: "Milestones", icon: Milestone, title: m.title, subtitle: project.get(m.project_id), href: `/projects/${m.project_id}`, done: m.done });
  for (const a of data.applications)
    push(
      {
        key: `app:${a.id}`,
        group: "Applications",
        icon: Send,
        title: a.name,
        subtitle: [a.organization, APPLICATION_STATUS_LABEL[a.status]].filter(Boolean).join(" · "),
        href: `/applications?open=${a.id}`,
      },
      [APPLICATION_TYPE_LABEL[a.type], a.requirements, a.notes, ...a.documents_required],
    );
  for (const d of data.deadlines)
    push(
      {
        key: `dl:${d.id}`,
        group: "Deadlines",
        icon: Flag,
        title: d.title,
        subtitle: [fmt(new Date(d.due_at)), d.category].filter(Boolean).join(" · "),
        href: `/deadlines?open=${d.id}`,
        done: d.status === "done",
      },
      [d.description, d.notes],
    );
  for (const e of data.events)
    push(
      {
        key: `ev:${e.id}`,
        group: "Events",
        icon: CalendarDays,
        title: e.title,
        subtitle: [fmt(new Date(e.start_at)), EVENT_KIND_LABEL[e.kind]].join(" · "),
        href: `/events?open=${e.id}`,
      },
      [e.location, e.notes, ...e.people],
    );
  const seenCourse = new Set<string>();
  for (const c of data.courses) {
    if (seenCourse.has(c.name)) continue;
    seenCourse.add(c.name);
    push(
      { key: `course:${c.id}`, group: "University", icon: GraduationCap, title: c.name, subtitle: [c.code, c.professor].filter(Boolean).join(" · "), href: `/university` },
      [c.location, c.notes, WEEKDAYS[c.day_of_week], "course class lecture"],
    );
  }
  for (const s of data.study_sessions)
    push(
      {
        key: `study:${s.id}`,
        group: "Study",
        icon: BookOpen,
        title: [s.subject, s.topic].filter(Boolean).join(" — "),
        subtitle: fmt(parseISODate(s.date)),
        href: `/study?open=${s.id}`,
        done: s.completed,
      },
      [s.subtopic, s.notes],
    );
  for (const i of data.ideas)
    push(
      { key: `idea:${i.id}`, group: "Ideas", icon: Lightbulb, title: i.title, subtitle: IDEA_STATUS_LABEL[i.status], href: `/ideas?open=${i.id}` },
      [i.description, i.category, ...i.tags],
    );
  for (const n of data.notes)
    push(
      { key: `note:${n.id}`, group: "Notes", icon: NotebookPen, title: n.title || n.content.slice(0, 80), subtitle: n.inbox ? "Inbox" : undefined, href: `/notes?open=${n.id}` },
      [n.content, ...n.tags],
    );
  for (const w of data.wishlist)
    push({ key: `wish:${w.id}`, group: "Wishlist", icon: ShoppingBag, title: w.name, subtitle: w.price ? `${w.price} ${w.currency}` : undefined, href: `/wishlist?open=${w.id}` }, [
      w.category,
      w.notes,
    ]);
  for (const f of data.future_items)
    push({ key: `future:${f.id}`, group: "Future", icon: Compass, title: f.title, href: `/future?open=${f.id}` }, [f.description, f.category]);
  for (const r of data.reminders)
    if (!r.done) push({ key: `rem:${r.id}`, group: "Reminders", icon: Bell, title: r.title, subtitle: fmt(new Date(r.remind_at)), href: `/reminders` });

  return out;
}

export function searchEntries(index: SearchEntry[], query: string, limit = 40): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/);
  const scored: { e: SearchEntry; score: number }[] = [];
  for (const e of index) {
    if (!tokens.every((t) => e.haystack.includes(t))) continue;
    const title = e.title.toLowerCase();
    let score = 0;
    if (title.startsWith(q)) score += 10;
    else if (title.includes(q)) score += 6;
    else if (tokens.every((t) => title.includes(t))) score += 4;
    if (e.done) score -= 3;
    scored.push({ e, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.e);
}
