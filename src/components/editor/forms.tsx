"use client";

import { useMemo, useState } from "react";
import { ImagePlus, Plus, X } from "lucide-react";
import { useData } from "@/lib/store";
import { getRepository } from "@/lib/db";
import { combineDateTime, toISODate, toLocalInputValue } from "@/lib/date";
import { cn, splitList } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABEL,
  APPLICATION_TYPE_LABEL,
  COLOR_NAMES,
  COURSE_KIND_LABEL,
  CURRENCIES,
  EVENT_KIND_LABEL,
  FUTURE_CATEGORY_LABEL,
  HORIZON_LABEL,
  IDEA_STATUS_LABEL,
  PROJECT_STATUS_LABEL,
  WEEKDAYS_SHORT,
  WISH_STATUS_LABEL,
  color as colorOf,
} from "@/lib/meta";
import type {
  Application,
  ApplicationStatus,
  ApplicationType,
  CourseKind,
  Deadline,
  DeadlineStatus,
  EventKind,
  FutureCategory,
  Horizon,
  IdeaStatus,
  Priority,
  ProjectStatus,
  Recurrence,
  ReminderRepeat,
  TableMap,
  TableName,
  Task,
  TaskStatus,
  WishStatus,
} from "@/lib/types";
import { Button, CheckCircle, Chip, Field, Input, Segmented, Select, Textarea } from "@/components/ui/primitives";
import {
  CourseSelect,
  DescriptionInput,
  EditorForm,
  FormBody,
  FormFooter,
  MoreDetails,
  PriorityChips,
  PrioritySelect,
  ProjectSelect,
  ReminderPicker,
  TitleInput,
} from "./form-kit";

export interface FormProps {
  id?: string;
  initial?: Record<string, unknown>;
  onClose: () => void;
}

function useRow<K extends TableName>(table: K, id?: string): TableMap[K] | undefined {
  const { data } = useData();
  return id ? (data[table] as TableMap[K][]).find((r) => r.id === id) : undefined;
}

function useExistingOffsets(sourceId: string | undefined, fallback: number[]) {
  const { data } = useData();
  return useMemo(() => {
    if (!sourceId) return fallback;
    return data.reminders
      .filter((r) => r.source_id === sourceId && r.offset_minutes !== null && !r.fired_at)
      .map((r) => r.offset_minutes!)
      .sort((a, b) => b - a);
    // Only computed once on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId]);
}

const nn = (s: string) => (s.trim() ? s.trim() : null);

function useDeleteAndClose(table: TableName, id: string | undefined, label: string, onClose: () => void) {
  const { remove } = useData();
  if (!id) return undefined;
  return () => {
    remove(table, id, { label });
    onClose();
  };
}

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------
export function TaskForm({ id, initial = {}, onClose }: FormProps) {
  const { data, create, update, createMany, remove, toggleTask, syncReminders } = useData();
  const row = useRow("tasks", id);
  const src = { ...(row ?? {}), ...initial } as Partial<Task>;
  const [title, setTitle] = useState(src.title ?? "");
  const [description, setDescription] = useState(src.description ?? "");
  const [dueDate, setDueDate] = useState(src.due_date ?? "");
  const [dueTime, setDueTime] = useState(src.due_time ?? "");
  const [priority, setPriority] = useState<Priority>(src.priority ?? "medium");
  const [status, setStatus] = useState<TaskStatus>(src.status ?? "todo");
  const [category, setCategory] = useState(src.category ?? "");
  const [projectId, setProjectId] = useState<string | null>(src.project_id ?? null);
  const [courseId, setCourseId] = useState<string | null>(src.course_id ?? null);
  const [recurrence, setRecurrence] = useState<Recurrence>(src.recurrence ?? "none");
  const [notes, setNotes] = useState(src.notes ?? "");
  const [offsets, setOffsets] = useState<number[]>(useExistingOffsets(id, []));
  const [newSubtasks, setNewSubtasks] = useState<string[]>([]);
  const [subDraft, setSubDraft] = useState("");
  const subtasks = id ? data.tasks.filter((t) => t.parent_id === id) : [];
  const categories = useMemo(() => [...new Set(data.tasks.map((t) => t.category).filter(Boolean))] as string[], [data.tasks]);

  const submit = async () => {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      description: nn(description),
      due_date: dueDate || null,
      due_time: dueDate && dueTime ? dueTime : null,
      priority,
      status,
      category: nn(category),
      project_id: projectId,
      course_id: courseId,
      recurrence,
      notes: nn(notes),
      completed_at: status === "done" ? (row?.completed_at ?? new Date().toISOString()) : null,
      ...(initial.plan_date !== undefined && !id ? { plan_date: initial.plan_date as string, plan_bucket: initial.plan_bucket as Task["plan_bucket"] } : {}),
      ...(initial.parent_id && !id ? { parent_id: initial.parent_id as string } : {}),
    };
    onClose();
    let taskId = id;
    if (id) await update("tasks", id, payload);
    else {
      const created = await create("tasks", payload);
      taskId = created.id;
      toast("Task added", { tone: "success", description: created.title });
    }
    if (newSubtasks.length && taskId)
      await createMany(
        "tasks",
        newSubtasks.map((t) => ({ title: t, parent_id: taskId, project_id: projectId })),
      );
    if (taskId)
      await syncReminders("task", taskId, payload.title, dueDate ? combineDateTime(dueDate, dueTime || "09:00") : null, offsets);
  };

  const addSub = () => {
    const t = subDraft.trim();
    if (!t) return;
    setNewSubtasks((s) => [...s, t]);
    setSubDraft("");
  };

  return (
    <EditorForm onSubmit={submit}>
      <FormBody>
        <div>
          <TitleInput value={title} onChange={setTitle} placeholder="What needs doing?" />
          <DescriptionInput value={description} onChange={setDescription} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Time">
            <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} disabled={!dueDate} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip onClick={() => setDueDate(toISODate(new Date()))} active={dueDate === toISODate(new Date())}>
            Today
          </Chip>
          <Chip
            onClick={() => setDueDate(toISODate(new Date(Date.now() + 86400000)))}
            active={dueDate === toISODate(new Date(Date.now() + 86400000))}
          >
            Tomorrow
          </Chip>
          <Chip onClick={() => setDueDate(toISODate(new Date(Date.now() + 7 * 86400000)))}>Next week</Chip>
          {dueDate && (
            <Chip onClick={() => (setDueDate(""), setDueTime(""))}>
              <X /> No date
            </Chip>
          )}
        </div>
        <Field label="Priority">
          <PriorityChips value={priority} onChange={setPriority} />
        </Field>

        <MoreDetails defaultOpen={!!id}>
          <Field label="Status">
            <Segmented
              size="sm"
              value={status}
              onChange={setStatus}
              options={[
                { value: "todo", label: "Todo" },
                { value: "in_progress", label: "In progress" },
                { value: "done", label: "Done" },
              ]}
            />
          </Field>
          <Field label="Repeat">
            <Select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)}>
              <option value="none">Doesn&apos;t repeat</option>
              <option value="daily">Every day</option>
              <option value="weekdays">Every weekday</option>
              <option value="weekly">Every week</option>
              <option value="monthly">Every month</option>
            </Select>
          </Field>
          <Field label="Project">
            <ProjectSelect value={projectId} onChange={setProjectId} />
          </Field>
          <Field label="Category">
            <Input list="task-categories" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. University, Personal" />
            <datalist id="task-categories">
              {[...new Set(["University", "Personal", "Websity", "Applications", "Health", ...categories])].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Course">
            <CourseSelect value={courseId} onChange={setCourseId} />
          </Field>
          <div className="sm:col-span-2">
            <ReminderPicker value={offsets} onChange={setOffsets} disabled={!dueDate} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-[12px] font-medium text-muted">Subtasks</span>
            {subtasks.map((s) => (
              <div key={s.id} className="group flex items-center gap-2.5 rounded-lg px-1 py-1">
                <CheckCircle size="sm" checked={s.status === "done"} onChange={() => toggleTask(s)} />
                <span className={cn("flex-1 text-sm", s.status === "done" && "text-subtle line-through")}>{s.title}</span>
                <button type="button" onClick={() => remove("tasks", s.id, { undo: false })} className="text-subtle opacity-0 group-hover:opacity-100 hover:text-rose-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {newSubtasks.map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 px-1 py-1">
                <span className="h-4 w-4 rounded-full border-[1.5px] border-line-strong" />
                <span className="flex-1 text-sm">{s}</span>
                <button type="button" onClick={() => setNewSubtasks((x) => x.filter((_, j) => j !== i))} className="text-subtle hover:text-rose-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={subDraft}
                onChange={(e) => setSubDraft(e.target.value)}
                placeholder="Add a subtask"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    addSub();
                  }
                }}
              />
              <Button size="icon" variant="subtle" onClick={addSub} aria-label="Add subtask">
                <Plus />
              </Button>
            </div>
          </div>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering…" />
          </Field>
        </MoreDetails>
      </FormBody>
      <FormFooter onCancel={onClose} onDelete={useDeleteAndClose("tasks", id, "Task", onClose)} canSubmit={!!title.trim()} submitLabel={id ? "Save" : "Add task"} />
    </EditorForm>
  );
}

