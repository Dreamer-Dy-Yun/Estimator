# 서비스수준 툴팁 KaTeX 렌더링 적용 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- `서비스 수준` 툴팁의 LaTeX 문자열을 텍스트가 아닌 실제 수식으로 렌더링한다.

## 영향 범위
- `dashboard-app/package.json`
- `dashboard-app/src/main.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/ko.ts`

## 수정 방식
- `katex`, `react-katex` 의존성을 추가한다.
- 전역에서 KaTeX 스타일시트를 로드한다.
- 서비스수준 툴팁 렌더링에 `BlockMath`를 적용한다.
- 수식 문자열은 `ko.ts`에서 별도 키로 분리해 관리한다.

## 검증 포인트
- 서비스수준 물음표 호버 시 LaTeX 수식이 실제 수식 형태로 렌더되는지
- 기존 다른 툴팁 표시/호버 동작에 영향이 없는지
