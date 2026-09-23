"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMinutes,
  addMonths,
  addWeeks,
  differenceInMinutes,
  endOfDay,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useLocalState, useNow, useMediaQuery } from "@/lib/hooks";
import { buildAgenda, KIND_META, type AgendaItem, type AgendaKind } from "@/lib/agenda";
import { dateRange, friendlyDate, toISODate, toTimeString, weekStart } from "@/lib/date";
import { color as colorOf } from "@/lib/meta";
import type { SourceType } from "@/lib/types";
import { Button, Card, Chip, Segmented } from "@/components/ui/primitives";
import { Page } from "@/components/ui/page";
import { AgendaRow, useAgendaActions } from "@/components/items/item-rows";
import { useEditor } from "@/components/editor/editor-provider";
import { toast } from "@/lib/toast";

type View = "month" | "week" | "day" | "agenda";
const HOUR_PX = 52;
const START_HOUR = 6;
const END_HOUR = 24;
const FILTERABLE: AgendaKind[] = ["class", "event", "study", "task", "deadline", "milestone", "application", "reminder"];

function useReschedule() {
  const { data, update, syncReminders } = useData();
  return async (item: AgendaItem, start: Date, keepTime: boolean) => {
    const target = keepTime ? new Date(start.getFullYear(), start.getMonth(), start.getDate(), item.start.getHours(), item.start.getMinutes()) : start;
    const date = toISODate(target);
    const time = toTimeString(target);
    const offsets = (id: string) => data.reminders.filter((r) => r.source_id === id && r.offset_minutes !== null && !r.fired_at).map((r) => r.offset_minutes!);
    const resync = (type: SourceType, due: Date) => {
      const o = offsets(item.id);
      if (o.length) syncReminders(type, item.id, item.title, due, o);
    };
    switch (item.kind) {
      case "event":
        await update("events", item.id, { start_at: target.toISOString() });
        resync("event", target);
        break;
      case "task": {
        const allDay = keepTime && item.allDay;
        await update("tasks", item.id, { due_date: date, due_time: allDay ? null : time });
        resync("task", target);
        break;
      }
      case "deadline":
        await update("deadlines", item.id, { due_at: target.toISOString() });
        resync("deadline", target);
        break;
      case "study":
        await update("study_sessions", item.id, { date, start_time: keepTime && item.allDay ? null : time });
        break;
      case "milestone":
        if (item.table === "milestones") await update("milestones", item.id, { due_date: date });
        break;
      case "reminder":
        await update("reminders", item.id, { remind_at: target.toISOString(), fired_at: null });
        break;
      default:
        return;
    }
    toast("Rescheduled", { description: `${item.title} → ${friendlyDate(target)}${keepTime && item.allDay ? "" : " " + time}` });
  };
}