// ---------------------------------------------------------------------------
// Deadline
// ---------------------------------------------------------------------------
const DEADLINE_CATEGORIES = ["University", "Competition", "Scholarship", "Application", "Client", "Project", "Personal"];

export function DeadlineForm({ id, initial = {}, onClose }: FormProps) {
  const { data, create, update, syncReminders } = useData();
  const row = useRow("deadlines", id);
  const src = { ...(row ?? {}), ...initial } as Partial<Deadline>;
  const due = toLocalInputValue(src.due_at);
  const [title, setTitle] = useState(src.title ?? "");
  const [description, setDescription] = useState(src.description ?? "");
  const [date, setDate] = useState(due.date || toISODate(new Date(Date.now() + 7 * 86400000)));
  const [time, setTime] = useState(due.time || "23:59");
  const [priority, setPriority] = useState<Priority>(src.priority ?? "high");
  const [status, setStatus] = useState<DeadlineStatus>(src.status ?? "pending");
  const [category, setCategory] = useState(src.category ?? "");
  const [projectId, setProjectId] = useState<string | null>(src.project_id ?? null);
  const [applicationId, setApplicationId] = useState<string | null>(src.application_id ?? null);
  const [courseId, setCourseId] = useState<string | null>(src.course_id ?? null);
  const [notes, setNotes] = useState(src.notes ?? "");
  const [offsets, setOffsets] = useState<number[]>(useExistingOffsets(id, [1440, 120]));

  const submit = async () => {
    if (!title.trim() || !date) return;
    const dueAt = combineDateTime(date, time || "23:59");
    const payload = {
      title: title.trim(),
      description: nn(description),
      due_at: dueAt.toISOString(),
      priority,
      status,
      category: nn(category),
      project_id: projectId,
      application_id: applicationId,
      course_id: courseId,
      notes: nn(notes),
    };
    onClose();
    let did = id;
    if (id) await update("deadlines", id, payload);
    else {
      did = (await create("deadlines", payload)).id;
      toast("Deadline added", { tone: "success", description: payload.title });
    }
    if (did) await syncReminders("deadline", did, payload.title, status === "done" ? null : dueAt, offsets);
  };

  return (
    <EditorForm onSubmit={submit}>
      <FormBody>
        <div>
          <TitleInput value={title} onChange={setTitle} placeholder="What's due?" />
          <DescriptionInput value={description} onChange={setDescription} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Deadline">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Exact time">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <Field label="Category">
          <div className="flex flex-wrap gap-1.5">
            {DEADLINE_CATEGORIES.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? "" : c)}>
                {c}
              </Chip>
            ))}
          </div>
        </Field>
        <ReminderPicker value={offsets} onChange={setOffsets} />
        <MoreDetails defaultOpen={!!id}>
          <Field label="Priority">
            <PrioritySelect value={priority} onChange={setPriority} />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as DeadlineStatus)}>
              <option value="pending">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done / submitted</option>
            </Select>
          </Field>
          <Field label="Related project">
            <ProjectSelect value={projectId} onChange={setProjectId} />
          </Field>
          <Field label="Related application">
            <Select value={applicationId ?? ""} onChange={(e) => setApplicationId(e.target.value || null)}>
              <option value="">None</option>
              {data.applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Course">
            <CourseSelect value={courseId} onChange={setCourseId} />
          </Field>
          <Field label="Custom category">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </MoreDetails>
      </FormBody>
      <FormFooter onCancel={onClose} onDelete={useDeleteAndClose("deadlines", id, "Deadline", onClose)} canSubmit={!!title.trim() && !!date} submitLabel={id ? "Save" : "Add deadline"} />
    </EditorForm>
  );
}

