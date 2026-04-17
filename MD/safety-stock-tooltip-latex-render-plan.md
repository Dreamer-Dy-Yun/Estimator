# 안전재고 툴팁 LaTeX 렌더링 전환 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- `안전재고` 물음표 툴팁 수식을 일반 텍스트가 아닌 LaTeX 렌더링으로 통일한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/ko.ts`
- `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`

## 수정 방식
- `ko.ts`에서 안전재고 설명 텍스트와 LaTeX 수식 키를 분리한다.
- `ProductSecondaryPanel.tsx`의 `safetyStockCalc` 툴팁 렌더에서 `BlockMath`를 사용한다.

## 검증 포인트
- 안전재고 물음표 호버 시 수식이 KaTeX 형태로 렌더되는지
- 기존 설명 텍스트가 함께 정상 노출되는지
