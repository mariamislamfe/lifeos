"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import {
  ArrowLeft,
  CalendarClock,
  CheckSquare,
  Diamond,
  ExternalLink,
  FileText,
  Flag,
  FolderKanban,
  Lightbulb,
  Link2,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { cn, hostname } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { projectProgress } from "@/lib/agenda";
import { combineDateTime, friendlyDate, parseISODate, toISODate } from "@/lib/date";
import { IDEA_STATUS_LABEL, PROJECT_STATUS_LABEL, PROJECT_STATUS_STYLE, color as colorOf } from "@/lib/meta";
import type { Attachment, ProjectStatus } from "@/lib/types";
import { Badge, Button, Card, CheckCircle, ProgressBar, ProgressRing, SectionHeader } from "@/components/ui/primitives";
import { Menu } from "@/components/ui/overlay";
import { EmptyState, Page } from "@/components/ui/page";
import { TaskRow } from "@/components/items/item-rows";
import { FileList, FilePreview, UploadButton } from "@/components/items/files";
import { useEditor } from "@/components/editor/editor-provider";

type Tab = "overview" | "tasks" | "timeline" | "notes" | "files" | "milestones";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "tasks", label: "Tasks" },
  { id: "timeline", label: "Timeline" },
  { id: "notes", label: "Notes" },
  { id: "files", label: "Files" },
  { id: "milestones", label: "Milestones" },
];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, update, remove } = useData();
  const now = useNow(60_000);
  const editor = useEditor();
  const [tab, setTab] = useState<Tab>("overview");
  const project = data.projects.find((p) => p.id === id);

  if (!project)
    return (
      <Page>
        <EmptyState
          icon={<FolderKanban />}
          title="Project not found"
          description="It may have been deleted."
          action={
            <Link href="/projects">
              <Button>Back to projects</Button>
            </Link>
          }
        />
      </Page>
    );

  const c = colorOf(project.color);
  const pct = projectProgress(project, data);
  const tasks = data.tasks.filter((t) => t.project_id === project.id && !t.parent_id);
  const openTasks = tasks.filter((t) => t.status !== "done");
  const milestones = data.milestones.filter((m) => m.project_id === project.id).sort((a, b) => (a.due_date ?? "9").localeCompare(b.due_date ?? "9"));
  const daysLeft = project.deadline ? differenceInCalendarDays(parseISODate(project.deadline), now) : null;

  return (
    <Page wide>
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-subtle hover:text-fg">
        <ArrowLeft className="h-3.5 w-3.5" /> Projects
      </Link>

      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-xl font-semibold", c.soft, c.text)}>{project.name.slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0">
            <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] sm:text-[30px]">{project.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <Menu
                align="start"
                trigger={(p) => (
                  <button {...p}>
                    <Badge className={cn("cursor-pointer", PROJECT_STATUS_STYLE[project.status])}>{PROJECT_STATUS_LABEL[project.status]} ▾</Badge>
                  </button>
                )}
                items={(Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((s) => ({
                  label: PROJECT_STATUS_LABEL[s],
                  onSelect: () => update("projects", project.id, { status: s }),
                }))}
              />
              {project.start_date && <span>Started {format(parseISODate(project.start_date), "MMM d")}</span>}
              {daysLeft !== null && (
                <span className={cn(daysLeft < 0 ? "text-rose-500" : daysLeft <= 7 ? "text-orange-600 dark:text-orange-400" : "")}>
                  · {daysLeft < 0 ? `${-daysLeft} days overdue` : daysLeft === 0 ? "Due today" : `Due ${friendlyDate(parseISODate(project.deadline!), now)} (${daysLeft}d)`}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ProgressRing value={pct} size={56} stroke={5} barClassName={cn("stroke-current", c.text)}>
            <span className="tabular text-[13px] font-semibold">{pct}%</span>
          </ProgressRing>
          <Button size="sm" onClick={() => editor.open("project", { id: project.id })}>
            <Pencil /> Edit
          </Button>
          <Menu
            trigger={(p) => (
              <Button {...p} size="icon" variant="ghost" aria-label="More">
                <MoreHorizontal />
              </Button>
            )}
            items={[
              { label: "Mark completed", onSelect: () => update("projects", project.id, { status: "completed" }) },
              { label: "Archive", onSelect: () => update("projects", project.id, { status: "archived" }) },
              "divider",
              {
                label: "Delete project",
                danger: true,
                icon: <Trash2 />,
                onSelect: () => {
                  remove("projects", project.id, { label: "Project" });
                  window.history.back();
                },
              },
            ]}
          />
        </div>
      </div>

      <div className="no-scrollbar -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 pb-2.5 text-[13px] font-medium transition-colors",
              tab === t.id ? "border-accent text-fg" : "border-transparent text-subtle hover:text-muted",
            )}
          >
            {t.label}
            {t.id === "tasks" && openTasks.length > 0 && <span className="ml-1.5 text-subtle">{openTasks.length}</span>}
            {t.id === "milestones" && milestones.length > 0 && <span className="ml-1.5 text-subtle">{milestones.length}</span>}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-fade-up">
        {tab === "overview" && <Overview projectId={project.id} now={now} onTab={setTab} />}
        {tab === "tasks" && <TasksTab projectId={project.id} now={now} />}
        {tab === "timeline" && <TimelineTab projectId={project.id} now={now} />}
        {tab === "notes" && <NotesTab projectId={project.id} />}
        {tab === "files" && <FilesTab projectId={project.id} />}
        {tab === "milestones" && (
          <Card className="p-2">
            {milestones.map((m) => (
              <MilestoneRow key={m.id} id={m.id} now={now} />
            ))}
            <button
              onClick={() => editor.open("milestone", { initial: { project_id: project.id } })}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-subtle hover:bg-surface-2 hover:text-fg"
            >
              <Plus className="h-4 w-4" /> Add milestone
            </button>
          </Card>
        )}
      </div>
    </Page>
  );
}

