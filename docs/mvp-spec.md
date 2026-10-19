# 연산 숙제 AI 채점 웹앱 — MVP 기획서 (개정)

> 대상: 개발 담당  
> 개정일: 2026-10-18  
> 관련: [비용·운영 가이드](ops-and-cost.md)

### 개정 이력
- 비동기 채점: `grading_jobs` + Next.js `after()` + 폴링 (외부 큐 SaaS 없음)
- 정답지 오류 의심: `problem_latex` 비저장, `computed_answer_latex`만 저장
- 비전: `VisionReader` 멀티 프로바이더 (`mock` 기본 → 파일럿 `gemini` → 게이트 승자)
- 형태 규칙 프리셋, 운영 한도, 사진 삭제 경고·연장, 판정 3단 레이어 명시

---

## 1. 개요

### 1.1 문제
수학 강사가 매일 연산 숙제를 손으로 채점하는 데 많은 시간을 쓴다. 연산 숙제는 정답이 명확해 자동화하기 좋다.

### 1.2 제품 한 줄
강사가 **정답지를 먼저 등록**해 두고, 학생 숙제를 **휴대폰으로 찍으면** AI가 문항별로 판정해 **틀린 번호 / 세모 번호 / 확인 필요 번호**만 알려주는 휴대폰 웹앱.

### 1.3 타겟
- 초등·중등 연산 (고등 범위 밖)
- MVP: 강사 1인 계정

### 1.4 차별점
한국 초중등 학습지 형식 + 정답지 기준 판정 + AI 교차 확인 + △ 자동 판정 + 저작권 고려(문제 본문 비저장).

---

## 2. 핵심 원칙

1. **판정 기준은 등록된 정답지.** AI 계산이 정답지를 뒤집지 않는다.
2. **계산은 SymPy.** 비전은 읽기만.
3. **확신 없으면 사람에게.** 애매하면 `?`(확인 필요).
4. **문제 본문 비저장.** 정답·규칙·파생 계산값만. 원본 정답지/숙제 사진은 정책에 따라 삭제.
5. **결과 화면 최소.** 점수 없음. ✕ / △ / ? 만.

---

## 3. 사용자 워크플로우

```
① 정답지 업로드 → ② 정답 확인·수정 → ③ 학생 학습지 촬영 → ④ 결과(✕ / △ / ?)
```

### ① 정답지 업로드
- 입력: 카메라, 이미지, PDF (HWP 미지원 → PDF 안내)
- 비전으로 번호별 정답 추출
- 여러 회차(1일차~4일차)가 한 페이지면 구간별로 나눠 각각 학습지로 저장 가능

### ② 정답 확인·수정
- 목록: `1번: 68 / 2번: 3/4 …` (수식 렌더)
- 강사가 틀린 것만 수정
- `instruction_hint`가 있으면 형태 규칙 추천; 없으면 **프리셋** 선택
- 저장 시 정답·규칙만 DB, 원본 즉시 삭제

### ③ 채점
- 학습지 → 학생 → 촬영. 연속 촬영 가능, 채점은 비동기
- 학생별 상태: 채점 중 / 완료 / 확인 필요 / 실패

### ④ 결과
```
김OO · 3일차 연산
✕ 틀린 번호   3, 7, 12
△ 세모 번호   5 (약분 안 함), 9 (근호 미정리)
? 확인 필요   14
```
- ○는 기본 숨김(펼치기 가능)
- `?` 화면: 학생 글씨 크게, AI 추정 작게 → ○/△/✕
- 반 목록: 학생별 `✕2 · △1 · ?1`, 확인 필요 강조
- 푸시/알림톡 MVP 제외

---

## 4. 판정 체계

| 기호 | 의미 | 주체 |
|---|---|---|
| ○ | 정답지와 같은 형태(항·곱셈 순서·공백 허용) | 자동 |
| △ | 값은 맞지만 형태 미정리(사유) | 자동 |
| ✕ | 값 다름 | 자동 |
| ? | 판독 불확실 | 강사 최종 |

형태 차이는 △로 처리해 확인량을 줄인다. 학습지별로 특정 △ 사유를 ✕로 격상 가능.

---

## 5. 시스템 구성

| 영역 | 선택 |
|---|---|
| 프론트 | Next.js App Router, 모바일 우선, PWA |
| 비전 | `VisionReader`: mock / gemini / claude … (`VISION_PROVIDER`) |
| 계산 | SymPy (Python) |
| DB·Auth·파일 | Supabase |
| 배포 | Vercel |
| 잡 | `grading_jobs` + `after()` + 폴링 |

