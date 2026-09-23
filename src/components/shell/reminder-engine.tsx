"use client";

import { useEffect, useRef } from "react";
import { useData } from "@/lib/store";
import { toast } from "@/lib/toast";
import { nextRepeat, offsetLabel } from "@/lib/reminders";

const CHECK_EVERY = 15_000;
const STALE_AFTER = 12 * 3600_000; // older misses are logged quietly instead of popping up

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return "unsupported" as const;
  if (Notification.permission === "default") return Notification.requestPermission();
  return Notification.permission;
}

/**
 * Runs in the background while the app is open: fires due reminders as browser
 * notifications + in-app toasts, logs them to the notification center, and rolls
 * repeating reminders forward.
 */
export function ReminderEngine() {
  const { data, loading, update, create } = useData();
  const handled = useRef(new Set<string>());
  const latest = useRef({ data, update, create });
  useEffect(() => {
    latest.current = { data, update, create };
  });

  useEffect(() => {
    if (loading) return;
    const tick = () => {
      const { data, update, create } = latest.current;
      const now = Date.now();
      for (const r of data.reminders) {
        if (r.done || r.fired_at) continue;
        const at = new Date(r.remind_at).getTime();
        if (at > now) continue;
        const token = `${r.id}:${r.remind_at}`;
        if (handled.current.has(token)) continue;
        handled.current.add(token);

        const stale = now - at > STALE_AFTER;
        const body = r.offset_minutes ? `${offsetLabel(r.offset_minutes)} the due time` : "Reminder";
        if (!stale) {
          toast(r.title, { description: body });
          if (notificationsSupported() && Notification.permission === "granted") {
            try {
              const n = new Notification(r.title, { body, icon: "/icon.svg", tag: r.id });
              n.onclick = () => {
                window.focus();
                n.close();
              };
            } catch {
              // Some mobile browsers only allow notifications from a service worker.
            }
          }
        }
        create("notifications", {
          title: r.title,
          body: stale ? "Missed reminder" : body,
          kind: "reminder",
          source_type: r.source_type,
          source_id: r.source_id,
        }).catch(() => {});

        if (r.repeat !== "none") {
          let next = nextRepeat(new Date(r.remind_at), r.repeat);
          while (next.getTime() <= now) next = nextRepeat(next, r.repeat);
          update("reminders", r.id, { remind_at: next.toISOString(), fired_at: null });
        } else {
          update("reminders", r.id, { fired_at: new Date().toISOString() });
        }
      }
    };
    tick();
    const id = setInterval(tick, CHECK_EVERY);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loading]);

  return null;
}
