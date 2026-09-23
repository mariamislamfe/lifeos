"use client";

import Link from "next/link";
import { useMemo } from "react";
import { differenceInCalendarDays } from "date-fns";
import { CalendarClock, CheckSquare, FolderKanban, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useLocalState, useNow } from "@/lib/hooks";
import { projectProgress } from "@/lib/agenda";
import { parseISODate } from "@/lib/date";
import { PRIORITY_RANK, PROJECT_STATUS_LABEL, PROJECT_STATUS_STYLE, color as colorOf } from "@/lib/meta";
import type { ProjectStatus } from "@/lib/types";
import { Badge, Button, PriorityIcon, ProgressBar, Segmented } from "@/components/ui/primitives";
import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { useEditor } from "@/components/editor/editor-provider";

type Filter = "current" | "ideas" | "done" | "all";
const FILTERS: Record<Filter, ProjectStatus[]> = {
  current: ["active", "planned", "paused"],
  ideas: ["idea"],
  done: ["completed", "archived"],
  all: ["idea", "planned", "active", "paused", "completed", "archived"],
};
const STATUS_ORDER: ProjectStatus[] = ["active", "planned", "paused", "idea", "completed", "archived"];

export default function ProjectsPage() {
  const { data } = useData();
  const now = useNow(60_000);
  const editor = useEditor();
  const [filter, setFilter] = useLocalState<Filter>("projects-filter", "current");

  const projects = useMemo(
    () =>
      data.projects
        .filter((p) => FILTERS[filter].includes(p.status))
        .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]),
    [data.projects, filter],
  );

  return (
    <Page wide>
      <PageHeader
        title="Projects"
        description={`${data.projects.filter((p) => p.status === "active").length} active`}
        actions={
          <>
            <Segmented
              size="sm"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "current", label: "Current" },
                { value: "ideas", label: "Ideas" },
                { value: "done", label: "Done" },
                { value: "all", label: "All" },
              ]}
            />
            <Button variant="primary" size="sm" onClick={() => editor.open("project")}>
              <Plus /> Project
            </Button>
          </>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban />}
          title={data.projects.length ? "Nothing here" : "No projects yet."}
          description={data.projects.length ? "Try another filter." : "Your next big thing starts here."}
          action={
            <Button variant="primary" onClick={() => editor.open("project")}>
              <Plus /> Create project
            </Button>
          }
        />
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const pct = projectProgress(p, data);
            const c = colorOf(p.color);
            const tasks = data.tasks.filter((t) => t.project_id === p.id && !t.parent_id);
            const open = tasks.filter((t) => t.status !== "done").length;
            const nextMs = data.milestones
              .filter((m) => m.project_id === p.id && !m.done)
              .sort((a, b) => (a.due_date ?? "9").localeCompare(b.due_date ?? "9"))[0];
            const daysLeft = p.deadline ? differenceInCalendarDays(parseISODate(p.deadline), now) : null;
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card"
              >
                <div className={cn("absolute inset-x-0 top-0 h-[3px]", c.bar)} />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-semibold", c.soft, c.text)}>{p.name.slice(0, 1).toUpperCase()}</div>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold tracking-tight group-hover:text-accent">{p.name}</div>
                      <Badge className={cn("mt-0.5", PROJECT_STATUS_STYLE[p.status])}>{PROJECT_STATUS_LABEL[p.status]}</Badge>
                    </div>
                  </div>
                  <PriorityIcon priority={p.priority} />
                </div>
                {p.description && <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-muted">{p.description}</p>}
                <div className="mt-auto pt-5">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted">Progress</span>
                    <span className="tabular font-semibold">{pct}%</span>
                  </div>
                  <ProgressBar value={pct} barClassName={c.bar} />
                  <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
                    <span className="flex items-center gap-1">
                      <CheckSquare className="h-3.5 w-3.5" /> {open} open
                    </span>
                    {daysLeft !== null && p.status !== "completed" && (
                      <span className={cn("flex items-center gap-1", daysLeft < 0 ? "text-rose-500" : daysLeft <= 7 ? "text-orange-600 dark:text-orange-400" : "")}>
                        <CalendarClock className="h-3.5 w-3.5" />
                        {daysLeft < 0 ? `${-daysLeft}d overdue` : daysLeft === 0 ? "Due today" : `${daysLeft}d left`}
                      </span>
                    )}
                    {nextMs && <span className="truncate">◆ {nextMs.title}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
          <button
            onClick={() => editor.open("project")}
            className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-sm text-subtle transition-colors hover:border-accent/50 hover:text-accent"
          >
            <Plus className="h-5 w-5" /> New project
          </button>
        </div>
      )}
    </Page>
  );
}