비용·플랜 상세는 [ops-and-cost.md](ops-and-cost.md).

### 5.1 비동기 채점

```
업로드 API → Storage + submissions + grading_jobs insert
         → after(runGradingJob) → 즉시 200
UI → submissions.status 2~3초 폴링
```

- 실패: `attempts`, `last_error`, 최대 2회 재시도 후 `failed` + 재촬영 CTA
- 연속 5장: 업로드만 동기, UI 비서블락

### 5.2 학생 숙제 파이프라인

```
사진 → Vision(읽기만) → SymPy compare
     → confidence 낮음이면 ? + estimate
     → computed_answer_latex 저장 (problem_latex는 메모리만)
     → 결과 저장, 원본은 정책에 따라 삭제
```

### 5.3 비전 스키마 (학생)

비전에게 **계산하지 말고 읽기만** 하라. JSON 강제.

```json
{
  "items": [
    {
      "number": "3",
      "section": "3일차",
      "student_answer_latex": "\\frac{6}{8}",
      "student_answer_raw": "6/8",
      "read_confidence": 0.93,
      "legible": true,
      "alternatives": ["\\frac{6}{3}"],
      "problem_latex": "\\frac{1}{2}+\\frac{1}{4}",
      "location_hint": "2열 3행"
    }
  ],
  "page_notes": "지우개 자국 많음"
}
```

- `READ_CONFIDENCE_THRESHOLD` 기본 0.8. 미달 또는 `legible=false` → `?`
- `problem_latex`: 교차 확인·`computed_answer_latex` 산출용. **DB·로그 금지**
- `location_hint`: 확인 화면 보조. bounding box MVP 비요구

### 5.4 비전 스키마 (정답지)

```json
{
  "sections": [
    {
      "label": "1일차",
      "items": [
        { "number": "1", "answer_latex": "68", "instruction_hint": null },
        { "number": "2", "answer_latex": "\\frac{3}{4}", "instruction_hint": "기약분수로 나타내시오" }
      ]
    }
  ]
}
```

### 5.5 판정 엔진 레이어

`normalize → parse → compare` (순수 함수, Python)

1. normalize: 전각/반각, ×÷, 대분수, `3 ... 2`, 단위 분리, `또는`/쉼표 해집합
2. parse: SymPy + 특수 타입(나머지, 단위, 해집합)
3. compare: 구조 동일 → ○; 값 동일 + 형태 규칙 → △/○; 값 다름 → ✕

단위·나머지·방정식은 SymPy 바깥 커스텀 비교기.

### 5.6 VisionReader

```
VISION_PROVIDER=mock|gemini|claude|openai|openrouter
VISION_MODEL=...
```

- 기본 `mock` (CI·로컬·$0)
- 실사진 파일럿: `gemini` Free (이름 가린 샘플)
- 게이트로 승자 확정 후 실운영 Paid
- Mathpix: 인터페이스 스텁만, 게이트 미달 시 실장

---

## 6. 정답 형식 범위

정수·음수, 소수, 분수·대분수·가분수, 몫·나머지(`3 ... 2`), 단위, 비교(`>`, `<`, `=`), 근호, 문자식, 방정식 해.

---

## 7. 형태 규칙 (△)

### 7.1 알고리즘
1. 파싱  
2. 정규형 구조 같으면 ○  
3. 값 같으면 형태 규칙 → 위반 시 △+사유, 없으면 ○  
4. 값 다르면 ✕  

### 7.2 사유 코드
`NOT_REDUCED`, `MIXED_IMPROPER`, `FRACTION_DECIMAL`, `RADICAL_NOT_SIMPLIFIED`, `NOT_RATIONALIZED`, `NOT_EXPANDED`, `NOT_FACTORED`, `UNIT_MISSING`, `OTHER_FORM`

### 7.3 학습지 설정·프리셋
- 각 사유: `TRIANGLE`(기본) | `WRONG`
- `instruction_hint` 있으면 AI 추천 → 강사 확인
- 없으면 프리셋: `DEFAULT` / `ELEM_FRACTION` / `MIDDLE_RADICAL` / `EXPAND_FACTOR`
- `?` 화면: “이 학습지에서 같은 유형은 모두 이렇게” 일괄 적용

---

## 8. 정답지 오류 의심

동일 worksheet·number에서:

- 여러 제출의 `computed_answer_latex`가 서로 같고
- 정답지와 다르며
- 해당 값이 있는 제출 ≥3 **또는** 제출자의 30% 이상

