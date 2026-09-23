"use client";

import { useState } from "react";
import { Bell, ChevronDown, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Chip, Input, Kbd, Select } from "@/components/ui/primitives";
import { REMINDER_PRESETS, offsetLabel } from "@/lib/reminders";
import { PRIORITIES, PRIORITY_LABEL } from "@/lib/meta";
import type { Priority } from "@/lib/types";
import { useData } from "@/lib/store";

export function TitleInput({
  value,
  onChange,
  placeholder,
  autoFocus = true,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent py-1 text-lg font-medium tracking-tight outline-none placeholder:text-subtle sm:text-xl"
    />
  );
}

export function DescriptionInput({ value, onChange, placeholder = "Add a description…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      onInput={(e) => {
        const el = e.currentTarget;
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
      }}
      className="w-full resize-none bg-transparent text-sm leading-relaxed text-muted outline-none placeholder:text-subtle"
    />
  );
}

/** Progressive disclosure: optional fields stay tucked away until asked for. */
export function MoreDetails({ children, defaultOpen = false, label = "More details" }: { children: React.ReactNode; defaultOpen?: boolean; label?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-fg"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open ? "" : "-rotate-90")} />
        {label}
      </button>
      {open && <div className="animate-fade-up mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>}
    </div>
  );
}

export function PrioritySelect({ value, onChange }: { value: Priority; onChange: (p: Priority) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value as Priority)}>
      {PRIORITIES.map((p) => (
        <option key={p} value={p}>
          {PRIORITY_LABEL[p]}
        </option>
      ))}
    </Select>
  );
}

export function PriorityChips({ value, onChange }: { value: Priority; onChange: (p: Priority) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRIORITIES.map((p) => (
        <Chip key={p} active={value === p} onClick={() => onChange(p)}>
          {PRIORITY_LABEL[p]}
        </Chip>
      ))}
    </div>
  );
}

export function ProjectSelect({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const { data } = useData();
  return (
    <Select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">No project</option>
      {data.projects
        .filter((p) => p.status !== "archived" || p.id === value)
        .map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
    </Select>
  );
}

export function CourseSelect({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const { data } = useData();
  const seen = new Set<string>();
  const unique = data.courses.filter((c) => (seen.has(c.name) ? false : (seen.add(c.name), true)));
  return (
    <Select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">No course</option>
      {unique.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </Select>
  );
}

/** Reminder offsets relative to a due date — presets plus custom. */
export function ReminderPicker({
  value,
  onChange,
  disabled,
}: {
  value: number[];
  onChange: (v: number[]) => void;
  disabled?: boolean;
}) {
  const [custom, setCustom] = useState(false);
  const [amount, setAmount] = useState("15");
  const [unit, setUnit] = useState<"m" | "h" | "d">("m");
  const toggle = (m: number) => onChange(value.includes(m) ? value.filter((x) => x !== m) : [...value, m].sort((a, b) => b - a));
  const customValues = value.filter((v) => !REMINDER_PRESETS.some((p) => p.minutes === v));

  return (
    <div className={cn("flex flex-col gap-2", disabled && "pointer-events-none opacity-50")}>
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
        <Bell className="h-3.5 w-3.5" /> Remind me
        {disabled && <span className="font-normal text-subtle">— set a date first</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {REMINDER_PRESETS.map((p) => (
          <Chip key={p.minutes} active={value.includes(p.minutes)} onClick={() => toggle(p.minutes)}>
            {p.label.replace(" before", "")}
          </Chip>
        ))}
        {customValues.map((m) => (
          <Chip key={m} active onClick={() => toggle(m)}>
            {offsetLabel(m).replace(" before", "")}
            <X />
          </Chip>
        ))}
        <Chip onClick={() => setCustom((c) => !c)} active={custom}>
          <Plus /> Custom
        </Chip>
      </div>
      {custom && (
        <div className="animate-fade-up flex items-center gap-2">
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-20" />
          <Select value={unit} onChange={(e) => setUnit(e.target.value as "m" | "h" | "d")} className="w-32">
            <option value="m">minutes</option>
            <option value="h">hours</option>
            <option value="d">days</option>
          </Select>
          <span className="text-xs text-subtle">before</span>
          <Button
            size="sm"
            variant="subtle"
            onClick={() => {
              const n = Number(amount);
              if (!n || n < 1) return;
              const mins = unit === "m" ? n : unit === "h" ? n * 60 : n * 1440;
              if (!value.includes(mins)) onChange([...value, mins].sort((a, b) => b - a));
              setCustom(false);
            }}
          >
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

export function FormBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("scrollbar-thin flex flex-col gap-4 overflow-y-auto px-5 pt-1 pb-5", className)}>{children}</div>;
}

export function FormFooter({
  onCancel,
  onDelete,
  submitLabel = "Save",
  canSubmit = true,
  extra,
}: {
  onCancel: () => void;
  onDelete?: () => void;
  submitLabel?: string;
  canSubmit?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-line bg-surface-2/50 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-1">
        {onDelete && (
          <Button variant="danger" size="sm" onClick={onDelete}>
            <Trash2 /> Delete
          </Button>
        )}
        {extra}
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1 text-[11px] text-subtle sm:flex">
          <Kbd>Ctrl</Kbd>
          <Kbd>↵</Kbd>
        </span>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" type="submit" disabled={!canSubmit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

/** Wraps a form so Enter-in-title and Ctrl/⌘+Enter anywhere submit it. */
export function EditorForm({ onSubmit, children }: { onSubmit: () => void; children: React.ReactNode }) {
  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onSubmit();
        }
      }}
    >
      {children}
    </form>
  );
}