function MilestoneRow({ id, now }: { id: string; now: Date }) {
  const { data, update } = useData();
  const editor = useEditor();
  const m = data.milestones.find((x) => x.id === id);
  if (!m) return null;
  const overdue = !m.done && m.due_date && m.due_date < toISODate(now);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => editor.open("milestone", { id: m.id })}
      onKeyDown={(e) => e.key === "Enter" && editor.open("milestone", { id: m.id })}
      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2"
    >
      <CheckCircle checked={m.done} onChange={() => update("milestones", m.id, { done: !m.done })} />
      <Diamond className={cn("h-3.5 w-3.5 shrink-0", m.done ? "text-subtle" : "text-teal-500")} />
      <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", m.done && "text-subtle line-through")}>{m.title}</span>
      {m.due_date && <span className={cn("tabular text-xs", overdue ? "text-rose-500" : "text-subtle")}>{friendlyDate(parseISODate(m.due_date), now)}</span>}
    </div>
  );
}

function Overview({ projectId, now, onTab }: { projectId: string; now: Date; onTab: (t: Tab) => void }) {
  const { data } = useData();
  const editor = useEditor();
  const project = data.projects.find((p) => p.id === projectId)!;
  const tasks = data.tasks.filter((t) => t.project_id === projectId && !t.parent_id);
  const done = tasks.filter((t) => t.status === "done").length;
  const next = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => (a.due_date ?? "9").localeCompare(b.due_date ?? "9"))
    .slice(0, 5);
  const milestones = data.milestones.filter((m) => m.project_id === projectId);
  const nextMs = milestones.filter((m) => !m.done).sort((a, b) => (a.due_date ?? "9").localeCompare(b.due_date ?? "9"))[0];
  const ideas = data.ideas.filter((i) => i.project_id === projectId);
  const deadlines = data.deadlines.filter((d) => d.project_id === projectId && d.status !== "done").sort((a, b) => a.due_at.localeCompare(b.due_at));
  const events = data.events.filter((e) => e.project_id === projectId && new Date(e.start_at) >= now).sort((a, b) => a.start_at.localeCompare(b.start_at));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <div className="text-[13px] font-semibold">About</div>
          <p className={cn("mt-2 text-sm leading-relaxed whitespace-pre-wrap", project.description ? "text-muted" : "text-subtle")}>{project.description || "No description yet."}</p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-subtle">Tasks</div>
              <div className="tabular text-lg font-semibold">
                {done}/{tasks.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-subtle">Milestones</div>
              <div className="tabular text-lg font-semibold">
                {milestones.filter((m) => m.done).length}/{milestones.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-subtle">Next milestone</div>
              <div className="truncate text-sm font-medium">{nextMs ? nextMs.title : "—"}</div>
            </div>
          </div>
        </Card>
        <Card>
          <SectionHeader
            title="Next up"
            icon={<CheckSquare />}
            action={
              <button onClick={() => onTab("tasks")} className="text-xs text-subtle hover:text-fg">
                All tasks →
              </button>
            }
          />
          <div className="px-2 pb-2">
            {next.length ? next.map((t) => <TaskRow key={t.id} task={t} now={now} showProject={false} />) : <p className="px-3 pb-3 text-sm text-subtle">No open tasks.</p>}
            <button
              onClick={() => editor.open("task", { initial: { project_id: projectId } })}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-subtle hover:bg-surface-2 hover:text-fg"
            >
              <Plus className="h-4 w-4" /> Add task
            </button>
          </div>
        </Card>
      </div>
      <div className="flex flex-col gap-4">
        {(deadlines.length > 0 || events.length > 0) && (
          <Card>
            <SectionHeader title="Coming up" icon={<CalendarClock />} />
            <div className="px-2 pb-2">
              {deadlines.map((d) => (
                <button key={d.id} onClick={() => editor.open("deadline", { id: d.id })} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-surface-2">
                  <Flag className="h-4 w-4 shrink-0 text-rose-500" />
                  <span className="min-w-0 flex-1 truncate text-sm">{d.title}</span>
                  <span className="text-xs text-subtle">{friendlyDate(new Date(d.due_at), now)}</span>
                </button>
              ))}
              {events.map((e) => (
                <button key={e.id} onClick={() => editor.open("event", { id: e.id })} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-surface-2">
                  <Users className="h-4 w-4 shrink-0 text-violet-500" />
                  <span className="min-w-0 flex-1 truncate text-sm">{e.title}</span>
                  <span className="text-xs text-subtle">{friendlyDate(new Date(e.start_at), now)}</span>
                </button>
              ))}
            </div>
          </Card>
        )}
        <Card>
          <SectionHeader title="Links" icon={<Link2 />} action={<Button size="icon-sm" variant="ghost" onClick={() => editor.open("project", { id: projectId })} aria-label="Edit links"><Pencil /></Button>} />
          <div className="px-2 pb-2">
            {project.links.length === 0 && <p className="px-3 pb-3 text-sm text-subtle">No links yet.</p>}
            {project.links.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-surface-2">
                <ExternalLink className="h-4 w-4 shrink-0 text-subtle" />
                <span className="text-sm font-medium">{l.label}</span>
                <span className="truncate text-xs text-subtle">{hostname(l.url)}</span>
              </a>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeader title="Ideas" icon={<Lightbulb />} action={<Button size="icon-sm" variant="ghost" onClick={() => editor.open("idea", { initial: { project_id: projectId } })} aria-label="Add idea"><Plus /></Button>} />
          <div className="px-2 pb-2">
            {ideas.length === 0 && <p className="px-3 pb-3 text-sm text-subtle">Park ideas for this project here.</p>}
            {ideas.map((i) => (
              <button key={i.id} onClick={() => editor.open("idea", { id: i.id })} className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-surface-2">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{i.title}</div>
                  <div className="text-xs text-subtle">{IDEA_STATUS_LABEL[i.status]}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function TasksTab({ projectId, now }: { projectId: string; now: Date }) {
  const { data, create } = useData();
  const [draft, setDraft] = useState("");
  const tasks = data.tasks.filter((t) => t.project_id === projectId && !t.parent_id);
  const open = tasks.filter((t) => t.status !== "done").sort((a, b) => (a.due_date ?? "9").localeCompare(b.due_date ?? "9"));
  const done = tasks.filter((t) => t.status === "done");
  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          create("tasks", { title: draft.trim(), project_id: projectId });
          setDraft("");
        }}
        className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 shadow-soft focus-within:border-accent/50"
      >
        <Plus className="h-4 w-4 text-subtle" />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a task to this project…" className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle" />
      </form>
      <Card className="p-2">
        {open.length ? open.map((t) => <TaskRow key={t.id} task={t} now={now} showProject={false} />) : <p className="px-3 py-3 text-sm text-subtle">All tasks done. 🎉</p>}
      </Card>
      {done.length > 0 && (
        <>
          <div className="px-1 text-[13px] font-semibold text-subtle">Completed · {done.length}</div>
          <Card className="p-2">
            {done.map((t) => (
              <TaskRow key={t.id} task={t} now={now} showProject={false} />
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

function TimelineTab({ projectId, now }: { projectId: string; now: Date }) {
  const { data } = useData();
  const project = data.projects.find((p) => p.id === projectId)!;
  const entries = useMemo(() => {
    const list: { at: Date; label: string; kind: "start" | "end" | "milestone" | "deadline" | "task" | "event"; done: boolean }[] = [];
    if (project.start_date) list.push({ at: parseISODate(project.start_date), label: "Project started", kind: "start", done: true });
    if (project.deadline) list.push({ at: parseISODate(project.deadline), label: "Project deadline", kind: "end", done: project.status === "completed" });
    for (const m of data.milestones) if (m.project_id === projectId && m.due_date) list.push({ at: parseISODate(m.due_date), label: m.title, kind: "milestone", done: m.done });
    for (const d of data.deadlines) if (d.project_id === projectId) list.push({ at: new Date(d.due_at), label: d.title, kind: "deadline", done: d.status === "done" });
    for (const e of data.events) if (e.project_id === projectId) list.push({ at: new Date(e.start_at), label: e.title, kind: "event", done: new Date(e.start_at) < now });
    for (const t of data.tasks) if (t.project_id === projectId && t.due_date && !t.parent_id) list.push({ at: combineDateTime(t.due_date, t.due_time), label: t.title, kind: "task", done: t.status === "done" });
    return list.sort((a, b) => a.at.getTime() - b.at.getTime());
  }, [data, project, projectId, now]);

  if (!entries.length) return <EmptyState compact icon={<CalendarClock />} title="No dates yet" description="Add a start date, deadline or milestones to build a timeline." />;

  const first = entries[0].at.getTime();
  const last = entries[entries.length - 1].at.getTime();
  const nowPct = last > first ? Math.max(0, Math.min(100, ((now.getTime() - first) / (last - first)) * 100)) : 0;
  const DOT: Record<string, string> = { start: "bg-zinc-400", end: "bg-rose-500", milestone: "bg-teal-500", deadline: "bg-rose-400", task: "bg-indigo-400", event: "bg-violet-500" };

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <div className="mb-2 flex justify-between text-xs text-subtle">
          <span>{format(entries[0].at, "MMM d")}</span>
          <span>Today</span>
          <span>{format(entries[entries.length - 1].at, "MMM d")}</span>
        </div>
        <ProgressBar value={nowPct} className="h-2" />
      </Card>
      <Card className="p-5">
        <ol className="relative ml-2 border-l border-line">
          {entries.map((e, i) => {
            const past = e.at < now;
            return (
              <li key={i} className="relative pb-5 pl-6 last:pb-0">
                <span className={cn("absolute top-1 -left-[5px] h-2.5 w-2.5 rounded-full ring-4 ring-surface", DOT[e.kind], e.done && "opacity-50")} />
                <div className="tabular text-xs text-subtle">
                  {format(e.at, "EEE, MMM d")}
                  {e.kind === "event" || e.kind === "deadline" ? ` · ${format(e.at, "HH:mm")}` : ""}
                </div>
                <div className={cn("text-sm font-medium", e.done && "text-subtle line-through", !e.done && past && "text-rose-600 dark:text-rose-400")}>
                  {e.kind === "milestone" && "◆ "}
                  {e.label}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}

function NotesTab({ projectId }: { projectId: string }) {
  const { data, update } = useData();
  const editor = useEditor();
  const project = data.projects.find((p) => p.id === projectId)!;
  const [text, setText] = useState(project.notes ?? "");
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const notes = data.notes.filter((n) => n.project_id === projectId);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-semibold">Project notes</span>
          <span className="text-xs text-subtle">{saved ? "Saved" : "Saving…"}</span>
        </div>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(async () => {
              await update("projects", projectId, { notes: e.target.value || null });
              setSaved(true);
            }, 700);
          }}
          placeholder="Decisions, context, thoughts…"
          className="min-h-[320px] w-full resize-y bg-transparent text-sm leading-relaxed outline-none placeholder:text-subtle"
        />
      </Card>
      <Card>
        <SectionHeader title="Linked notes" icon={<NotebookPen />} action={<Button size="icon-sm" variant="ghost" onClick={() => editor.open("note", { initial: { project_id: projectId } })} aria-label="Add note"><Plus /></Button>} />
        <div className="px-2 pb-2">
          {notes.length === 0 && <p className="px-3 pb-3 text-sm text-subtle">No linked notes.</p>}
          {notes.map((n) => (
            <button key={n.id} onClick={() => editor.open("note", { id: n.id })} className="flex w-full flex-col items-start rounded-xl px-3 py-2 text-left hover:bg-surface-2">
              <span className="truncate text-sm font-medium">{n.title || n.content.slice(0, 40)}</span>
              <span className="line-clamp-2 text-xs text-subtle">{n.content}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function FilesTab({ projectId }: { projectId: string }) {
  const { data } = useData();
  const [preview, setPreview] = useState<Attachment | null>(null);
  const files = data.attachments.filter((a) => a.entity_type === "project" && a.entity_id === projectId);
  return (
    <Card>
      <SectionHeader title="Files" icon={<FileText />} count={files.length} action={<UploadButton entityType="project" entityId={projectId} variant="subtle" />} />
      <div className="px-2 pb-3">
        {files.length === 0 ? (
          <EmptyState compact icon={<FileText />} title="No files yet" description="Upload briefs, designs, reports or anything else for this project." />
        ) : (
          <FileList files={files} onOpen={setPreview} />
        )}
      </div>
      <FilePreview file={preview} open={!!preview} onClose={() => setPreview(null)} />
    </Card>
  );
}