→ `answer_items.key_error_flag`. 자동 수정 금지. 강사 수정 시 해당 문항 전체 재판정 job.

`problem_latex`는 저장하지 않는다. 채점 시점에만 SymPy로 `computed_answer_latex`를 만든다.

---

## 9. 데이터 모델

```
students          id, teacher_id, name, class_name, created_at

worksheets        id, teacher_id, title, section_label, grade_level,
                  form_rules jsonb, created_at

answer_items      id, worksheet_id, number, answer_latex,
                  answer_type, item_form_rules jsonb null,
                  key_error_flag bool default false

submissions       id, worksheet_id, student_id, teacher_id,
                  photo_path null, status,
                  -- uploaded|grading|done|needs_review|failed
                  photo_delete_at, photo_delete_warned_at,
                  created_at

item_results      id, submission_id, number,
                  student_answer_latex, student_answer_raw,
                  read_confidence, ai_estimate_latex null,
                  computed_answer_latex null,
                  auto_verdict,  -- O|TRI|X|CHECK
                  reason_code null,
                  final_verdict null, resolved_at null

grading_jobs      id, submission_id, teacher_id, status,
                  attempts, last_error,
                  created_at, started_at, finished_at
```

- RLS: `teacher_id = auth.uid()`
- 문제 본문 컬럼 금지
- Storage: private, 서명 URL만

### 9.1 파일 보관
- 정답지 원본: 저장 즉시 삭제 (실패 시 저장 롤백/재시도)
- 숙제 사진: `?` 전부 확정 시 즉시 삭제, 아니면 7일 cron
- 삭제 24시간 전 UI 경고; 미해결 `?`면 1회 +7일 연장

---

## 10. 화면 (390px)

1. 로그인  
2. 홈(학습지 + 정답지 등록)  
3. 정답지 업로드  
4. 정답 확인·수정 + 형태 규칙/프리셋  
5. 학생 관리  
6. 채점(연속 촬영)  
7. 반별 결과  
8. 학생 결과 상세  
9. 확인 필요 판정(핀치줌)

iOS: `capture` + 앨범. 기울기·가로 촬영 짧은 안내.

---

## 11. MVP 범위

### 포함
정답지 업로드·추출·수정, 프리셋, 학생 관리, 연속 촬영·비동기 채점, ○/△/✕/?, 확인·일괄 적용, 오류 의심, 파일 삭제·한도, 멀티 VisionReader(mock+gemini 최소)

### 제외
점수, 푸시/알림톡, 학부모 공유, 학생 직접 제출, 통계, HWP, 다중 강사, Mathpix 실장(스텁만)

---

## 12. 구현 우선순위·완료 기준

1. SymPy 엔진 + 아래 단위 테스트  
2. 정답지 업로드→저장(+원본 삭제)  
3. 숙제 1장→결과+`?`  
4. 연속 촬영 + jobs + 폴링  
5. 프리셋·오류 의심·cron·한도·E2E  

### 단위 테스트 (필수)
- `5x + x^2 + 6` vs `x^2 + 5x + 6` → ○  
- `6/8` vs `3/4` → △ NOT_REDUCED  
- `\sqrt{12}` vs `2\sqrt{3}` → △ RADICAL_NOT_SIMPLIFIED  
- `1/\sqrt{2}` vs `\sqrt{2}/2` → △ NOT_RATIONALIZED  
- `(x+2)(x+3)` vs `x^2+5x+6` (전개) → △ NOT_EXPANDED  
- `7/4` vs `1 3/4` → △ MIXED_IMPROPER  
- `3 ... 2` vs `3 ... 2` → ○, `3 ... 1` → ✕  
- `x = 2 또는 x = -3` vs `x = -3, x = 2` → ○  
- `12` vs `12cm` → △ UNIT_MISSING  

### 제품 완료
- 정답지 사진(여러 회차) → 구간 추출 → 수정 → 저장 (휴대폰)
- 숙제 1장 → 결과, 연속 5장 UI 비서블락
- 정답지 저장 후 Storage에 원본 없음
- DB에 문제 본문 없음
- Playwright 390×844 mock E2E 통과

### 정확도 게이트
샘플 10~20장: 오판 거의 없음, `?` ≤20%. 미달 시 프롬프트·임계 → Mathpix 검토.

---

## 13. 개발 지침

- Context7로 Next/Supabase/Gemini/Anthropic/SymPy 문서 확인
- Playwright MCP 모바일 뷰포트 E2E
- 판정 로직은 순수 함수, 테스트 먼저
- 비밀값은 환경변수만
- Preview 기본 `VISION_PROVIDER=mock`
