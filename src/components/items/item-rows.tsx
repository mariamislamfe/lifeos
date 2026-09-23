"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ListTree, MapPin, Repeat, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { KIND_META, type AgendaItem } from "@/lib/agenda";
import { combineDateTime, friendlyDate, toTimeString, urgencyOf } from "@/lib/date";
import { color as colorOf } from "@/lib/meta";
import type { Task } from "@/lib/types";
import { Badge, CheckCircle, ColorBadge, PriorityIcon, UrgencyBadge } from "@/components/ui/primitives";
import { useEditor, type EditorKind } from "@/components/editor/editor-provider";

const KIND_TO_EDITOR: Partial<Record<AgendaItem["kind"], EditorKind>> = {
  event: "event",
  study: "study",
  task: "task",
  deadline: "deadline",
  reminder: "reminder",
  milestone: "milestone",
  application: "application",
  class: "course",
};

/** Opens the editor for whatever `?open=<id>` points to, then cleans the URL. */
export function useOpenFromQuery(kind: EditorKind) {
  const editor = useEditor();
  const router = useRouter();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("open");
    if (!id) return;
    editor.open(kind, { id });
    router.replace(window.location.pathname, { scroll: false });
  }, [editor, kind, router]);
}

export function useAgendaActions() {
  const { data, update, toggleTask } = useData();
  const editor = useEditor();
  const toggle = (item: AgendaItem) => {
    switch (item.kind) {
      case "task": {
        const t = data.tasks.find((x) => x.id === item.id);
        if (t) toggleTask(t);
        break;
      }
      case "deadline":
        update("deadlines", item.id, { status: item.done ? "pending" : "done" });
        break;
      case "study": {
        const s = data.study_sessions.find((x) => x.id === item.id);
        if (s) update("study_sessions", item.id, { completed: !s.completed, actual_minutes: !s.completed ? (s.actual_minutes ?? s.planned_minutes) : s.actual_minutes });
        break;
      }
      case "milestone":
        if (item.table === "milestones") update("milestones", item.id, { done: !item.done });
        break;
      case "reminder":
        update("reminders", item.id, { done: !item.done });
        break;
    }
  };
  const canToggle = (item: AgendaItem) => ["task", "deadline", "study", "reminder"].includes(item.kind) || (item.kind === "milestone" && item.table === "milestones");
  const open = (item: AgendaItem) => {
    if (item.table === "projects") return false;
    const kind = KIND_TO_EDITOR[item.kind];
    if (!kind) return false;
    editor.open(kind, { id: item.id });
    return true;
  };
  return { toggle, canToggle, open };
}