export default function CalendarPage() {
  const { data } = useData();
  const now = useNow(60_000);
  const editor = useEditor();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [view, setView] = useLocalState<View>("calendar-view", "week");
  const [cursor, setCursor] = useState(() => new Date());
  const [hidden, setHidden] = useLocalState<AgendaKind[]>("calendar-hidden", []);
  const effectiveView: View = isMobile && view === "week" ? "day" : view;

  const range = useMemo(() => {
    if (effectiveView === "month") {
      const start = weekStart(startOfMonth(cursor));
      return { from: start, to: endOfDay(addDays(start, 41)) };
    }
    if (effectiveView === "week") {
      const start = weekStart(cursor);
      return { from: start, to: endOfDay(addDays(start, 6)) };
    }
    if (effectiveView === "day") return { from: startOfDay(cursor), to: endOfDay(cursor) };
    return { from: startOfDay(cursor), to: endOfDay(addDays(cursor, 30)) };
  }, [cursor, effectiveView]);

  const items = useMemo(
    () => buildAgenda(data, range.from, range.to, { reminders: !hidden.includes("reminder") }).filter((i) => !hidden.includes(i.kind)),
    [data, range, hidden],
  );

  const step = (dir: 1 | -1) => {
    if (effectiveView === "month") setCursor((c) => addMonths(c, dir));
    else if (effectiveView === "week") setCursor((c) => addWeeks(c, dir));
    else if (effectiveView === "day") setCursor((c) => addDays(c, dir));
    else setCursor((c) => addDays(c, dir * 30));
  };

  const title =
    effectiveView === "month"
      ? format(cursor, "MMMM yyyy")
      : effectiveView === "week"
        ? `${format(range.from, "MMM d")} – ${format(range.to, isSameMonth(range.from, range.to) ? "d, yyyy" : "MMM d, yyyy")}`
        : effectiveView === "day"
          ? format(cursor, "EEEE, MMMM d")
          : `Next 30 days`;

  return (
    <Page wide className="lg:pb-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] sm:text-[28px]">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center">
            <Button size="icon" variant="ghost" onClick={() => step(-1)} aria-label="Previous">
              <ChevronLeft />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setCursor(new Date())}>
              Today
            </Button>
            <Button size="icon" variant="ghost" onClick={() => step(1)} aria-label="Next">
              <ChevronRight />
            </Button>
          </div>
          <Segmented
            size="sm"
            value={effectiveView}
            onChange={setView}
            options={[
              { value: "month", label: "Month" },
              ...(isMobile ? [] : [{ value: "week" as View, label: "Week" }]),
              { value: "day", label: "Day" },
              { value: "agenda", label: "Agenda" },
            ]}
          />
          <Button size="sm" variant="primary" onClick={() => editor.open("event", { initial: { start_at: new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 10).toISOString() } })}>
            <Plus /> Event
          </Button>
        </div>
      </div>

      <div className="no-scrollbar -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTERABLE.map((k) => {
          const on = !hidden.includes(k);
          return (
            <Chip key={k} active={on} onClick={() => setHidden(on ? [...hidden, k] : hidden.filter((h) => h !== k))}>
              <span className={cn("h-2 w-2 rounded-full", colorOf(KIND_META[k].color).dot, !on && "opacity-30")} />
              {k === "class" ? "University" : KIND_META[k].label}
            </Chip>
          );
        })}
      </div>

      <div key={effectiveView} className="animate-fade-in">
        {effectiveView === "month" && <MonthView cursor={cursor} items={items} now={now} onPickDay={(d) => (setCursor(d), setView("day"))} />}
        {effectiveView === "week" && <TimeGrid days={dateRange(range.from, 7)} items={items} now={now} />}
        {effectiveView === "day" && <TimeGrid days={[startOfDay(cursor)]} items={items} now={now} />}
        {effectiveView === "agenda" && <AgendaView items={items} now={now} />}
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Month
// ---------------------------------------------------------------------------
function MonthView({ cursor, items, now, onPickDay }: { cursor: Date; items: AgendaItem[]; now: Date; onPickDay: (d: Date) => void }) {
  const days = dateRange(weekStart(startOfMonth(cursor)), 42);
  const reschedule = useReschedule();
  const { open } = useAgendaActions();
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overDay, setOverDay] = useState<string | null>(null);
  const editor = useEditor();
  const lastRowNeeded = days[35] <= endOfMonth(cursor);
  const visible = lastRowNeeded ? days : days.slice(0, 35);

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-line bg-surface-2/50">
        {days.slice(0, 7).map((d) => (
          <div key={d.toISOString()} className="px-2 py-2 text-center text-[11px] font-medium tracking-wide text-subtle uppercase">
            {format(d, "EEE")}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {visible.map((d, i) => {
          const dayItems = items.filter((it) => isSameDay(it.start, d));
          const iso = toISODate(d);
          const inMonth = isSameMonth(d, cursor);
          const today = isSameDay(d, now);
          return (
            <div
              key={iso}
              onDragOver={(e) => {
                if (!dragKey) return;
                e.preventDefault();
                setOverDay(iso);
              }}
              onDragLeave={() => setOverDay((o) => (o === iso ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                const item = items.find((it) => it.key === dragKey);
                if (item && !isSameDay(item.start, d)) reschedule(item, d, true);
                setDragKey(null);
                setOverDay(null);
              }}
              onDoubleClick={() => editor.open("event", { initial: { start_at: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10).toISOString() } })}
              className={cn(
                "group relative min-h-[76px] border-line p-1 transition-colors sm:min-h-[112px] sm:p-1.5",
                i % 7 !== 6 && "border-r",
                i < visible.length - 7 && "border-b",
                !inMonth && "bg-surface-2/40",
                overDay === iso && "bg-accent/[0.07]",
              )}
            >
              <button
                onClick={() => onPickDay(d)}
                className={cn(
                  "tabular mb-1 grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-medium transition-colors",
                  today ? "bg-accent text-accent-fg" : inMonth ? "text-fg hover:bg-surface-2" : "text-subtle",
                )}
              >
                {format(d, "d")}
              </button>
              {/* Mobile: dots only */}
              <div className="flex flex-wrap gap-0.5 px-1 sm:hidden">
                {dayItems.slice(0, 6).map((it) => (
                  <span key={it.key} className={cn("h-1.5 w-1.5 rounded-full", colorOf(it.color).dot, it.done && "opacity-30")} />
                ))}
              </div>
              <div className="hidden flex-col gap-0.5 sm:flex">
                {dayItems.slice(0, 3).map((it) => (
                  <button
                    key={it.key}
                    draggable={it.movable}
                    onDragStart={(e) => {
                      setDragKey(it.key);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDragKey(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      open(it);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 truncate rounded-md px-1.5 py-[3px] text-left text-[11.5px] transition-colors",
                      it.allDay || it.kind === "deadline" ? cn(colorOf(it.color).soft, colorOf(it.color).text, "font-medium") : "hover:bg-surface-2",
                      it.done && "line-through opacity-50",
                      it.movable && "cursor-grab active:cursor-grabbing",
                    )}
                  >
                    {!(it.allDay || it.kind === "deadline") && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", colorOf(it.color).dot)} />}
                    {!it.allDay && <span className="tabular shrink-0 text-subtle">{toTimeString(it.start)}</span>}
                    <span className="truncate">{it.title}</span>
                  </button>
                ))}
                {dayItems.length > 3 && (
                  <button onClick={() => onPickDay(d)} className="px-1.5 text-left text-[11px] font-medium text-subtle hover:text-fg">
                    +{dayItems.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Week / Day time grid
// ---------------------------------------------------------------------------
interface Placed {
  item: AgendaItem;
  top: number;
  height: number;
  lane: number;
  lanes: number;
}

function layoutDay(items: AgendaItem[]): Placed[] {
  const timed = items
    .filter((i) => !i.allDay)
    .map((item) => {
      const startMin = Math.max(START_HOUR * 60, item.start.getHours() * 60 + item.start.getMinutes());
      const endRaw = item.end ? differenceInMinutes(item.end, startOfDay(item.start)) : startMin + 30;
      const endMin = Math.min(END_HOUR * 60, Math.max(startMin + 20, endRaw));
      return { item, startMin, endMin };
    })
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const placed: Placed[] = [];
  let cluster: { p: Placed; end: number }[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.p.lane + 1));
    cluster.forEach((c) => (c.p.lanes = lanes));
    cluster = [];
  };
  for (const t of timed) {
    if (t.startMin >= clusterEnd) flush();
    const laneEnds: number[] = [];
    for (const c of cluster) laneEnds[c.p.lane] = Math.max(laneEnds[c.p.lane] ?? 0, c.end);
    let lane = 0;
    while (laneEnds[lane] !== undefined && laneEnds[lane] > t.startMin) lane++;
    const p: Placed = {
      item: t.item,
      top: ((t.startMin - START_HOUR * 60) / 60) * HOUR_PX,
      height: Math.max(22, ((t.endMin - t.startMin) / 60) * HOUR_PX - 2),
      lane,
      lanes: 1,
    };
    cluster.push({ p, end: t.endMin });
    placed.push(p);
    clusterEnd = Math.max(clusterEnd, t.endMin);
  }
  flush();
  return placed;
}

function TimeGrid({ days, items, now }: { days: Date[]; items: AgendaItem[]; now: Date }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const reschedule = useReschedule();
  const { open } = useAgendaActions();
  const editor = useEditor();
  const [drag, setDrag] = useState<{ key: string; offsetMin: number } | null>(null);
  const [ghost, setGhost] = useState<{ day: number; min: number } | null>(null);
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = Math.max(0, (Math.min(now.getHours(), 20) - START_HOUR - 1.5) * HOUR_PX);
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const minutesAt = (e: React.DragEvent | React.MouseEvent, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const y = e.clientY - rect.top;
    return Math.round(((y / HOUR_PX) * 60 + START_HOUR * 60) / 15) * 15;
  };

  const allDayByDay = days.map((d) => items.filter((i) => i.allDay && isSameDay(i.start, d)));
  const hasAllDay = allDayByDay.some((l) => l.length);

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="grid border-b border-line" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div />
        {days.map((d) => {
          const today = isSameDay(d, now);
          return (
            <div key={d.toISOString()} className="flex items-center justify-center gap-1.5 border-l border-line py-2.5">
              <span className={cn("text-[11px] font-medium tracking-wide uppercase", today ? "text-accent" : "text-subtle")}>{format(d, "EEE")}</span>
              <span className={cn("tabular grid h-7 min-w-7 place-items-center rounded-full px-1 text-sm font-semibold", today && "bg-accent text-accent-fg")}>{format(d, "d")}</span>
            </div>
          );
        })}
      </div>
      {hasAllDay && (
        <div className="grid border-b border-line bg-surface-2/40" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="px-2 py-1.5 text-right text-[10px] text-subtle">all-day</div>
          {allDayByDay.map((list, i) => (
            <div key={i} className="flex min-w-0 flex-col gap-0.5 border-l border-line p-1">
              {list.map((it) => (
                <button
                  key={it.key}
                  draggable={it.movable}
                  onDragStart={() => setDrag({ key: it.key, offsetMin: 0 })}
                  onDragEnd={() => (setDrag(null), setGhost(null))}
                  onClick={() => open(it)}
                  className={cn("truncate rounded-md px-1.5 py-0.5 text-left text-[11.5px] font-medium", colorOf(it.color).soft, colorOf(it.color).text, it.done && "line-through opacity-50")}
                >
                  {it.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="scrollbar-thin relative max-h-[calc(100dvh-280px)] min-h-[420px] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="relative">
            {hours.map((h) => (
              <div key={h} className="tabular relative pr-2 text-right text-[10.5px] text-subtle" style={{ height: HOUR_PX }}>
                <span className="relative -top-2">{h === START_HOUR ? "" : `${String(h).padStart(2, "0")}:00`}</span>
              </div>
            ))}
          </div>
          {days.map((d, di) => {
            const placed = layoutDay(items.filter((i) => isSameDay(i.start, d)));
            const today = isSameDay(d, now);
            const nowTop = ((now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) / 60) * HOUR_PX;
            return (
              <div
                key={d.toISOString()}
                className={cn("relative border-l border-line", today && "bg-accent/[0.025]")}
                style={{ height: hours.length * HOUR_PX }}
                onDragOver={(e) => {
                  if (!drag) return;
                  e.preventDefault();
                  const min = minutesAt(e, e.currentTarget) - drag.offsetMin;
                  if (!ghost || ghost.day !== di || ghost.min !== min) setGhost({ day: di, min });
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const item = items.find((i) => i.key === drag?.key);
                  if (item && drag) {
                    const min = Math.max(0, minutesAt(e, e.currentTarget) - drag.offsetMin);
                    reschedule(item, addMinutes(startOfDay(d), min), false);
                  }
                  setDrag(null);
                  setGhost(null);
                }}
                onClick={(e) => {
                  if (e.target !== e.currentTarget) return;
                  const min = Math.floor(minutesAt(e, e.currentTarget) / 30) * 30;
                  editor.open("event", { initial: { start_at: addMinutes(startOfDay(d), min).toISOString() } });
                }}
              >
                {hours.map((h) => (
                  <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-line/70" style={{ top: (h - START_HOUR) * HOUR_PX }} />
                ))}
                {today && nowTop > 0 && (
                  <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: nowTop }}>
                    <span className="-ml-1 h-2 w-2 rounded-full bg-rose-500" />
                    <span className="h-[1.5px] flex-1 bg-rose-500" />
                  </div>
                )}
                {ghost && ghost.day === di && (
                  <div
                    className="pointer-events-none absolute inset-x-1 z-20 rounded-lg border-2 border-dashed border-accent/60 bg-accent/10"
                    style={{ top: ((ghost.min - START_HOUR * 60) / 60) * HOUR_PX, height: HOUR_PX / 2 }}
                  >
                    <span className="tabular px-1.5 text-[10px] font-semibold text-accent">{`${String(Math.floor(ghost.min / 60)).padStart(2, "0")}:${String(ghost.min % 60).padStart(2, "0")}`}</span>
                  </div>
                )}
                {placed.map(({ item, top, height, lane, lanes }) => {
                  const c = colorOf(item.color);
                  const past = (item.end ?? item.start) < now;
                  return (
                    <button
                      key={item.key}
                      draggable={item.movable}
                      onDragStart={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const offsetMin = Math.round((((e.clientY - rect.top) / HOUR_PX) * 60) / 15) * 15;
                        setDrag({ key: item.key, offsetMin });
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => (setDrag(null), setGhost(null))}
                      onClick={() => open(item)}
                      className={cn(
                        "absolute z-[5] flex flex-col overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 text-left transition-[box-shadow,transform] hover:z-10 hover:shadow-card",
                        c.soft,
                        c.border,
                        "bg-surface",
                        item.movable && "cursor-grab active:cursor-grabbing",
                        (past || item.done) && "opacity-55",
                        drag?.key === item.key && "opacity-30",
                      )}
                      style={{
                        top: top + 1,
                        height,
                        left: `calc(${(lane / lanes) * 100}% + 3px)`,
                        width: `calc(${100 / lanes}% - 6px)`,
                      }}
                    >
                      <div className={cn("absolute inset-0 -z-10", c.soft)} />
                      <span className={cn("truncate text-[11.5px] leading-tight font-semibold", c.text, item.done && "line-through")}>{item.title}</span>
                      {height > 34 && (
                        <span className="tabular truncate text-[10.5px] text-muted">
                          {toTimeString(item.start)}
                          {item.end ? `–${toTimeString(item.end)}` : ""}
                          {item.subtitle && height > 50 ? ` · ${item.subtitle}` : ""}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------
function AgendaView({ items, now }: { items: AgendaItem[]; now: Date }) {
  const byDay = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const i of items) {
      const k = toISODate(i.start);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(i);
    }
    return [...map.entries()];
  }, [items]);

  if (!byDay.length)
    return (
      <Card className="grid place-items-center py-16 text-center">
        <CalendarDays className="mb-2 h-6 w-6 text-subtle" />
        <div className="text-sm text-muted">Nothing on the calendar for the next 30 days.</div>
      </Card>
    );

  return (
    <div className="flex flex-col gap-3">
      {byDay.map(([iso, list]) => {
        const d = new Date(iso + "T00:00");
        const today = isSameDay(d, now);
        return (
          <Card key={iso} className="flex flex-col gap-0 p-2 sm:flex-row sm:gap-4">
            <div className="flex items-baseline gap-2 px-2.5 pt-2 sm:w-32 sm:shrink-0 sm:flex-col sm:gap-0 sm:pt-2.5">
              <span className={cn("tabular text-2xl font-semibold tracking-tight", today && "text-accent")}>{format(d, "d")}</span>
              <span className="text-xs text-subtle">
                {format(d, "EEE, MMM")}
                {today ? " · Today" : ""}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              {list.map((i) => (
                <AgendaRow key={i.key} item={i} now={now} />
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
