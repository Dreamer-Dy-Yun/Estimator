# dashboard-app

판매·경쟁 분석 및 오더 후보군 UI를 담는 프론트엔드 SPA입니다. 데이터는 현재 목(mock)·`localStorage` 중심이며, 백엔드 연동 시 API 계약만 교체하면 됩니다.

## 문서 (제품·계약)

| 문서 | 경로 |
|------|------|
| 프론트 개요·화면·구조 | [../MD/dashboard-app/frontend-overview.md](../MD/dashboard-app/frontend-overview.md) |
| 문서 인덱스 | [../MD/dashboard-app/README.md](../MD/dashboard-app/README.md) |
| 백엔드 API 스펙 | [../MD/backend-api/README.md](../MD/backend-api/README.md) |
| 테스트 도입 계획 | [../MD/dashboard-app/test-strategy.md](../MD/dashboard-app/test-strategy.md) |

## 스크립트

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 타입체크 + 프로덕션 빌드
npm run lint     # ESLint
npm run preview  # 빌드 결과 미리보기
```

## 스택

React 19, TypeScript, Vite 8, React Router 7, Recharts, KaTeX.

---

아래는 프로젝트 생성 시 포함된 **Vite 기본 README**입니다. ESLint 확장 등 템플릿 안내는 여기를 참고하면 됩니다.

---

# React + TypeScript + Vite (템플릿 원문)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, use this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also use [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
```
