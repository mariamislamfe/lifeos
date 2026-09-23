"use client";

import { useMemo, useState } from "react";
import { addDays, differenceInCalendarDays } from "date-fns";
import { CheckSquare, ChevronDown, CornerDownLeft, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useLocalState, useNow } from "@/lib/hooks";
import { combineDateTime, friendlyDate, parseISODate, toISODate } from "@/lib/date";
import { guessCapture } from "@/lib/capture";
import { PRIORITIES, PRIORITY_LABEL, PRIORITY_RANK, TASK_STATUS_LABEL } from "@/lib/meta";
import type { Priority, Task, TaskStatus } from "@/lib/types";
import { Button, Card, Chip, Segmented, Select } from "@/components/ui/primitives";
import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { TaskRow, useOpenFromQuery } from "@/components/items/item-rows";
import { useEditor } from "@/components/editor/editor-provider";

type Group = { id: string; label: string; tasks: Task[]; tone?: string };

export default function TasksPage() {
  useOpenFromQuery("task");
  const { data, create, update } = useData();
  const now = useNow();
  const editor = useEditor();
  const [view, setView] = useLocalState<"list" | "board">("tasks-view", "list");
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [draft, setDraft] = useState("");
  const [showDone, setShowDone] = useState(false);

  const tasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.tasks.filter(
      (t) =>
        !t.parent_id &&
        (!projectId || t.project_id === projectId) &&
        (!priority || t.priority === priority) &&
        (!q || `${t.title} ${t.description ?? ""} ${t.category ?? ""}`.toLowerCase().includes(q)),
    );
  }, [data.tasks, query, projectId, priority]);

  const groups = useMemo<Group[]>(() => {
    const open = tasks.filter((t) => t.status !== "done");
    const byDue = (a: Task, b: Task) =>
      (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || (a.due_time ?? "99").localeCompare(b.due_time ?? "99") || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    const diff = (t: Task) => (t.due_date ? differenceInCalendarDays(parseISODate(t.due_date), now) : null);
    const g: Group[] = [
      { id: "overdue", label: "Overdue", tone: "text-rose-600 dark:text-rose-400", tasks: open.filter((t) => (diff(t) ?? 1) < 0) },
      { id: "today", label: "Today", tone: "text-accent", tasks: open.filter((t) => diff(t) === 0) },
      { id: "tomorrow", label: "Tomorrow", tasks: open.filter((t) => diff(t) === 1) },
      { id: "week", label: "Next 7 days", tasks: open.filter((t) => (diff(t) ?? -1) > 1 && (diff(t) ?? 0) <= 7) },
      { id: "later", label: "Later", tasks: open.filter((t) => (diff(t) ?? 0) > 7) },
      { id: "nodate", label: "No date", tasks: open.filter((t) => !t.due_date) },
    ];
    g.forEach((x) => x.tasks.sort(byDue));
    return g.filter((x) => x.tasks.length);
  }, [tasks, now]);

  const done = tasks.filter((t) => t.status === "done").sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  const openCount = tasks.length - done.length;

  const quickAdd = async () => {
    const text = draft.trim();
    if (!text) return;
    const g = guessCapture(text);
    setDraft("");
    await create("tasks", { title: g.title || text, due_date: g.date, due_time: g.date ? g.time : null, project_id: projectId || null });
  };
  const hint = draft.trim() ? guessCapture(draft) : null;

  return (
    <Page wide>
      <PageHeader
        title="Tasks"
        description={`${openCount} open · ${done.length} done`}
        actions={
          <>
            <Segmented
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: "list", label: "List" },
                { value: "board", label: "Board" },
              ]}
            />
            <Button variant="primary" size="sm" onClick={() => editor.open("task", { initial: { project_id: projectId || null } })}>
              <Plus /> Task
            </Button>
          </>
        }
      />

      {/* Quick add */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          quickAdd();
        }}
        className="mb-4 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 shadow-soft transition-shadow focus-within:border-accent/50 focus-within:shadow-[0_0_0_3px_var(--ring)]"
      >
        <Plus className="h-4 w-4 text-subtle" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder='Add a task — try "Submit report friday 5pm"'
          className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
        />
        {hint?.date && (
          <span className="animate-fade-in hidden rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent sm:inline">
            {friendlyDate(parseISODate(hint.date), now)}
            {hint.time ? ` · ${hint.time}` : ""}
          </span>
        )}
        {draft && <CornerDownLeft className="h-4 w-4 text-subtle" />}
      </form>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter…"
            className="h-8 w-40 rounded-lg border border-line bg-surface pr-2 pl-8 text-[13px] outline-none focus:border-accent/50"
          />
        </div>
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-8 w-auto text-[13px]">
          <option value="">All projects</option>
          {data.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        {PRIORITIES.slice()
          .reverse()
          .map((p) => (
            <Chip key={p} active={priority === p} onClick={() => setPriority(priority === p ? "" : p)}>
              {PRIORITY_LABEL[p]}
            </Chip>
          ))}
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare />}
          title={query || projectId || priority ? "Nothing matches" : "A clear mind"}
          description={query || projectId || priority ? "Try removing a filter." : "Nothing on your plate yet. Add the first thing you need to do."}
          action={
            <Button variant="primary" onClick={() => editor.open("task")}>
              <Plus /> Add task
            </Button>
          }
        />
      ) : view === "list" ? (
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <Card key={g.id}>
              <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
                <span className={cn("text-[13px] font-semibold", g.tone)}>{g.label}</span>
                <span className="tabular text-xs text-subtle">{g.tasks.length}</span>
              </div>
              <div className="stagger px-2 pb-2">
                {g.tasks.map((t) => (
                  <TaskRow key={t.id} task={t} now={now} />
                ))}
              </div>
            </Card>
          ))}
          {done.length > 0 && (
            <div>
              <button onClick={() => setShowDone((s) => !s)} className="mb-2 flex items-center gap-1.5 px-1 text-[13px] font-medium text-subtle hover:text-fg">
                <ChevronDown className={cn("h-4 w-4 transition-transform", !showDone && "-rotate-90")} /> Completed · {done.length}
              </button>
              {showDone && (
                <Card className="animate-fade-up px-2 py-2">
                  {done.slice(0, 50).map((t) => (
                    <TaskRow key={t.id} task={t} now={now} />
                  ))}
                </Card>
              )}
            </div>
          )}
        </div>
      ) : (
        <Board tasks={tasks} now={now} onMove={(t, status) => update("tasks", t.id, { status, completed_at: status === "done" ? new Date().toISOString() : null })} />
      )}
    </Page>
  );
}

