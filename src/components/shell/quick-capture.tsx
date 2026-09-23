"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CheckSquare, Flag, Inbox, Lightbulb, ShoppingBag, Sparkles } from "lucide-react";
import { useData } from "@/lib/store";
import { toast } from "@/lib/toast";
import { combineDateTime, friendlyDate, parseISODate, toISODate } from "@/lib/date";
import { guessCapture, type CaptureGuess, type CaptureKind } from "@/lib/capture";
import { Modal } from "@/components/ui/overlay";
import { Kbd } from "@/components/ui/primitives";
import { useEditor, type EditorKind } from "@/components/editor/editor-provider";
import { useShell } from "./shell-context";

export const CAPTURE_TARGETS: { kind: Exclude<CaptureKind, "note">; label: string; icon: typeof CheckSquare; editor: EditorKind }[] = [
  { kind: "task", label: "Task", icon: CheckSquare, editor: "task" },
  { kind: "deadline", label: "Deadline", icon: Flag, editor: "deadline" },
  { kind: "event", label: "Event", icon: CalendarDays, editor: "event" },
  { kind: "idea", label: "Idea", icon: Lightbulb, editor: "idea" },
  { kind: "purchase", label: "Wishlist", icon: ShoppingBag, editor: "purchase" },
];

/** Turns a captured thought into a real record. Returns the editor kind + id so callers can offer "Edit". */
export function useCaptureActions() {
  const { create } = useData();
  const editor = useEditor();
  return useCallback(
    async (kind: Exclude<CaptureKind, "note">, g: CaptureGuess) => {
      let id: string;
      switch (kind) {
        case "task":
          id = (await create("tasks", { title: g.title, due_date: g.date, due_time: g.date ? g.time : null })).id;
          break;
        case "deadline":
          id = (
            await create("deadlines", {
              title: g.title,
              due_at: combineDateTime(g.date ?? toISODate(new Date(Date.now() + 7 * 86400000)), g.time ?? "23:59").toISOString(),
            })
          ).id;
          break;
        case "event":
          id = (
            await create("events", {
              title: g.title,
              start_at: combineDateTime(g.date ?? toISODate(new Date()), g.time ?? "10:00").toISOString(),
            })
          ).id;
          break;
        case "idea":
          id = (await create("ideas", { title: g.title })).id;
          break;
        case "purchase":
          id = (await create("wishlist", { name: g.title })).id;
          break;
      }
      const target = CAPTURE_TARGETS.find((t) => t.kind === kind)!;
      toast(`Saved as ${target.label.toLowerCase()}`, {
        tone: "success",
        description: g.title,
        action: { label: "Edit", onClick: () => editor.open(target.editor, { id }) },
      });
    },
    [create, editor],
  );
}

export function QuickCapture() {
  const { captureOpen: open, setCaptureOpen } = useShell();
  const { create, data } = useData();
  const convert = useCaptureActions();
  const [text, setText] = useState("");
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText("");
      setCount(0);
    }
  }, [open]);

  const guess = useMemo(() => (text.trim() ? guessCapture(text) : null), [text]);
  const suggestion = guess && guess.kind !== "note" ? CAPTURE_TARGETS.find((t) => t.kind === guess.kind) : null;
  const close = () => setCaptureOpen(false);
  const inboxCount = data.notes.filter((n) => n.inbox).length;

  const saveInbox = async () => {
    const content = text.trim();
    if (!content) return;
    setText("");
    setCount((c) => c + 1);
    await create("notes", { content, inbox: true });
    toast("Captured to inbox", { tone: "success", description: content.length > 60 ? content.slice(0, 60) + "…" : content });
    ref.current?.focus();
  };

  const saveAs = async (kind: Exclude<CaptureKind, "note">) => {
    if (!guess) return;
    setText("");
    setCount((c) => c + 1);
    await convert(kind, guess);
    ref.current?.focus();
  };

  return (
    <Modal open={open} onClose={close} label="Quick capture" className="sm:max-w-xl">
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <Inbox className="h-4 w-4 text-accent" /> Quick capture
        </div>
        <span className="text-xs text-subtle">{count > 0 ? `${count} captured · keep going` : `${inboxCount} in inbox`}</span>
      </div>
      <div className="px-5 pt-2 pb-3">
        <textarea
          ref={ref}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if ((e.metaKey || e.ctrlKey) && suggestion) saveAs(suggestion.kind);
              else saveInbox();
            }
          }}
          rows={3}
          placeholder="Dump it here — sort it out later.&#10;e.g. “Competition deadline October 4” or “Buy laptop stand”"
          className="w-full resize-none bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-subtle"
        />
      </div>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 px-5 pb-3">
        {suggestion && guess ? (
          <button
            onClick={() => saveAs(suggestion.kind)}
            className="animate-scale-in inline-flex h-8 items-center gap-2 rounded-lg bg-accent/10 px-3 text-[13px] font-medium text-accent transition-colors hover:bg-accent/15"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Save as {suggestion.label.toLowerCase()}
            {guess.date && (
              <span className="font-normal opacity-80">
                · {friendlyDate(parseISODate(guess.date))}
                {guess.time ? ` ${guess.time}` : ""}
              </span>
            )}
            <Kbd className="ml-1 border-accent/20 bg-transparent text-accent/70">Ctrl ↵</Kbd>
          </button>
        ) : (
          <span className="text-xs text-subtle">Everything lands in your Notes inbox unless you pick a home.</span>
        )}
        {text.trim() &&
          CAPTURE_TARGETS.filter((t) => t.kind !== suggestion?.kind).map((t) => (
            <button
              key={t.kind}
              onClick={() => saveAs(t.kind)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
      </div>
      <div className="flex items-center justify-between border-t border-line bg-surface-2/50 px-5 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] text-[11px] text-subtle">
        <span className="flex items-center gap-1">
          <Kbd>↵</Kbd> save to inbox <Kbd className="ml-2">⇧↵</Kbd> new line
        </span>
        <button onClick={saveInbox} disabled={!text.trim()} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg disabled:opacity-40">
          Capture
        </button>
      </div>
    </Modal>
  );
}
