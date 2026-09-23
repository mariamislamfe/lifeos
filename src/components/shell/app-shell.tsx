"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { DataProvider, useData } from "@/lib/store";
import { Toaster } from "@/components/ui/overlay";
import { Button } from "@/components/ui/primitives";
import { EditorProvider } from "@/components/editor/editor-provider";
import { ShellProvider } from "./shell-context";
import { Sidebar } from "./sidebar";
import { MobileNav, TopBar } from "./mobile-nav";
import { CommandPalette } from "./command-palette";
import { QuickCapture } from "./quick-capture";
import { NotificationCenter } from "./notification-center";
import { ReminderEngine } from "./reminder-engine";
import { Logo } from "./sidebar";
import { useEffect } from "react";
import { setAccent } from "@/lib/theme";

/** Applies the accent saved on the profile, so it follows the user across devices. */
function AccentSync() {
  const { profile } = useData();
  useEffect(() => {
    if (profile?.accent && profile.accent !== document.documentElement.dataset.accent) setAccent(profile.accent);
  }, [profile?.accent]);
  return null;
}

function Gate({ children }: { children: React.ReactNode }) {
  const { loading, error, reload, mode } = useData();
  if (loading)
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-pulse">
            <Logo />
          </div>
          <div className="h-0.5 w-28 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full w-1/3 animate-[fade-in_0.8s_ease-in-out_infinite_alternate] rounded-full bg-accent" />
          </div>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/10 text-rose-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="font-display text-2xl">Couldn&apos;t load your data</div>
          <p className="text-sm text-muted">{error}</p>
          {mode === "supabase" && (
            <p className="text-xs text-subtle">
              If this is a fresh Supabase project, run <code className="rounded bg-surface-2 px-1">supabase/migrations/0001_lifeos_schema.sql</code> in the SQL editor first.
            </p>
          )}
          <Button variant="primary" onClick={reload} className="mt-2">
            <RefreshCw /> Try again
          </Button>
        </div>
      </div>
    );
  return <>{children}</>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <EditorProvider>
        <ShellProvider>
          <Sidebar />
          <div className="min-h-dvh lg:pl-[248px]">
            <TopBar />
            <main className="overflow-x-clip">
              <Gate>{children}</Gate>
            </main>
          </div>
          <MobileNav />
          <CommandPalette />
          <QuickCapture />
          <NotificationCenter />
          <ReminderEngine />
          <AccentSync />
          <Toaster />
        </ShellProvider>
      </EditorProvider>
    </DataProvider>
  );
}
