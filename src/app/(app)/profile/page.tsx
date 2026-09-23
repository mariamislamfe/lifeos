"use client";

import { useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { useData } from "@/lib/store";
import { Button, Card, Field, Input } from "@/components/ui/primitives";
import { Page, PageHeader } from "@/components/ui/page";
import { toast } from "@/lib/toast";

export default function ProfilePage() {
  const { profile, email, mode, data, updateProfile, signOut } = useData();
  const [name, setName] = useState(profile?.full_name ?? "");
  const initials = (profile?.full_name ?? "M").trim().slice(0, 1).toUpperCase();

  const stats: [string, number][] = [
    ["Tasks completed", data.tasks.filter((t) => t.status === "done").length],
    ["Projects", data.projects.length],
    ["Applications", data.applications.length],
    ["Ideas", data.ideas.length],
    ["Study sessions", data.study_sessions.filter((s) => s.completed).length],
    ["Notes", data.notes.length],
  ];

  return (
    <Page className="max-w-3xl">
      <PageHeader title="Profile" />
      <Card className="mb-4 flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-accent/70 to-accent font-display text-4xl text-accent-fg shadow-card">{initials}</div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-3xl">{profile?.full_name || "You"}</div>
          <div className="text-sm text-muted">{email ?? (mode === "local" ? "Local demo — not signed in" : "")}</div>
        </div>
        {mode === "supabase" && (
          <Button onClick={signOut}>
            <LogOut /> Sign out
          </Button>
        )}
      </Card>

      <Card className="mb-4 p-5">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await updateProfile({ full_name: name.trim() || null });
            toast("Profile updated", { tone: "success" });
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <Field label="Display name" hint="Used in your greeting on the dashboard" className="flex-1">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mariam" />
          </Field>
          <Button type="submit" variant="primary">
            <UserRound /> Save
          </Button>
        </form>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map(([label, n]) => (
          <Card key={label} className="px-4 py-3.5">
            <div className="text-xs text-muted">{label}</div>
            <div className="tabular mt-1 text-2xl font-semibold tracking-tight">{n}</div>
          </Card>
        ))}
      </div>
    </Page>
  );
}
