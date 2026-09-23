"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { CornerDownLeft, Lightbulb, Pin, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { IDEA_STATUS_LABEL, color as colorOf } from "@/lib/meta";
import type { Idea, IdeaStatus } from "@/lib/types";
import { Badge, Button, Chip, PriorityIcon } from "@/components/ui/primitives";
import { Menu } from "@/components/ui/overlay";
import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { useOpenFromQuery } from "@/components/items/item-rows";
import { useEditor } from "@/components/editor/editor-provider";

const STATUS_STYLE: Record<IdeaStatus, string> = {
  brain_dump: "bg-surface-2 text-muted",
  interesting: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  research: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  building: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  archived: "bg-surface-2 text-subtle",
};

export default function IdeasPage() {
  useOpenFromQuery("idea");
  const { data, create } = useData();
  const editor = useEditor();
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<IdeaStatus | "">("");
  const [tag, setTag] = useState("");
  const [query, setQuery] = useState("");

  const ideas = useMemo(() => {
    const q = query.toLowerCase();
    return data.ideas
      .filter((i) => (status ? i.status === status : i.status !== "archived"))
      .filter((i) => !tag || i.tags.includes(tag))
      .filter((i) => !q || `${i.title} ${i.description ?? ""} ${i.tags.join(" ")}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at));
  }, [data.ideas, status, tag, query]);
  const tags = [...new Set(data.ideas.flatMap((i) => i.tags))].slice(0, 12);

  const add = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const [title, ...rest] = text.split(/\s[-—:]\s|\n/);
    const hashtags = [...text.matchAll(/#(\w+)/g)].map((m) => m[1].toLowerCase());
    await create("ideas", { title: title.replace(/#\w+/g, "").trim() || text, description: rest.join(" ").replace(/#\w+/g, "").trim() || null, tags: hashtags });
  };

  return (
    <Page wide>
      <PageHeader
        title="Ideas"
        description="A vault for every spark. Capture first, judge later."
        actions={
          <Button variant="primary" size="sm" onClick={() => editor.open("idea")}>
            <Plus /> Idea
          </Button>
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="mb-5 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 shadow-soft transition-shadow focus-within:border-accent/50 focus-within:shadow-[0_0_0_3px_var(--ring)]"
      >
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Got an idea? Type it and press Enter  (use #tags)"
          className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
        />
        {draft && <CornerDownLeft className="h-4 w-4 text-subtle" />}
      </form>

      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <Chip active={!status} onClick={() => setStatus("")}>
          All
        </Chip>
        {(Object.keys(IDEA_STATUS_LABEL) as IdeaStatus[]).map((s) => (
          <Chip key={s} active={status === s} onClick={() => setStatus(status === s ? "" : s)}>
            {IDEA_STATUS_LABEL[s]}
            <span className="text-subtle">{data.ideas.filter((i) => i.status === s).length}</span>
          </Chip>
        ))}
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ideas" className="h-8 w-44 rounded-lg border border-line bg-surface pr-2 pl-8 text-[13px] outline-none focus:border-accent/50" />
        </div>
      </div>
      {tags.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <button key={t} onClick={() => setTag(tag === t ? "" : t)} className={cn("rounded-md px-2 py-0.5 text-xs transition-colors", tag === t ? "bg-accent/10 text-accent" : "text-subtle hover:text-fg")}>
              #{t}
            </button>
          ))}
        </div>
      )}

      {ideas.length === 0 ? (
        <EmptyState
          icon={<Lightbulb />}
          title={data.ideas.length ? "No ideas match" : "Your idea vault is empty"}
          description={data.ideas.length ? "Try a different filter." : "Every big thing started as a half-formed thought. Drop the first one in."}
        />
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
          {ideas.map((i, idx) => (
            <IdeaCard key={i.id} idea={i} index={idx} />
          ))}
        </div>
      )}
    </Page>
  );
}

function IdeaCard({ idea, index }: { idea: Idea; index: number }) {
  const { data, update } = useData();
  const editor = useEditor();
  const project = idea.project_id ? data.projects.find((p) => p.id === idea.project_id) : null;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => editor.open("idea", { id: idea.id })}
      onKeyDown={(e) => e.key === "Enter" && editor.open("idea", { id: idea.id })}
      className={cn(
        "group animate-fade-up relative mb-4 cursor-pointer break-inside-avoid rounded-2xl border border-line bg-surface p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card",
        idea.pinned && "border-amber-500/30 bg-gradient-to-b from-amber-500/[0.04] to-transparent",
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[15px] leading-snug font-semibold tracking-tight">{idea.title}</div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            update("ideas", idea.id, { pinned: !idea.pinned });
          }}
          className={cn("shrink-0 transition-opacity", idea.pinned ? "text-amber-500" : "text-subtle opacity-0 group-hover:opacity-100 hover:text-fg")}
          aria-label={idea.pinned ? "Unpin" : "Pin"}
        >
          <Pin className="h-3.5 w-3.5" fill={idea.pinned ? "currentColor" : "none"} />
        </button>
      </div>
      {idea.description && <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-wrap text-muted">{idea.description}</p>}
      {idea.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {idea.tags.map((t) => (
            <span key={t} className="text-xs text-subtle">
              #{t}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3.5 flex items-center gap-2">
        <Menu
          align="start"
          trigger={(p) => (
            <button {...p}>
              <Badge className={cn("cursor-pointer", STATUS_STYLE[idea.status])}>{IDEA_STATUS_LABEL[idea.status]}</Badge>
            </button>
          )}
          items={(Object.keys(IDEA_STATUS_LABEL) as IdeaStatus[]).map((s) => ({ label: IDEA_STATUS_LABEL[s], onSelect: () => update("ideas", idea.id, { status: s }) }))}
        />
        {project && (
          <Link href={`/projects/${project.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 truncate text-xs text-subtle hover:text-fg">
            <span className={cn("h-1.5 w-1.5 rounded-full", colorOf(project.color).dot)} />
            {project.name}
          </Link>
        )}
        <span className="ml-auto flex items-center gap-2 text-[11px] text-subtle">
          {idea.priority !== "medium" && <PriorityIcon priority={idea.priority} />}
          {formatDistanceToNowStrict(new Date(idea.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}
