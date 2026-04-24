# 차트 ResponsiveContainer 뷰포트 체인/측정 안정화 계획

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-04-24 |
| 변경일 | 2026-04-24 |
| 지시 | Yun Daeyoung |

## 목적

`SelfPage`와 `CompetitorPage`의 산점도 차트가 카드 영역을 끝까지 채우도록 복원하면서,
`ResponsiveContainer` 초기 측정 실패로 발생하는 `width(-1) / height(-1)` 경고를 정석적으로 제거한다.

## 영향 범위

- 앱 상위 레이아웃 높이 체인
  - `dashboard-app/src/app.module.css`
  - `dashboard-app/src/dashboard/layout.module.css`
- 자사/경쟁사 분석 공통 카드 레이아웃
  - `dashboard-app/src/dashboard/components/common.module.css`
- 자사/경쟁사 분석 차트 렌더 시점
  - `dashboard-app/src/dashboard/pages/SelfPage.tsx`
  - `dashboard-app/src/dashboard/pages/CompetitorPage.tsx`
- 공통 측정 훅(신규)
  - `dashboard-app/src/dashboard/hooks/useElementSize.ts`

## 원인 정리

1. 자사/경쟁사 페이지 차트는 `ResponsiveContainer`에 의존한다.
2. 차트가 첫 렌더 시점에 부모의 실제 width/height를 받기 전에 마운트되면 Recharts가 `-1 x -1` 경고를 낸다.
3. 최근 `aspect` 우회는 경고를 근본 해결하지 못하고, 카드 fill 레이아웃도 줄어드는 부작용이 생겼다.

## 수정 원칙

1. `aspect` 기반 우회 제거
2. 뷰포트 -> 앱 -> 대시보드 레이아웃 -> 차트 카드까지 높이 체인을 명시
3. 차트 래퍼의 실제 width/height가 0보다 클 때만 `ResponsiveContainer`를 렌더
4. 그래프는 다시 카드 영역 전체를 채우도록 `width="100%" height="100%"`로 복원

## 실행 계획

1. 앱 루트와 대시보드 레이아웃에 `height/min-height: 100dvh`, `min-height: 0` 체인 정리
2. 차트 카드 래퍼의 fill 레이아웃 유지용 CSS 보강
3. `ResizeObserver` 기반 공통 훅 추가
4. `SelfPage`/`CompetitorPage`에서 측정 완료 후 차트 렌더하도록 변경
5. 린트 확인

## 기대 결과

- 자사/경쟁사 분석의 그래프가 카드 전체를 다시 채운다.
- 초기 마운트 시 Recharts `width(-1) / height(-1)` 경고가 사라진다.
