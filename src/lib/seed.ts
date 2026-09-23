import { addDays, setHours, setMinutes, startOfDay } from "date-fns";
import { buildRow, uid } from "./defaults";
import { toISODate, weekStart } from "./date";
import type { Collections, Draft, TableMap, TableName } from "./types";

/**
 * Realistic sample data positioned relative to `now`, so the dashboard always has
 * something happening today, tomorrow and later this week.
 */
export function buildSampleData(now: Date): Partial<Collections> {
  const out: Partial<Collections> = {};
  const add = <K extends TableName>(table: K, draft: Draft<K>): TableMap[K] => {
    const row = buildRow(table, draft);
    (out[table] ??= [] as never);
    (out[table] as TableMap[K][]).push(row);
    return row;
  };

  const today = startOfDay(now);
  const day = (offset: number) => toISODate(addDays(today, offset));
  const at = (offset: number, h: number, m = 0) => setMinutes(setHours(addDays(today, offset), h), m).toISOString();
  const dow = (offset: number) => addDays(today, offset).getDay();

  // Projects -----------------------------------------------------------------
  const websity = add("projects", {
    id: uid(),
    name: "Websity",
    description: "Web design & brand growth studio — landing pages, identities and growth packages for small businesses.",
    status: "active",
    priority: "high",
    start_date: day(-60),
    deadline: day(24),
    color: "iris",
    notes: "Focus this month: finish the portfolio refresh and ship the brand growth package offer.",
    links: [
      { label: "Website", url: "https://websity.dev" },
      { label: "Figma", url: "https://figma.com" },
    ],
  });
  const burn = add("projects", {
    id: uid(),
    name: "AI Burn Detection",
    description: "Graduation project: classifying burn severity from images with a CNN and a clinician-facing web app.",
    status: "active",
    priority: "urgent",
    start_date: day(-40),
    deadline: day(3),
    color: "rose",
    notes: "Dataset v2 cleaned. Need to finish evaluation section before the presentation.",
    links: [{ label: "GitHub", url: "https://github.com" }],
  });
  const site = add("projects", {
    id: uid(),
    name: "Personal Website",
    description: "Minimal portfolio with writing, projects and a now page.",
    status: "planned",
    priority: "medium",
    start_date: day(7),
    deadline: day(45),
    color: "teal",
    notes: null,
    links: [],
  });
  add("projects", {
    id: uid(),
    name: "Startup Idea: StudyMate",
    description: "Peer study-group matching for university students.",
    status: "idea",
    priority: "low",
    color: "amber",
  });

  add("milestones", { project_id: burn.id, title: "Dataset cleaned & labelled", due_date: day(-10), done: true });
  add("milestones", { project_id: burn.id, title: "Model v1 trained", due_date: day(-3), done: true });
  add("milestones", { project_id: burn.id, title: "Evaluation & report", due_date: day(2), done: false });
  add("milestones", { project_id: burn.id, title: "Final presentation", due_date: day(3), done: false });
  add("milestones", { project_id: websity.id, title: "Portfolio refresh live", due_date: day(6), done: false });
  add("milestones", { project_id: websity.id, title: "Brand growth package launched", due_date: day(20), done: false });
  add("milestones", { project_id: site.id, title: "Design in Figma", due_date: day(14), done: false });

  // University ---------------------------------------------------------------
  const physics = add("courses", {
    id: uid(),
    name: "Physics II",
    code: "PHY 202",
    professor: "Dr. Hany Mostafa",
    location: "Hall B · Building 3",
    kind: "lecture",
    day_of_week: dow(0),
    start_time: "08:00",
    end_time: "09:30",
    color: "sky",
  });
  add("courses", {
    name: "Physics II",
    code: "PHY 202",
    professor: "Eng. Salma Adel",
    location: "Lab 4",
    kind: "lab",
    day_of_week: dow(2),
    start_time: "11:00",
    end_time: "13:00",
    color: "sky",
  });
  const ml = add("courses", {
    id: uid(),
    name: "Machine Learning",
    code: "CS 341",
    professor: "Dr. Nour El-Din",
    location: "Hall A",
    kind: "lecture",
    day_of_week: dow(1),
    start_time: "10:00",
    end_time: "11:30",
    color: "violet",
  });
  add("courses", {
    name: "Machine Learning",
    code: "CS 341",
    professor: "Eng. Omar Khaled",
    location: "Room 210",
    kind: "section",
    day_of_week: dow(3),
    start_time: "12:00",
    end_time: "13:30",
    color: "violet",
  });
  const db = add("courses", {
    id: uid(),
    name: "Database Systems",
    code: "CS 331",
    professor: "Dr. Yasmine Farouk",
    location: "Hall C",
    kind: "lecture",
    day_of_week: dow(0),
    start_time: "10:00",
    end_time: "11:30",
    color: "emerald",
  });
  add("courses", {
    name: "Technical Writing",
    code: "HUM 210",
    professor: "Dr. Laila Hassan",
    location: "Room 105",
    kind: "lecture",
    day_of_week: dow(4),
    start_time: "09:00",
    end_time: "10:30",
    color: "amber",
  });

  // Applications ---------------------------------------------------------------
  const compApp = add("applications", {
    id: uid(),
    name: "Microsoft Imagine Cup",
    organization: "Microsoft",
    type: "competition",
    status: "preparing",
    deadline_at: at(1, 23, 59),
    url: "https://imaginecup.microsoft.com",
    requirements: "Team of up to 4. Working prototype, 3-minute pitch video and project deck.",
    documents_required: ["Pitch video", "Project deck", "Team info", "Prototype link"],
    documents_submitted: ["Team info", "Prototype link"],
    notes: "Submit AI Burn Detection as the project.",
    result_date: day(40),
  });
  add("applications", {
    name: "DAAD Scholarship",
    organization: "DAAD",
    type: "scholarship",
    status: "researching",
    deadline_at: at(35, 23, 59),
    url: "https://daad.de",
    requirements: "Motivation letter, CV, 2 recommendation letters, transcript.",
    documents_required: ["Motivation letter", "CV", "Recommendation 1", "Recommendation 2", "Transcript"],
    documents_submitted: ["CV"],
  });
  add("applications", {
    name: "Google STEP Internship",
    organization: "Google",
    type: "internship",
    status: "applied",
    deadline_at: at(-12, 23, 59),
    url: "https://careers.google.com",
    documents_required: ["CV", "Transcript"],
    documents_submitted: ["CV", "Transcript"],
    result_date: day(18),
  });
  add("applications", {
    name: "MLH Fellowship",
    organization: "Major League Hacking",
    type: "fellowship",
    status: "interview",
    url: "https://fellowship.mlh.io",
    notes: "Technical interview next week — review PR walkthrough.",
  });
  add("applications", {
    name: "ITIDA Hackathon",
    organization: "ITIDA",
    type: "hackathon",
    status: "interested",
    deadline_at: at(12, 17, 0),
  });
  add("applications", {
    name: "Women Techmakers Scholars",
    organization: "Google",
    type: "program",
    status: "accepted",
    result: "Accepted 🎉",
    result_date: day(-20),
  });

  // Deadlines -------------------------------------------------------------------
  const compDeadline = add("deadlines", {
    id: uid(),
    title: "Submit Imagine Cup application",
    description: "Upload pitch video, deck and prototype link.",
    category: "Competition",
    due_at: at(1, 23, 59),
    priority: "urgent",
    status: "in_progress",
    application_id: compApp.id,
    project_id: burn.id,
  });
  const assignment = add("deadlines", {
    id: uid(),
    title: "Database assignment 2 — ER diagram",
    category: "University",
    due_at: at(0, 22, 0),
    priority: "high",
    status: "pending",
    course_id: db.id,
  });
  add("deadlines", {
    title: "ML problem set 3",
    category: "University",
    due_at: at(-1, 23, 59),
    priority: "high",
    status: "pending",
    course_id: ml.id,
  });
  add("deadlines", {
    title: "Project presentation — AI Burn Detection",
    category: "University",
    due_at: at(3, 10, 0),
    priority: "urgent",
    status: "pending",
    project_id: burn.id,
  });
  add("deadlines", {
    title: "Client deadline: Nile Café landing page",
    category: "Client",
    due_at: at(6, 18, 0),
    priority: "high",
    status: "pending",
    project_id: websity.id,
  });

  // Events --------------------------------------------------------------------
  const meeting = add("events", {
    id: uid(),
    title: "Team meeting — Burn Detection",
    kind: "meeting",
    start_at: at(0, 13, 0),
    duration_minutes: 60,
    location: "Library, 2nd floor",
    people: ["Ahmed", "Nada", "Youssef"],
    notes: "Split evaluation tasks; rehearse the demo.",
    project_id: burn.id,
  });
  add("events", {
    title: "Call with Nile Café",
    kind: "call",
    start_at: at(1, 18, 30),
    duration_minutes: 30,
    meeting_url: "https://meet.google.com",
    people: ["Karim (owner)"],
    project_id: websity.id,
  });
  add("events", {
    title: "MLH Fellowship interview",
    kind: "interview",
    start_at: at(4, 16, 0),
    duration_minutes: 45,
    meeting_url: "https://zoom.us",
  });
  add("events", {
    title: "Physics midterm",
    kind: "exam",
    start_at: at(9, 9, 0),
    duration_minutes: 120,
    location: "Exam Hall 1",
    course_id: physics.id,
  });
  add("events", {
    title: "GDG DevFest",
    kind: "conference",
    start_at: at(11, 10, 0),
    duration_minutes: 480,
    location: "Cairo ICT Center",
  });

  // Study sessions -------------------------------------------------------------------
  add("study_sessions", {
    subject: "Physics",
    topic: "Mechanics",
    subtopic: "Newton's Laws",
    date: day(0),
    start_time: "10:00",
    planned_minutes: 120,
    priority: "high",
    course_id: physics.id,
  });
  add("study_sessions", {
    subject: "Machine Learning",
    topic: "Gradient descent",
    date: day(0),
    start_time: "20:30",
    planned_minutes: 60,
    course_id: ml.id,
  });
  const history: [number, string, string, number][] = [
    [-1, "Physics", "Kinematics", 90],
    [-1, "Database Systems", "Normalization", 60],
    [-2, "Machine Learning", "Linear regression", 120],
    [-3, "Physics", "Vectors", 75],
    [-4, "Database Systems", "SQL joins", 90],
    [-5, "Machine Learning", "Probability review", 60],
    [-6, "Physics", "Units & dimensions", 45],
    [-8, "Technical Writing", "Report structure", 40],
    [-9, "Machine Learning", "NumPy practice", 90],
    [-11, "Database Systems", "ER modelling", 80],
    [-13, "Physics", "Problem set 1", 100],
  ];
  for (const [offset, subject, topic, mins] of history)
    add("study_sessions", {
      subject,
      topic,
      date: day(offset),
      start_time: "18:00",
      planned_minutes: mins,
      actual_minutes: Math.round(mins * (0.8 + ((mins * 7) % 5) / 10)),
      completed: true,
    });
  add("study_sessions", {
    subject: "Database Systems",
    topic: "Transactions",
    date: day(2),
    start_time: "19:00",
    planned_minutes: 90,
    course_id: db.id,
  });

  // Tasks -----------------------------------------------------------------------
  const t1 = add("tasks", {
    id: uid(),
    title: "Record Imagine Cup pitch video",
    priority: "urgent",
    due_date: day(0),
    due_time: "15:00",
    project_id: burn.id,
    category: "Competition",
    plan_date: day(0),
    plan_bucket: "must",
    plan_order: 0,
  });
  add("tasks", { title: "Write script (3 minutes)", parent_id: t1.id, status: "done", project_id: burn.id });
  add("tasks", { title: "Record & edit", parent_id: t1.id, project_id: burn.id });
  add("tasks", {
    title: "Work on Websity portfolio case study",
    priority: "high",
    due_date: day(0),
    due_time: "17:00",
    project_id: websity.id,
    category: "Websity",
    plan_date: day(0),
    plan_bucket: "should",
    plan_order: 0,
  });
  add("tasks", {
    title: "Email Professor Nour about project feedback",
    priority: "medium",
    due_date: day(0),
    category: "University",
    plan_date: day(0),
    plan_bucket: "must",
    plan_order: 1,
  });
  add("tasks", {
    title: "Finish ER diagram for DB assignment",
    priority: "high",
    due_date: day(0),
    due_time: "20:00",
    course_id: db.id,
    category: "University",
    plan_date: day(0),
    plan_bucket: "must",
    plan_order: 2,
  });
  add("tasks", {
    title: "Tidy desk & plan week",
    priority: "low",
    due_date: day(0),
    recurrence: "weekly",
    plan_date: day(0),
    plan_bucket: "could",
    plan_order: 0,
  });
  add("tasks", {
    title: "Update CV with latest projects",
    priority: "medium",
    due_date: day(-2),
    category: "Applications",
  });
  add("tasks", { title: "Evaluate model on test set", priority: "high", due_date: day(1), project_id: burn.id, status: "in_progress" });
  add("tasks", { title: "Prepare presentation slides", priority: "high", due_date: day(2), project_id: burn.id });
  add("tasks", { title: "Train model v1", project_id: burn.id, status: "done", completed_at: at(-3, 20) });
  add("tasks", { title: "Collect & label dataset v2", project_id: burn.id, status: "done", completed_at: at(-10, 20) });
  add("tasks", { title: "Design brand growth package tiers", priority: "medium", due_date: day(4), project_id: websity.id });
  add("tasks", { title: "Nile Café hero section", priority: "high", due_date: day(3), project_id: websity.id });
  add("tasks", { title: "Write 2 client testimonials", project_id: websity.id, status: "done", completed_at: at(-2, 14) });
  add("tasks", { title: "Pick a domain name", project_id: site.id, due_date: day(8) });
  add("tasks", { title: "Buy printer ink", priority: "low", due_date: day(2), category: "Personal" });
  add("tasks", { title: "Gym", priority: "medium", due_date: day(1), due_time: "07:00", recurrence: "weekdays", category: "Health" });
  add("tasks", { title: "Submitted ML quiz", status: "done", completed_at: at(-1, 11), due_date: day(-1), category: "University" });

  // Reminders --------------------------------------------------------------------
  const due = new Date(compDeadline.due_at).getTime();
  for (const m of [1440, 180, 60])
    if (due - m * 60000 > now.getTime())
      add("reminders", {
        title: compDeadline.title,
        remind_at: new Date(due - m * 60000).toISOString(),
        source_type: "deadline",
        source_id: compDeadline.id,
        offset_minutes: m,
      });
  const asgDue = new Date(assignment.due_at).getTime();
  if (asgDue - 120 * 60000 > now.getTime())
    add("reminders", {
      title: assignment.title,
      remind_at: new Date(asgDue - 120 * 60000).toISOString(),
      source_type: "deadline",
      source_id: assignment.id,
      offset_minutes: 120,
    });
  const meetingAt = new Date(meeting.start_at).getTime();
  if (meetingAt - 30 * 60000 > now.getTime())
    add("reminders", {
      title: meeting.title,
      remind_at: new Date(meetingAt - 30 * 60000).toISOString(),
      source_type: "event",
      source_id: meeting.id,
      offset_minutes: 30,
    });
  add("reminders", { title: "Call grandma", remind_at: at(0, 19, 0), repeat: "weekly" });
  add("reminders", { title: "Renew student ID", remind_at: at(5, 9, 0) });

  // Ideas ---------------------------------------------------------------------
  add("ideas", {
    title: "Brand growth package for Websity",
    description: "Bundle logo refresh + landing page + 30 days of social templates at a fixed price.",
    category: "Business",
    priority: "high",
    tags: ["websity", "pricing"],
    project_id: websity.id,
    status: "research",
    pinned: true,
  });
  add("ideas", {
    title: "Burn severity explainability heatmaps",
    description: "Grad-CAM overlays so doctors can see what the model is looking at.",
    category: "Research",
    tags: ["ml", "grad-project"],
    project_id: burn.id,
    status: "building",
  });
  add("ideas", {
    title: "Study group matcher",
    description: "Match students by course + availability + study style.",
    category: "Startup",
    tags: ["startup"],
    status: "interesting",
  });
  add("ideas", { title: "Newsletter about student side projects", category: "Content", tags: ["writing"], status: "brain_dump" });
  add("ideas", { title: "Notion-style template for university notes", category: "Product", tags: ["templates"], status: "brain_dump" });

  // Future --------------------------------------------------------------------
  add("future_items", { title: "Learn Rust fundamentals", category: "learn", horizon: "year" });
  add("future_items", { title: "Apply to a summer research program", category: "apply", horizon: "month", target_date: day(25) });
  add("future_items", { title: "Visit Japan", category: "travel", horizon: "someday" });
  add("future_items", { title: "Launch StudyMate MVP", category: "build", horizon: "year" });
  add("future_items", { title: "Get better at public speaking", category: "skill", horizon: "someday" });
  add("future_items", { title: "Attend a Google I/O Extended", category: "event", horizon: "month" });

  // Wishlist ------------------------------------------------------------------
  add("wishlist", {
    name: "Laptop stand",
    price: 850,
    currency: "EGP",
    priority: "medium",
    category: "Desk setup",
    status: "planning",
    url: "https://amazon.eg",
    image_url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80",
  });
  add("wishlist", {
    name: "Noise-cancelling headphones",
    price: 9500,
    currency: "EGP",
    priority: "high",
    category: "Tech",
    status: "saving",
    image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80",
  });
  add("wishlist", {
    name: "Designing Data-Intensive Applications",
    price: 1200,
    currency: "EGP",
    priority: "medium",
    category: "Books",
    status: "want",
    image_url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&q=80",
  });
  add("wishlist", { name: "Mechanical keyboard", price: 3200, currency: "EGP", priority: "low", category: "Tech", status: "want" });

  // Notes ---------------------------------------------------------------------
  add("notes", { content: "I need to email Professor X about the project", inbox: true });
  add("notes", { content: "Idea for Websity: create a brand growth package", inbox: true });
  add("notes", { content: "Buy laptop stand", inbox: true });
  add("notes", {
    title: "Presentation outline",
    content: "1. Problem — burn triage delays\n2. Dataset\n3. Model & results\n4. Demo\n5. Next steps",
    pinned: true,
    project_id: burn.id,
  });
  add("notes", {
    title: "Useful links",
    content: "Scholarship tracker spreadsheet, portfolio references, ML course notes.",
  });

  add("weekly_reviews", {
    week_start: toISODate(weekStart(now)),
    next_week_items: [
      { id: uid(), text: "Ship Imagine Cup submission", done: false },
      { id: uid(), text: "Start DAAD motivation letter", done: false },
    ],
  });

  add("notifications", { title: "Welcome to LifeOS", body: "Everything in your head, organised. Press Ctrl/⌘ K to get around.", kind: "system" });

  return out;
}
