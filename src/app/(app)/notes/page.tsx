"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Archive, Inbox, NotebookPen, Pin, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { guessCapture } from "@/lib/capture";
import type { Note } from "@/lib/types";
import { Button, Card, Kbd } from "@/components/ui/primitives";
import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { useOpenFromQuery } from "@/components/items/item-rows";
import { useEditor } from "@/components/editor/editor-provider";
import { useShell } from "@/components/shell/shell-context";
import { CAPTURE_TARGETS, useCaptureActions } from "@/components/shell/quick-capture";

export default function NotesPage() {
  useOpenFromQuery("note");
  const { data } = useData();
  const editor = useEditor();
  const { setCaptureOpen } = useShell();
  const [query, setQuery] = useState("");

  const inbox = data.notes.filter((n) => n.inbox).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const notes = useMemo(() => {
    const q = query.toLowerCase();
    return data.notes
      .filter((n) => !n.inbox)
      .filter((n) => !q || `${n.title ?? ""} ${n.content} ${n.tags.join(" ")}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at));
  }, [data.notes, query]);

  return (
    <Page wide>
      <PageHeader
        title="Notes"
        description="Your inbox for quick captures, plus everything worth writing down."
        actions={
          <>
            <Button size="sm" onClick={() => setCaptureOpen(true)}>
              <Inbox /> Capture <Kbd className="ml-1">C</Kbd>
            </Button>
            <Button variant="primary" size="sm" onClick={() => editor.open("note")}>
              <Plus /> Note
            </Button>
          </>
        }
      />

      <Card className="mb-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold">
            <Inbox className="h-4 w-4 text-accent" /> Inbox
            <span className="tabular text-xs font-medium text-subtle">{inbox.length}</span>
          </div>
          <span className="text-xs text-subtle">Sort each capture into its home — or keep it as a note.</span>
        </div>
        {inbox.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-5 text-sm text-muted">
            <Sparkles className="h-4 w-4 text-accent" /> Inbox zero. Press <Kbd>C</Kbd> anywhere to capture a thought.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {inbox.map((n) => (
              <InboxRow key={n.id} note={n} />
            ))}
          </div>
        )}
      </Card>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold">All notes</h2>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes" className="h-8 w-48 rounded-lg border border-line bg-surface pr-2 pl-8 text-[13px] outline-none focus:border-accent/50" />
        </div>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          icon={<NotebookPen />}
          title={query ? "No notes match" : "No notes yet"}
          description={query ? "Try another search." : "Outlines, links, meeting notes — anything worth keeping."}
          action={
            !query && (
              <Button variant="primary" onClick={() => editor.open("note")}>
                <Plus /> Write a note
              </Button>
            )
          }
        />
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} />
          ))}
        </div>
      )}
    </Page>
  );
}

function InboxRow({ note }: { note: Note }) {
  const { update, remove } = useData();
  const convert = useCaptureActions();
  const guess = guessCapture(note.content);
  const suggested = guess.kind !== "note" ? guess.kind : null;

  const sortInto = async (kind: (typeof CAPTURE_TARGETS)[number]["kind"]) => {
    await convert(kind, guess.kind === kind ? guess : { ...guess, kind, title: note.content });
    remove("notes", note.id, { undo: false });
  };

  return (
    <div className="group flex flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="text-[14px]">{note.content}</div>
        <div className="text-xs text-subtle">{formatDistanceToNowStrict(new Date(note.created_at), { addSuffix: true })}</div>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {CAPTURE_TARGETS.map((t) => (
          <button
            key={t.kind}
            onClick={() => sortInto(t.kind)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors",
              suggested === t.kind ? "bg-accent/10 text-accent hover:bg-accent/15" : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
            title={`Move to ${t.label}`}
          >
            <t.icon className="h-3.5 w-3.5" />
            <span className={cn(suggested === t.kind ? "" : "hidden md:inline")}>{t.label}</span>
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-line" />
        <button onClick={() => update("notes", note.id, { inbox: false })} className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs text-muted hover:bg-surface-2 hover:text-fg" title="Keep as note">
          <Archive className="h-3.5 w-3.5" /> <span className="hidden md:inline">Keep</span>
        </button>
        <button onClick={() => remove("notes", note.id, { label: "Capture" })} className="grid h-7 w-7 place-items-center rounded-lg text-subtle hover:bg-rose-500/10 hover:text-rose-500" title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function NoteCard({ note }: { note: Note }) {
  const { data, update } = useData();
  const editor = useEditor();
  const project = note.project_id ? data.projects.find((p) => p.id === note.project_id) : null;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => editor.open("note", { id: note.id })}
      onKeyDown={(e) => e.key === "Enter" && editor.open("note", { id: note.id })}
      className="group animate-fade-up mb-4 cursor-pointer break-inside-avoid rounded-2xl border border-line bg-surface p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
    >
      <div className="flex items-start justify-between gap-2">
        {note.title ? <div className="text-[15px] font-semibold tracking-tight">{note.title}</div> : <span />}
        <button
          onClick={(e) => {
            e.stopPropagation();
            update("notes", note.id, { pinned: !note.pinned });
          }}
          className={cn("shrink-0", note.pinned ? "text-accent" : "text-subtle opacity-0 group-hover:opacity-100")}
          aria-label="Pin"
        >
          <Pin className="h-3.5 w-3.5" fill={note.pinned ? "currentColor" : "none"} />
        </button>
      </div>
      <p className="mt-1 line-clamp-[10] text-[13px] leading-relaxed whitespace-pre-wrap text-muted">{note.content}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-subtle">
        {project && <span>{project.name}</span>}
        {note.tags.map((t) => (
          <span key={t}>#{t}</span>
        ))}
        <span className="ml-auto">{formatDistanceToNowStrict(new Date(note.updated_at ?? note.created_at), { addSuffix: true })}</span>
      </div>
    </div>
  );
}
