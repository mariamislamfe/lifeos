-- LifeOS schema
-- Every user-owned table carries user_id (defaulting to auth.uid()) and is protected by
-- row level security so each user only ever sees their own rows.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- users (profiles)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  accent      text not null default 'iris',
  seeded      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- projects & milestones
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  description text,
  status      text not null default 'active' check (status in ('idea','planned','active','paused','completed','archived')),
  priority    text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  start_date  date,
  deadline    date,
  progress    integer check (progress between 0 and 100), -- null = derive from tasks & milestones
  color       text not null default 'iris',
  notes       text,
  links       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.milestones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  title       text not null,
  description text,
  due_date    date,
  done        boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- university
-- ---------------------------------------------------------------------------
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  code        text,
  professor   text,
  location    text,
  kind        text not null default 'lecture' check (kind in ('lecture','section','lab','tutorial')),
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time  time not null,
  end_time    time not null,
  color       text not null default 'sky',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
create table if not exists public.applications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                text not null,
  organization        text,
  type                text not null default 'competition' check (type in ('competition','scholarship','internship','program','university','fellowship','hackathon','conference','other')),
  status              text not null default 'interested' check (status in ('interested','researching','preparing','applied','interview','accepted','rejected','waitlisted','withdrawn')),
  deadline_at         timestamptz,
  url                 text,
  requirements        text,
  documents_required  text[] not null default '{}',
  documents_submitted text[] not null default '{}',
  notes               text,
  result_date         date,
  result              text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tasks (project tasks are tasks with a project_id; subtasks use parent_id)
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null,
  description  text,
  notes        text,
  due_date     date,
  due_time     time,
  priority     text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status       text not null default 'todo' check (status in ('todo','in_progress','done')),
  category     text,
  project_id   uuid references public.projects (id) on delete cascade,
  course_id    uuid references public.courses (id) on delete set null,
  parent_id    uuid references public.tasks (id) on delete cascade,
  recurrence   text not null default 'none' check (recurrence in ('none','daily','weekdays','weekly','monthly')),
  plan_date    date,
  plan_bucket  text check (plan_bucket in ('must','should','could')),
  plan_order   integer not null default 0,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create or replace view public.project_tasks with (security_invoker = true) as
  select * from public.tasks where project_id is not null;

-- ---------------------------------------------------------------------------
-- deadlines
-- ---------------------------------------------------------------------------
create table if not exists public.deadlines (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title          text not null,
  description    text,
  category       text,
  due_at         timestamptz not null,
  priority       text not null default 'high' check (priority in ('low','medium','high','urgent')),
  status         text not null default 'pending' check (status in ('pending','in_progress','done')),
  project_id     uuid references public.projects (id) on delete set null,
  application_id uuid references public.applications (id) on delete set null,
  course_id      uuid references public.courses (id) on delete set null,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- events & meetings
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title            text not null,
  kind             text not null default 'meeting' check (kind in ('meeting','call','interview','university','exam','workshop','conference','personal')),
  start_at         timestamptz not null,
  duration_minutes integer not null default 60,
  all_day          boolean not null default false,
  location         text,
  meeting_url      text,
  people           text[] not null default '{}',
  notes            text,
  project_id       uuid references public.projects (id) on delete set null,
  course_id        uuid references public.courses (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- study
-- ---------------------------------------------------------------------------
create table if not exists public.study_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject         text not null,
  topic           text,
  subtopic        text,
  date            date not null,
  start_time      time,
  planned_minutes integer not null default 60,
  actual_minutes  integer,
  priority        text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  completed       boolean not null default false,
  course_id       uuid references public.courses (id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- reminders (optionally attached to any other record via source_type/source_id)
-- ---------------------------------------------------------------------------
create table if not exists public.reminders (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title          text not null,
  remind_at      timestamptz not null,
  repeat         text not null default 'none' check (repeat in ('none','daily','weekly','monthly')),
  source_type    text check (source_type in ('task','deadline','event','application','study_session','milestone')),
  source_id      uuid,
  offset_minutes integer,
  fired_at       timestamptz,
  done           boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ideas, future, wishlist, notes
-- ---------------------------------------------------------------------------
create table if not exists public.ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null,
  description text,
  category    text,
  priority    text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  tags        text[] not null default '{}',
  project_id  uuid references public.projects (id) on delete set null,
  status      text not null default 'brain_dump' check (status in ('brain_dump','interesting','research','building','archived')),
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.future_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null,
  description text,
  category    text not null default 'other' check (category in ('learn','travel','build','apply','buy','project','event','skill','other')),
  horizon     text not null default 'someday' check (horizon in ('month','year','someday')),
  target_date date,
  done        boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.wishlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  image_url   text,
  price       numeric(12,2),
  currency    text not null default 'EGP',
  url         text,
  priority    text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  category    text,
  target_date date,
  notes       text,
  status      text not null default 'want' check (status in ('want','planning','saving','bought')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text,
  content     text not null default '',
  inbox       boolean not null default false, -- true = quick capture waiting to be sorted
  pinned      boolean not null default false,
  tags        text[] not null default '{}',
  project_id  uuid references public.projects (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- notifications, attachments, weekly reviews
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null,
  body        text,
  kind        text not null default 'reminder',
  source_type text,
  source_id   uuid,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.attachments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entity_type text not null, -- 'project' | 'timetable' | ...
  entity_id   uuid,
  name        text not null,
  path        text not null,
  mime        text,
  size        bigint,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.weekly_reviews (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start      date not null,
  reflection      text,
  next_week_focus text,
  next_week_items jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ---------------------------------------------------------------------------
-- indexes, updated_at triggers and RLS for every user-owned table
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'projects','milestones','courses','applications','tasks','deadlines','events',
    'study_sessions','reminders','ideas','future_items','wishlist','notes',
    'notifications','attachments','weekly_reviews'
  ] loop
    execute format('create index if not exists %I on public.%I (user_id)', t || '_user_id_idx', t);
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end;
$$;

create index if not exists tasks_project_idx on public.tasks (project_id);
create index if not exists tasks_due_idx on public.tasks (user_id, due_date);
create index if not exists deadlines_due_idx on public.deadlines (user_id, due_at);
create index if not exists events_start_idx on public.events (user_id, start_at);
create index if not exists reminders_at_idx on public.reminders (user_id, remind_at) where not done;
create index if not exists milestones_project_idx on public.milestones (project_id);

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
alter table public.profiles enable row level security;
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- storage: private bucket for timetables & project files, one folder per user
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

drop policy if exists "own files read" on storage.objects;
create policy "own files read" on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own files write" on storage.objects;
create policy "own files write" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own files delete" on storage.objects;
create policy "own files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