export function KindIcon({ item, className }: { item: AgendaItem; className?: string }) {
  const Icon = KIND_META[item.kind].icon;
  const c = colorOf(item.color);
  return (
    <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-[10px]", c.soft, c.text, className)}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

/** A single line in a chronological agenda: time — title — category — priority — status. */
export function AgendaRow({ item, now, showDate, compact }: { item: AgendaItem; now: Date; showDate?: boolean; compact?: boolean }) {
  const { toggle, canToggle, open } = useAgendaActions();
  const router = useRouter();
  const c = colorOf(item.color);
  const running = !item.allDay && item.end && item.start <= now && item.end > now;
  const past = !item.allDay && (item.end ?? item.start) < now;
  const dueLike = item.kind === "deadline" || item.kind === "task" || item.kind === "application";
  const urgency = dueLike && !item.done ? urgencyOf(item.start, now, item.allDay) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!open(item)) router.push(item.href);
      }}
      onKeyDown={(e) => e.key === "Enter" && (open(item) || router.push(item.href))}
      className={cn(
        "group relative flex cursor-pointer items-center gap-3 rounded-xl px-2.5 transition-colors hover:bg-surface-2",
        compact ? "py-1.5" : "py-2.5",
        running && "bg-accent/[0.06] hover:bg-accent/10",
      )}
    >
      <div className={cn("tabular w-12 shrink-0 text-right text-[12px] font-medium", past && !running ? "text-subtle" : "text-muted")}>
        {showDate ? (
          <span className="text-[11px]">{friendlyDate(item.start, now).replace(/^(\w{3})\w*, /, "$1 ")}</span>
        ) : item.allDay ? (
          <span className="text-[11px] text-subtle">All day</span>
        ) : (
          toTimeString(item.start)
        )}
      </div>
      <div className={cn("w-[3px] self-stretch rounded-full", c.bar, (item.done || (past && !running)) && "opacity-30")} />
      {canToggle(item) ? (
        <CheckCircle checked={item.done} onChange={() => toggle(item)} />
      ) : (
        <div className={cn("grid h-[18px] w-[18px] shrink-0 place-items-center")}>
          {running ? <span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> : <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-[14px] font-medium tracking-[-0.005em]", item.done && "text-subtle line-through decoration-line-strong")}>{item.title}</div>
        {!compact && (item.subtitle || showDate) && (
          <div className="truncate text-xs text-subtle">
            {showDate && !item.allDay ? `${toTimeString(item.start)}${item.subtitle ? " · " : ""}` : ""}
            {item.subtitle}
          </div>
        )}
      </div>
      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
        {running && <Badge className="bg-accent/10 text-accent">Now</Badge>}
        {urgency && (urgency === "overdue" || urgency === "today") && <UrgencyBadge urgency={urgency} label={urgency === "today" && item.kind === "task" ? "Today" : undefined} />}
        <ColorBadge color={KIND_META[item.kind].color}>{item.kind === "class" ? "University" : item.category}</ColorBadge>
        {item.priority && item.priority !== "medium" && item.priority !== "low" && <PriorityIcon priority={item.priority} />}
      </div>
    </div>
  );
}

export function TaskRow({ task, now, showProject = true, draggable, onDragStart }: { task: Task; now: Date; showProject?: boolean; draggable?: boolean; onDragStart?: (e: React.DragEvent) => void }) {
  const { data, toggleTask } = useData();
  const editor = useEditor();
  const project = task.project_id ? data.projects.find((p) => p.id === task.project_id) : null;
  const subs = data.tasks.filter((t) => t.parent_id === task.id);
  const subsDone = subs.filter((t) => t.status === "done").length;
  const due = task.due_date ? combineDateTime(task.due_date, task.due_time) : null;
  const urgency = due && task.status !== "done" ? urgencyOf(due, now, !task.due_time) : null;
  const done = task.status === "done";

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={() => editor.open("task", { id: task.id })}
      onKeyDown={(e) => e.key === "Enter" && editor.open("task", { id: task.id })}
      className={cn("group flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-surface-2", draggable && "active:cursor-grabbing")}
    >
      <CheckCircle checked={done} onChange={() => toggleTask(task)} />
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-[14px] transition-colors", done ? "text-subtle line-through decoration-line-strong" : "text-fg")}>{task.title}</div>
        <div className="flex items-center gap-2 text-xs text-subtle empty:hidden">
          {task.status === "in_progress" && <span className="text-sky-600 dark:text-sky-400">In progress</span>}
          {subs.length > 0 && (
            <span className="flex items-center gap-1">
              <ListTree className="h-3 w-3" /> {subsDone}/{subs.length}
            </span>
          )}
          {task.recurrence !== "none" && <Repeat className="h-3 w-3" />}
          {showProject && project && (
            <Link href={`/projects/${project.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 hover:text-fg">
              <span className={cn("h-1.5 w-1.5 rounded-full", colorOf(project.color).dot)} /> {project.name}
            </Link>
          )}
          {!project && task.category && <span>{task.category}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {due && !done && (
          <span
            className={cn(
              "tabular text-xs",
              urgency === "overdue" ? "font-medium text-rose-600 dark:text-rose-400" : urgency === "today" ? "font-medium text-orange-600 dark:text-orange-400" : "text-subtle",
            )}
          >
            {urgency === "today" ? (task.due_time ? task.due_time : "Today") : friendlyDate(due, now)}
            {urgency !== "today" && task.due_time ? ` ${task.due_time}` : ""}
          </span>
        )}
        <PriorityIcon priority={task.priority} className={cn(task.priority === "low" && "opacity-50")} />
      </div>
    </div>
  );
}

export function LocationLine({ location, url }: { location?: string | null; url?: string | null }) {
  if (!location && !url) return null;
  return (
    <span className="flex min-w-0 items-center gap-1 text-xs text-subtle">
      {url ? <Video className="h-3 w-3 shrink-0" /> : <MapPin className="h-3 w-3 shrink-0" />}
      <span className="truncate">{location ?? "Online"}</span>
    </span>
  );
}
