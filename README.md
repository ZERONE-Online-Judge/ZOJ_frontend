# ZOJ Frontend

Zerone Online Judge 프론트엔드 프로젝트입니다.

## 실행 환경

```text
Node.js: ^20.19.0 또는 >=22.12.0
npm: >=10
```

이 프로젝트는 npm을 사용합니다. 다른 패키지 매니저의 lockfile은 추가하지 않습니다.

## 설치

```bash
npm install
```

## 개발 서버

```bash
npm run dev
```

## 빌드

```bash
npm run build
```

## 프리뷰

```bash
npm run preview
```

`npm run build` 이후 실행합니다.

## 코드 검사와 포맷

```bash
npm run lint
npm run format:check
npm run format
```

- `npm run lint`: ESLint 검사를 실행합니다.
- `npm run format:check`: Prettier 포맷 상태를 확인합니다.
- `npm run format`: Prettier로 파일을 정리합니다.

## 기술 스택

- Vite
- React
- TypeScript
- Tailwind CSS
- React Router
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Monaco Editor
- React Markdown
- KaTeX
- ESLint
- Prettier

## Import 규칙

프로젝트 내부 파일은 `@/` alias로 import합니다.

```ts
import App from '@/App';
import '@/index.css';
```

## 환경 변수

아직 필수 환경 변수는 없습니다.

Vite 환경 변수는 `VITE_` prefix를 사용합니다.

## 보안 의존성 고정

`monaco-editor`의 하위 의존성인 `dompurify`는 `package.json`의 `overrides`로 안전 버전을 고정합니다.

```json
{
  "overrides": {
    "dompurify": "3.4.2"
  }
}
```

## 현재 상태

현재 앱은 초기 빈 상태입니다. `src/App.tsx`는 화면을 렌더링하지 않습니다.
