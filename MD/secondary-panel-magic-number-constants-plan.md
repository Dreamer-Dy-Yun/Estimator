# ProductSecondaryPanel 매직넘버 상수화 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- `ProductSecondaryPanel.tsx`의 해시/난수 유틸 구간에서 의미 없는 숫자 리터럴(매직넘버)을 제거하고, 명시적 상수명으로 치환해 가독성과 유지보수성을 높인다.

## 영향 범위
- 대상 파일: `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`
- 대상 함수:
  - `hashString()`
  - `mulberry32()`

## 작업 계획
1. 해시/난수 함수에 사용되는 숫자 리터럴을 식별한다.
2. 파일 상단에 의미 기반 상수(`HASH_*`, `MULBERRY32_*`)를 선언한다.
3. 함수 본문 숫자를 상수 참조로 치환한다.
4. 동작 불변(동일 알고리즘) 여부를 타입/린트로 확인한다.

## 검증 포인트
- 기존과 동일한 함수 시그니처 유지
- TypeScript/Lint 오류 미발생
