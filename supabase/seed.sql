-- Local demo teacher + two students (service role / seed).
-- DEMO_TEACHER_ID defaults to 00000000-0000-4000-8000-000000000001

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'demo@localhost',
  crypt('demo-password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Demo Teacher"}'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  jsonb_build_object('sub', '00000000-0000-4000-8000-000000000001', 'email', 'demo@localhost'),
  'email',
  '00000000-0000-4000-8000-000000000001',
  now(),
  now(),
  now()
)
on conflict do nothing;

insert into public.students (id, teacher_id, name, class_name)
values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-000000000001', '김민수', '초4-A'),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-4000-8000-000000000001', '이서연', '초4-A')
on conflict (id) do nothing;
