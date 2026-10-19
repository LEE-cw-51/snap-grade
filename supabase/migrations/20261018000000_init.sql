-- snap-grade MVP schema + RLS

create extension if not exists "pgcrypto";

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  class_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.worksheets (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  section_label text not null default '',
  grade_level text,
  form_rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.answer_items (
  id uuid primary key default gen_random_uuid(),
  worksheet_id uuid not null references public.worksheets(id) on delete cascade,
  number text not null,
  answer_latex text not null,
  answer_type text not null default 'expression',
  item_form_rules jsonb,
  key_error_flag boolean not null default false,
  unique (worksheet_id, number)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  worksheet_id uuid not null references public.worksheets(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  photo_path text,
  status text not null default 'uploaded'
    check (status in ('uploaded','grading','done','needs_review','failed')),
  photo_delete_at timestamptz,
  photo_delete_warned_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.item_results (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  number text not null,
  student_answer_latex text,
  student_answer_raw text,
  read_confidence double precision,
  ai_estimate_latex text,
  computed_answer_latex text,
  auto_verdict text not null check (auto_verdict in ('O','TRI','X','CHECK')),
  reason_code text,
  final_verdict text check (final_verdict is null or final_verdict in ('O','TRI','X')),
  resolved_at timestamptz,
  unique (submission_id, number)
);

create table if not exists public.grading_jobs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued','running','done','failed')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists students_teacher_idx on public.students(teacher_id);
create index if not exists worksheets_teacher_idx on public.worksheets(teacher_id);
create index if not exists submissions_teacher_idx on public.submissions(teacher_id);
create index if not exists submissions_worksheet_idx on public.submissions(worksheet_id);
create index if not exists grading_jobs_submission_idx on public.grading_jobs(submission_id);

alter table public.students enable row level security;
alter table public.worksheets enable row level security;
alter table public.answer_items enable row level security;
alter table public.submissions enable row level security;
alter table public.item_results enable row level security;
alter table public.grading_jobs enable row level security;

create policy students_own on public.students
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy worksheets_own on public.worksheets
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy answer_items_own on public.answer_items
  for all using (
    exists (
      select 1 from public.worksheets w
      where w.id = worksheet_id and w.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.worksheets w
      where w.id = worksheet_id and w.teacher_id = auth.uid()
    )
  );

create policy submissions_own on public.submissions
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy item_results_own on public.item_results
  for all using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.teacher_id = auth.uid()
    )
  );

create policy grading_jobs_own on public.grading_jobs
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- private buckets (create via dashboard or storage API)
insert into storage.buckets (id, name, public)
values ('answer-keys', 'answer-keys', false),
       ('homework-photos', 'homework-photos', false)
on conflict (id) do nothing;
