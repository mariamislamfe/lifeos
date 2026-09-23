"use client";

import { useMemo, useState } from "react";
import { addMinutes, format, isSameDay } from "date-fns";
import { ChevronDown, Plus, Users, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { friendlyDate, relativeLabel, toTimeString } from "@/lib/date";
import { EVENT_KIND_LABEL } from "@/lib/meta";
import type { EventKind, LifeEvent } from "@/lib/types";
import { Badge, Button, Card, Chip } from "@/components/ui/primitives";
import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { LocationLine, useOpenFromQuery } from "@/components/items/item-rows";
import { useEditor } from "@/components/editor/editor-provider";

const KIND_STYLE: Record<EventKind, string> = {
  meeting: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  call: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  interview: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  university: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  exam: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  workshop: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  conference: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  personal: "bg-pink-500/10 text-pink-700 dark:text-pink-300",
};

export default function EventsPage() {
  useOpenFromQuery("event");
  const { data } = useData();
  const now = useNow(60_000);
  const editor = useEditor();
  const [kind, setKind] = useState<EventKind | "">("");
  const [showPast, setShowPast] = useState(false);

  const { upcoming, past } = useMemo(() => {
    const list = data.events.filter((e) => !kind || e.kind === kind);
    const end = (e: LifeEvent) => addMinutes(new Date(e.start_at), e.all_day ? 1440 : e.duration_minutes);
    return {
      upcoming: list.filter((e) => end(e) >= now).sort((a, b) => a.start_at.localeCompare(b.start_at)),
      past: list.filter((e) => end(e) < now).sort((a, b) => b.start_at.localeCompare(a.start_at)),
    };
  }, [data.events, kind, now]);

  const byDay = useMemo(() => {
    const groups: { day: Date; events: LifeEvent[] }[] = [];
    for (const e of upcoming) {
      const d = new Date(e.start_at);
      const last = groups[groups.length - 1];
      if (last && isSameDay(last.day, d)) last.events.push(e);
      else groups.push({ day: d, events: [e] });
    }
    return groups;
  }, [upcoming]);

  const kinds = [...new Set(data.events.map((e) => e.kind))];

  return (
    <Page>
      <PageHeader
        title="Events"
        description={`${upcoming.length} upcoming`}
        actions={
          <Button variant="primary" size="sm" onClick={() => editor.open("event")}>
            <Plus /> Event
          </Button>
        }
      />
      {kinds.length > 1 && (
        <div className="no-scrollbar -mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Chip active={!kind} onClick={() => setKind("")}>
            All
          </Chip>
          {kinds.map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(kind === k ? "" : k)}>
              {EVENT_KIND_LABEL[k]}
            </Chip>
          ))}
        </div>
      )}

      {data.events.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No events yet"
          description="Meetings, calls, interviews, workshops and conferences — they'll show up on your dashboard as they get close."
          action={
            <Button variant="primary" onClick={() => editor.open("event")}>
              <Plus /> Add event
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {byDay.length === 0 && <p className="text-sm text-subtle">Nothing upcoming.</p>}
          {byDay.map(({ day, events }) => (
            <section key={day.toISOString()}>
              <h2 className="mb-2 flex items-baseline gap-2 px-1">
                <span className="text-[13px] font-semibold">{friendlyDate(day, now)}</span>
                <span className="text-xs text-subtle">{format(day, "MMMM d")}</span>
              </h2>
              <div className="stagger flex flex-col gap-2">
                {events.map((e) => (
                  <EventCard key={e.id} e={e} now={now} />
                ))}
              </div>
            </section>
          ))}
          {past.length > 0 && (
            <div>
              <button onClick={() => setShowPast((s) => !s)} className="mb-2 flex items-center gap-1.5 px-1 text-[13px] font-medium text-subtle hover:text-fg">
                <ChevronDown className={cn("h-4 w-4 transition-transform", !showPast && "-rotate-90")} /> Past · {past.length}
              </button>
              {showPast && (
                <div className="animate-fade-up flex flex-col gap-2 opacity-70">
                  {past.map((e) => (
                    <EventCard key={e.id} e={e} now={now} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Page>
  );
}

function EventCard({ e, now }: { e: LifeEvent; now: Date }) {
  const editor = useEditor();
  const start = new Date(e.start_at);
  const end = addMinutes(start, e.duration_minutes);
  const live = !e.all_day && start <= now && end > now;
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => editor.open("event", { id: e.id })}
      className={cn("flex cursor-pointer items-center gap-4 p-4 transition-all hover:-translate-y-px hover:shadow-card", live && "ring-2 ring-accent/30")}
    >
      <div className="tabular w-14 shrink-0 text-center">
        {e.all_day ? (
          <div className="text-xs font-medium text-muted">All day</div>
        ) : (
          <>
            <div className="text-[15px] font-semibold">{toTimeString(start)}</div>
            <div className="text-[11px] text-subtle">{toTimeString(end)}</div>
          </>
        )}
      </div>
      <div className="h-10 w-px bg-line" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[15px] font-semibold tracking-tight">{e.title}</span>
          <Badge className={KIND_STYLE[e.kind]}>{EVENT_KIND_LABEL[e.kind]}</Badge>
          {live && <Badge className="bg-accent/10 text-accent">Now</Badge>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <LocationLine location={e.location} url={e.meeting_url} />
          {e.people.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-subtle">
              <span className="flex -space-x-1.5">
                {e.people.slice(0, 4).map((p) => (
                  <span key={p} className="grid h-5 w-5 place-items-center rounded-full bg-surface-3 text-[9px] font-semibold text-muted ring-2 ring-surface">
                    {p.slice(0, 1).toUpperCase()}
                  </span>
                ))}
              </span>
              {e.people.length <= 2 ? e.people.join(", ") : `${e.people.length} people`}
            </span>
          )}
          {!live && start > now && <span className="text-xs text-subtle">{relativeLabel(start, now)}</span>}
        </div>
      </div>
      {e.meeting_url && start.getTime() - now.getTime() < 3600_000 && end > now && (
        <a href={e.meeting_url} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()}>
          <Button size="sm" variant="primary">
            <Video /> Join
          </Button>
        </a>
      )}
    </Card>
  );
}
