"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Compass,
  Flag,
  FolderKanban,
  GraduationCap,
  Lightbulb,
  Milestone,
  NotebookPen,
  Send,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { Modal, ModalHeader } from "@/components/ui/overlay";
import {
  ApplicationForm,
  CourseForm,
  DeadlineForm,
  EventForm,
  FutureForm,
  IdeaForm,
  MilestoneForm,
  NoteForm,
  ProjectForm,
  PurchaseForm,
  ReminderForm,
  StudyForm,
  TaskForm,
  type FormProps,
} from "./forms";

export type EditorKind =
  | "task"
  | "reminder"
  | "event"
  | "study"
  | "deadline"
  | "project"
  | "application"
  | "idea"
  | "purchase"
  | "note"
  | "course"
  | "future"
  | "milestone";

export const EDITOR_META: Record<EditorKind, { label: string; icon: LucideIcon; form: React.ComponentType<FormProps>; size?: "md" | "lg" }> = {
  task: { label: "Task", icon: CheckSquare, form: TaskForm },
  reminder: { label: "Reminder", icon: Bell, form: ReminderForm },
  event: { label: "Event", icon: CalendarDays, form: EventForm },
  study: { label: "Study session", icon: BookOpen, form: StudyForm },
  deadline: { label: "Deadline", icon: Flag, form: DeadlineForm },
  project: { label: "Project", icon: FolderKanban, form: ProjectForm },
  application: { label: "Application", icon: Send, form: ApplicationForm },
  idea: { label: "Idea", icon: Lightbulb, form: IdeaForm },
  purchase: { label: "Purchase", icon: ShoppingBag, form: PurchaseForm },
  note: { label: "Note", icon: NotebookPen, form: NoteForm },
  course: { label: "Class", icon: GraduationCap, form: CourseForm },
  future: { label: "Future plan", icon: Compass, form: FutureForm },
  milestone: { label: "Milestone", icon: Milestone, form: MilestoneForm },
};

/** The order shown in the "+ Add" menu. */
export const QUICK_ADD_KINDS: EditorKind[] = [
  "task",
  "reminder",
  "event",
  "study",
  "deadline",
  "project",
  "application",
  "idea",
  "purchase",
  "note",
];

interface EditorRequest {
  kind: EditorKind;
  id?: string;
  initial?: Record<string, unknown>;
  key: number;
}

interface EditorContextValue {
  open(kind: EditorKind, opts?: { id?: string; initial?: Record<string, unknown> }): void;
  close(): void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [req, setReq] = useState<EditorRequest | null>(null);
  const open = useCallback<EditorContextValue["open"]>((kind, opts = {}) => {
    setReq({ kind, id: opts.id, initial: opts.initial, key: Date.now() });
  }, []);
  const close = useCallback(() => setReq(null), []);
  const value = useMemo(() => ({ open, close }), [open, close]);
  const meta = req ? EDITOR_META[req.kind] : null;
  const Form = meta?.form;
  const Icon = meta?.icon;

  return (
    <EditorContext.Provider value={value}>
      {children}
      <Modal open={!!req} onClose={close} label={meta?.label} size={meta?.size ?? "md"}>
        {req && meta && Form && Icon && (
          <>
            <ModalHeader title={req.id ? `Edit ${meta.label.toLowerCase()}` : `New ${meta.label.toLowerCase()}`} icon={<Icon />} onClose={close} />
            <Form key={req.key} id={req.id} initial={req.initial} onClose={close} />
          </>
        )}
      </Modal>
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside <EditorProvider>");
  return ctx;
}
