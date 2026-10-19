# snap-grade

초중등 연산 숙제 사진 채점 웹앱 (강사 1인 MVP).

## 문서

- [MVP 기획서](docs/mvp-spec.md) — 제품·판정·데이터·완료 기준
- [비용·운영 가이드](docs/ops-and-cost.md) — API/DB 비용, $0 실험, 플랜 추천
- [개발 단계·PR 기준](docs/dev-phases.md) — API 키 전 작업 쪼개기·병렬 규칙
- [정확도 게이트](docs/accuracy-gate.md) — 실사진 측정 (키 필요)

## $0으로 되는 것 / 안 되는 것

| 키 없이 (지금) | 키·계정 필요 (나중) |
|---|---|
| `DATA_PROVIDER=memory` + `VISION_PROVIDER=mock` | `GEMINI_API_KEY` 등 실 Vision |
| SymPy 판정·웹 플로우·한도/삭제 규칙 | 클라우드 Supabase / 강사 Auth |
| Playwright mock E2E | 실손글씨 정확도 게이트 |

자세한 스택·PR 단위는 [docs/dev-phases.md](docs/dev-phases.md).

## 개발

```bash
# 판정 엔진
cd python/grader && python3 -m pip install -r requirements.txt && python3 -m pytest -q

# 웹앱 ($0: DATA_PROVIDER=memory, VISION_PROVIDER=mock)
cp .env.example .env.local
npm install
npm run dev
```

기본값은 메모리 스토어 + mock 비전이라 Supabase/API 키 없이 플로우를 검증할 수 있습니다.
