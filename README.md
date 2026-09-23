# LifeOS

A personal operating system: university, study, projects, applications, deadlines, reminders, ideas, plans and purchases in one place, organised around one question: **what do I need to know, do, remember or prepare for right now?**

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres, Auth, Storage) and Lucide icons.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

With no Supabase keys, LifeOS runs in **local demo mode**. Data is stored in this browser's `localStorage` and filled with sample data, so you can try everything straight away.

## Connect Supabase (real accounts and persistence)

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run [`supabase/migrations/0001_lifeos_schema.sql`](supabase/migrations/0001_lifeos_schema.sql). It creates the tables, row-level security (each user sees only their own rows), `updated_at` triggers, the profile-on-signup trigger and a private `attachments` storage bucket.
3. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. **Authentication → URL Configuration**: add `http://localhost:3000/auth/callback` (and your production URL + `/auth/callback`) to the redirect URLs.
5. Optional, for Google login: **Authentication → Providers → Google**. Enable it and paste an OAuth client ID and secret from Google Cloud. The authorised redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`.
6. Restart `npm run dev`. You'll be sent to `/login`. On first sign-in, your account is seeded with sample data. You can clear it or load it again from **Settings → Data**.

## What's inside

| Area | Where |
| --- | --- |
| Dashboard: Now → Today → Up next → Due soon → long-term | `src/app/(app)/page.tsx` |
| Today plan: Morning/Afternoon/Evening plus Must / Should / If I have time (drag to reorder) | `src/app/(app)/today` |
| Calendar: month / week / day / agenda, drag to reschedule | `src/app/(app)/calendar` |
| Tasks (list + board), Deadlines (urgency groups), Reminders | `src/app/(app)/{tasks,deadlines,reminders}` |
| University timetable plus PDF/image timetable upload | `src/app/(app)/university` |
| Study tracker with stats, streak and chart | `src/app/(app)/study` |
| Projects with Overview / Tasks / Timeline / Notes / Files / Milestones | `src/app/(app)/projects` |
| Applications pipeline (drag between statuses) | `src/app/(app)/applications` |
| Events, Ideas, Future, Wishlist, Notes (capture inbox), Weekly review | `src/app/(app)/*` |
| Unified agenda engine (used by everything time-based) | `src/lib/agenda.ts` |
| Data layer: Supabase repository + local demo fallback | `src/lib/db.ts`, `src/lib/store.tsx` |
| Create/edit forms with progressive disclosure | `src/components/editor` |
| Command palette, quick capture, notification centre, reminder engine | `src/components/shell` |

### Keyboard

`Ctrl/⌘ K` command palette and search · `/` search · `C` or `Ctrl/⌘ I` quick capture · `N` new task · `Ctrl/⌘ Enter` save form · `Esc` close.

### Reminders and notifications

Reminders can be attached to deadlines, tasks, events, applications and study sessions, using presets from 1 week to 30 minutes before, or a custom offset. They can also be standalone, with an optional repeat. While LifeOS is open in a tab, it fires due reminders as browser notifications (once you allow them) and in-app toasts, and logs them in the notification centre.

Getting notifications while the app is closed would need Web Push: a service worker plus a scheduled Supabase Edge Function that reads `reminders`. The schema already supports this.

### Timetable upload

Uploaded PDFs and images are stored privately in Supabase Storage. Open one and it appears next to the class form, so you can type in your classes (pick several days to repeat a class). Automatic OCR import isn't built yet; the upload and attachment model are ready for it.
