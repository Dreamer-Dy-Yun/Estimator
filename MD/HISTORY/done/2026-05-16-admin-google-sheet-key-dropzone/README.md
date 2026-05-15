# 관리자 구글 시트 JSON 키 업로드 정리

## TODO

- 없음.

## DONE

- 구글 시트 설정 생성 화면에서 권한, 접근, 범위, 서비스 계정 이메일 직접 입력 제거.
- 서비스 계정 JSON 키를 드래그앤드랍/파일 선택으로 받도록 분리 컴포넌트 추가.
- JSON 키의 `client_email`을 파싱해 미리보기와 mock/API 계약에 사용하도록 정리.
- 백엔드 API 계약과 프론트 경계 문서에 축소된 구글 시트 설정 계약 기록.
- `npm run lint`, `npm run check:encoding`, `npm run test:run`, `npm run build -- --base=/Estimator/` 검증 완료.