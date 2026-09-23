import type { Draft, TableMap, TableName } from "./types";

const DEFAULTS: { [K in TableName]: Omit<TableMap[K], "id" | "created_at"> } = {
  tasks: {
    title: "",
    description: null,
    notes: null,
    due_date: null,
    due_time: null,
    priority: "medium",
    status: "todo",
    category: null,
    project_id: null,
    course_id: null,
    parent_id: null,
    recurrence: "none",
    plan_date: null,
    plan_bucket: null,
    plan_order: 0,
    completed_at: null,
  },
  deadlines: {
    title: "",
    description: null,
    category: null,
    due_at: new Date(0).toISOString(),
    priority: "high",
    status: "pending",
    project_id: null,
    application_id: null,
    course_id: null,
    notes: null,
  },
  reminders: {
    title: "",
    remind_at: new Date(0).toISOString(),
    repeat: "none",
    source_type: null,
    source_id: null,
    offset_minutes: null,
    fired_at: null,
    done: false,
  },
  events: {
    title: "",
    kind: "meeting",
    start_at: new Date(0).toISOString(),
    duration_minutes: 60,
    all_day: false,
    location: null,
    meeting_url: null,
    people: [],
    notes: null,
    project_id: null,
    course_id: null,
  },
  courses: {
    name: "",
    code: null,
    professor: null,
    location: null,
    kind: "lecture",
    day_of_week: 0,
    start_time: "09:00",
    end_time: "10:30",
    color: "sky",
    notes: null,
  },
  study_sessions: {
    subject: "",
    topic: null,
    subtopic: null,
    date: "",
    start_time: null,
    planned_minutes: 60,
    actual_minutes: null,
    priority: "medium",
    completed: false,
    course_id: null,
    notes: null,
  },
  projects: {
    name: "",
    description: null,
    status: "active",
    priority: "medium",
    start_date: null,
    deadline: null,
    progress: null,
    color: "iris",
    notes: null,
    links: [],
  },
  milestones: { project_id: "", title: "", description: null, due_date: null, done: false },
  applications: {
    name: "",
    organization: null,
    type: "competition",
    status: "interested",
    deadline_at: null,
    url: null,
    requirements: null,
    documents_required: [],
    documents_submitted: [],
    notes: null,
    result_date: null,
    result: null,
  },
  ideas: {
    title: "",
    description: null,
    category: null,
    priority: "medium",
    tags: [],
    project_id: null,
    status: "brain_dump",
    pinned: false,
  },
  future_items: { title: "", description: null, category: "other", horizon: "someday", target_date: null, done: false },
  wishlist: {
    name: "",
    image_url: null,
    price: null,
    currency: "EGP",
    url: null,
    priority: "medium",
    category: null,
    target_date: null,
    notes: null,
    status: "want",
  },
  notes: { title: null, content: "", inbox: false, pinned: false, tags: [], project_id: null },
  notifications: { title: "", body: null, kind: "reminder", source_type: null, source_id: null, read_at: null },
  attachments: { entity_type: "", entity_id: null, name: "", path: "", mime: null, size: null },
  weekly_reviews: { week_start: "", reflection: null, next_week_focus: null, next_week_items: [] },
};

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Builds a complete row from a partial draft so optimistic UI always has every field. */
export function buildRow<K extends TableName>(table: K, draft: Draft<K>): TableMap[K] {
  const now = new Date().toISOString();
  return {
    ...(DEFAULTS[table] as object),
    ...(draft as object),
    id: (draft as { id?: string }).id ?? uid(),
    created_at: now,
    updated_at: now,
  } as TableMap[K];
}

const TIME_COLUMNS = ["due_time", "start_time", "end_time"];

/** Postgres returns `time` as HH:mm:ss and numerics as strings; normalise for the UI. */
export function normalizeRow<T>(row: T): T {
  const r = row as Record<string, unknown>;
  for (const col of TIME_COLUMNS) {
    const v = r[col];
    if (typeof v === "string" && v.length > 5) r[col] = v.slice(0, 5);
  }
  if (typeof r.price === "string") r.price = Number(r.price);
  return row;
}