// ---------------------------------------------------------------------------
// Event
// ---------------------------------------------------------------------------
const EVENT_KINDS = Object.keys(EVENT_KIND_LABEL) as EventKind[];

export function EventForm({ id, initial = {}, onClose }: FormProps) {
  const { create, update, syncReminders } = useData();
  const row = useRow("events", id);
  const src = { ...(row ?? {}), ...initial } as Partial<TableMap["events"]>;
  const start = toLocalInputValue(src.start_at);
  const [title, setTitle] = useState(src.title ?? "");
  const [kind, setKind] = useState<EventKind>(src.kind ?? "meeting");
  const [date, setDate] = useState(start.date || toISODate(new Date()));
  const [time, setTime] = useState(start.time || "10:00");
  const [duration, setDuration] = useState(String(src.duration_minutes ?? 60));
  const [allDay, setAllDay] = useState(src.all_day ?? false);
  const [location, setLocation] = useState(src.location ?? "");
  const [link, setLink] = useState(src.meeting_url ?? "");
  const [people, setPeople] = useState((src.people ?? []).join(", "));
  const [notes, setNotes] = useState(src.notes ?? "");
  const [projectId, setProjectId] = useState<string | null>(src.project_id ?? null);
  const [courseId, setCourseId] = useState<string | null>(src.course_id ?? null);
  const [offsets, setOffsets] = useState<number[]>(useExistingOffsets(id, [30]));

  const submit = async () => {
    if (!title.trim() || !date) return;
    const startAt = combineDateTime(date, allDay ? "00:00" : time);
    const payload = {
      title: title.trim(),
      kind,
      start_at: startAt.toISOString(),
      duration_minutes: Math.max(5, Number(duration) || 60),
      all_day: allDay,
      location: nn(location),
      meeting_url: nn(link),
      people: splitList(people),
      notes: nn(notes),
      project_id: projectId,
      course_id: courseId,
    };
    onClose();
    let eid = id;
    if (id) await update("events", id, payload);
    else {
      eid = (await create("events", payload)).id;
      toast("Event added", { tone: "success", description: payload.title });
    }
    if (eid) await syncReminders("event", eid, payload.title, allDay ? combineDateTime(date, "09:00") : startAt, offsets);
  };

  return (
    <EditorForm onSubmit={submit}>
      <FormBody>
        <TitleInput value={title} onChange={setTitle} placeholder="Meeting, call, interview…" />
        <div className="flex flex-wrap gap-1.5">
          {EVENT_KINDS.map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
              {EVENT_KIND_LABEL[k]}
            </Chip>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          {!allDay && (
            <>
              <Field label="Time">
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </Field>
              <Field label="Duration">
                <Select value={duration} onChange={(e) => setDuration(e.target.value)}>
                  {[15, 30, 45, 60, 90, 120, 180, 240, 480].map((m) => (
                    <option key={m} value={m}>
                      {m < 60 ? `${m} min` : `${m / 60} h`}
                    </option>
                  ))}
                  {![15, 30, 45, 60, 90, 120, 180, 240, 480].includes(Number(duration)) && <option value={duration}>{duration} min</option>}
                </Select>
              </Field>
            </>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Location">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where?" />
          </Field>
          <Field label="Meeting link">
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
          </Field>
        </div>
        <ReminderPicker value={offsets} onChange={setOffsets} />
        <MoreDetails defaultOpen={!!id}>
          <Field label="People" hint="Comma separated">
            <Input value={people} onChange={(e) => setPeople(e.target.value)} placeholder="Ahmed, Nada" />
          </Field>
          <Field label="All day">
            <Segmented
              size="sm"
              value={allDay ? "yes" : "no"}
              onChange={(v) => setAllDay(v === "yes")}
              options={[
                { value: "no", label: "Timed" },
                { value: "yes", label: "All day" },
              ]}
            />
          </Field>
          <Field label="Project">
            <ProjectSelect value={projectId} onChange={setProjectId} />
          </Field>
          <Field label="Course">
            <CourseSelect value={courseId} onChange={setCourseId} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Agenda, prep, questions…" />
          </Field>
        </MoreDetails>
      </FormBody>
      <FormFooter onCancel={onClose} onDelete={useDeleteAndClose("events", id, "Event", onClose)} canSubmit={!!title.trim()} submitLabel={id ? "Save" : "Add event"} />
    </EditorForm>
  );
}

// ---------------------------------------------------------------------------
// Reminder (standalone)
// ---------------------------------------------------------------------------
export function ReminderForm({ id, initial = {}, onClose }: FormProps) {
  const { create, update } = useData();
  const row = useRow("reminders", id);
  const src = { ...(row ?? {}), ...initial } as Partial<TableMap["reminders"]>;
  const at = toLocalInputValue(src.remind_at);
  const inOneHour = new Date(Date.now() + 3600000);
  const [title, setTitle] = useState(src.title ?? "");
  const [date, setDate] = useState(at.date || toISODate(inOneHour));
  const [time, setTime] = useState(at.time || `${String(inOneHour.getHours()).padStart(2, "0")}:00`);
  const [repeat, setRepeat] = useState<ReminderRepeat>(src.repeat ?? "none");

  const quick = (mins: number) => {
    const d = new Date(Date.now() + mins * 60000);
    setDate(toISODate(d));
    setTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
  };

  const submit = async () => {
    if (!title.trim()) return;
    const payload = { title: title.trim(), remind_at: combineDateTime(date, time).toISOString(), repeat, fired_at: null, done: false };
    onClose();
    if (id) await update("reminders", id, payload);
    else {
      await create("reminders", payload);
      toast("Reminder set", { tone: "success", description: `${payload.title}` });
    }
  };

  return (
    <EditorForm onSubmit={submit}>
      <FormBody>
        <TitleInput value={title} onChange={setTitle} placeholder="Remind me to…" />
        <div className="flex flex-wrap gap-1.5">
          <Chip onClick={() => quick(30)}>In 30 min</Chip>
          <Chip onClick={() => quick(60)}>In 1 hour</Chip>
          <Chip onClick={() => quick(180)}>In 3 hours</Chip>
          <Chip
            onClick={() => {
              const d = new Date(Date.now() + 86400000);
              setDate(toISODate(d));
              setTime("09:00");
            }}
          >
            Tomorrow 9:00
          </Chip>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Time">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Repeat">
            <Select value={repeat} onChange={(e) => setRepeat(e.target.value as ReminderRepeat)}>
              <option value="none">Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
          </Field>
        </div>
      </FormBody>
      <FormFooter onCancel={onClose} onDelete={useDeleteAndClose("reminders", id, "Reminder", onClose)} canSubmit={!!title.trim()} submitLabel={id ? "Save" : "Set reminder"} />
    </EditorForm>
  );
}

// ---------------------------------------------------------------------------
// Study session
// ---------------------------------------------------------------------------
export function StudyForm({ id, initial = {}, onClose }: FormProps) {
  const { data, create, update, syncReminders } = useData();
  const row = useRow("study_sessions", id);
  const src = { ...(row ?? {}), ...initial } as Partial<TableMap["study_sessions"]>;
  const [subject, setSubject] = useState(src.subject ?? "");
  const [topic, setTopic] = useState(src.topic ?? "");
  const [subtopic, setSubtopic] = useState(src.subtopic ?? "");
  const [date, setDate] = useState(src.date || toISODate(new Date()));
  const [time, setTime] = useState(src.start_time ?? "");
  const [planned, setPlanned] = useState(String(src.planned_minutes ?? 60));
  const [actual, setActual] = useState(src.actual_minutes != null ? String(src.actual_minutes) : "");
  const [priority, setPriority] = useState<Priority>(src.priority ?? "medium");
  const [completed, setCompleted] = useState(src.completed ?? false);
  const [courseId, setCourseId] = useState<string | null>(src.course_id ?? null);
  const [notes, setNotes] = useState(src.notes ?? "");
  const [offsets, setOffsets] = useState<number[]>(useExistingOffsets(id, []));
  const subjects = useMemo(
    () => [...new Set([...data.courses.map((c) => c.name), ...data.study_sessions.map((s) => s.subject)])],
    [data.courses, data.study_sessions],
  );

  const submit = async () => {
    if (!subject.trim()) return;
    const course = courseId ? null : data.courses.find((c) => c.name === subject.trim());
    const payload = {
      subject: subject.trim(),
      topic: nn(topic),
      subtopic: nn(subtopic),
      date,
      start_time: time || null,
      planned_minutes: Math.max(5, Number(planned) || 60),
      actual_minutes: actual ? Number(actual) : completed ? Number(planned) || 60 : null,
      priority,
      completed,
      course_id: courseId ?? course?.id ?? null,
      notes: nn(notes),
    };
    onClose();
    let sid = id;
    if (id) await update("study_sessions", id, payload);
    else {
      sid = (await create("study_sessions", payload)).id;
      toast("Study session planned", { tone: "success", description: payload.topic ?? payload.subject });
    }
    if (sid) await syncReminders("study_session", sid, `Study: ${payload.subject}`, time && !completed ? combineDateTime(date, time) : null, offsets);
  };

  return (
    <EditorForm onSubmit={submit}>
      <FormBody>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Subject">
            <Input autoFocus list="study-subjects" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Physics" />
            <datalist id="study-subjects">
              {subjects.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Topic">
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Mechanics" />
          </Field>
          <Field label="Subtopic">
            <Input value={subtopic} onChange={(e) => setSubtopic(e.target.value)} placeholder="Newton's Laws" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Start time">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Planned">
            <Select value={planned} onChange={(e) => setPlanned(e.target.value)}>
              {[25, 30, 45, 60, 90, 120, 150, 180, 240].map((m) => (
                <option key={m} value={m}>
                  {m < 60 ? `${m} min` : `${m / 60} h`}
                </option>
              ))}
              {![25, 30, 45, 60, 90, 120, 150, 180, 240].includes(Number(planned)) && <option value={planned}>{planned} min</option>}
            </Select>
          </Field>
        </div>
        <div className="flex items-center gap-2.5">
          <CheckCircle checked={completed} onChange={() => setCompleted((c) => !c)} />
          <span className="text-sm">Completed</span>
          {completed && (
            <div className="animate-fade-up ml-3 flex items-center gap-2">
              <span className="text-xs text-muted">Actual</span>
              <Input type="number" min={0} value={actual} onChange={(e) => setActual(e.target.value)} placeholder={planned} className="h-8 w-20" />
              <span className="text-xs text-muted">min</span>
            </div>
          )}
        </div>
        <MoreDetails defaultOpen={!!id}>
          <Field label="Priority">
            <PrioritySelect value={priority} onChange={setPriority} />
          </Field>
          <Field label="Course">
            <CourseSelect value={courseId} onChange={setCourseId} />
          </Field>
          <div className="sm:col-span-2">
            <ReminderPicker value={offsets} onChange={setOffsets} disabled={!time} />
          </div>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Chapters, resources, what to review…" />
          </Field>
        </MoreDetails>
      </FormBody>
      <FormFooter onCancel={onClose} onDelete={useDeleteAndClose("study_sessions", id, "Study session", onClose)} canSubmit={!!subject.trim()} submitLabel={id ? "Save" : "Add session"} />
    </EditorForm>
  );
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------
export function ProjectForm({ id, initial = {}, onClose }: FormProps) {
  const { create, update } = useData();
  const row = useRow("projects", id);
  const src = { ...(row ?? {}), ...initial } as Partial<TableMap["projects"]>;
  const [name, setName] = useState(src.name ?? "");
  const [description, setDescription] = useState(src.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(src.status ?? "active");
  const [priority, setPriority] = useState<Priority>(src.priority ?? "medium");
  const [startDate, setStartDate] = useState(src.start_date ?? "");
  const [deadline, setDeadline] = useState(src.deadline ?? "");
  const [colorName, setColorName] = useState(src.color ?? "iris");
  const [manual, setManual] = useState(src.progress !== null && src.progress !== undefined);
  const [progress, setProgress] = useState(src.progress ?? 0);
  const [links, setLinks] = useState((src.links ?? []).map((l) => `${l.label} | ${l.url}`).join("\n"));

  const submit = async () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      description: nn(description),
      status,
      priority,
      start_date: startDate || null,
      deadline: deadline || null,
      color: colorName,
      progress: manual ? progress : null,
      links: links
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          const [a, b] = l.split("|").map((s) => s.trim());
          return b ? { label: a, url: b } : { label: a.replace(/^https?:\/\//, ""), url: a };
        }),
    };
    onClose();
    if (id) await update("projects", id, payload);
    else {
      await create("projects", payload);
      toast("Project created", { tone: "success", description: payload.name });
    }
  };

  return (
    <EditorForm onSubmit={submit}>
      <FormBody>
        <div>
          <TitleInput value={name} onChange={setName} placeholder="Project name" />
          <DescriptionInput value={description} onChange={setDescription} placeholder="What is it, and why does it matter?" />
        </div>
        <Field label="Status">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((s) => (
              <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
                {PROJECT_STATUS_LABEL[s]}
              </Chip>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Deadline">
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        </div>
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {COLOR_NAMES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColorName(c)}
                aria-label={c}
                className={cn(
                  "h-6 w-6 rounded-full ring-offset-2 ring-offset-surface transition-all",
                  colorOf(c).dot,
                  colorName === c ? "scale-110 ring-2 ring-fg/40" : "hover:scale-110",
                )}
              />
            ))}
          </div>
        </Field>
        <MoreDetails defaultOpen={!!id}>
          <Field label="Priority">
            <PrioritySelect value={priority} onChange={setPriority} />
          </Field>
          <Field label="Progress">
            <div className="flex h-9 items-center gap-3">
              <Segmented
                size="sm"
                value={manual ? "manual" : "auto"}
                onChange={(v) => setManual(v === "manual")}
                options={[
                  { value: "auto", label: "From tasks" },
                  { value: "manual", label: "Manual" },
                ]}
              />
              {manual && (
                <>
                  <input type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="flex-1 accent-[var(--accent)]" />
                  <span className="tabular w-9 text-right text-xs text-muted">{progress}%</span>
                </>
              )}
            </div>
          </Field>
          <Field label="Links" hint="One per line — “Label | https://…”" className="sm:col-span-2">
            <Textarea value={links} onChange={(e) => setLinks(e.target.value)} placeholder={"GitHub | https://github.com/…\nFigma | https://figma.com/…"} className="min-h-[64px] font-mono text-xs" />
          </Field>
        </MoreDetails>
      </FormBody>
      <FormFooter onCancel={onClose} onDelete={useDeleteAndClose("projects", id, "Project", onClose)} canSubmit={!!name.trim()} submitLabel={id ? "Save" : "Create project"} />
    </EditorForm>
  );
}

// ---------------------------------------------------------------------------
// Milestone
// ---------------------------------------------------------------------------
export function MilestoneForm({ id, initial = {}, onClose }: FormProps) {
  const { data, create, update } = useData();
  const row = useRow("milestones", id);
  const src = { ...(row ?? {}), ...initial } as Partial<TableMap["milestones"]>;
  const [title, setTitle] = useState(src.title ?? "");
  const [description, setDescription] = useState(src.description ?? "");
  const [dueDate, setDueDate] = useState(src.due_date ?? "");
  const [projectId, setProjectId] = useState<string | null>(src.project_id ?? data.projects[0]?.id ?? null);

  const submit = async () => {
    if (!title.trim() || !projectId) return;
    const payload = { title: title.trim(), description: nn(description), due_date: dueDate || null, project_id: projectId };
    onClose();
    if (id) await update("milestones", id, payload);
    else await create("milestones", payload);
  };

  return (
    <EditorForm onSubmit={submit}>
      <FormBody>
        <div>
          <TitleInput value={title} onChange={setTitle} placeholder="Milestone" />
          <DescriptionInput value={description} onChange={setDescription} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Project">
            <ProjectSelect value={projectId} onChange={setProjectId} />
          </Field>
        </div>
      </FormBody>
      <FormFooter onCancel={onClose} onDelete={useDeleteAndClose("milestones", id, "Milestone", onClose)} canSubmit={!!title.trim() && !!projectId} submitLabel={id ? "Save" : "Add milestone"} />
    </EditorForm>
  );
}

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------
export function ApplicationForm({ id, initial = {}, onClose }: FormProps) {
  const { create, update, syncReminders } = useData();
  const row = useRow("applications", id);
  const src = { ...(row ?? {}), ...initial } as Partial<Application>;
  const due = toLocalInputValue(src.deadline_at);
  const [name, setName] = useState(src.name ?? "");
  const [organization, setOrganization] = useState(src.organization ?? "");
  const [type, setType] = useState<ApplicationType>(src.type ?? "competition");
  const [status, setStatus] = useState<ApplicationStatus>(src.status ?? "interested");
  const [date, setDate] = useState(due.date);
  const [time, setTime] = useState(due.time || "23:59");
  const [url, setUrl] = useState(src.url ?? "");
  const [requirements, setRequirements] = useState(src.requirements ?? "");
  const [docs, setDocs] = useState((src.documents_required ?? []).join(", "));
  const [submitted, setSubmitted] = useState<string[]>(src.documents_submitted ?? []);
  const [notes, setNotes] = useState(src.notes ?? "");
  const [resultDate, setResultDate] = useState(src.result_date ?? "");
  const [result, setResult] = useState(src.result ?? "");
  const [offsets, setOffsets] = useState<number[]>(useExistingOffsets(id, [10080, 4320, 1440]));
  const docList = splitList(docs);

  const submit = async () => {
    if (!name.trim()) return;
    const deadlineAt = date ? combineDateTime(date, time || "23:59") : null;
    const payload = {
      name: name.trim(),
      organization: nn(organization),
      type,
      status,
      deadline_at: deadlineAt?.toISOString() ?? null,
      url: nn(url),
      requirements: nn(requirements),
      documents_required: docList,
      documents_submitted: submitted.filter((d) => docList.includes(d)),
      notes: nn(notes),
      result_date: resultDate || null,
      result: nn(result),
    };
    onClose();
    let aid = id;
    if (id) await update("applications", id, payload);
    else {
      aid = (await create("applications", payload)).id;
      toast("Application added", { tone: "success", description: payload.name });
    }
    const open = ["interested", "researching", "preparing"].includes(status);
    if (aid) await syncReminders("application", aid, `${payload.name} deadline`, open ? deadlineAt : null, offsets);
  };

  return (
    <EditorForm onSubmit={submit}>
      <FormBody>
        <TitleInput value={name} onChange={setName} placeholder="Competition, scholarship, internship…" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Organization">
            <Input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Who runs it?" />
          </Field>
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as ApplicationType)}>
              {(Object.keys(APPLICATION_TYPE_LABEL) as ApplicationType[]).map((t) => (
                <option key={t} value={t}>
                  {APPLICATION_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Application deadline">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Time">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={!date} />
          </Field>
        </div>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus)}>
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {APPLICATION_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
        <ReminderPicker value={offsets} onChange={setOffsets} disabled={!date} />
        <MoreDetails defaultOpen={!!id}>
          <Field label="Website" className="sm:col-span-2">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
          </Field>
          <Field label="Requirements" className="sm:col-span-2">
            <Textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="Eligibility, format, word limits…" />
          </Field>
          <Field label="Documents required" hint="Comma separated" className="sm:col-span-2">
            <Input value={docs} onChange={(e) => setDocs(e.target.value)} placeholder="CV, Motivation letter, Transcript" />
          </Field>
          {docList.length > 0 && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-[12px] font-medium text-muted">Submitted documents</span>
              <div className="flex flex-wrap gap-1.5">
                {docList.map((d) => (
                  <Chip
                    key={d}
                    active={submitted.includes(d)}
                    onClick={() => setSubmitted((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]))}
                  >
                    {submitted.includes(d) ? "✓ " : ""}
                    {d}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          <Field label="Result date">
            <Input type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} />
          </Field>
          <Field label="Result">
            <Input value={result} onChange={(e) => setResult(e.target.value)} placeholder="Accepted, finalist…" />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </MoreDetails>
      </FormBody>
      <FormFooter onCancel={onClose} onDelete={useDeleteAndClose("applications", id, "Application", onClose)} canSubmit={!!name.trim()} submitLabel={id ? "Save" : "Add application"} />
    </EditorForm>
  );
}

// ---------------------------------------------------------------------------
// Idea
// ---------------------------------------------------------------------------
export function IdeaForm({ id, initial = {}, onClose }: FormProps) {
  const { create, update } = useData();
  const row = useRow("ideas", id);
  const src = { ...(row ?? {}), ...initial } as Partial<TableMap["ideas"]>;
  const [title, setTitle] = useState(src.title ?? "");
  const [description, setDescription] = useState(src.description ?? "");
  const [category, setCategory] = useState(src.category ?? "");
  const [priority, setPriority] = useState<Priority>(src.priority ?? "medium");
  const [tags, setTags] = useState((src.tags ?? []).join(", "));
  const [projectId, setProjectId] = useState<string | null>(src.project_id ?? null);
  const [status, setStatus] = useState<IdeaStatus>(src.status ?? "brain_dump");

  const submit = async () => {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      description: nn(description),
      category: nn(category),
      priority,
      tags: splitList(tags).map((t) => t.replace(/^#/, "").toLowerCase()),
      project_id: projectId,
      status,
    };
    onClose();
    if (id) await update("ideas", id, payload);
    else {
      await create("ideas", payload);
      toast("Idea saved", { tone: "success", description: payload.title });
    }
  };

  return (
    <EditorForm onSubmit={submit}>
      <FormBody>
        <div>
          <TitleInput value={title} onChange={setTitle} placeholder="What's the idea?" />
          <DescriptionInput value={description} onChange={setDescription} placeholder="Dump everything — refine later." />
        </div>
        <MoreDetails defaultOpen={!!id}>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as IdeaStatus)}>
              {(Object.keys(IDEA_STATUS_LABEL) as IdeaStatus[]).map((s) => (
                <option key={s} value={s}>
                  {IDEA_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Category">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Business, Research…" />
          </Field>
          <Field label="Tags" hint="Comma separated">
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="startup, ai" />
          </Field>
          <Field label="Priority">
            <PrioritySelect value={priority} onChange={setPriority} />
          </Field>
          <Field label="Related project" className="sm:col-span-2">
            <ProjectSelect value={projectId} onChange={setProjectId} />
          </Field>
        </MoreDetails>
      </FormBody>
      <FormFooter onCancel={onClose} onDelete={useDeleteAndClose("ideas", id, "Idea", onClose)} canSubmit={!!title.trim()} submitLabel={id ? "Save" : "Save idea"} />
    </EditorForm>
  );
}

// ---------------------------------------------------------------------------
// Wishlist / purchase
// ---------------------------------------------------------------------------
export function PurchaseForm({ id, initial = {}, onClose }: FormProps) {
  const { create, update } = useData();
  const row = useRow("wishlist", id);
  const src = { ...(row ?? {}), ...initial } as Partial<TableMap["wishlist"]>;
  const [name, setName] = useState(src.name ?? "");
  const [price, setPrice] = useState(src.price != null ? String(src.price) : "");
  const [currency, setCurrency] = useState(src.currency ?? "EGP");
  const [url, setUrl] = useState(src.url ?? "");
  const [image, setImage] = useState(src.image_url ?? "");
  const [priority, setPriority] = useState<Priority>(src.priority ?? "medium");
  const [category, setCategory] = useState(src.category ?? "");
  const [targetDate, setTargetDate] = useState(src.target_date ?? "");
  const [notes, setNotes] = useState(src.notes ?? "");
  const [status, setStatus] = useState<WishStatus>(src.status ?? "want");
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const { path } = await getRepository().upload(file, "wishlist");
      setImage(`storage:${path}`);
    } catch (e) {
      toast("Upload failed", { tone: "error", description: String(e) });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      price: price ? Number(price) : null,
      currency,
      url: nn(url),
      image_url: nn(image),
      priority,
      category: nn(category),
      target_date: targetDate || null,
      notes: nn(notes),
      status,
    };
    onClose();
    if (id) await update("wishlist", id, payload);
    else {
      await create("wishlist", payload);
      toast("Added to wishlist", { tone: "success", description: payload.name });
    }
  };

  return (
    <EditorForm onSubmit={submit}>
      <FormBody>
        <TitleInput value={name} onChange={setName} placeholder="What do you want to buy?" />
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <Field label="Price">
            <Input type="number" min={0} step="any" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Currency">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Link">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        </Field>
        <MoreDetails defaultOpen={!!id}>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as WishStatus)}>
              {(Object.keys(WISH_STATUS_LABEL) as WishStatus[]).map((s) => (
                <option key={s} value={s}>
                  {WISH_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Priority">
            <PrioritySelect value={priority} onChange={setPriority} />
          </Field>
          <Field label="Category">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Tech, Books…" />
          </Field>
          <Field label="Target purchase date">
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </Field>
          <Field label="Image" className="sm:col-span-2">
            <div className="flex gap-2">
              <Input value={image.startsWith("storage:") ? "Uploaded image" : image} onChange={(e) => setImage(e.target.value)} placeholder="Image URL" disabled={image.startsWith("storage:")} />
              {image && (
                <Button size="icon" variant="ghost" onClick={() => setImage("")} aria-label="Remove image">
                  <X />
                </Button>
              )}
              <label className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3 text-sm font-medium hover:bg-surface-2">
                <ImagePlus className="h-4 w-4" />
                {uploading ? "…" : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </label>
            </div>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </MoreDetails>
      </FormBody>
      <FormFooter onCancel={onClose} onDelete={useDeleteAndClose("wishlist", id, "Item", onClose)} canSubmit={!!name.trim()} submitLabel={id ? "Save" : "Add to wishlist"} />
    </EditorForm>
  );
}

// ---------------------------------------------------------------------------
// Note
// ---------------------------------------------------------------------------
export function NoteForm({ id, initial = {}, onClose }: FormProps) {
  const { create, update } = useData();
  const row = useRow("notes", id);
  const src = { ...(row ?? {}), ...initial } as Partial<TableMap["notes"]>;
  const [title, setTitle] = useState(src.title ?? "");
  const [content, setContent] = useState(src.content ?? "");
  const [tags, setTags] = useState((src.tags ?? []).join(", "));
  const [projectId, setProjectId] = useState<string | null>(src.project_id ?? null);
  const [pinned, setPinned] = useState(src.pinned ?? false);

  const submit = async () => {
    if (!title.trim() && !content.trim()) return;
    const payload = {
      title: nn(title),
      content: content.trim(),
      tags: splitList(tags),
      project_id: projectId,
      pinned,
      inbox: id ? (src.inbox ?? false) : false,
    };
    onClose();
    if (id) await update("notes", id, payload);
    else await create("notes", payload);
  };

  return (
    <EditorForm onSubmit={submit}>
      <FormBody>
        <TitleInput value={title} onChange={setTitle} placeholder="Title (optional)" />
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write anything…" className="min-h-[200px] border-none bg-surface-2/60 px-3.5 py-3 focus:shadow-none" />
        <MoreDetails defaultOpen={!!id}>
          <Field label="Tags">
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma, separated" />
          </Field>
          <Field label="Project">
            <ProjectSelect value={projectId} onChange={setProjectId} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <CheckCircle checked={pinned} onChange={() => setPinned((p) => !p)} /> Pin to top
          </label>
        </MoreDetails>
      </FormBody>
      <FormFooter onCancel={onClose} onDelete={useDeleteAndClose("notes", id, "Note", onClose)} canSubmit={!!(title.trim() || content.trim())} submitLabel={id ? "Save" : "Save note"} />
    </EditorForm>
  );
}

// ---------------------------------------------------------------------------
// Course (university timetable entry)
// ---------------------------------------------------------------------------
export function CourseForm({ id, initial = {}, onClose }: FormProps) {
  const { data, create, createMany, update } = useData();
  const row = useRow("courses", id);
  const src = { ...(row ?? {}), ...initial } as Partial<TableMap["courses"]>;
  const [name, setName] = useState(src.name ?? "");
  const [code, setCode] = useState(src.code ?? "");
  const [kind, setKind] = useState<CourseKind>(src.kind ?? "lecture");
  const [days, setDays] = useState<number[]>(src.day_of_week !== undefined ? [src.day_of_week] : [new Date().getDay()]);
  const [start, setStart] = useState(src.start_time ?? "09:00");
  const [end, setEnd] = useState(src.end_time ?? "10:30");
  const [professor, setProfessor] = useState(src.professor ?? "");
  const [location, setLocation] = useState(src.location ?? "");
  const existingColor = data.courses.find((c) => c.name === name.trim())?.color;
  const [colorName, setColorName] = useState(src.color ?? "sky");
  const [notes, setNotes] = useState(src.notes ?? "");
  const courseNames = [...new Set(data.courses.map((c) => c.name))];

  const submit = async () => {
    if (!name.trim() || !days.length) return;
    const base = {
      name: name.trim(),
      code: nn(code),
      kind,
      start_time: start,
      end_time: end > start ? end : start,
      professor: nn(professor),
      location: nn(location),
      color: colorName,
      notes: nn(notes),
    };
    onClose();
    if (id) await update("courses", id, { ...base, day_of_week: days[0] });
    else {
      if (days.length === 1) await create("courses", { ...base, day_of_week: days[0] });
      else await createMany("courses", days.map((d) => ({ ...base, day_of_week: d })));
      toast("Added to timetable", { tone: "success", description: base.name });
    }
  };

  return (
    <EditorForm onSubmit={submit}>
      <FormBody>
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Field label="Course name">
            <Input
              autoFocus
              list="course-names"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                const match = data.courses.find((c) => c.name === e.target.value);
                if (match && !id) {
                  setColorName(match.color);
                  setCode(match.code ?? "");
                }
              }}
              placeholder="Physics II"
            />
            <datalist id="course-names">
              {courseNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </Field>
          <Field label="Code">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PHY 202" />
          </Field>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(COURSE_KIND_LABEL) as CourseKind[]).map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
              {COURSE_KIND_LABEL[k]}
            </Chip>
          ))}
        </div>
        <Field label={id ? "Day" : "Days (select several to repeat)"}>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS_SHORT.map((d, i) => (
              <Chip
                key={d}
                active={days.includes(i)}
                onClick={() => setDays((cur) => (id ? [i] : cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]))}
              >
                {d}
              </Chip>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts">
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Ends">
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <Field label="Professor / TA">
            <Input value={professor} onChange={(e) => setProfessor(e.target.value)} placeholder="Dr. …" />
          </Field>
          <Field label="Location">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Hall B" />
          </Field>
        </div>
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {COLOR_NAMES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColorName(c)}
                aria-label={c}
                className={cn(
                  "h-6 w-6 rounded-full ring-offset-2 ring-offset-surface transition-all",
                  colorOf(c).dot,
                  colorName === c ? "scale-110 ring-2 ring-fg/40" : "hover:scale-110",
                  existingColor === c && colorName !== c && "opacity-60",
                )}
              />
            ))}
          </div>
        </Field>
        <MoreDetails defaultOpen={!!src.notes}>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Office hours, grading, materials…" />
          </Field>
        </MoreDetails>
      </FormBody>
      <FormFooter onCancel={onClose} onDelete={useDeleteAndClose("courses", id, "Class", onClose)} canSubmit={!!name.trim() && days.length > 0} submitLabel={id ? "Save" : "Add to timetable"} />
    </EditorForm>
  );
}

// ---------------------------------------------------------------------------
// Future item
// ---------------------------------------------------------------------------
export function FutureForm({ id, initial = {}, onClose }: FormProps) {
  const { create, update } = useData();
  const row = useRow("future_items", id);
  const src = { ...(row ?? {}), ...initial } as Partial<TableMap["future_items"]>;
  const [title, setTitle] = useState(src.title ?? "");
  const [description, setDescription] = useState(src.description ?? "");
  const [category, setCategory] = useState<FutureCategory>(src.category ?? "other");
  const [horizon, setHorizon] = useState<Horizon>(src.horizon ?? "someday");
  const [targetDate, setTargetDate] = useState(src.target_date ?? "");

  const submit = async () => {
    if (!title.trim()) return;
    const payload = { title: title.trim(), description: nn(description), category, horizon, target_date: targetDate || null };
    onClose();
    if (id) await update("future_items", id, payload);
    else await create("future_items", payload);
  };

  return (
    <EditorForm onSubmit={submit}>
      <FormBody>
        <div>
          <TitleInput value={title} onChange={setTitle} placeholder="Something you want to do eventually" />
          <DescriptionInput value={description} onChange={setDescription} />
        </div>
        <Field label="When">
          <Segmented
            value={horizon}
            onChange={setHorizon}
            options={(Object.keys(HORIZON_LABEL) as Horizon[]).map((h) => ({ value: h, label: HORIZON_LABEL[h] }))}
          />
        </Field>
        <Field label="Kind">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FUTURE_CATEGORY_LABEL) as FutureCategory[]).map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                {FUTURE_CATEGORY_LABEL[c]}
              </Chip>
            ))}
          </div>
        </Field>
        <MoreDetails defaultOpen={!!targetDate}>
          <Field label="Target date (optional)">
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </Field>
        </MoreDetails>
      </FormBody>
      <FormFooter onCancel={onClose} onDelete={useDeleteAndClose("future_items", id, "Plan", onClose)} canSubmit={!!title.trim()} submitLabel={id ? "Save" : "Add"} />
    </EditorForm>
  );
}
