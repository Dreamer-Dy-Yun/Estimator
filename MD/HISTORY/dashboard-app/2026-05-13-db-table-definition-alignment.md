# DB 테이블 정의 기반 프론트 계약 정리

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-13 |
| 상태 | 결과 기록 |
| 참조 | Google Spreadsheet `1_psnxflNU6L9CKLJ6K3l9S82IVGq4Csx`, `USER_ACCOUNT`, `SKU`, `CANDIDATE_STASH`, `CANDIDATE_ITEM`, `LLM_API`, `SALES_ERP`, `SALES_EXTERNAL`, monthly summary 계열 |

## Goal

제공된 DB 테이블 정의를 기준으로 프론트 변수명과 API 데이터 흐름의 애매한 부분을 줄인다. 특히 DB `SKU.uuid`와 프론트 상품 행 식별자가 섞이지 않도록, 상품 묶음 단위와 실제 SKU 단위를 분리해 명명한다.

## Scope

- 자사/경쟁 분석 리스트, 상품 드로워, 후보군 담기, 후보군 상세, 스냅샷, 엑셀 다운로드 타입.
- `dashboard-app/src/api/types/*`, `src/api/requests/*`, `src/api/mock/*`, 관련 화면/훅.
- 백엔드 구현 참고용 `MD/backend-api/backend-api-spec.md`와 소스 경계 지도.

## Principles

- DB `SKU`의 실제 유일성은 `code + color_code + size`다.
- 현재 화면의 상품 행과 드로워는 사이즈를 뺀 상품 묶음 단위이므로 `SKU.uuid`가 아니라 `SKU.code + SKU.color_code`를 가리킨다.
- 이 묶음 키는 `skuGroupKey`로 부른다. UI row `id`, DB surrogate `id`, DB `SKU.uuid`와 혼용하지 않는다.
- 후보군 소유자는 DB `CANDIDATE_STASH.user_uuid` 기준이며, 화면은 사용자 UUID를 직접 들고 다니지 않는다. request adapter가 mock 전환용으로만 현재 세션 UUID를 붙이고, 운영 백엔드는 세션을 우선해야 한다.
- 배지는 DB `CANDIDATE_ITEM.badge` JSON에 맞춰 `{ name, color, tooltip }[]`로 전달한다. 별도 정의 map과 item badge name 조인을 화면에서 수행하지 않는다.

## Plan

1. 기존 `productId` 계열 명칭을 `skuGroupKey`로 바꾼다.
2. `ProductPrimarySummary`, `ProductSecondaryDetail`, snapshot, drawer cache, 후보군 payload에서 상품 묶음 식별자를 `skuGroupKey`로 통일한다.
3. 후보군 스태시 소유자 필드를 `createdByUserUuid`가 아닌 `userUuid`로 맞춘다.
4. 후보군 배지 응답을 `badgeDefinitions + badgeNames`에서 `badges: { name, color, tooltip }[]`로 맞춘다.
5. 백엔드 API 문서에 DB `SKU.uuid`와 `skuGroupKey`의 차이를 명시한다.

## Result

- `productId`는 소스와 문서에서 제거했고, 상품 묶음 단위는 `skuGroupKey`로 통일했다.
- 후보군 일괄 담기 payload는 `stashUuid + skuGroupKeys`이며, 스냅샷 없이 후보군에 상품 묶음을 추가한다.
- 후보군 상세 리스트와 추천 응답은 각 아이템 안의 `insight.badges` 배열로 배지 표시 정보를 받는다.
- `dashboardRequests.ts`에는 백엔드 전환 시 `skuGroupKey`를 실제 SKU row 집합으로 매핑해야 한다는 주의점을 남겼다.
- `backend-api-spec.md`는 `SKU.code + SKU.color_code + size`, `skuGroupKey`, `CANDIDATE_STASH.user_uuid`, `CANDIDATE_ITEM.badge`의 경계를 기준으로 갱신했다.

## Non-Goals

- DB 테이블 생성이나 migration 작성은 하지 않는다.
- GPT 관리자 화면의 UI 명칭은 사용자가 정한 GPT 전용 흐름을 유지한다. 백엔드 저장 테이블은 `LLM_API`에 대응시키되, 프론트 화면 용어를 무리하게 LLM 일반화하지 않는다.
- 현재 mock의 데이터 품질을 실제 운영 DB 품질처럼 검증하지 않는다. 운영 검증은 API 경계와 백엔드에서 수행한다.
