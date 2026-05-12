# SKU code/color contract alignment

- 작성 방법 지시: 사용자
- 작성자: Codex
- 작성일: 2026-05-12

## Goal

자사 분석, 경쟁사 분석, 1차/2차 드로어, 후보군 리스트, 후보군 엑셀 다운로드가 같은 SKU 식별 필드를 사용하도록 맞춘다.

## Scope

- DB `SKU` 설계를 기준으로 프론트 타입과 API 계약 필드를 `code`, `colorCode`, `productName`으로 정리한다.
- 화면에서는 품번(`code`)과 색상(`colorCode`)을 상품명 주변에 노출한다.
- SKU 유일성은 `code + colorCode + size` 조합으로 본다.

## Principles

- 목업 데이터는 `src/api/mock` 안에서만 생산하고, 화면은 API 타입만 본다.
- 자사/경쟁 분석 필터 계약은 `codeQuery`와 `codes`를 사용한다.
- 후보군 엑셀은 이미 받은 후보군 상세 응답을 기반으로 프론트에서 생성하며, 별도 백엔드 재호출을 하지 않는다.

## Result

- `SelfSalesRow`, `CompetitorSalesRow`, `ProductPrimarySummary`, `CandidateItemSummary`에 SKU 필드명을 반영했다.
- 자사 분석 목록은 상품명 앞에 품번, 상품명 뒤에 색상을 표시한다.
- 경쟁사 분석 목록은 `코드` 컬럼을 `품번`으로 바꾸고, 상품명 뒤에 색상을 표시한다.
- 1차 드로어 이미지 위 메타 배지와 2차 드로어 메타 카드에 색상을 추가했다.
- 후보군 상세 목록, 추천 모달, 발주 엑셀 다운로드에도 품번/색상 계약을 맞췄다.

## Non-goals

- 실제 백엔드 SKU 테이블 구현은 이 변경의 범위가 아니다.
- 기존 스냅샷 값을 재계산하거나 대체하지 않는다.
