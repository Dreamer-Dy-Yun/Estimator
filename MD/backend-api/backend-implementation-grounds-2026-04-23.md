# 백엔드 구현 도움말 (현재 기준)

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-04-23 |
| 변경일 | 2026-04-23 |
| 지시 | Yun Daeyoung |

## 목적

백엔드 구현 시 필요한 현재 계약/구조/판단 기준만 정리합니다.
변경 히스토리는 다루지 않으며, 구현자가 바로 의사결정할 수 있는 정보만 제공합니다.

## 현재 구조 요약

- API 계약 인터페이스: `dashboard-app/src/api/types/dashboard-api.ts`
- 세부 DTO 타입:
  - `dashboard-app/src/api/types/secondary.ts`
  - `dashboard-app/src/api/types/sales.ts`
  - `dashboard-app/src/api/types/drawer.ts`
- 스냅샷 스키마: `dashboard-app/src/snapshot/orderSnapshotTypes.ts`
- KPI 공통 타입/계산식: `dashboard-app/src/utils/salesKpiColumn.ts`
- 목 API 구현 참조: `dashboard-app/src/api/mock/dashboardApi.ts`

## 백엔드 구현 핵심 규칙

### 1) 경쟁 채널

- 유효 채널: `kream`, `musinsa`
- `getSecondaryCompetitorChannels()`는 위 두 채널만 반환
- 비활성/미사용 채널은 API 응답에 노출하지 않음

### 2) `competitorChannelId` 해석

- 유효 채널이면 채널별 `priceSkew`, `qtySkew` 의미를 반영
- 미지의 채널 id 처리 방식은 정책 결정 필요:
  - A안: 400 에러
  - B안: 기본값 fallback
- 프론트 호환 우선이면 B안이 안전함

### 3) KPI 계산 책임

- `SalesKpiColumn` 필드는 프론트와 서버에서 의미가 동일해야 함
- 서버가 계산 책임을 가지더라도 필드명/단위/정렬 기준은 그대로 유지

### 4) 경계값 규칙

- `forecastMonths`: 1~24 범위
- 기간 가중치: 0.2~1.8 범위
- 역순 기간 입력도 span 기준으로 동일 처리
- 경계값 처리 정책은 API 문서에 명시

### 5) 후보군/스냅샷 일관성

- `CandidateItemSummary.expectedOrderAmount`는 스냅샷 `drawer2.stockDerived.expectedOrderAmount`와 의미가 동일해야 함
- `qty`는 `sizeRows.confirmQty` 집계값과 일치해야 함

## 구현 순서 (권장)

1. 채널/판매 조회 API (`getSecondaryCompetitorChannels`, `getCompetitorSales`) 먼저 구현
2. 스냅샷/후보군 CRUD 구현 (프론트 저장/조회 플로우 안정화)
3. 2차 계산 API(`getSecondaryStockOrderCalc`) 구현
4. LLM 응답 API 실제 모델 연동

## 최소 수용 테스트(백엔드)

- 채널 목록: `kream`, `musinsa`만 반환
- `competitorChannelId`별 금액/수량 변화 검증
- `forecastMonths` 경계(0, 1, 24, 25) 검증
- 후보군 아이템 집계(`expectedOrderAmount`, `qty`) 일관성 검증

## 관련 문서

- `MD/backend-api/backend-api-spec.md`
- `MD/backend-api/README.md`
