import { getSupabase } from "./supabase/client";
import { STORAGE_BUCKET, isSupabaseConfigured } from "./supabase/config";
import { normalizeRow, uid } from "./defaults";
import { TABLES, type Collections, type Profile, type TableMap, type TableName } from "./types";

/**
 * Persistence boundary. The Supabase implementation is the real backend; the local
 * implementation only exists so the UI can be explored before a project is connected.
 */
export interface Repository {
  mode: "supabase" | "local";
  getUser(): Promise<{ id: string; email: string | null } | null>;
  loadAll(): Promise<Collections>;
  getProfile(): Promise<Profile | null>;
  updateProfile(patch: Partial<Profile>): Promise<void>;
  insert<K extends TableName>(table: K, rows: TableMap[K][]): Promise<void>;
  update<K extends TableName>(table: K, id: string, patch: Partial<TableMap[K]>): Promise<void>;
  remove(table: TableName, id: string): Promise<void>;
  clearAll(): Promise<void>;
  upload(file: File, folder: string): Promise<{ path: string }>;
  fileUrl(path: string): Promise<string | null>;
  removeFile(path: string): Promise<void>;
  signOut(): Promise<void>;
}

function emptyCollections(): Collections {
  return Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as Collections;
}

/** Strip client-only fields so inserts never try to write columns the database owns. */
function toDbRow(row: object) {
  const { created_at: _c, updated_at: _u, user_id: _uid, ...rest } = row as Record<string, unknown>;
  void _c;
  void _u;
  void _uid;
  return rest;
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------
class SupabaseRepository implements Repository {
  mode = "supabase" as const;
  private get sb() {
    return getSupabase();
  }

  async getUser() {
    const { data } = await this.sb.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
  }

  async loadAll() {
    const out = emptyCollections();
    const results = await Promise.all(
      TABLES.map((t) => this.sb.from(t).select("*").order("created_at", { ascending: true })),
    );
    results.forEach((res, i) => {
      if (res.error) throw new Error(`${TABLES[i]}: ${res.error.message}`);
      (out as unknown as Record<string, unknown[]>)[TABLES[i]] = (res.data ?? []).map(normalizeRow);
    });
    return out;
  }

  async getProfile() {
    const user = await this.getUser();
    if (!user) return null;
    const { data } = await this.sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (data) return data as Profile;
    const fresh: Profile = { id: user.id, full_name: user.email?.split("@")[0] ?? null, accent: "iris", seeded: false };
    await this.sb.from("profiles").upsert(fresh);
    return fresh;
  }

  async updateProfile(patch: Partial<Profile>) {
    const user = await this.getUser();
    if (!user) return;
    const { error } = await this.sb.from("profiles").update(patch).eq("id", user.id);
    if (error) throw new Error(error.message);
  }

  async insert<K extends TableName>(table: K, rows: TableMap[K][]) {
    if (!rows.length) return;
    const { error } = await this.sb.from(table).insert(rows.map(toDbRow));
    if (error) throw new Error(error.message);
  }

  async update<K extends TableName>(table: K, id: string, patch: Partial<TableMap[K]>) {
    const { error } = await this.sb.from(table).update(toDbRow(patch)).eq("id", id);
    if (error) throw new Error(error.message);
  }

  async remove(table: TableName, id: string) {
    const { error } = await this.sb.from(table).delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async clearAll() {
    const user = await this.getUser();
    if (!user) return;
    // Children first so foreign keys never block a delete.
    for (const t of [...TABLES].reverse()) {
      const { error } = await this.sb.from(t).delete().eq("user_id", user.id);
      if (error) throw new Error(`${t}: ${error.message}`);
    }
  }

  async upload(file: File, folder: string) {
    const user = await this.getUser();
    if (!user) throw new Error("Not signed in");
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${user.id}/${folder}/${uid()}-${safe}`;
    const { error } = await this.sb.storage.from(STORAGE_BUCKET).upload(path, file, { contentType: file.type });
    if (error) throw new Error(error.message);
    return { path };
  }

  async fileUrl(path: string) {
    const { data } = await this.sb.storage.from(STORAGE_BUCKET).createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
  }

  async removeFile(path: string) {
    await this.sb.storage.from(STORAGE_BUCKET).remove([path]);
  }

  async signOut() {
    await this.sb.auth.signOut();
  }
}

// ---------------------------------------------------------------------------
// Local demo (localStorage)
// ---------------------------------------------------------------------------
const LS_PREFIX = "lifeos:v1:";

class LocalRepository implements Repository {
  mode = "local" as const;

  private read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }
  private write(key: string, value: unknown) {
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn("LifeOS: could not persist locally", e);
    }
  }
  private rows<K extends TableName>(table: K): TableMap[K][] {
    return this.read<TableMap[K][]>(table, []);
  }

  async getUser() {
    return { id: "local", email: null };
  }
  async loadAll() {
    const out = emptyCollections();
    for (const t of TABLES) (out as unknown as Record<string, unknown[]>)[t] = this.rows(t);
    return out;
  }
  async getProfile() {
    return this.read<Profile>("profile", { id: "local", full_name: "Mariam", accent: "iris", seeded: false });
  }
  async updateProfile(patch: Partial<Profile>) {
    this.write("profile", { ...(await this.getProfile()), ...patch });
  }
  async insert<K extends TableName>(table: K, rows: TableMap[K][]) {
    this.write(table, [...this.rows(table), ...rows]);
  }
  async update<K extends TableName>(table: K, id: string, patch: Partial<TableMap[K]>) {
    this.write(
      table,
      this.rows(table).map((r) => (r.id === id ? { ...r, ...patch, updated_at: new Date().toISOString() } : r)),
    );
  }
  async remove(table: TableName, id: string) {
    this.write(
      table,
      this.rows(table).filter((r) => r.id !== id),
    );
    // Mirror the database's cascading deletes.
    if (table === "projects") {
      this.write("milestones", this.rows("milestones").filter((m) => m.project_id !== id));
      this.write("tasks", this.rows("tasks").filter((t) => t.project_id !== id));
    }
    if (table === "tasks") this.write("tasks", this.rows("tasks").filter((t) => t.parent_id !== id));
  }
  async clearAll() {
    for (const t of TABLES) this.write(t, []);
  }
  async upload(file: File, folder: string) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const path = `local/${folder}/${uid()}`;
    this.write("file:" + path, dataUrl);
    return { path };
  }
  async fileUrl(path: string) {
    return this.read<string | null>("file:" + path, null);
  }
  async removeFile(path: string) {
    try {
      localStorage.removeItem(LS_PREFIX + "file:" + path);
    } catch {}
  }
  async signOut() {}
}

let repo: Repository | null = null;
export function getRepository(): Repository {
  if (!repo) repo = isSupabaseConfigured ? new SupabaseRepository() : new LocalRepository();
  return repo;
}
