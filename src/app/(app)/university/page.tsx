"use client";

import { useMemo, useState } from "react";
import { addDays, format, startOfDay } from "date-fns";
import { BookOpen, ClipboardList, FileUp, Flag, GraduationCap, MapPin, Plus, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { friendlyDate, relativeLabel, timeToMinutes, toTimeString, weekStartsOn } from "@/lib/date";
import { COURSE_KIND_LABEL, WEEKDAYS, WEEKDAYS_SHORT, color as colorOf } from "@/lib/meta";
import type { Attachment, Course } from "@/lib/types";
import { Badge, Button, Card, SectionHeader, Segmented } from "@/components/ui/primitives";
import { Menu } from "@/components/ui/overlay";
import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { useEditor } from "@/components/editor/editor-provider";
import { FileList, FilePreview, UploadButton } from "@/components/items/files";

const PX_PER_MIN = 0.9;

export default function UniversityPage() {
  const { data } = useData();
  const now = useNow();
  const editor = useEditor();
  const [preview, setPreview] = useState<Attachment | null>(null);
  const [mobileDay, setMobileDay] = useState(String(now.getDay()));

  const firstDay = weekStartsOn();
  const order = Array.from({ length: 7 }, (_, i) => (firstDay + i) % 7);
  const activeDays = order.filter((d) => data.courses.some((c) => c.day_of_week === d));
  const days = activeDays.length ? activeDays : order.slice(0, 5);

  const bounds = useMemo(() => {
    if (!data.courses.length) return { start: 8 * 60, end: 16 * 60 };
    const start = Math.min(...data.courses.map((c) => timeToMinutes(c.start_time)));
    const end = Math.max(...data.courses.map((c) => timeToMinutes(c.end_time)));
    return { start: Math.floor(start / 60) * 60, end: Math.ceil(end / 60) * 60 };
  }, [data.courses]);
  const hours = Array.from({ length: (bounds.end - bounds.start) / 60 }, (_, i) => bounds.start / 60 + i);

  const courses = useMemo(() => {
    const map = new Map<string, Course[]>();
    for (const c of data.courses) {
      if (!map.has(c.name)) map.set(c.name, []);
      map.get(c.name)!.push(c);
    }
    return [...map.entries()];
  }, [data.courses]);

  const courseIds = new Set(data.courses.map((c) => c.id));
  const exams = data.events
    .filter((e) => e.kind === "exam" && new Date(e.start_at) >= startOfDay(now))
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
  const assignments = data.deadlines
    .filter((d) => d.status !== "done" && (d.category === "University" || (d.course_id && courseIds.has(d.course_id))))
    .sort((a, b) => a.due_at.localeCompare(b.due_at));
  const files = data.attachments.filter((a) => a.entity_type === "timetable");

  const nextClass = useMemo(() => {
    for (let i = 0; i < 8; i++) {
      const day = addDays(now, i);
      const list = data.courses
        .filter((c) => c.day_of_week === day.getDay())
        .map((c) => ({ c, start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), ...(c.start_time.split(":").map(Number) as [number, number])) }))
        .filter((x) => x.start > now)
        .sort((a, b) => a.start.getTime() - b.start.getTime());
      if (list[0]) return list[0];
    }
    return null;
  }, [data.courses, now]);

  const addMenu = (
    <Menu
      trigger={(p) => (
        <Button {...p} variant="primary" size="sm">
          <Plus /> Add
        </Button>
      )}
      items={[
        { label: "Lecture", icon: <GraduationCap />, onSelect: () => editor.open("course", { initial: { kind: "lecture" } }) },
        { label: "Section", icon: <GraduationCap />, onSelect: () => editor.open("course", { initial: { kind: "section" } }) },
        { label: "Lab", icon: <GraduationCap />, onSelect: () => editor.open("course", { initial: { kind: "lab" } }) },
        "divider",
        { label: "Exam", icon: <ClipboardList />, onSelect: () => editor.open("event", { initial: { kind: "exam" } }) },
        { label: "Assignment", icon: <Flag />, onSelect: () => editor.open("deadline", { initial: { category: "University" } }) },
        { label: "University project", icon: <Flag />, onSelect: () => editor.open("deadline", { initial: { category: "University", priority: "high" } }) },
        { label: "Study session", icon: <BookOpen />, onSelect: () => editor.open("study") },
      ]}
    />
  );

  return (
    <Page wide>
      <PageHeader
        title="University"
        description={nextClass ? `Next class: ${nextClass.c.name} · ${relativeLabel(nextClass.start, now)} at ${nextClass.c.start_time}` : "Your weekly timetable, exams and assignments"}
        actions={
          <>
            <UploadButton entityType="timetable" accept="application/pdf,image/*" label="Upload timetable" onUploaded={(a) => setPreview(a)} />
            {addMenu}
          </>
        }
      />

      {data.courses.length === 0 ? (
        <EmptyState
          icon={<GraduationCap />}
          title="Build your timetable"
          description="Add your lectures, sections and labs once — they'll appear on your calendar and dashboard every week. You can also upload your timetable PDF or screenshot and transcribe it side by side."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" onClick={() => editor.open("course")}>
                <Plus /> Add a class
              </Button>
              <UploadButton entityType="timetable" accept="application/pdf,image/*" label="Upload timetable" onUploaded={(a) => setPreview(a)} />
            </div>
          }
        />
      ) : (
        <>
          {/* Desktop weekly grid */}
          <Card className="mb-5 hidden overflow-hidden md:block">
            <div className="grid border-b border-line" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
              <div />
              {days.map((d) => (
                <div key={d} className={cn("border-l border-line py-2.5 text-center text-[12px] font-semibold", d === now.getDay() ? "text-accent" : "text-muted")}>
                  {WEEKDAYS[d]}
                </div>
              ))}
            </div>
            <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
              <div>
                {hours.map((h) => (
                  <div key={h} className="tabular pr-2 text-right text-[10.5px] text-subtle" style={{ height: 60 * PX_PER_MIN }}>
                    <span className="relative -top-1.5">{String(h).padStart(2, "0")}:00</span>
                  </div>
                ))}
              </div>
              {days.map((d) => (
                <div key={d} className={cn("relative border-l border-line", d === now.getDay() && "bg-accent/[0.03]")} style={{ height: hours.length * 60 * PX_PER_MIN }}>
                  {hours.map((h) => (
                    <div key={h} className="absolute inset-x-0 border-t border-line/60" style={{ top: (h * 60 - bounds.start) * PX_PER_MIN }} />
                  ))}
                  {data.courses
                    .filter((c) => c.day_of_week === d)
                    .map((c) => {
                      const top = (timeToMinutes(c.start_time) - bounds.start) * PX_PER_MIN;
                      const height = Math.max(28, (timeToMinutes(c.end_time) - timeToMinutes(c.start_time)) * PX_PER_MIN - 3);
                      const col = colorOf(c.color);
                      return (
                        <button
                          key={c.id}
                          onClick={() => editor.open("course", { id: c.id })}
                          className={cn("absolute inset-x-1.5 overflow-hidden rounded-xl border-l-[3px] bg-surface p-2 text-left shadow-soft transition-all hover:z-10 hover:-translate-y-px hover:shadow-card", col.border)}
                          style={{ top: top + 1, height }}
                        >
                          <div className={cn("absolute inset-0", col.soft)} />
                          <div className="relative">
                            <div className={cn("truncate text-[12.5px] leading-tight font-semibold", col.text)}>{c.name}</div>
                            <div className="tabular truncate text-[11px] text-muted">
                              {c.start_time}–{c.end_time} · {COURSE_KIND_LABEL[c.kind]}
                            </div>
                            {height > 60 && c.location && <div className="truncate text-[11px] text-subtle">{c.location}</div>}
                            {height > 76 && c.professor && <div className="truncate text-[11px] text-subtle">{c.professor}</div>}
                          </div>
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          </Card>

          {/* Mobile day list */}
          <div className="mb-5 md:hidden">
            <div className="no-scrollbar -mx-4 mb-3 overflow-x-auto px-4">
              <Segmented
                size="sm"
                value={mobileDay}
                onChange={setMobileDay}
                options={order.map((d) => ({ value: String(d), label: WEEKDAYS_SHORT[d] }))}
              />
            </div>
            <Card className="p-1.5">
              {data.courses
                .filter((c) => c.day_of_week === Number(mobileDay))
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map((c) => (
                  <button key={c.id} onClick={() => editor.open("course", { id: c.id })} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2">
                    <div className="tabular w-11 text-xs font-medium text-muted">{c.start_time}</div>
                    <div className={cn("w-[3px] self-stretch rounded-full", colorOf(c.color).bar)} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{c.name}</div>
                      <div className="truncate text-xs text-subtle">
                        {COURSE_KIND_LABEL[c.kind]} · {c.start_time}–{c.end_time}
                        {c.location ? ` · ${c.location}` : ""}
                      </div>
                    </div>
                  </button>
                ))}
              {!data.courses.some((c) => c.day_of_week === Number(mobileDay)) && <p className="px-3 py-4 text-sm text-subtle">No classes — free day.</p>}
            </Card>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <SectionHeader title="Courses" icon={<GraduationCap />} count={courses.length} action={<Button size="icon-sm" variant="ghost" onClick={() => editor.open("course")} aria-label="Add class"><Plus /></Button>} />
          <div className="px-2 pb-2">
            {courses.length === 0 && <p className="px-3 pb-3 text-sm text-subtle">No courses yet.</p>}
            {courses.map(([name, sessions]) => {
              const c = sessions[0];
              return (
                <button key={name} onClick={() => editor.open("course", { id: c.id })} className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-surface-2">
                  <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", colorOf(c.color).dot)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{name}</span>
                      {c.code && <span className="text-xs text-subtle">{c.code}</span>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-subtle">
                      {c.professor && (
                        <span className="flex items-center gap-1">
                          <UserRound className="h-3 w-3" /> {c.professor}
                        </span>
                      )}
                      {c.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {c.location}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {sessions
                        .slice()
                        .sort((a, b) => order.indexOf(a.day_of_week) - order.indexOf(b.day_of_week))
                        .map((s) => (
                          <Badge key={s.id}>
                            {WEEKDAYS_SHORT[s.day_of_week]} {s.start_time} · {COURSE_KIND_LABEL[s.kind]}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Exams" icon={<ClipboardList />} count={exams.length} action={<Button size="icon-sm" variant="ghost" onClick={() => editor.open("event", { initial: { kind: "exam" } })} aria-label="Add exam"><Plus /></Button>} />
          <div className="px-2 pb-2">
            {exams.length === 0 && <p className="px-3 pb-3 text-sm text-subtle">No upcoming exams.</p>}
            {exams.map((e) => {
              const at = new Date(e.start_at);
              return (
                <button key={e.id} onClick={() => editor.open("event", { id: e.id })} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-surface-2">
                  <div className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-rose-500/10 py-1 text-rose-600 dark:text-rose-400">
                    <span className="text-[9px] font-bold tracking-wider uppercase">{format(at, "MMM")}</span>
                    <span className="tabular text-base leading-none font-semibold">{format(at, "d")}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{e.title}</div>
                    <div className="text-xs text-subtle">
                      {relativeLabel(at, now)} · {toTimeString(at)}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Assignments & projects" icon={<Flag />} count={assignments.length} action={<Button size="icon-sm" variant="ghost" onClick={() => editor.open("deadline", { initial: { category: "University" } })} aria-label="Add assignment"><Plus /></Button>} />
          <div className="px-2 pb-2">
            {assignments.length === 0 && <p className="px-3 pb-3 text-sm text-subtle">Nothing due. Enjoy it.</p>}
            {assignments.map((d) => {
              const at = new Date(d.due_at);
              const overdue = at < now;
              return (
                <button key={d.id} onClick={() => editor.open("deadline", { id: d.id })} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-surface-2">
                  <Flag className={cn("h-4 w-4 shrink-0", overdue ? "text-rose-500" : "text-subtle")} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{d.title}</div>
                    <div className={cn("text-xs", overdue ? "text-rose-500" : "text-subtle")}>
                      {overdue ? "Overdue · " : ""}
                      {friendlyDate(at, now)} · {toTimeString(at)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <SectionHeader title="Timetable files" icon={<FileUp />} count={files.length} action={<UploadButton entityType="timetable" accept="application/pdf,image/*" label="Upload" variant="subtle" onUploaded={(a) => setPreview(a)} />} />
        <div className="px-2 pb-3">
          {files.length === 0 ? (
            <p className="px-3 pb-1 text-sm text-subtle">Upload a PDF, photo or screenshot of your official timetable. Open it here and add your classes side by side.</p>
          ) : (
            <FileList files={files} onOpen={setPreview} />
          )}
        </div>
      </Card>

      <FilePreview
        file={preview}
        open={!!preview}
        onClose={() => setPreview(null)}
        side={
          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium">Transcribe your timetable</div>
            <p className="text-xs leading-relaxed text-muted">
              Add each class once — pick several days to repeat it. Everything you add appears on your weekly grid, calendar and dashboard automatically.
            </p>
            <Button
              variant="primary"
              onClick={() => {
                setPreview(null);
                editor.open("course");
              }}
            >
              <Plus /> Add a class
            </Button>
            <div className="mt-2 flex flex-col gap-1">
              {data.courses
                .slice()
                .sort((a, b) => order.indexOf(a.day_of_week) - order.indexOf(b.day_of_week) || a.start_time.localeCompare(b.start_time))
                .map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-xs">
                    <span className={cn("h-1.5 w-1.5 rounded-full", colorOf(c.color).dot)} />
                    <span className="w-8 text-subtle">{WEEKDAYS_SHORT[c.day_of_week]}</span>
                    <span className="tabular text-subtle">{c.start_time}</span>
                    <span className="truncate">{c.name}</span>
                  </div>
                ))}
            </div>
          </div>
        }
      />
    </Page>
  );
}
