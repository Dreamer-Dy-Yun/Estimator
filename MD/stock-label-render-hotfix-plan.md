# 재고·오더 라벨 렌더 깨짐 핫픽스 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- 재고·오더 상단 2x2 영역에서 라벨 텍스트가 깨지거나 보이지 않는 문제를 강제적으로 차단한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 작업 계획
1. 셀 레이아웃을 단순 고정 `78px + 1fr`로 고정
2. 라벨 영역에 shrink/overflow 방지 스타일을 명시
3. 라벨 정렬을 flex 중앙정렬로 고정해 렌더 흔들림 제거

## 검증 포인트
- `일평균` 라벨 정상 노출
- 다른 3개 라벨도 동일하게 정상 노출
