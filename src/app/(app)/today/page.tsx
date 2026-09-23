"use client";

import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { ChevronLeft, ChevronRight, GripVertical, Moon, Plus, Sun, Sunrise, Sunset, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { agendaForDay, type AgendaItem } from "@/lib/agenda";
import { parseISODate, toISODate } from "@/lib/date";
import { PRIORITY_RANK } from "@/lib/meta";
import type { PlanBucket, Task } from "@/lib/types";
import { Button, Card, CheckCircle, PriorityIcon, SectionHeader } from "@/components/ui/primitives";
import { Page, PageHeader } from "@/components/ui/page";
import { AgendaRow } from "@/components/items/item-rows";
import { useEditor } from "@/components/editor/editor-provider";

const BUCKETS: { id: PlanBucket; title: string; hint: string; accent: string }[] = [
  { id: "must", title: "Must do", hint: "Non-negotiable today", accent: "bg-rose-500" },
  { id: "should", title: "Should do", hint: "Important, not critical", accent: "bg-amber-500" },
  { id: "could", title: "If I have time", hint: "Nice to get to", accent: "bg-emerald-500" },
];

const PERIODS = [
  { id: "morning", label: "Morning", icon: Sunrise, test: (h: number) => h < 12 },
  { id: "afternoon", label: "Afternoon", icon: Sun, test: (h: number) => h >= 12 && h < 17 },
  { id: "evening", label: "Evening", icon: Sunset, test: (h: number) => h >= 17 },
];

export default function TodayPage() {
  const { data, update, create, toggleTask } = useData();
  const now = useNow();
  const editor = useEditor();
  const [dayOffset, setDayOffset] = useState(0);
  const day = addDays(now, dayOffset);
  const iso = toISODate(day);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ bucket: PlanBucket; index: number } | null>(null);
  const [drafts, setDrafts] = useState<Record<PlanBucket, string>>({ must: "", should: "", could: "" });

  const schedule = useMemo(() => agendaForDay(data, day).filter((i) => !(i.kind === "task" && i.allDay)), [data, day]);
  const allDay = schedule.filter((i) => i.allDay);
  const timed = schedule.filter((i) => !i.allDay);

  const planned = useMemo(() => {
    const byBucket: Record<PlanBucket, Task[]> = { must: [], should: [], could: [] };
    for (const t of data.tasks) if (t.plan_date === iso && t.plan_bucket && !t.parent_id) byBucket[t.plan_bucket].push(t);
    for (const b of Object.keys(byBucket) as PlanBucket[]) byBucket[b].sort((a, b) => a.plan_order - b.plan_order);
    return byBucket;
  }, [data.tasks, iso]);

  const suggestions = useMemo(
    () =>
      data.tasks
        .filter((t) => t.status !== "done" && !t.parent_id && !(t.plan_date === iso && t.plan_bucket) && t.due_date && t.due_date <= iso)
        .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
        .slice(0, 8),
    [data.tasks, iso],
  );

  const plannedCount = BUCKETS.reduce((n, b) => n + planned[b.id].length, 0);
  const doneCount = BUCKETS.reduce((n, b) => n + planned[b.id].filter((t) => t.status === "done").length, 0);

  const moveTo = (taskId: string, bucket: PlanBucket, index: number) => {
    const list = planned[bucket].filter((t) => t.id !== taskId);
    const task = data.tasks.find((t) => t.id === taskId);
    if (!task) return;
    list.splice(Math.min(index, list.length), 0, task);
    list.forEach((t, i) => {
      if (t.id === taskId) update("tasks", t.id, { plan_date: iso, plan_bucket: bucket, plan_order: i });
      else if (t.plan_order !== i) update("tasks", t.id, { plan_order: i });
    });
  };

  const unplan = (t: Task) => update("tasks", t.id, { plan_date: null, plan_bucket: null });

  const addToBucket = async (bucket: PlanBucket) => {
    const title = drafts[bucket].trim();
    if (!title) return;
    setDrafts((d) => ({ ...d, [bucket]: "" }));
    await create("tasks", { title, plan_date: iso, plan_bucket: bucket, plan_order: planned[bucket].length, due_date: iso });
  };

  return (
    <Page wide>
      <PageHeader
        title={
          <span className="flex items-baseline gap-3">
            <span className="font-display text-[34px] font-normal italic sm:text-[40px]">{dayOffset === 0 ? "Today's plan" : dayOffset === 1 ? "Tomorrow's plan" : format(day, "EEEE")}</span>
          </span>
        }
        description={`${format(day, "EEEE, MMMM d")} · ${plannedCount ? `${doneCount} of ${plannedCount} priorities done` : "Pick what matters most"}`}
        actions={
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => setDayOffset((d) => d - 1)} aria-label="Previous day">
              <ChevronLeft />
            </Button>
            <Button size="sm" variant={dayOffset === 0 ? "subtle" : "secondary"} onClick={() => setDayOffset(0)}>
              Today
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setDayOffset((d) => d + 1)} aria-label="Next day">
              <ChevronRight />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.1fr]">
        {/* Schedule by period */}
        <div className="flex flex-col gap-4">
          {allDay.length > 0 && (
            <Card>
              <SectionHeader title="All day" icon={<Moon />} />
              <div className="px-2 pb-2">
                {allDay.map((i) => (
                  <AgendaRow key={i.key} item={i} now={now} compact />
                ))}
              </div>
            </Card>
          )}
          {PERIODS.map((p) => {
            const items = timed.filter((i) => p.test(i.start.getHours()));
            const Icon = p.icon;
            return (
              <Card key={p.id}>
                <SectionHeader
                  title={p.label}
                  icon={<Icon />}
                  count={items.length || undefined}
                  action={
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Add to ${p.label}`}
                      onClick={() =>
                        editor.open("task", { initial: { due_date: iso, due_time: p.id === "morning" ? "09:00" : p.id === "afternoon" ? "14:00" : "19:00" } })
                      }
                    >
                      <Plus />
                    </Button>
                  }
                />
                <div className="px-2 pb-2">
                  {items.length ? (
                    items.map((i: AgendaItem) => <AgendaRow key={i.key} item={i} now={now} />)
                  ) : (
                    <p className="px-3 pb-2 text-sm text-subtle">Free</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Priorities */}
        <div className="flex flex-col gap-4">
          {BUCKETS.map((b) => (
            <Card
              key={b.id}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                if (!over || over.bucket !== b.id) setOver({ bucket: b.id, index: planned[b.id].length });
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId && over) moveTo(dragId, over.bucket, over.index);
                setDragId(null);
                setOver(null);
              }}
              className={cn("transition-shadow", over?.bucket === b.id && "ring-2 ring-accent/30")}
            >
              <div className="flex items-center justify-between px-4 pt-3.5 pb-1.5">
                <div className="flex items-center gap-2.5">
                  <span className={cn("h-2 w-2 rounded-full", b.accent)} />
                  <span className="text-[13px] font-semibold">{b.title}</span>
                  <span className="text-xs text-subtle">{b.hint}</span>
                </div>
                <span className="tabular text-xs text-subtle">
                  {planned[b.id].filter((t) => t.status === "done").length}/{planned[b.id].length}
                </span>
              </div>
              <div className="px-2 pb-2">
                {planned[b.id].map((t, idx) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => {
                      setDragId(t.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOver(null);
                    }}
                    onDragOver={(e) => {
                      if (!dragId) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const after = e.clientY > rect.top + rect.height / 2;
                      setOver({ bucket: b.id, index: idx + (after ? 1 : 0) });
                    }}
                    className={cn("group relative", dragId === t.id && "opacity-40")}
                  >
                    {over?.bucket === b.id && over.index === idx && dragId && dragId !== t.id && <div className="absolute -top-px right-3 left-3 h-0.5 rounded-full bg-accent" />}
                    <div className="flex items-center gap-2 rounded-xl px-1.5 py-2 transition-colors hover:bg-surface-2">
                      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-line-strong group-hover:text-subtle" />
                      <CheckCircle checked={t.status === "done"} onChange={() => toggleTask(t)} />
                      <button onClick={() => editor.open("task", { id: t.id })} className={cn("min-w-0 flex-1 truncate text-left text-[14px]", t.status === "done" && "text-subtle line-through")}>
                        {t.title}
                      </button>
                      {t.due_time && <span className="tabular text-xs text-subtle">{t.due_time}</span>}
                      <PriorityIcon priority={t.priority} />
                      <button onClick={() => unplan(t)} className="text-subtle opacity-0 group-hover:opacity-100 hover:text-fg" title="Remove from plan">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {over?.bucket === b.id && over.index === planned[b.id].length && dragId && <div className="mx-3 h-0.5 rounded-full bg-accent" />}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addToBucket(b.id);
                  }}
                  className="flex items-center gap-2 rounded-xl px-1.5 py-1.5"
                >
                  <Plus className="ml-0.5 h-4 w-4 shrink-0 text-subtle" />
                  <input
                    value={drafts[b.id]}
                    onChange={(e) => setDrafts((d) => ({ ...d, [b.id]: e.target.value }))}
                    placeholder="Add a task…"
                    className="h-7 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
                  />
                </form>
              </div>
            </Card>
          ))}

          {suggestions.length > 0 && (
            <Card className="border-dashed bg-transparent shadow-none">
              <SectionHeader title="Waiting to be planned" count={suggestions.length} />
              <div className="px-2 pb-2">
                {suggestions.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOver(null);
                    }}
                    className="group flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-surface-2"
                  >
                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-line-strong" />
                    <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                    {t.due_date && t.due_date < iso && <span className="text-xs text-rose-500">Overdue</span>}
                    <div className="flex gap-1">
                      {BUCKETS.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => moveTo(t.id, b.id, planned[b.id].length)}
                          className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-subtle ring-1 ring-line transition-colors hover:bg-surface hover:text-fg"
                        >
                          {b.id === "must" ? "Must" : b.id === "should" ? "Should" : "If time"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {dayOffset === 0 && parseISODate(iso) && (
            <p className="px-1 text-xs text-subtle">Tip: drag tasks between lists to re-prioritise, or drag within a list to reorder.</p>
          )}
        </div>
      </div>
    </Page>
  );
}
