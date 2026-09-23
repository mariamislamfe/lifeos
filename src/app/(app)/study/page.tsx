"use client";

import { useMemo, useState } from "react";
import { addDays, format, isSameDay, startOfDay, startOfMonth } from "date-fns";
import { BookOpen, Flame, Plus, Timer } from "lucide-react";
import { cn, formatMinutes } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { friendlyDate, parseISODate, toISODate, weekStart } from "@/lib/date";
import type { StudySession } from "@/lib/types";
import { Button, Card, CheckCircle, PriorityIcon, SectionHeader, Segmented } from "@/components/ui/primitives";
import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { useOpenFromQuery } from "@/components/items/item-rows";
import { useEditor } from "@/components/editor/editor-provider";

const minutesOf = (s: StudySession) => s.actual_minutes ?? s.planned_minutes;

export default function StudyPage() {
  useOpenFromQuery("study");
  const { data, update } = useData();
  const now = useNow(60_000);
  const editor = useEditor();
  const [range, setRange] = useState<"week" | "month">("week");
  const todayIso = toISODate(now);

  const done = useMemo(() => data.study_sessions.filter((s) => s.completed), [data.study_sessions]);

  const stats = useMemo(() => {
    const sumSince = (from: Date) => done.filter((s) => parseISODate(s.date) >= from && s.date <= todayIso).reduce((n, s) => n + minutesOf(s), 0);
    const days = new Set(done.map((s) => s.date));
    let streak = 0;
    // A streak survives today until the day is over.
    let cursor = days.has(todayIso) ? now : addDays(now, -1);
    while (days.has(toISODate(cursor))) {
      streak++;
      cursor = addDays(cursor, -1);
    }
    return {
      today: sumSince(startOfDay(now)),
      week: sumSince(weekStart(now)),
      month: sumSince(startOfMonth(now)),
      streak,
    };
  }, [done, now, todayIso]);

  const series = useMemo(() => {
    const count = range === "week" ? 7 : 30;
    return Array.from({ length: count }, (_, i) => {
      const d = addDays(startOfDay(now), i - count + 1);
      const iso = toISODate(d);
      return { d, iso, minutes: done.filter((s) => s.date === iso).reduce((n, s) => n + minutesOf(s), 0) };
    });
  }, [done, now, range]);

  const subjects = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of done) map.set(s.subject, (map.get(s.subject) ?? 0) + minutesOf(s));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [done]);

  const planned = data.study_sessions
    .filter((s) => !s.completed && s.date >= toISODate(addDays(now, -3)))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time ?? "").localeCompare(b.start_time ?? ""));
  const recent = done.slice().sort((a, b) => b.date.localeCompare(a.date) || (b.start_time ?? "").localeCompare(a.start_time ?? "")).slice(0, 12);

  const complete = (s: StudySession) => update("study_sessions", s.id, { completed: !s.completed, actual_minutes: !s.completed ? (s.actual_minutes ?? s.planned_minutes) : s.actual_minutes });

  const Row = ({ s }: { s: StudySession }) => {
    const d = parseISODate(s.date);
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => editor.open("study", { id: s.id })}
        onKeyDown={(e) => e.key === "Enter" && editor.open("study", { id: s.id })}
        className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-surface-2"
      >
        <CheckCircle checked={s.completed} onChange={() => complete(s)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 truncate text-sm">
            <span className="font-medium">{s.subject}</span>
            {s.topic && <span className="truncate text-muted">→ {s.topic}</span>}
            {s.subtopic && <span className="hidden truncate text-subtle sm:inline">→ {s.subtopic}</span>}
          </div>
          <div className={cn("text-xs", !s.completed && s.date < todayIso ? "text-rose-500" : "text-subtle")}>
            {friendlyDate(d, now)}
            {s.start_time ? ` · ${s.start_time}` : ""}
          </div>
        </div>
        <div className="tabular shrink-0 text-right text-xs">
          {s.completed ? (
            <>
              <div className="font-medium">{formatMinutes(minutesOf(s))}</div>
              {s.actual_minutes != null && s.actual_minutes !== s.planned_minutes && <div className="text-subtle">of {formatMinutes(s.planned_minutes)}</div>}
            </>
          ) : (
            <div className="text-muted">{formatMinutes(s.planned_minutes)}</div>
          )}
        </div>
        {s.priority !== "medium" && <PriorityIcon priority={s.priority} />}
      </div>
    );
  };

  return (
    <Page wide>
      <PageHeader
        title="Study"
        description="Plan sessions, log what you actually did, watch the hours add up."
        actions={
          <Button variant="primary" size="sm" onClick={() => editor.open("study")}>
            <Plus /> Study session
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Today" value={formatMinutes(stats.today)} empty={!stats.today} />
        <StatTile label="This week" value={formatMinutes(stats.week)} empty={!stats.week} />
        <StatTile label="This month" value={formatMinutes(stats.month)} empty={!stats.month} />
        <StatTile
          label="Study streak"
          value={`${stats.streak} ${stats.streak === 1 ? "day" : "days"}`}
          empty={!stats.streak}
          icon={<Flame className={cn("h-4 w-4", stats.streak ? "text-orange-500" : "text-subtle")} />}
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <SectionHeader
            title={range === "week" ? "Last 7 days" : "Last 30 days"}
            icon={<Timer />}
            action={
              <Segmented
                size="sm"
                value={range}
                onChange={setRange}
                options={[
                  { value: "week", label: "Week" },
                  { value: "month", label: "Month" },
                ]}
              />
            }
          />
          <BarChart data={series} now={now} range={range} />
        </Card>

        <Card>
          <SectionHeader title="Most studied" icon={<BookOpen />} />
          <div className="flex flex-col gap-3 px-4 pt-1 pb-4">
            {subjects.length === 0 && <p className="text-sm text-subtle">Complete a session to see your subjects here.</p>}
            {subjects.map(([name, mins]) => (
              <div key={name} className="group">
                <div className="mb-1 flex items-baseline justify-between text-[13px]">
                  <span className="truncate font-medium">{name}</span>
                  <span className="tabular text-xs text-muted">{formatMinutes(mins)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${(mins / subjects[0][1]) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {data.study_sessions.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title="Start your first session"
          description="Physics → Mechanics → Newton's Laws → 2 hours. Plan it, then tick it off when you're done."
          action={
            <Button variant="primary" onClick={() => editor.open("study")}>
              <Plus /> Plan a session
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <SectionHeader title="Planned" count={planned.length} action={<Button size="icon-sm" variant="ghost" onClick={() => editor.open("study")} aria-label="Plan session"><Plus /></Button>} />
            <div className="px-2 pb-2">
              {planned.length ? planned.map((s) => <Row key={s.id} s={s} />) : <p className="px-3 pb-3 text-sm text-subtle">Nothing planned. Schedule your next session.</p>}
            </div>
          </Card>
          <Card>
            <SectionHeader title="Recent sessions" count={done.length} />
            <div className="px-2 pb-2">{recent.length ? recent.map((s) => <Row key={s.id} s={s} />) : <p className="px-3 pb-3 text-sm text-subtle">No completed sessions yet.</p>}</div>
          </Card>
        </div>
      )}
    </Page>
  );
}

function StatTile({ label, value, empty, icon }: { label: string; value: string; empty?: boolean; icon?: React.ReactNode }) {
  return (
    <Card className="px-4 py-3.5">
      <div className="flex items-center justify-between text-xs font-medium text-muted">
        {label}
        {icon}
      </div>
      <div className={cn("tabular mt-1 text-[26px] leading-tight font-semibold tracking-tight", empty && "text-subtle")}>{value}</div>
    </Card>
  );
}

/** Single-series bar chart: accent bars, recessive grid, per-bar hover tooltip. */
function BarChart({ data, now, range }: { data: { d: Date; iso: string; minutes: number }[]; now: Date; range: "week" | "month" }) {
  const [hover, setHover] = useState<number | null>(null);
  const maxHours = Math.max(2, Math.ceil(Math.max(...data.map((x) => x.minutes)) / 60));
  const ticks = Array.from({ length: maxHours + 1 }, (_, i) => i).filter((h) => maxHours <= 6 || h % 2 === 0);
  const H = 180;

  return (
    <div className="px-4 pt-2 pb-4">
      <div className="relative flex" style={{ height: H + 22 }}>
        {/* y axis */}
        <div className="relative w-8 shrink-0">
          {ticks.map((h) => (
            <span key={h} className="tabular absolute right-2 -translate-y-1/2 text-[10.5px] text-subtle" style={{ top: H - (h / maxHours) * H }}>
              {h}h
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {ticks.map((h) => (
            <div key={h} className={cn("absolute inset-x-0 border-t", h === 0 ? "border-line-strong" : "border-dashed border-line")} style={{ top: H - (h / maxHours) * H }} />
          ))}
          <div className="absolute inset-x-0 top-0 flex items-end" style={{ height: H, gap: range === "week" ? 14 : 3 }}>
            {data.map((x, i) => {
              const h = (x.minutes / 60 / maxHours) * H;
              const today = isSameDay(x.d, now);
              return (
                <div
                  key={x.iso}
                  className="relative flex h-full flex-1 items-end justify-center"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  <div
                    className={cn("w-full rounded-t-[4px] transition-[height,opacity] duration-500 ease-out", x.minutes ? "bg-accent" : "", hover !== null && hover !== i && "opacity-45")}
                    style={{ height: x.minutes ? Math.max(3, h) : 0, maxWidth: range === "week" ? 40 : 14 }}
                  />
                  {hover === i && (
                    <div className="pointer-events-none absolute bottom-full z-10 mb-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-center whitespace-nowrap shadow-pop" style={{ bottom: Math.min(H - 30, h) + 6 }}>
                      <div className="text-[11px] text-muted">{format(x.d, "EEE, MMM d")}</div>
                      <div className="tabular text-[13px] font-semibold">{x.minutes ? formatMinutes(x.minutes) : "No study"}</div>
                    </div>
                  )}
                  <span
                    className={cn("tabular absolute -bottom-5 text-[10.5px]", today ? "font-semibold text-fg" : "text-subtle", range === "month" && i % 5 !== 4 && !today && "hidden")}
                  >
                    {range === "week" ? format(x.d, "EEE") : format(x.d, "d")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
