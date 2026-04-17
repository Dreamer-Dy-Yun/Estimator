# 서비스 수준 → z 값 jstat 계산 전환 계획

- 작성일자: 2026-04-16
- 변경일자: 2026-04-16
- 지시자: Yun Daeyoung

## 목적

- `zFromServiceLevelPct`를 구간 고정값 대신 `jstat` 표준정규 역분포(`normal.inv`)로 계산한다.

## 영향 범위

- `dashboard-app/package.json` (의존성 `jstat`)
- `dashboard-app/src/dashboard/components/product-secondary/secondaryPanelCalc.ts`
- `dashboard-app/src/jstat.d.ts` (모듈 타입 선언)

## 검증 포인트

- `npm run build` 통과
- 서비스 수준 % 입력에 대해 `z`가 연속적으로 변하는지
