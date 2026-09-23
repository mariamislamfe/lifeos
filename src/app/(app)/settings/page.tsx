"use client";

import { useEffect, useState } from "react";
import { BellRing, Check, Database, Download, Keyboard, Monitor, Moon, Palette, Sun, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { ACCENTS, setAccent, useTheme, type ThemePref } from "@/lib/theme";
import { WEEKDAYS } from "@/lib/meta";
import { weekStartsOn } from "@/lib/date";
import { toast } from "@/lib/toast";
import { TABLES } from "@/lib/types";
import { Button, Card, Kbd, Segmented, Select } from "@/components/ui/primitives";
import { Modal, ModalHeader } from "@/components/ui/overlay";
import { Page, PageHeader } from "@/components/ui/page";
import { notificationsSupported, requestNotificationPermission } from "@/components/shell/reminder-engine";

function Section({ icon, title, description, children }: { icon: React.ReactNode; title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted [&_svg]:h-4 [&_svg]:w-4">{icon}</div>
        <div>
          <div className="text-[14px] font-semibold">{title}</div>
          {description && <div className="text-xs text-muted">{description}</div>}
        </div>
      </div>
      {children}
    </Card>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-line py-3 first:border-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm">{label}</div>
        {hint && <div className="text-xs text-subtle">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { data, mode, profile, updateProfile, loadSampleData, clearAll } = useData();
  const { theme, setTheme } = useTheme();
  const [accent, setAccentState] = useState("iris");
  const [weekStart, setWeekStart] = useState(6);
  const [permission, setPermission] = useState("default");
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    setAccentState(document.documentElement.dataset.accent ?? "iris");
    setWeekStart(weekStartsOn());
    setPermission(notificationsSupported() ? Notification.permission : "unsupported");
  }, []);

  // Keep the accent synced across devices via the profile.
  useEffect(() => {
    if (profile?.accent && profile.accent !== document.documentElement.dataset.accent) {
      setAccent(profile.accent);
      setAccentState(profile.accent);
    }
  }, [profile?.accent]);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), ...Object.fromEntries(TABLES.map((t) => [t, data[t]])) }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifeos-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const total = TABLES.reduce((n, t) => n + data[t].length, 0);

  return (
    <Page className="max-w-3xl">
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-4">
        <Section icon={<Palette />} title="Appearance" description="Make it yours.">
          <Row label="Theme">
            <Segmented<ThemePref>
              size="sm"
              value={theme}
              onChange={setTheme}
              options={[
                { value: "light", label: <span className="flex items-center gap-1.5"><Sun className="h-3.5 w-3.5" /> Light</span> },
                { value: "dark", label: <span className="flex items-center gap-1.5"><Moon className="h-3.5 w-3.5" /> Dark</span> },
                { value: "system", label: <span className="flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" /> System</span> },
              ]}
            />
          </Row>
          <Row label="Accent colour">
            <div className="flex gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setAccent(a.id);
                    setAccentState(a.id);
                    updateProfile({ accent: a.id });
                  }}
                  title={a.label}
                  className={cn("grid h-7 w-7 place-items-center rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-110", accent === a.id && "ring-2 ring-fg/30")}
                  style={{ background: a.swatch }}
                >
                  {accent === a.id && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Week starts on" hint="Used by the calendar, timetable and weekly review">
            <Select
              value={weekStart}
              onChange={(e) => {
                const v = Number(e.target.value);
                setWeekStart(v);
                try {
                  localStorage.setItem("lifeos:weekStart", String(v));
                } catch {}
              }}
              className="w-40"
            >
              {[6, 0, 1].map((d) => (
                <option key={d} value={d}>
                  {WEEKDAYS[d]}
                </option>
              ))}
            </Select>
          </Row>
        </Section>

        <Section icon={<BellRing />} title="Notifications" description="Reminders appear in-app; browser notifications reach you while LifeOS is open in a background tab.">
          <Row label="Browser notifications" hint={permission === "denied" ? "Blocked — allow notifications for this site in your browser settings." : undefined}>
            {permission === "granted" ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-emerald-600 dark:text-emerald-400">Enabled</span>
                <Button size="sm" onClick={() => new Notification("LifeOS", { body: "Notifications are working ✨", icon: "/icon.svg" })}>
                  Send test
                </Button>
              </div>
            ) : permission === "default" ? (
              <Button size="sm" variant="primary" onClick={async () => setPermission(await requestNotificationPermission())}>
                Enable
              </Button>
            ) : (
              <span className="text-sm text-subtle capitalize">{permission}</span>
            )}
          </Row>
        </Section>

        <Section icon={<Database />} title="Data" description={mode === "supabase" ? "Stored in your Supabase database, private to your account." : "Demo mode — stored in this browser only. Connect Supabase to sync and back up."}>
          <Row label="Storage" hint={`${total} records`}>
            <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", mode === "supabase" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300")}>
              {mode === "supabase" ? "Supabase" : "Local demo"}
            </span>
          </Row>
          <Row label="Export" hint="Download everything as JSON">
            <Button size="sm" onClick={exportData}>
              <Download /> Export
            </Button>
          </Row>
          <Row label="Sample data" hint="Optional — adds example items to explore the app">
            <Button size="sm" onClick={loadSampleData}>
              <Upload /> Load sample data
            </Button>
          </Row>
          <Row label="Clear all data" hint="Permanently deletes every item in your account">
            <Button size="sm" variant="danger" onClick={() => setConfirm(true)}>
              <Trash2 /> Clear
            </Button>
          </Row>
        </Section>

        <Section icon={<Keyboard />} title="Keyboard shortcuts">
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {[
              [["Ctrl", "K"], "Command palette & search"],
              [["/"], "Search"],
              [["C"], "Quick capture"],
              [["Ctrl", "I"], "Quick capture (anywhere)"],
              [["N"], "New task"],
              [["Ctrl", "↵"], "Save the open form"],
              [["Esc"], "Close dialogs"],
            ].map(([keys, label]) => (
              <div key={label as string} className="flex items-center justify-between rounded-lg px-2 py-1.5">
                <span className="text-muted">{label as string}</span>
                <span className="flex gap-1">
                  {(keys as string[]).map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} size="sm">
        <ModalHeader title="Clear all data?" onClose={() => setConfirm(false)} icon={<Trash2 />} />
        <p className="px-5 pb-4 text-sm text-muted">This permanently deletes all {total} items — tasks, projects, applications, notes, everything. It can&apos;t be undone. Consider exporting first.</p>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-rose-600 text-white hover:bg-rose-700"
            onClick={async () => {
              setConfirm(false);
              await clearAll();
              toast("Everything cleared");
            }}
          >
            Delete everything
          </Button>
        </div>
      </Modal>
    </Page>
  );
}
