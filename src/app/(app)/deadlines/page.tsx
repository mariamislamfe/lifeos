"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Bell, ChevronDown, Flag, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { relativeLabel, toTimeString, urgencyOf, type Urgency } from "@/lib/date";
import { color as colorOf } from "@/lib/meta";
import type { Deadline } from "@/lib/types";
import { Badge, Button, Card, CheckCircle, PriorityIcon, URGENCY_META } from "@/components/ui/primitives";
import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { useOpenFromQuery } from "@/components/items/item-rows";
import { useEditor } from "@/components/editor/editor-provider";

const ORDER: { id: Urgency; label: string; description: string }[] = [
  { id: "overdue", label: "Overdue", description: "Past due — deal with these or reschedule" },
  { id: "today", label: "Due today", description: "" },
  { id: "soon", label: "Soon", description: "Within 3 days" },
  { id: "upcoming", label: "Upcoming", description: "Next two weeks" },
  { id: "later", label: "Later", description: "" },
];

export default function DeadlinesPage() {
  useOpenFromQuery("deadline");
  const { data } = useData();
  const now = useNow();
  const editor = useEditor();
  const [showDone, setShowDone] = useState(false);

  const grouped = useMemo(() => {
    const open = data.deadlines.filter((d) => d.status !== "done").sort((a, b) => a.due_at.localeCompare(b.due_at));
    const map = new Map<Urgency, Deadline[]>();
    for (const d of open) {
      const u = urgencyOf(new Date(d.due_at), now);
      if (!map.has(u)) map.set(u, []);
      map.get(u)!.push(d);
    }
    return map;
  }, [data.deadlines, now]);
  const done = data.deadlines.filter((d) => d.status === "done").sort((a, b) => b.due_at.localeCompare(a.due_at));
  const openCount = data.deadlines.length - done.length;

  return (
    <Page>
      <PageHeader
        title="Deadlines"
        description={openCount ? `${openCount} open · ${grouped.get("overdue")?.length ?? 0} overdue` : "Nothing due"}
        actions={
          <Button variant="primary" size="sm" onClick={() => editor.open("deadline")}>
            <Plus /> Deadline
          </Button>
        }
      />

      {/* Urgency overview */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ORDER.slice(0, 4).map((o) => {
          const n = grouped.get(o.id)?.length ?? 0;
          const m = URGENCY_META[o.id];
          return (
            <a key={o.id} href={`#${o.id}`} className={cn("rounded-2xl border border-line bg-surface px-4 py-3 shadow-soft transition-colors hover:border-line-strong", !n && "opacity-60")}>
              <div className="flex items-center gap-2 text-xs font-medium text-muted">
                <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} /> {o.label}
              </div>
              <div className="tabular mt-1 text-2xl font-semibold tracking-tight">{n}</div>
            </a>
          );
        })}
      </div>

      {openCount === 0 && done.length === 0 ? (
        <EmptyState
          icon={<Flag />}
          title="No deadlines"
          description="Competitions, scholarships, assignments, client work — add a deadline and LifeOS will remind you in time."
          action={
            <Button variant="primary" onClick={() => editor.open("deadline")}>
              <Plus /> Add deadline
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {ORDER.map((o) => {
            const list = grouped.get(o.id);
            if (!list?.length) return null;
            return (
              <section key={o.id} id={o.id} className="scroll-mt-20">
                <div className="mb-2 flex items-baseline gap-2 px-1">
                  <h2 className={cn("text-[13px] font-semibold", o.id === "overdue" && "text-rose-600 dark:text-rose-400", o.id === "today" && "text-orange-600 dark:text-orange-400")}>{o.label}</h2>
                  {o.description && <span className="text-xs text-subtle">{o.description}</span>}
                </div>
                <Card className="stagger p-1.5">
                  {list.map((d) => (
                    <DeadlineRow key={d.id} d={d} now={now} urgency={o.id} />
                  ))}
                </Card>
              </section>
            );
          })}
          {done.length > 0 && (
            <div>
              <button onClick={() => setShowDone((s) => !s)} className="mb-2 flex items-center gap-1.5 px-1 text-[13px] font-medium text-subtle hover:text-fg">
                <ChevronDown className={cn("h-4 w-4 transition-transform", !showDone && "-rotate-90")} /> Done · {done.length}
              </button>
              {showDone && (
                <Card className="animate-fade-up p-1.5">
                  {done.map((d) => (
                    <DeadlineRow key={d.id} d={d} now={now} urgency="later" />
                  ))}
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </Page>
  );
}

function DeadlineRow({ d, now, urgency }: { d: Deadline; now: Date; urgency: Urgency }) {
  const { data, update } = useData();
  const editor = useEditor();
  const due = new Date(d.due_at);
  const done = d.status === "done";
  const project = d.project_id ? data.projects.find((p) => p.id === d.project_id) : null;
  const app = d.application_id ? data.applications.find((a) => a.id === d.application_id) : null;
  const reminders = data.reminders.filter((r) => r.source_id === d.id && !r.fired_at && !r.done).length;
  const m = URGENCY_META[urgency];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => editor.open("deadline", { id: d.id })}
      onKeyDown={(e) => e.key === "Enter" && editor.open("deadline", { id: d.id })}
      className="group flex cursor-pointer items-center gap-3.5 rounded-xl px-3 py-3 transition-colors hover:bg-surface-2"
    >
      <CheckCircle checked={done} onChange={() => update("deadlines", d.id, { status: done ? "pending" : "done" })} />
      <div className="hidden w-14 shrink-0 flex-col items-center rounded-lg border border-line py-1 sm:flex">
        <span className="text-[10px] font-semibold tracking-wide text-subtle uppercase">{format(due, "MMM")}</span>
        <span className="tabular text-lg leading-none font-semibold">{format(due, "d")}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-[14.5px] font-medium", done && "text-subtle line-through")}>{d.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-subtle">
          <span className="tabular">
            {format(due, "EEE d MMM")} · {toTimeString(due)}
          </span>
          {d.category && <span>{d.category}</span>}
          {project && (
            <Link href={`/projects/${project.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 hover:text-fg">
              <span className={cn("h-1.5 w-1.5 rounded-full", colorOf(project.color).dot)} />
              {project.name}
            </Link>
          )}
          {app && (
            <Link href={`/applications?open=${app.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-fg">
              ↗ {app.name}
            </Link>
          )}
          {d.status === "in_progress" && <span className="text-sky-600 dark:text-sky-400">In progress</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {reminders > 0 && (
          <span title={`${reminders} reminder(s) scheduled`} className="flex items-center gap-0.5 text-xs text-subtle">
            <Bell className="h-3 w-3" />
            {reminders}
          </span>
        )}
        {!done && (
          <Badge className={m.className}>
            <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
            {relativeLabel(due, now)}
          </Badge>
        )}
        <PriorityIcon priority={d.priority} className="hidden sm:inline-flex" />
      </div>
    </div>
  );
}
