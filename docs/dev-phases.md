# API 세팅 전 개발 단계·PR 기준

> 종료선: 클라우드 API 키·강사 Auth·유료 플랜이 필요해지기 직전.  
> 기본 env: `DATA_PROVIDER=memory`, `VISION_PROVIDER=mock` ([`.env.example`](../.env.example)).

관련: [MVP 기획서](mvp-spec.md) §12, [비용·운영](ops-and-cost.md) §0.

---

## 키 없이 가능한 것 / 아닌 것

| 가능 ($0 · mock) | 불가 (키·계정 필요) |
|---|---|
| SymPy 단위 테스트 | 실손글씨 Vision 정확도 게이트 |
| 정답지·학생·연속 채점·? UX (fixture) | Gemini/Claude/OpenAI 호출 |
| 한도·삭제·key_error 규칙 (memory) | 클라우드 Supabase Auth/Storage |
| Playwright 390 mock E2E | Mathpix, 알림톡, 상용 Vercel |
| (선택) 로컬 Supabase CLI + Docker | 실학생 데이터·Paid 비전 |

---

## 권장 PR 스택

```
PR0 docs → PR1 SymPy → PR2a 정답지 → PR2b 채점/? → PR3a 한도 → PR3b 삭제·key_error → PR4 E2E → (PR5 로컬 Supabase)
```

| PR | 사용자 가치(한 문장) | 완료 증거 |
|---|---|---|
| **PR0** | $0 범위와 PR 기준이 문서에 고정된다 | README + 이 문서 |
| **PR1** | 판정 엔진이 스펙 케이스를 통과한다 | `npm run test:grader` |
| **PR2a** | 정답지를 회차·프리셋과 함께 저장한다 | 수동: answer-key 저장 |
| **PR2b** | 연속 채점 후 ?를 일괄 확정한다 | 수동: grade→review |
| **PR3a** | 리사이즈·일일/페이지 한도·job 가드가 막는다 | 한도 초과 UX |
| **PR3b** | 사진 수명·정답지 오류 의심이 동작한다 | memory 시각 조작 데모 |
| **PR4** | mock E2E가 플로우를 잠근다 | Playwright CI |
| **PR5** | 로컬 Supabase에 데이터가 남는다 | Docker만, 클라우드 키 없음 |

**병렬:** PR0 ↔ PR1만 독립. 이후는 위 순서. 전면 병렬 불가.

---

## PR 쪼개기 기준 (요약)

**한 PR에 묶음:** 같은 완료 질문·한 문장 가치·`memory`+`mock`으로 검증 가능.

**반드시 분리:** 엔진 vs UI, 정답지 vs 채점, UX vs 운영 가드, 한도 vs 삭제/key_error, 기능 vs E2E, memory vs Supabase, mock vs 실키.

**더 쪼갬:** 리뷰 파일 ~15개 초과, 의존성+기능+CI 동시, 스토어 계약과 UI 동시 개편, 마이그레이션/Auth.

### 출구 조건

1. `main` 기준 단독 머지 가능 (이전 PR에만 의존)
2. 기본 env happy path 유지
3. 검증 명령 또는 수동 3줄
4. 점수·알림톡·실키·Mathpix 없음
5. Draft → 조건 충족 후 ready

### PR 본문 템플릿

```
## 사용자 가치
(한 문장)

## 범위
- 포함:
- 제외(의도적):

## 검증
- [ ] memory + mock 기본값
- [ ] 명령: …
- [ ] 수동: …

## 키/계정
필요 없음 | 로컬 Docker만 | (이후 PR) 클라우드 키
```
