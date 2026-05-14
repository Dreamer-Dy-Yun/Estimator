# PowerShell Get-Content 한글 깨짐 대응

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-14 |
| 최종 수정일 | 2026-05-14 |
| 상태 | 유지 문서 |
| 적용 범위 | PowerShell, Windows 콘솔, UTF-8 문서/소스, E2E 테스트 파일 |

## 검색 키워드

PowerShell, Get-Content, 한글 깨짐, mojibake, UTF-8, CP949, ANSI, Windows PowerShell 5.1, PowerShell 7, pwsh, chcp 65001, OutputEncoding, E2E, Playwright, 한글 문자열, 문서 손상 판별

## 증상

UTF-8로 저장된 MD, TS, TSX 파일을 PowerShell `Get-Content`로 읽었을 때 한글이 다음처럼 깨져 보인다.

| 실제 문자열 | 깨져 보이는 예 |
|-------------|----------------|
| `로그인` | `濡쒓렇??` <!-- intentional-mojibake-example --> |
| `자사 분석` | `?먯궗 遺꾩꽍` <!-- intentional-mojibake-example --> |
| `오더 후보군` | `?ㅻ뜑 ?꾨낫援?` <!-- intentional-mojibake-example --> |

이 증상만으로 파일이 손상됐다고 판단하면 안 된다. 특히 Windows PowerShell 5.1과 BOM 없는 UTF-8 파일 조합에서 자주 발생한다.

## 원인

- 프로젝트 파일은 원칙적으로 UTF-8로 저장한다.
- Windows PowerShell 5.1의 `Get-Content`는 BOM 없는 UTF-8 파일을 현재 ANSI 코드페이지, 예를 들면 CP949로 해석할 수 있다.
- 이 경우 파일 bytes는 정상인데, 콘솔 출력에서만 mojibake가 발생한다.
- 콘솔 출력 인코딩과 파일 읽기 인코딩은 별개다. `chcp 65001`만으로 기존 `Get-Content` 판독 문제가 항상 해결되지는 않는다.

## 빠른 판별법

### 1. 프로젝트 표준 검사 사용

`dashboard-app`에서 다음을 먼저 실행한다.

```powershell
npm run check:encoding
```

이 검사는 `src`, `e2e`, `MD`, `AGENTS.md`의 한국어 문자열을 UTF-8로 읽고, 실제 mojibake 흔적이나 replacement character를 찾는다.

### 2. Node로 UTF-8 직접 판독

PowerShell 표시가 이상하면 `Get-Content` 대신 Node로 파일을 직접 UTF-8 판독한다.

```powershell
node -e "const fs=require('fs'); console.log(fs.readFileSync('dashboard-app/e2e/main-flows.spec.ts','utf8').slice(0,700))"
```

Node 출력이 정상이고 `npm run check:encoding`도 통과하면 파일 손상이 아니라 PowerShell 표시 문제로 본다.

### 3. replacement 문자 확인

파일에 실제 손상이 있으면 `U+FFFD` replacement character가 들어갈 수 있다.

```powershell
node -e "const fs=require('fs'); const s=fs.readFileSync('경로','utf8'); console.log([...s].filter(ch=>ch.charCodeAt(0)===0xfffd).length)"
```

결과가 `0`이면 replacement character는 없다.

## 즉시 해결

### 이 PC에 적용한 영구 설정

현재 PC에는 다음 사용자 프로필 파일을 생성해 Windows PowerShell 5.1 시작 시 UTF-8 기본값이 적용되도록 했다.

```text
C:\Users\윤대영\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1
```

적용 내용은 다음과 같다.

- 콘솔 입력 인코딩을 UTF-8로 설정
- 콘솔 출력 인코딩을 UTF-8로 설정
- `$OutputEncoding`을 UTF-8로 설정
- console code page를 `65001`로 설정
- `Get-Content`, `Set-Content`, `Add-Content`, `Out-File`, CSV import/export 기본 인코딩을 UTF-8로 설정

검증 결과:

```powershell
powershell -NoLogo -Command "Get-Content -Raw dashboard-app\e2e\helpers\app.ts"
```

위 명령은 프로필을 로드하므로 한글이 정상 표시된다.

반대로 다음 명령은 프로필을 건너뛰기 때문에 Windows PowerShell 5.1의 기본 문제를 재현할 수 있다.

```powershell
powershell -NoLogo -NoProfile -Command "Get-Content -Raw dashboard-app\e2e\helpers\app.ts"
```

### 파일 하나를 PowerShell에서 읽어야 할 때

```powershell
Get-Content -Encoding UTF8 -Raw .\dashboard-app\e2e\main-flows.spec.ts
```

Windows PowerShell에서는 `-Encoding UTF8`을 붙이는 것을 기본으로 한다.

### 현재 세션의 콘솔 출력도 UTF-8에 맞출 때

```powershell
chcp 65001
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
```

단, 이 설정은 콘솔 입출력 문제를 줄이는 용도다. 파일 판독은 여전히 `Get-Content -Encoding UTF8` 또는 Node 판독을 우선한다.

### 가능하면 PowerShell 7 사용

PowerShell 7, 즉 `pwsh`는 기본 UTF-8 처리가 Windows PowerShell 5.1보다 낫다. 다만 자동화나 Codex 작업 로그에서는 여전히 Node 판독 또는 `npm run check:encoding`을 권위 있는 판별 기준으로 둔다.

## 작업 원칙

- `Get-Content` 출력이 깨졌다는 이유만으로 파일을 재작성하지 않는다.
- 먼저 `npm run check:encoding` 또는 Node UTF-8 판독으로 실제 손상 여부를 판별한다.
- PowerShell로 파일을 쓰는 경우 `Set-Content` 기본 인코딩을 믿지 않는다. 코드 수정은 원칙적으로 `apply_patch`를 사용한다.
- 실제 손상이 확인되면 추측으로 복원하지 말고, `git diff`, `git show`, 최근 작업 로그, 테스트 실패 지점을 기준으로 복구한다.
- 한글이 포함된 테스트 파일은 `dashboard-app/scripts/check-korean-encoding.mjs` 검사 범위에 포함한다.

## Playwright 변환 캐시 관련

E2E 테스트 작성 중 한글 문자열과 TypeScript 변환 캐시가 엮여 Playwright가 Windows에서 `EXIT:-1073740791`로 조용히 종료한 적이 있다. 이 경우 우선 Playwright transform cache를 삭제한 뒤 다시 실행한다.

```powershell
$cache = Join-Path $env:TEMP 'playwright-transform-cache'
if (Test-Path $cache) { Remove-Item -Recurse -Force -LiteralPath $cache }
npm run test:e2e
```

이 문제도 파일 손상과는 별개다. 캐시 삭제 후 `npm run test:e2e`와 `npm run check:encoding`이 통과하면 소스 파일은 정상으로 본다.

## 결론

이 프로젝트에서 한글 파일의 실제 손상 여부는 `Get-Content` 출력이 아니라 `npm run check:encoding`, Node UTF-8 판독, Git diff를 기준으로 판단한다. `Get-Content`는 반드시 `-Encoding UTF8`을 붙여 사용한다.
