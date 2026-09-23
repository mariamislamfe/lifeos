export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "done";
export type Recurrence = "none" | "daily" | "weekdays" | "weekly" | "monthly";
export type PlanBucket = "must" | "should" | "could";

interface Base {
  id: string;
  user_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface Task extends Base {
  title: string;
  description: string | null;
  notes: string | null;
  due_date: string | null; // YYYY-MM-DD
  due_time: string | null; // HH:mm
  priority: Priority;
  status: TaskStatus;
  category: string | null;
  project_id: string | null;
  course_id: string | null;
  parent_id: string | null;
  recurrence: Recurrence;
  plan_date: string | null;
  plan_bucket: PlanBucket | null;
  plan_order: number;
  completed_at: string | null;
}

export type DeadlineStatus = "pending" | "in_progress" | "done";
export interface Deadline extends Base {
  title: string;
  description: string | null;
  category: string | null;
  due_at: string; // ISO
  priority: Priority;
  status: DeadlineStatus;
  project_id: string | null;
  application_id: string | null;
  course_id: string | null;
  notes: string | null;
}

export type ReminderRepeat = "none" | "daily" | "weekly" | "monthly";
export type SourceType = "task" | "deadline" | "event" | "application" | "study_session" | "milestone";
export interface Reminder extends Base {
  title: string;
  remind_at: string;
  repeat: ReminderRepeat;
  source_type: SourceType | null;
  source_id: string | null;
  offset_minutes: number | null;
  fired_at: string | null;
  done: boolean;
}

export type EventKind = "meeting" | "call" | "interview" | "university" | "exam" | "workshop" | "conference" | "personal";
export interface LifeEvent extends Base {
  title: string;
  kind: EventKind;
  start_at: string;
  duration_minutes: number;
  all_day: boolean;
  location: string | null;
  meeting_url: string | null;
  people: string[];
  notes: string | null;
  project_id: string | null;
  course_id: string | null;
}

export type CourseKind = "lecture" | "section" | "lab" | "tutorial";
export interface Course extends Base {
  name: string;
  code: string | null;
  professor: string | null;
  location: string | null;
  kind: CourseKind;
  day_of_week: number; // 0 = Sunday
  start_time: string; // HH:mm
  end_time: string;
  color: string;
  notes: string | null;
}

export interface StudySession extends Base {
  subject: string;
  topic: string | null;
  subtopic: string | null;
  date: string;
  start_time: string | null;
  planned_minutes: number;
  actual_minutes: number | null;
  priority: Priority;
  completed: boolean;
  course_id: string | null;
  notes: string | null;
}

export type ProjectStatus = "idea" | "planned" | "active" | "paused" | "completed" | "archived";
export interface ProjectLink {
  label: string;
  url: string;
}
export interface Project extends Base {
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: Priority;
  start_date: string | null;
  deadline: string | null;
  progress: number | null;
  color: string;
  notes: string | null;
  links: ProjectLink[];
}

export interface Milestone extends Base {
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  done: boolean;
}

export type ApplicationType =
  | "competition"
  | "scholarship"
  | "internship"
  | "program"
  | "university"
  | "fellowship"
  | "hackathon"
  | "conference"
  | "other";
export type ApplicationStatus =
  | "interested"
  | "researching"
  | "preparing"
  | "applied"
  | "interview"
  | "accepted"
  | "rejected"
  | "waitlisted"
  | "withdrawn";
export interface Application extends Base {
  name: string;
  organization: string | null;
  type: ApplicationType;
  status: ApplicationStatus;
  deadline_at: string | null;
  url: string | null;
  requirements: string | null;
  documents_required: string[];
  documents_submitted: string[];
  notes: string | null;
  result_date: string | null;
  result: string | null;
}

export type IdeaStatus = "brain_dump" | "interesting" | "research" | "building" | "archived";
export interface Idea extends Base {
  title: string;
  description: string | null;
  category: string | null;
  priority: Priority;
  tags: string[];
  project_id: string | null;
  status: IdeaStatus;
  pinned: boolean;
}

export type FutureCategory = "learn" | "travel" | "build" | "apply" | "buy" | "project" | "event" | "skill" | "other";
export type Horizon = "month" | "year" | "someday";
export interface FutureItem extends Base {
  title: string;
  description: string | null;
  category: FutureCategory;
  horizon: Horizon;
  target_date: string | null;
  done: boolean;
}

export type WishStatus = "want" | "planning" | "saving" | "bought";
export interface WishlistItem extends Base {
  name: string;
  image_url: string | null;
  price: number | null;
  currency: string;
  url: string | null;
  priority: Priority;
  category: string | null;
  target_date: string | null;
  notes: string | null;
  status: WishStatus;
}

export interface Note extends Base {
  title: string | null;
  content: string;
  inbox: boolean;
  pinned: boolean;
  tags: string[];
  project_id: string | null;
}

export interface AppNotification extends Base {
  title: string;
  body: string | null;
  kind: string;
  source_type: string | null;
  source_id: string | null;
  read_at: string | null;
}

export interface Attachment extends Base {
  entity_type: string;
  entity_id: string | null;
  name: string;
  path: string;
  mime: string | null;
  size: number | null;
}

export interface WeeklyReview extends Base {
  week_start: string;
  reflection: string | null;
  next_week_focus: string | null;
  next_week_items: { id: string; text: string; done: boolean }[];
}

export interface Profile {
  id: string;
  full_name: string | null;
  accent: string;
  seeded: boolean;
}

export interface TableMap {
  tasks: Task;
  deadlines: Deadline;
  reminders: Reminder;
  events: LifeEvent;
  courses: Course;
  study_sessions: StudySession;
  projects: Project;
  milestones: Milestone;
  applications: Application;
  ideas: Idea;
  future_items: FutureItem;
  wishlist: WishlistItem;
  notes: Note;
  notifications: AppNotification;
  attachments: Attachment;
  weekly_reviews: WeeklyReview;
}

export type TableName = keyof TableMap;
export type Collections = { [K in TableName]: TableMap[K][] };

export const TABLES: TableName[] = [
  "projects",
  "courses",
  "applications",
  "milestones",
  "tasks",
  "deadlines",
  "events",
  "study_sessions",
  "reminders",
  "ideas",
  "future_items",
  "wishlist",
  "notes",
  "notifications",
  "attachments",
  "weekly_reviews",
];

/** Fields the client may send when creating a row. */
export type Draft<K extends TableName> = Partial<Omit<TableMap[K], "user_id" | "created_at" | "updated_at">>;
