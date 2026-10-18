# 비용·운영 가이드 (1인 강사 MVP)

> 작성일: 2026-10-18  
> 대상: 공부방·교습소 1인 강사 기준 MVP 운영  
> 요금은 변동되므로, 계약 전 [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing) / [Supabase](https://supabase.com/pricing) / [Vercel](https://vercel.com/pricing) / [Mathpix](https://mathpix.com/pricing/api) 공식 페이지를 재확인할 것.

---

## 1. 한 줄 결론

| 구분 | MVP에서 쓸 것 | 이유 |
|---|---|---|
| 호스팅 | **Vercel Hobby**로 시작 → 상용·긴 채점 필요 시 **Pro ($20/월)** | Hobby는 non-commercial 제한·함수 300초 상한 |
| DB·Auth·Storage | **Supabase Free**로 개발·파일럿 → 실운영 전 **Pro ($25/월)** | Free는 1주 미사용 시 pause, 백업·운영 안정성 부족 |
| 비전 AI | **Claude Sonnet** (환경변수로 모델명) | 손글씨+레이아웃에 필요. 비용의 대부분 |
| 판정 엔진 | **SymPy on Vercel Python Function** | 추가 SaaS 요금 없음 |
| 2차 OCR | **Mathpix는 게이트 미달 전까지 가입하지 않음** | 셋업비+$0.002/장. 필요할 때만 |
| 잡 큐 | **없음** (`grading_jobs` + `after()` + 폴링) | Inngest 등 월정액 절약 |
| 알림 | MVP 제외 | 알림톡·푸시는 단가·검수 비용 큼 |

**실운영 최소 고정비 대략:** Supabase Pro $25 + (상용이면) Vercel Pro $20 ≈ **$45/월** + Claude 사용량.

---

## 2. 비용이 나는 곳 (중요도 순)

### 2.1 Claude Vision API — **최대 비용 드라이버**

채점·정답지 추출마다 이미지+프롬프트+JSON 출력이 토큰으로 과금된다.

| 항목 | 현실적 선택 |
|---|---|
| 모델 | **Sonnet** 계열을 기본 (`CLAUDE_VISION_MODEL`). Opus는 정확도 게이트에서 Sonnet이 부족할 때만 |
| 이미지 | 업로드 전 **긴 변 1568px 이하로 리사이즈·JPEG 압축** (토큰·전송 절감, 품질은 초중등 손글씨에 충분) |
| 호출 횟수 | 학습지 1페이지 = 비전 1회. PDF는 페이지당 1회 |
| 재시도 | 실패 시 **1회만**. 동일 사진 무한 재호출 금지 |
| 한도 | `DAILY_GRADE_LIMIT` (예: 80장/일), `MAX_PAGES_PER_SUBMISSION` (예: 2) |

**월 사용량 감(대략, Sonnet 기준·변동 큼):**

가정: 숙제 사진 1장 ≈ 이미지 토큰 ~1.5k + 프롬프트·출력 ~3–6k → **대략 $0.01–0.04/장** 수준으로 잡고 시작 (모델·해상도·문항 수에 따라 달라짐).

| 시나리오 | 월 채점 장수 | Claude 대략 |
|---|---|---|
| 파일럿 (학생 10명 × 주 3회) | ~120장 | **수 달러** |
| 소규모 공부방 (20명 × 주 5회) | ~400장 | **$10–20대** |
| 바쁜 달 (40명 × 매일) | ~800–1200장 | **$20–50대** |

정답지 등록은 월 수십 회 수준이라 상대적으로 작다.  
**반드시:** Anthropic 콘솔에 **월 사용 한도(spend limit)** 설정.

### 2.2 Supabase (DB + Auth + Storage)

| 플랜 | 월비용 | MVP 권장 |
|---|---|---|
| Free | $0 | 개발·데모만. **1주 idle pause**, DB 500MB, Storage 1GB, egress 5GB |
| Pro | **$25** (+ Micro compute 크레딧 $10 포함 구조) | **실운영 기본**. 미사용 pause 없음, 일일 백업 7일, Storage 100GB·egress 250GB 포함 |

**운영상 포인트**

- Auth MAU: 강사 1명이면 사실상 무시 가능.
- Storage: 숙제 사진은 **7일 또는 `?` 해소 시 삭제** → Free 1GB로도 파일럿 가능하나, pause·백업 때문에 실운영은 Pro.
- Egress: 서명 URL로 사진을 자주 열면 증가. 확인 화면에서 **썸네일/원본 분리**, 불필요 재다운로드 줄이기.
- Image Transformation 유료 옵션은 **쓰지 않음** (클라이언트 리사이즈로 충분).
- Cron(사진 삭제): Supabase **Scheduled Functions / pg_cron** — Pro에서 안정적으로 돌릴 것.

### 2.3 Vercel (호스팅 + Functions)

| 플랜 | 월비용 | MVP 권장 |
|---|---|---|
| Hobby | $0 | 개인 실험. **commercial use 제한**, 함수 max **300초**, 사용량 한도 |
| Pro | **$20** (+ usage credit) | 강사에게 실제로 팔거나 매일 쓰는 순간부터. `maxDuration` 연장(기본 300s, 설정 시 최대 800s / 일부 런타임 beta 1800s), Spend Management |

**운영상 포인트**

- 채점 job은 Vision 대기 포함해 **수십 초~수 분**. Hobby 300초로도 1장 처리는 보통 가능하나, 여유·상용·로그를 위해 실운영은 Pro.
- Fluid Compute: I/O 대기(Vision API)는 Active CPU가 거의 안 나가 상대적으로 유리.
- SymPy Python Function은 호출당 짧음(수 ms~수백 ms) → 비용 미미.
- **Spend Management**로 월 상한 알림/차단 설정.
- 커스텀 도메인은 나중에; 초기엔 `*.vercel.app`로 충분.

### 2.4 Mathpix (옵션 — 지금은 가입하지 않음)

| 항목 | 비용 |
|---|---|
| API 키 활성화 | 일회 **$19.99** + 테스트 크레딧 $29 |
| 이미지 OCR | **$0.002/장** (월 1M장 이하) |

Claude만으로 `?` 비율·오판 게이트를 통과하면 **영구히 불필요**.  
게이트 미달 시에만 “낮은 confidence / 근호·지수 문항”에 2차로 붙인다. 전 장면에 이중 호출하지 말 것.

### 2.5 쓰지 않을 것 (MVP에서 비용·복잡도만 늘어남)

- Inngest / Trigger.dev / 별도 Redis 큐
- Vercel Blob (Storage는 Supabase로 통일)
- 카카오 알림톡 / FCM 푸시
- Sentry 유료 플랜 (초기엔 Vercel·Supabase 로그로 충분; 에러 폭주 시 무료 티어만)
- CDN 이미지 최적화 유료 옵션
- 별도 FastAPI 서버(Render/Fly) — 트래픽이 폭증하기 전에는 Vercel Python으로 유지

---

## 3. 시나리오별 월 예산 (대략)

숫자는 **고정비 + Claude 감**이다. 환율·요금 변경에 열려 있음.

| 단계 | Vercel | Supabase | Claude | 합계 감 |
|---|---|---|---|---|
| 개발만 (본인) | Hobby $0 | Free $0 | 테스트 수 $ | **~$0–10** |
| 파일럿 (실제 학생 소수) | Hobby 또는 Pro | Free→버리면 Pro | ~$5–15 | **~$30–60** (Pro 둘 다 켜면) |
| 실운영 권장 | Pro $20 | Pro $25 | ~$10–40 | **~$55–85** |
| Mathpix 추가 시 | 위 + | 위 + | 위 + | **+$20 셋업 + 장당 $0.002** |

1인 공부방 기준, **월 10만 원 안팎**이면 고정+AI를 감당할 수 있는 설계를 목표로 한다. Claude가 예상보다 나오면 일일 한도·해상도·Sonnet 유지를 먼저 조인다.

---

## 4. 운영에 필요한 것들 (비용 외)

### 4.1 계정·비밀값

| 항목 | 비고 |
|---|---|
| Anthropic API 키 | 서버 전용. 클라이언트 노출 금지. 월 spend limit |
| Supabase URL / anon / **service role** | service role은 서버(채점 job·삭제 cron)만 |
| Vercel 환경변수 | Production / Preview 분리. Preview에는 실키 최소화 |
| `CLAUDE_VISION_MODEL`, `READ_CONFIDENCE_THRESHOLD` | 게이트 튜닝용 |
| `DAILY_GRADE_LIMIT`, `MAX_PAGES_PER_SUBMISSION` | 비용 가드 |

### 4.2 반드시 돌릴 스케줄·가드

1. **사진 삭제 cron (매일)** — `photo_delete_at` 지난 제출물 Storage 삭제 + path null  
2. **삭제 24시간 전 경고 플래그** — UI 배지 (`photo_delete_warned_at`)  
3. **일일 채점 한도** — 초과 시 업로드 거부 + “내일 다시” 문구  
4. **Anthropic / Vercel spend cap** — 콘솔에서 설정 (앱 코드와 별개)  
5. **실패 job 정리** — `failed` 48시간 후 사진도 삭제 대상에 포함할지 정책 고정 (권장: 포함, 재촬영 유도)

### 4.3 모니터링 (최소)

| 볼 것 | 어디서 |
|---|---|
| 채점 실패율, 평균 소요 시간 | `grading_jobs` 집계 또는 간단한 admin 쿼리 |
| Claude 일일 비용 | Anthropic 콘솔 |
| Function 에러·timeout | Vercel Runtime Logs |
| Storage 용량 | Supabase Dashboard |
| `?` 비율 | `item_results` 주간 집계 (정확도 게이트) |

초기엔 대시보드 SaaS 없이 **주 1회 수동 확인**으로 충분. 지표가 나빠지면 그때 알림 웹훅(이메일)만 추가.

### 4.4 백업·장애

- Supabase Pro **일일 백업 7일** 사용. Free에 의존하지 말 것.
- 장애 시 UX: “채점 실패 · 다시 시도”만. 사진이 남아 있으면 재큐, 없으면 재촬영.
- Vision 장애(429/5xx): exponential backoff 1회 후 `failed`.

### 4.5 개인정보·저작권 운영

- Storage 버킷 **private**, 서명 URL TTL 짧게(예: 5–15분).
- 문제 본문·`problem_latex` 로그 출력 금지 (서버 로그 포함).
- 정답지 원본은 저장 즉시 삭제 — 삭제가 실패하면 학습지 저장을 롤백하거나 재시도 큐에 넣고 강사에게 알림.
- 테스트 샘플은 **학생 이름 가린** 이미지만 리포/픽스처에 보관.

### 4.6 도메인·접속

| 단계 | 선택 |
|---|---|
| MVP | `*.vercel.app` + PWA 홈 화면 추가 |
| 이후 | 저가 도메인 + Vercel DNS. 별도 CDN 불필요 |

### 4.7 지원·운영 수칙 (강사=본인일 때)

- 로그인 문제: 매직 링크/비밀번호 재설정만
- 채점 이상: `?` 수동 확정 → 그래도 이상하면 해당 문항 정답 수정 → 재판정
- 비용 급증: 일일 한도·Anthropic limit가 1차 방어선

---

## 5. 현실적 도입 순서 (돈 쓰는 순서)

```
1) Anthropic 키 + spend limit          ← 개발 중 소액
2) Supabase Free + Vercel Hobby        ← 개발·데모
3) 샘플 채점으로 Claude 단가 실측       ← 한도 숫자 확정
4) 실학생 들어가기 직전:
     Supabase Pro + (상용/안정) Vercel Pro
5) 정확도 게이트 미달 시에만 Mathpix
```

**지금 카드 등록이 필요한 것:** Anthropic(종량).  
**실운영 직전:** Supabase Pro, 필요 시 Vercel Pro.  
**나중:** Mathpix, 도메인, 알림톡.

---

## 6. 앱에 넣을 비용 가드 (구현 체크리스트)

- [ ] 업로드 전 이미지 리사이즈(긴 변 ≤1568, JPEG quality ~0.85)
- [ ] `DAILY_GRADE_LIMIT` / `MAX_PAGES_PER_SUBMISSION`
- [ ] Vision 재시도 최대 1회, job attempts ≤ 2
- [ ] 동일 submission 중복 채점 방지 (status가 grading이면 enqueue 거부)
- [ ] 정답지·숙제 원본 삭제 경로 + cron
- [ ] 관리 화면(또는 SQL 뷰): 오늘 채점 수, 실패 수, `?` 비율
- [ ] 환경별 키 분리 (Preview에서 실사용량 폭주 방지)

---

## 7. 추천 구성 요약

**개발·파일럿:** Vercel Hobby + Supabase Free + Claude Sonnet + SymPy + 잡 테이블 폴링  

**실운영(1인 강사):** Vercel Pro + Supabase Pro + Claude Sonnet(리사이즈·일일 한도) + SymPy + cron 삭제 + 콘솔 spend cap  

**보류:** Mathpix, 외부 큐, 알림톡, 유료 모니터링, 별도 Python 호스트
