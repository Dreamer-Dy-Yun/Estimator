# 추천 적용 신규 후보 오더 지표 계산

## TODO

- 없음.

## DONE

- 추천 적용 시 기존 후보 `skuGroupKey`와 비교해 새로 추가된 후보만 오더 지표 SSE 대상으로 제한.
- 후보군 목록 재조회 후 기존 행의 계산 완료 지표는 보존하고 신규 행만 로딩/계산 흐름에 태움.
- 백엔드 API 계약/프론트 구조 문서에 부분 `candidateItemUuids` SSE 호출 책임을 기록.
- `npm run lint`, `npm run check:encoding`, `npm run test:run`, `npm run build -- --base=/Estimator/` 검증 완료.