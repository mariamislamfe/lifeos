"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Compass, GraduationCap, Hammer, Plane, Plus, Send, ShoppingBag, Sparkles, Star, Ticket, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { parseISODate } from "@/lib/date";
import { FUTURE_CATEGORY_LABEL, HORIZON_LABEL } from "@/lib/meta";
import type { FutureCategory, FutureItem, Horizon } from "@/lib/types";
import { Button, CheckCircle } from "@/components/ui/primitives";
import { Page, PageHeader } from "@/components/ui/page";
import { useOpenFromQuery } from "@/components/items/item-rows";
import { useEditor } from "@/components/editor/editor-provider";

const CATEGORY_ICON: Record<FutureCategory, LucideIcon> = {
  learn: GraduationCap,
  travel: Plane,
  build: Hammer,
  apply: Send,
  buy: ShoppingBag,
  project: Sparkles,
  event: Ticket,
  skill: Wrench,
  other: Star,
};

const HORIZON_HINT: Record<Horizon, string> = {
  month: "Within the next few weeks",
  year: "Before the year is out",
  someday: "No rush — just don't forget",
};

export default function FuturePage() {
  useOpenFromQuery("future");
  const { data, create, update } = useData();
  const editor = useEditor();
  const [drafts, setDrafts] = useState<Record<Horizon, string>>({ month: "", year: "", someday: "" });
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Horizon | null>(null);
  const done = data.future_items.filter((f) => f.done);

  return (
    <Page wide>
      <PageHeader
        title="Future"
        description="Things you want to do eventually — held here so your head doesn't have to."
        actions={
          <Button variant="primary" size="sm" onClick={() => editor.open("future")}>
            <Plus /> Add
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(Object.keys(HORIZON_LABEL) as Horizon[]).map((h) => {
          const items = data.future_items
            .filter((f) => f.horizon === h && !f.done)
            .sort((a, b) => (a.target_date ?? "9").localeCompare(b.target_date ?? "9"));
          return (
            <div
              key={h}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(h);
              }}
              onDragLeave={() => setOver((o) => (o === h ? null : o))}
              onDrop={() => {
                if (dragId) update("future_items", dragId, { horizon: h });
                setDragId(null);
                setOver(null);
              }}
              className={cn("flex flex-col rounded-2xl border border-line bg-surface p-2 shadow-soft transition-colors", over === h && "border-accent/40 bg-accent/[0.04]")}
            >
              <div className="px-2.5 pt-2 pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl italic">{HORIZON_LABEL[h]}</span>
                  <span className="tabular text-xs text-subtle">{items.length}</span>
                </div>
                <div className="text-xs text-subtle">{HORIZON_HINT[h]}</div>
              </div>
              <div className="flex flex-col">
                {items.map((f) => (
                  <FutureRow key={f.id} f={f} onDragStart={() => setDragId(f.id)} onDragEnd={() => setDragId(null)} dragging={dragId === f.id} />
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const title = drafts[h].trim();
                  if (!title) return;
                  create("future_items", { title, horizon: h });
                  setDrafts((d) => ({ ...d, [h]: "" }));
                }}
                className="mt-1 flex items-center gap-2 rounded-xl px-2.5 py-1.5"
              >
                <Plus className="h-4 w-4 shrink-0 text-subtle" />
                <input
                  value={drafts[h]}
                  onChange={(e) => setDrafts((d) => ({ ...d, [h]: e.target.value }))}
                  placeholder="Add…"
                  className="h-7 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
                />
              </form>
            </div>
          );
        })}
      </div>

      {done.length > 0 && (
        <div className="mt-8">
          <div className="mb-2 flex items-center gap-2 px-1 text-[13px] font-semibold text-subtle">
            <Compass className="h-4 w-4" /> Done — {done.length}
          </div>
          <div className="flex flex-wrap gap-2">
            {done.map((f) => (
              <button key={f.id} onClick={() => update("future_items", f.id, { done: false })} className="rounded-full border border-line px-3 py-1 text-xs text-subtle line-through hover:text-fg" title="Mark as not done">
                {f.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </Page>
  );
}

function FutureRow({ f, onDragStart, onDragEnd, dragging }: { f: FutureItem; onDragStart: () => void; onDragEnd: () => void; dragging: boolean }) {
  const { update } = useData();
  const editor = useEditor();
  const Icon = CATEGORY_ICON[f.category];
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => editor.open("future", { id: f.id })}
      className={cn("group flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-surface-2", dragging && "opacity-40")}
    >
      <CheckCircle checked={f.done} onChange={() => update("future_items", f.id, { done: !f.done })} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{f.title}</div>
        <div className="flex items-center gap-1.5 text-xs text-subtle">
          <Icon className="h-3 w-3" /> {FUTURE_CATEGORY_LABEL[f.category]}
          {f.target_date && <span>· by {format(parseISODate(f.target_date), "MMM d")}</span>}
        </div>
      </div>
    </div>
  );
}
