# snap-grade

초중등 연산 숙제 사진 채점 웹앱 (강사 1인 MVP).

## 문서

- [MVP 기획서](docs/mvp-spec.md) — 제품·판정·데이터·완료 기준
- [비용·운영 가이드](docs/ops-and-cost.md) — API/DB 비용, $0 실험, 플랜 추천

## 개발 빠른 시작

```bash
# 판정 엔진 단위 테스트
cd python/grader && pip install -r requirements.txt && pytest -q
```

환경변수는 `.env.example` 참고. 기본 비전은 `VISION_PROVIDER=mock`.
