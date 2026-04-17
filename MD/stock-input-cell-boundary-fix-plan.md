# 재고·오더 셀 경계 준수 레이아웃 수정 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- 재고·오더 2x2 각 셀에서 라벨/입력 컨트롤이 셀 허용 영역 밖으로 넘치지 않도록 고정한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 작업 계획
1. `stockInputCell` 내부 컬럼을 `minmax(0, 1fr)` 기반으로 변경한다.
2. 라벨 고정폭/nowrap 강제를 제거해 셀 경계 내 줄바꿈/축소가 가능하게 한다.
3. 입력 래퍼를 grid로 전환해 `input`과 단위(`EA`, `%`)가 셀 내부에서만 배치되도록 조정한다.

## 검증 포인트
- 직접입력 ON/OFF 모두 셀 경계 내 렌더
- 긴 라벨(`안전재고(직접입력)`)에서도 오버플로우 미발생
