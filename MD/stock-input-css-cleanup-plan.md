# 재고·오더 입력 CSS 정리 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- 재고·오더 입력란 관련 CSS에서 불필요한 크기/미사용 규칙을 제거한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 작업 계획
1. 현재 마크업에서 사용하지 않는 클래스(`stockInputCol`, `inlineFieldRow`) 제거
2. 입력란 크기 고정에 해당하는 불필요 width 스타일 제거
3. 입력은 `flex` 기반으로 가용폭을 채우는 규칙만 유지

## 검증 포인트
- 입력란 표시/정렬 유지
- 린트/빌드 오류 없음