function Board({ tasks, now, onMove }: { tasks: Task[]; now: Date; onMove: (t: Task, s: TaskStatus) => void }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  const editor = useEditor();
  const cols: TaskStatus[] = ["todo", "in_progress", "done"];
  const soon = toISODate(addDays(now, 3));
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
      {cols.map((s) => {
        const list = tasks
          .filter((t) => t.status === s)
          .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.due_date ?? "9").localeCompare(b.due_date ?? "9"));
        return (
          <div
            key={s}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(s);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={() => {
              const t = tasks.find((x) => x.id === dragId);
              if (t && t.status !== s) onMove(t, s);
              setDragId(null);
              setOver(null);
            }}
            className={cn("flex w-[85vw] shrink-0 snap-start flex-col rounded-2xl bg-surface-2/60 p-2 transition-colors sm:w-auto", over === s && "bg-accent/[0.07]")}
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[13px] font-semibold">{TASK_STATUS_LABEL[s]}</span>
              <span className="tabular text-xs text-subtle">{list.length}</span>
            </div>
            <div className="flex min-h-24 flex-col gap-2">
              {list.slice(0, s === "done" ? 20 : 100).map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => editor.open("task", { id: t.id })}
                  className={cn(
                    "cursor-grab rounded-xl border border-line bg-surface p-3 shadow-soft transition-all hover:-translate-y-px hover:shadow-card active:cursor-grabbing",
                    dragId === t.id && "opacity-40",
                  )}
                >
                  <div className={cn("text-[13.5px] leading-snug font-medium", s === "done" && "text-subtle line-through")}>{t.title}</div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-subtle">
                    {t.due_date && (
                      <span className={cn(t.due_date < toISODate(now) && s !== "done" ? "text-rose-500" : t.due_date <= soon ? "text-orange-500" : "")}>
                        {friendlyDate(combineDateTime(t.due_date), now)}
                      </span>
                    )}
                    <span className="ml-auto">{PRIORITY_LABEL[t.priority]}</span>
                  </div>
                </div>
              ))}
              {s === "todo" && (
                <button onClick={() => editor.open("task")} className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-subtle hover:bg-surface hover:text-fg">
                  <Plus className="h-4 w-4" /> Add
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
