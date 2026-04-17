# Secondary Grid Card 컴포넌트 분리 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- `ProductSecondaryPanel` 내부 그리드(`salesStockAiRow`)에 있는 카드들을 독립 컴포넌트로 분리해 가독성, 유지보수성, 향후 교체 작업 용이성을 높인다.

## 영향 범위
- 대상 파일: `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`
- 신규 파일:
  - `dashboard-app/src/dashboard/components/product-secondary/cards/SalesMetricsCard.tsx`
  - `dashboard-app/src/dashboard/components/product-secondary/cards/StockOrderCard.tsx`
  - `dashboard-app/src/dashboard/components/product-secondary/cards/AiMockCard.tsx`

## 작업 계획
1. 기존 그리드 내 3개 카드 JSX와 사용 prop/state를 식별한다.
2. 카드별 독립 컴포넌트를 생성한다.
3. `ProductSecondaryPanel`에서 해당 카드 컴포넌트를 import 하여 교체한다.
4. 동작 영향(버튼/입력/도움말/로딩 상태)이 기존과 동일한지 확인한다.
5. 린트 에러를 확인하고 필요 시 수정한다.

## 검증 포인트
- 판매 정보 테이블 렌더링 동일 여부
- 재고/오더 입력 및 계산값 표기 동일 여부
- AI 카드 입력/버튼/응답 표시 및 로딩 disabled 상태 동일 여부
