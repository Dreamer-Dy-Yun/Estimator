# 서비스 수준 툴팁 역함수(z) LaTeX 추가 계획

- 작성일자: 2026-04-16
- 변경일자: 2026-04-16
- 지시자: Yun Daeyoung

## 목적

- 서비스 수준(확률)에서 z를 구하는 관계 `z = Φ⁻¹(p)`를 툴팁에 명시한다.

## 영향 범위

- `dashboard-app/src/dashboard/components/product-secondary/ko.ts`
- `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`

## 검증 포인트

- 서비스 수준 물음표에서 역함수 식이 KaTeX로 보이는지
