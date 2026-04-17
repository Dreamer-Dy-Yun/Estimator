# 서비스수준 툴팁 LaTeX 수식 추가 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- `서비스 수준` 툴팁 설명에 정규분포 누적분포함수 정의식을 LaTeX 문자열로 추가한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/ko.ts`

## 수정 방식
- `helpServiceLevel` 문구 하단에 LaTeX 수식 문자열을 줄바꿈으로 추가한다.
- 기존 설명 문구는 유지한다.

## 검증 포인트
- 서비스수준 물음표 툴팁에 기존 설명 + LaTeX 수식 문자열이 함께 보이는지
