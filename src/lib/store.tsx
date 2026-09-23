"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getRepository } from "./db";
import { buildRow } from "./defaults";
import { combineDateTime, toISODate } from "./date";
import { toast } from "./toast";
import { buildSampleData } from "./seed";
import {
  TABLES,
  type Collections,
  type Draft,
  type Profile,
  type SourceType,
  type TableMap,
  type TableName,
  type Task,
} from "./types";

interface DataContextValue {
  data: Collections;
  profile: Profile | null;
  mode: "supabase" | "local";
  email: string | null;
  loading: boolean;
  error: string | null;
  create<K extends TableName>(table: K, draft: Draft<K>): Promise<TableMap[K]>;
  createMany<K extends TableName>(table: K, drafts: Draft<K>[]): Promise<TableMap[K][]>;
  update<K extends TableName>(table: K, id: string, patch: Partial<TableMap[K]>): Promise<void>;
  remove(table: TableName, id: string, opts?: { undo?: boolean; label?: string }): Promise<void>;
  toggleTask(task: Task): Promise<void>;
  syncReminders(source: SourceType, sourceId: string, title: string, due: Date | null, offsets: number[]): Promise<void>;
  updateProfile(patch: Partial<Profile>): Promise<void>;
  loadSampleData(): Promise<void>;
  clearAll(): Promise<void>;
  reload(): Promise<void>;
  signOut(): Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

function empty(): Collections {
  return Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as Collections;
}

function isEmpty(c: Collections) {
  return TABLES.every((t) => c[t].length === 0);
}

// Insert order that satisfies foreign keys.
const INSERT_ORDER: TableName[] = [
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
  "weekly_reviews",
];

export function DataProvider({ children }: { children: React.ReactNode }) {
  const repo = getRepository();
  const [data, setDataState] = useState<Collections>(empty);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef<Collections>(data);

  // Keeps the ref in sync synchronously so chained optimistic updates see each other.
  const setData = useCallback((next: Collections | ((prev: Collections) => Collections)) => {
    const value = typeof next === "function" ? next(dataRef.current) : next;
    dataRef.current = value;
    setDataState(value);
  }, []);

  const insertAll = useCallback(
    async (sample: Partial<Collections>) => {
      for (const t of INSERT_ORDER) {
        const rows = (sample[t] ?? []) as TableMap[typeof t][];
        if (rows.length) await repo.insert(t, rows);
      }
    },
    [repo],
  );

  const load = useCallback(async () => {
    try {
      const [user, prof] = await Promise.all([repo.getUser(), repo.getProfile()]);
      setEmail(user?.email ?? null);
      let all = await repo.loadAll();
      // First run: populate realistic sample data so the dashboard feels alive.
      if (prof && !prof.seeded && isEmpty(all)) {
        const sample = buildSampleData(new Date());
        await insertAll(sample);
        await repo.updateProfile({ seeded: true });
        prof.seeded = true;
        all = await repo.loadAll();
      }
      setProfile(prof);
      setData(all);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [repo, insertAll, setData]);

  useEffect(() => {
    load();
  }, [load]);

  const patchLocal = useCallback(
    <K extends TableName>(table: K, fn: (rows: TableMap[K][]) => TableMap[K][]) => {
      setData((prev) => ({ ...prev, [table]: fn(prev[table] as TableMap[K][]) }));
    },
    [setData],
  );

  const fail = useCallback(
    (e: unknown, snapshot: Collections) => {
      setData(snapshot);
      toast("Couldn't save that change", { tone: "error", description: e instanceof Error ? e.message : String(e) });
    },
    [setData],
  );

  const createMany = useCallback(
    async <K extends TableName>(table: K, drafts: Draft<K>[]) => {
      const rows = drafts.map((d) => buildRow(table, d));
      const snapshot = dataRef.current;
      patchLocal(table, (prev) => [...prev, ...rows]);
      try {
        await repo.insert(table, rows);
      } catch (e) {
        fail(e, snapshot);
        throw e;
      }
      return rows;
    },
    [repo, patchLocal, fail],
  );

  const create = useCallback(
    async <K extends TableName>(table: K, draft: Draft<K>) => (await createMany(table, [draft]))[0],
    [createMany],
  );

  const update = useCallback(
    async <K extends TableName>(table: K, id: string, patch: Partial<TableMap[K]>) => {
      const snapshot = dataRef.current;
      patchLocal(table, (prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch, updated_at: new Date().toISOString() } : r)),
      );
      try {
        await repo.update(table, id, patch);
      } catch (e) {
        fail(e, snapshot);
      }
    },
    [repo, patchLocal, fail],
  );

  const removeRaw = useCallback(
    async (table: TableName, id: string) => {
      const snapshot = dataRef.current;
      setData((prev) => {
        const next = { ...prev, [table]: (prev[table] as { id: string }[]).filter((r) => r.id !== id) } as Collections;
        // Mirror cascades locally so the UI never shows orphans.
        if (table === "projects") {
          next.milestones = prev.milestones.filter((m) => m.project_id !== id);
          next.tasks = prev.tasks.filter((t) => t.project_id !== id);
        }
        if (table === "tasks") next.tasks = next.tasks.filter((t) => t.parent_id !== id);
        next.reminders = next.reminders.filter((r) => r.source_id !== id);
        return next;
      });
      try {
        await repo.remove(table, id);
        const linked = snapshot.reminders.filter((r) => r.source_id === id);
        await Promise.all(linked.map((r) => repo.remove("reminders", r.id)));
      } catch (e) {
        fail(e, snapshot);
      }
      return snapshot;
    },
    [repo, fail, setData],
  );

  const remove = useCallback(
    async (table: TableName, id: string, opts: { undo?: boolean; label?: string } = {}) => {
      const snapshot = await removeRaw(table, id);
      if (opts.undo === false) return;
      const row = (snapshot[table] as { id: string }[]).find((r) => r.id === id);
      const linked = snapshot.reminders.filter((r) => r.source_id === id);
      const children =
        table === "projects"
          ? { milestones: snapshot.milestones.filter((m) => m.project_id === id), tasks: snapshot.tasks.filter((t) => t.project_id === id) }
          : table === "tasks"
            ? { tasks: snapshot.tasks.filter((t) => t.parent_id === id) }
            : {};
      if (!row) return;
      toast(`${opts.label ?? "Item"} deleted`, {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await repo.insert(table, [row] as never);
              if (children.milestones?.length) await repo.insert("milestones", children.milestones);
              if (children.tasks?.length) await repo.insert("tasks", children.tasks);
              if (linked.length) await repo.insert("reminders", linked);
              setData((prev) => {
                const next = { ...prev } as unknown as Record<string, unknown[]>;
                next[table] = [...next[table], row];
                if (children.milestones) next.milestones = [...next.milestones, ...children.milestones];
                if (children.tasks) next.tasks = [...next.tasks, ...children.tasks];
                next.reminders = [...next.reminders, ...linked];
                return next as unknown as Collections;
              });
            } catch (e) {
              toast("Couldn't restore", { tone: "error", description: String(e) });
            }
          },
        },
      });
    },
    [removeRaw, repo, setData],
  );

  const toggleTask = useCallback(
    async (task: Task) => {
      const done = task.status !== "done";
      await update("tasks", task.id, { status: done ? "done" : "todo", completed_at: done ? new Date().toISOString() : null });
      // Recurring tasks roll forward to their next occurrence when completed.
      if (done && task.recurrence !== "none" && task.due_date) {
        const d = combineDateTime(task.due_date);
        do {
          if (task.recurrence === "daily") d.setDate(d.getDate() + 1);
          else if (task.recurrence === "weekly") d.setDate(d.getDate() + 7);
          else if (task.recurrence === "monthly") d.setMonth(d.getMonth() + 1);
          else if (task.recurrence === "weekdays") d.setDate(d.getDate() + 1);
        } while (task.recurrence === "weekdays" && (d.getDay() === 5 || d.getDay() === 6));
        const exists = dataRef.current.tasks.some(
          (t) => t.title === task.title && t.due_date === toISODate(d) && t.status !== "done",
        );
        if (!exists) {
          await create("tasks", {
            ...task,
            id: undefined,
            status: "todo",
            completed_at: null,
            due_date: toISODate(d),
            plan_date: null,
            plan_bucket: null,
          });
          toast("Next occurrence scheduled", { description: `${task.title} · ${toISODate(d)}` });
        }
      }
    },
    [update, create],
  );

  const syncReminders = useCallback(
    async (source: SourceType, sourceId: string, title: string, due: Date | null, offsets: number[]) => {
      const existing = dataRef.current.reminders.filter(
        (r) => r.source_id === sourceId && r.offset_minutes !== null && !r.fired_at,
      );
      const now = Date.now();
      const wanted = due ? offsets.filter((m) => due.getTime() - m * 60000 > now) : [];
      const keep = existing.filter(
        (r) => wanted.includes(r.offset_minutes!) && due && new Date(r.remind_at).getTime() === due.getTime() - r.offset_minutes! * 60000,
      );
      const drop = existing.filter((r) => !keep.includes(r));
      for (const r of drop) await removeRaw("reminders", r.id);
      for (const r of keep) if (r.title !== title) await update("reminders", r.id, { title });
      const toAdd = wanted.filter((m) => !keep.some((r) => r.offset_minutes === m));
      if (toAdd.length && due)
        await createMany(
          "reminders",
          toAdd.map((m) => ({
            title,
            remind_at: new Date(due.getTime() - m * 60000).toISOString(),
            source_type: source,
            source_id: sourceId,
            offset_minutes: m,
          })),
        );
    },
    [removeRaw, update, createMany],
  );

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      setProfile((p) => (p ? { ...p, ...patch } : p));
      try {
        await repo.updateProfile(patch);
      } catch (e) {
        toast("Couldn't update profile", { tone: "error", description: String(e) });
      }
    },
    [repo],
  );

  const loadSampleData = useCallback(async () => {
    try {
      await insertAll(buildSampleData(new Date()));
      await repo.updateProfile({ seeded: true });
      setData(await repo.loadAll());
      toast("Sample data loaded", { tone: "success" });
    } catch (e) {
      toast("Couldn't load sample data", { tone: "error", description: String(e) });
    }
  }, [insertAll, repo, setData]);

  const clearAll = useCallback(async () => {
    try {
      await repo.clearAll();
      await repo.updateProfile({ seeded: true });
      setData(empty());
      toast("All data cleared");
    } catch (e) {
      toast("Couldn't clear data", { tone: "error", description: String(e) });
    }
  }, [repo, setData]);

  const signOut = useCallback(async () => {
    await repo.signOut();
    window.location.href = repo.mode === "supabase" ? "/login" : "/";
  }, [repo]);

  const value = useMemo<DataContextValue>(
    () => ({
      data,
      profile,
      mode: repo.mode,
      email,
      loading,
      error,
      create,
      createMany,
      update,
      remove,
      toggleTask,
      syncReminders,
      updateProfile,
      loadSampleData,
      clearAll,
      reload: load,
      signOut,
    }),
    [data, profile, repo.mode, email, loading, error, create, createMany, update, remove, toggleTask, syncReminders, updateProfile, loadSampleData, clearAll, load, signOut],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
