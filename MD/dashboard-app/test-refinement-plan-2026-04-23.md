# 테스트 정리/보강 계획 및 결과

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-04-23 |
| 변경일 | 2026-04-23 |
| 지시 | Yun Daeyoung |

## 목적

테스트 전반을 점검해 다음 기준으로 정리한다.

- 과한/취약 테스트 수정
- 경계값 누락 보강
- 최근 변경사항 회귀 방지 강화

## 적용 기준

1. **행동 검증 중심**: 구현 상세보다 계약/결과를 검증
2. **경계값 포함**: 최소/최대/역순/알 수 없는 입력
3. **회귀 포인트 고정**: 최근 변경(`naver` 제거, mock 분리) 재유입 방지
4. **테스트 비용 최소화**: 의미 중복은 줄이고 빠른 테스트 유지

## 이번 반영 내역

### 1) 취약한 비교 방식 보강

- 파일: `dashboard-app/src/api/mock/dashboardApi.test.ts`
- 변경:
  - `unknown channel fallback` 검증에서 배열 전체 strict-equal만 사용하던 방식을 보완
  - id 기준 맵으로 핵심 수치(`competitorAvgPrice`, `competitorQty`, `competitorAmount`)를 비교
- 이유:
  - 순서/부가필드 변화에 덜 취약하면서도 계약 핵심을 검증

### 2) 회귀 방지 케이스 추가

- 파일: `dashboard-app/src/api/mock/dashboardApi.test.ts`
- 추가:
  - `competitorChannelId: 'naver'` 입력 시 기본 스큐 fallback 동작 검증
- 이유:
  - 제거된 채널이 요청 파라미터로 재유입되어도 API가 안전하게 동작하는지 보장

### 3) 경계값/라운딩 테스트 보강

- 파일: `dashboard-app/src/api/mock/productCatalog.test.ts`
- 추가:
  - `historicalMonths` 경계(`2024-07`..`2025-12`, 길이 18)
  - `forecastMonths` 라운딩(7.6 → 8)
  - `estimatePeriodWeight` 12개월 구간 = 1.0
- 이유:
  - 월 축 계약, 라운딩 규칙, 대표 중간값 경계를 명시적으로 고정

## 유지한 테스트

- `salesTables.test.ts`와 `dashboardApi.test.ts`의 채널 검증은 일부 의미가 겹치지만,
  - 하나는 **데이터 소스 레벨**
  - 하나는 **API 계약 레벨**
  로 서로 다른 회귀 지점을 커버하므로 유지.

## 검증

- 실행: `npm run test:run`
- 결과: 전체 통과 (최신 실행 기준)

