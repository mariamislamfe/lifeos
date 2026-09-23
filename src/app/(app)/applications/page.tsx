"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ExternalLink, FileCheck2, Plus, Send } from "lucide-react";
import { cn, hostname } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useLocalState, useNow } from "@/lib/hooks";
import { relativeLabel, urgencyOf } from "@/lib/date";
import { APPLICATION_STATUSES, APPLICATION_STATUS_DOT, APPLICATION_STATUS_LABEL, APPLICATION_TYPE_LABEL } from "@/lib/meta";
import type { Application, ApplicationStatus, ApplicationType } from "@/lib/types";
import { Badge, Button, Card, Chip, Segmented, UrgencyBadge } from "@/components/ui/primitives";
import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { useOpenFromQuery } from "@/components/items/item-rows";
import { useEditor } from "@/components/editor/editor-provider";

const PRE_SUBMIT: ApplicationStatus[] = ["interested", "researching", "preparing"];

export default function ApplicationsPage() {
  useOpenFromQuery("application");
  const { data, update, syncReminders } = useData();
  const now = useNow(60_000);
  const editor = useEditor();
  const [view, setView] = useLocalState<"board" | "list">("applications-view", "board");
  const [type, setType] = useState<ApplicationType | "">("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<ApplicationStatus | null>(null);

  const apps = useMemo(() => data.applications.filter((a) => !type || a.type === type), [data.applications, type]);
  const types = [...new Set(data.applications.map((a) => a.type))];

  const move = (a: Application, status: ApplicationStatus) => {
    update("applications", a.id, { status });
    // Deadline reminders only matter until the application is sent.
    if (!PRE_SUBMIT.includes(status)) syncReminders("application", a.id, a.name, null, []);
  };

  const active = data.applications.filter((a) => !["accepted", "rejected", "withdrawn"].includes(a.status)).length;
  const accepted = data.applications.filter((a) => a.status === "accepted").length;

  return (
    <Page wide>
      <PageHeader
        title="Applications"
        description={`${active} in progress · ${accepted} accepted`}
        actions={
          <>
            <Segmented
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: "board", label: "Pipeline" },
                { value: "list", label: "List" },
              ]}
            />
            <Button variant="primary" size="sm" onClick={() => editor.open("application")}>
              <Plus /> Application
            </Button>
          </>
        }
      />

      {types.length > 1 && (
        <div className="no-scrollbar -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Chip active={!type} onClick={() => setType("")}>
            All
          </Chip>
          {types.map((t) => (
            <Chip key={t} active={type === t} onClick={() => setType(type === t ? "" : t)}>
              {APPLICATION_TYPE_LABEL[t]}
            </Chip>
          ))}
        </div>
      )}

      {data.applications.length === 0 ? (
        <EmptyState
          icon={<Send />}
          title="Track every opportunity"
          description="Competitions, scholarships, internships, fellowships, hackathons — keep requirements, documents and deadlines in one pipeline."
          action={
            <Button variant="primary" onClick={() => editor.open("application")}>
              <Plus /> Add application
            </Button>
          }
        />
      ) : view === "board" ? (
        <div className="scrollbar-thin -mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
          {APPLICATION_STATUSES.map((s) => {
            const list = apps.filter((a) => a.status === s).sort((a, b) => (a.deadline_at ?? "9").localeCompare(b.deadline_at ?? "9"));
            const terminal = ["rejected", "withdrawn"].includes(s);
            return (
              <div
                key={s}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(s);
                }}
                onDragLeave={() => setOver((o) => (o === s ? null : o))}
                onDrop={() => {
                  const a = apps.find((x) => x.id === dragId);
                  if (a && a.status !== s) move(a, s);
                  setDragId(null);
                  setOver(null);
                }}
                className={cn(
                  "flex w-[272px] shrink-0 flex-col rounded-2xl bg-surface-2/60 p-2 transition-colors",
                  over === s && "bg-accent/[0.08] ring-2 ring-accent/20",
                  terminal && !list.length && "w-[180px] opacity-70",
                )}
              >
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <span className={cn("h-2 w-2 rounded-full", APPLICATION_STATUS_DOT[s])} />
                  <span className="text-[13px] font-semibold">{APPLICATION_STATUS_LABEL[s]}</span>
                  <span className="tabular ml-auto text-xs text-subtle">{list.length}</span>
                </div>
                <div className="flex min-h-28 flex-col gap-2">
                  {list.map((a) => (
                    <AppCard key={a.id} a={a} now={now} dragging={dragId === a.id} onDragStart={() => setDragId(a.id)} onDragEnd={() => setDragId(null)} />
                  ))}
                  {s === "interested" && (
                    <button onClick={() => editor.open("application")} className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-subtle transition-colors hover:bg-surface hover:text-fg">
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b border-line bg-surface-2/50 px-5 py-2.5 text-[11px] font-medium tracking-wide text-subtle uppercase md:grid">
            <span>Name</span>
            <span>Type</span>
            <span>Status</span>
            <span>Deadline</span>
            <span>Documents</span>
          </div>
          {apps
            .slice()
            .sort((a, b) => APPLICATION_STATUSES.indexOf(a.status) - APPLICATION_STATUSES.indexOf(b.status))
            .map((a) => {
              const docs = a.documents_required.length;
              const sub = a.documents_submitted.length;
              return (
                <button
                  key={a.id}
                  onClick={() => editor.open("application", { id: a.id })}
                  className="grid w-full grid-cols-1 gap-1 border-b border-line px-5 py-3 text-left transition-colors last:border-0 hover:bg-surface-2 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.name}</div>
                    <div className="truncate text-xs text-subtle">{a.organization}</div>
                  </div>
                  <span className="text-xs text-muted">{APPLICATION_TYPE_LABEL[a.type]}</span>
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className={cn("h-1.5 w-1.5 rounded-full", APPLICATION_STATUS_DOT[a.status])} />
                    {APPLICATION_STATUS_LABEL[a.status]}
                  </span>
                  <span className="tabular text-xs text-muted">{a.deadline_at ? format(new Date(a.deadline_at), "MMM d, HH:mm") : "—"}</span>
                  <span className="tabular text-xs text-muted">{docs ? `${sub}/${docs}` : "—"}</span>
                </button>
              );
            })}
        </Card>
      )}
    </Page>
  );
}

function AppCard({ a, now, dragging, onDragStart, onDragEnd }: { a: Application; now: Date; dragging: boolean; onDragStart: () => void; onDragEnd: () => void }) {
  const editor = useEditor();
  const deadline = a.deadline_at ? new Date(a.deadline_at) : null;
  const pre = PRE_SUBMIT.includes(a.status);
  const u = deadline && pre ? urgencyOf(deadline, now) : null;
  const docs = a.documents_required.length;
  const sub = a.documents_submitted.filter((d) => a.documents_required.includes(d)).length;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={() => editor.open("application", { id: a.id })}
      className={cn(
        "group cursor-grab rounded-xl border border-line bg-surface p-3.5 shadow-soft transition-all duration-150 hover:-translate-y-px hover:border-line-strong hover:shadow-card active:cursor-grabbing",
        dragging && "rotate-1 opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13.5px] leading-snug font-semibold">{a.name}</div>
          {a.organization && <div className="truncate text-xs text-subtle">{a.organization}</div>}
        </div>
        {a.url && (
          <a href={a.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="shrink-0 text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:text-fg" title={hostname(a.url)}>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge>{APPLICATION_TYPE_LABEL[a.type]}</Badge>
        {u && (u === "overdue" || u === "today" || u === "soon") ? (
          <UrgencyBadge urgency={u} label={u === "overdue" ? "Missed" : relativeLabel(deadline!, now)} />
        ) : deadline && pre ? (
          <Badge>Due {format(deadline, "MMM d")}</Badge>
        ) : null}
        {a.result && <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">{a.result}</Badge>}
        {!a.result && a.result_date && !pre && <Badge>Result {format(new Date(a.result_date + "T00:00"), "MMM d")}</Badge>}
      </div>
      {docs > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <FileCheck2 className="h-3.5 w-3.5 text-subtle" />
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
            <div className={cn("h-full rounded-full transition-all", sub === docs ? "bg-emerald-500" : "bg-accent")} style={{ width: `${(sub / docs) * 100}%` }} />
          </div>
          <span className="tabular text-[11px] text-subtle">
            {sub}/{docs}
          </span>
        </div>
      )}
    </div>
  );
}
