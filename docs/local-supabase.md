# 로컬 Supabase (클라우드 키 없음)

`DATA_PROVIDER=supabase`로 persistence만 검증한다. Vision은 계속 `mock`.

## 필요 조건

- Docker Desktop / Docker Engine
- Node 22+, `npx supabase`

이 환경에 Docker가 없으면 어댑터 코드·문서만 두고, 런타임은 `memory` 기본값을 쓴다.

## 시작

```bash
npx supabase start
npx supabase db reset   # migrations + seed.sql
npx supabase status -o env
```

`.env.local` 예:

```bash
DATA_PROVIDER=supabase
VISION_PROVIDER=mock
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<status anon key>
SUPABASE_SERVICE_ROLE_KEY=<status service_role key>
DEMO_TEACHER_ID=00000000-0000-4000-8000-000000000001
```

```bash
npm run dev
```

시드 계정: `demo@localhost` / `demo-password` (로컬 전용).  
학생 김민수·이서연이 `seed.sql`로 들어간다.

## 스모크

```bash
# memory 기본 E2E는 그대로
npm run test:e2e

# supabase 연결만 확인 (URL/키 있을 때)
npm run test:supabase-smoke
```

## 주의

- Preview/CI 기본은 `memory` + `mock`
- 클라우드 Supabase Free/Pro 프로젝트는 **이 PR 범위 밖** (키·계정 세팅 단계)
- Storage 버킷 `homework-photos`는 init migration에서 생성
