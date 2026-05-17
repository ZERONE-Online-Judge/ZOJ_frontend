# 프로젝트 종합 리뷰

검토일: 2026-05-17

검토 범위:

- `rg --files`로 확인한 전체 소스, 문서, 설정 파일 목록
- `package.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `.env.example`
- `src/routes`, `src/shared/api`, `src/domains`, `src/pages`, `src/components`, `src/shared`, `src/app`
- 자동 검증: `npm run typecheck` 통과, `npm run lint` 통과

이 문서는 단순 문법보다 실제 서비스 출시 전 품질, 보안, 유지보수성, API/세션 구조를 기준으로 작성했다.

## 1. 전체 평가

- 코드 상태: 보통
- 구조 설계: 보통
- UI 일관성: 보통
- API 설계: 보통
- 인증/세션: 위험
- 성능: 위험
- 보안: 위험
- 유지보수성: 위험
- 실제 서비스 준비도: 보통

요약하면 기능 범위는 많이 올라왔고 `domains/*/api.ts`, `ContestPageShell`, `OperatorAccessGate`, `AdminAccessGate`, TanStack Query 사용 등 기본 골격은 잡혀 있다. 다만 최근 기능을 빠르게 붙이면서 대형 페이지 파일, page-local polling, session/token fallback, query key 불일치, 디자인 시스템 미정착 문제가 누적됐다. 실제 서비스 배포 전에는 인증/세션과 route/code splitting, 관리 페이지 분리, API 에러 노출 정책을 먼저 정리해야 한다.

## 2. 가장 먼저 고쳐야 할 문제 TOP 10

### [Critical] access token을 `sessionStorage`에 저장하고 있어 XSS 발생 시 즉시 탈취 가능

- 위치: `src/domains/identityAccess/sessionStorage.ts`, `src/shared/api/client.ts`
- 문제: refresh token은 저장소에서 제거했지만 access token, participant token, operator token은 `sessionStorage`에 저장된다.
- 왜 문제인가: 현재 `MarkdownPreview`는 raw HTML을 렌더링하지 않고 `SvgIcon`도 내부 registry만 쓰는 구조라 즉시 XSS가 보이진 않는다. 하지만 한번 XSS가 들어오면 `sessionStorage`의 bearer token은 바로 탈취된다. 운영자/관리자 기능이 있는 서비스라 피해 범위가 크다.
- 개선 방향: 단기적으로 CSP, HTML 삽입 금지, SVG registry 외부 입력 차단, token TTL 단축, refresh cookie E2E를 확정한다. 중기적으로 access token도 가능하면 메모리 보관 + httpOnly refresh cookie 기반 재발급으로 줄인다.
- 예상 수정 난이도: 높음
- 우선순위: 높음

### [High] API 클라이언트가 명시 token보다 저장소 token을 우선해 세션 혼선 가능성이 있다

- 위치: `src/shared/api/client.ts`
- 문제: `preferredStoredTokenForRequest()`가 호출자가 넘긴 token보다 저장된 general/operator/participant token을 우선한다. `storedReplacementTokenForRequest()`도 401 시 저장소 token으로 조용히 대체한다.
- 왜 문제인가: 페이지 query key에는 A 세션 token이 들어갔는데 실제 요청은 저장소의 B token으로 나갈 수 있다. 탭 간 로그인 전환, 권한 변경, 참가자 세션 교체 시 데이터가 다른 계정 권한으로 조회되는 혼선이 생길 수 있다.
- 개선 방향: API 함수가 받은 token을 기본 신뢰하고, refresh 이후 대체만 허용한다. 저장소 token 자동 주입은 `authClient` 또는 `useAuthenticatedQuery` 계층으로 올려 의도를 명확히 한다.
- 예상 수정 난이도: 중간
- 우선순위: 높음

### [High] route-level 보호가 없고 페이지 내부 gate에 접근 제어가 분산되어 있다

- 위치: `src/routes/routeConfig.ts`, `src/routes/AppRoutes.tsx`, `src/components/admin/AdminShell.tsx`, `src/components/operator/OperatorShell.tsx`, `src/components/contest/ContestPageShell.tsx`
- 문제: `/admin`, `/operator/contests/:contestId/*`, contest participant 접근이 각 페이지나 shell 내부에서만 처리된다.
- 왜 문제인가: 현재는 대부분 query 호출 전에 gate가 감싸지만, 새 페이지가 추가될 때 gate 누락 위험이 높다. 라우트 목록만 보고 공개/인증/권한 요구사항을 파악하기도 어렵다.
- 개선 방향: route config에 `access: public | general | admin | operator`, `permission`, `contestParam` 메타를 추가하고 `ProtectedRoute`/`ContestPermissionRoute`에서 공통 처리한다.
- 예상 수정 난이도: 중간
- 우선순위: 높음

### [High] route lazy loading이 없어 Monaco/관리 화면까지 초기 번들에 들어간다

- 위치: `src/routes/routeConfig.ts`, `src/routes/AppRoutes.tsx`, `src/components/contest/problem/ProblemSubmitPanel.tsx`, `src/shared/ui/CodeEditor.tsx`
- 문제: 모든 page component를 정적 import한다. `ProblemSubmitPanel`이 Monaco 기반 `CodeEditor`를 import하므로 문제/운영자 페이지가 초기 번들에 섞일 가능성이 크다.
- 왜 문제인가: 빌드에서 `index-*.js`가 1MB 이상으로 경고가 난다. 공개 메인, 공지, 대회 목록 사용자도 관리자/문제 편집 코드 비용을 부담할 수 있다.
- 개선 방향: `React.lazy`와 route 단위 code splitting을 적용한다. Monaco는 `ProblemSubmitPanel` 또는 `CodeEditor`에서 lazy import한다.
- 예상 수정 난이도: 중간
- 우선순위: 높음

### [High] 운영자/관리자 대형 페이지가 비즈니스 로직, UI, validation, modal을 한 파일에 모두 가진다

- 위치: `src/pages/operator/OperatorProblemsPage.tsx`, `src/pages/operator/OperatorParticipantsPage.tsx`, `src/pages/operator/OperatorSettingsPage.tsx`, `src/pages/admin/AdminJudgePage.tsx`
- 문제: `OperatorProblemsPage.tsx` 1211줄, `OperatorSettingsPage.tsx` 786줄, `OperatorParticipantsPage.tsx` 762줄이다.
- 왜 문제인가: 기능 추가 시 영향 범위를 파악하기 어렵고, 같은 form/input/modal/table 패턴을 매번 새로 구현하게 된다. 테스트도 페이지 단위로만 어려워진다.
- 개선 방향: 페이지는 query와 큰 상태 분기만 남기고 `features/operator/problems/*`, `features/operator/participants/*` 식으로 form, modal, table, hooks를 분리한다.
- 예상 수정 난이도: 중간
- 우선순위: 높음

### [High] operator/admin query key에 사용자 식별자나 token fingerprint가 거의 없다

- 위치: `src/pages/operator/*`, `src/pages/admin/*`
- 문제: query key가 대부분 `['operator', 'dashboard', contestId]`, `['admin', ...]` 형태다.
- 왜 문제인가: 로그아웃 때 `queryClient.clear()`는 있지만, 같은 탭에서 세션이 갱신되거나 권한이 바뀌거나 다른 운영자 계정으로 재로그인하면 stale data가 잠깐 노출될 수 있다. API client token 자동 대체 문제와 결합하면 더 위험하다.
- 개선 방향: operator/admin query key에 `session.staff.email` 또는 access token fingerprint를 포함한다. 세션 변경 시 관련 query를 invalidate/clear한다.
- 예상 수정 난이도: 낮음
- 우선순위: 높음

### [High] 스코어보드 long polling과 1초 refetchInterval 조합이 서버 부하를 키울 수 있다

- 위치: `src/pages/contest/ContestScoreboardPage.tsx`, `src/pages/operator/OperatorScoreboardPage.tsx`, `src/domains/submissionScoreboard/api.ts`
- 문제: queryFn 내부에서 `scoreboard:wait`를 호출하면서 `refetchInterval: 1_000`을 함께 사용한다.
- 왜 문제인가: wait endpoint는 기본 4초 대기다. TanStack Query가 같은 query의 중복 fetch를 어느 정도 막더라도, 느린 네트워크/탭 다중 열림 상황에서는 서버 연결이 많아질 수 있다.
- 개선 방향: long polling을 쓸 때는 `refetchInterval`을 제거하고 query 완료 후 즉시 다음 wait를 스케줄링하는 hook으로 통합한다. 단순 polling을 쓸 때는 wait endpoint 대신 일반 endpoint를 쓴다.
- 예상 수정 난이도: 중간
- 우선순위: 높음

### [Medium] API 에러 메시지가 사용자 화면에 과도하게 직접 노출된다

- 위치: `src/shared/api/errors.ts`, `src/pages/*`
- 문제: `formatApiError()`가 fallback 뒤에 서버 message, code, HTTP status, request_id를 붙인다.
- 왜 문제인가: 운영자 화면에서는 진단에 유용하지만, 공개/참가자 화면에서는 서버 내부 메시지, 이메일 충돌 정보, request_id가 불필요하게 노출될 수 있다.
- 개선 방향: `formatUserError`, `formatOperatorError`, `formatDebugError`로 분리한다. 공개 화면은 친화 문구와 재시도 안내, 운영자/관리자 화면은 접을 수 있는 상세를 제공한다.
- 예상 수정 난이도: 낮음
- 우선순위: 중간

### [Medium] 서버 응답 타입을 런타임 검증 없이 단언한다

- 위치: `src/shared/api/client.ts`, `src/domains/*/api.ts`, `src/domains/contestAdministration/types.ts`
- 문제: `return (result.payload as DataEnvelope<T>).data as T`처럼 envelope와 data shape을 신뢰한다.
- 왜 문제인가: 백엔드 응답이 `data` 누락, 부분 필드, union 변경을 내보내면 페이지가 런타임에서 깨진다. `ContestFormatType | string`처럼 느슨한 필드도 늘어나는 중이다.
- 개선 방향: 주요 auth/session 응답, contest/workspace, submission/scoreboard 응답부터 Zod 또는 수동 guard를 둔다. 전체를 한 번에 검증하기보다 인증/권한 관련 응답부터 시작한다.
- 예상 수정 난이도: 중간
- 우선순위: 중간

### [Medium] 공통 UI 컴포넌트가 부족해 버튼/모달/폼 스타일이 페이지마다 분산된다

- 위치: `src/pages/admin/*`, `src/pages/operator/*`, `src/components/admin/AdminShell.tsx`, `src/components/operator/OperatorShell.tsx`
- 문제: `AdminPanel`과 `OperatorPanel`은 거의 같은 구조이고, confirm modal, picker modal, table empty state, input style이 페이지별로 반복된다.
- 왜 문제인가: 디자인 변경이나 접근성 보강이 페이지별 작업이 된다. 새 기능을 빠르게 추가할수록 UI 일관성이 깨질 가능성이 높다.
- 개선 방향: `src/shared/ui/Button.tsx`, `Modal.tsx`, `Panel.tsx`, `TextField.tsx`, `SelectField.tsx`, `EmptyState.tsx`, `StatusPill.tsx`를 점진 도입한다.
- 예상 수정 난이도: 중간
- 우선순위: 중간

## 3. 파일/폴더별 상세 리뷰

### pages

- 현재 상태: 공개, 참가자, 운영자, 관리자 화면이 모두 `src/pages` 아래에 있다. 기능 구현은 빠르게 완성됐지만 몇몇 페이지가 너무 커졌다.
- 좋은 점: API 호출은 대부분 `domains/*/api.ts`로 빠져 있고, TanStack Query를 사용한다. `ContestPageShell`, `OperatorAccessGate`, `AdminAccessGate`로 큰 접근 흐름을 감싼 점은 좋다.
- 문제점: `OperatorProblemsPage.tsx`, `OperatorParticipantsPage.tsx`, `OperatorSettingsPage.tsx`, `ContestBoardPage.tsx`, `AdminJudgePage.tsx`는 페이지 파일이 form, modal, table, validation, mutation, derived state를 모두 가진다.
- 개선 제안: 페이지별 `features` 디렉터리를 만든다. 예를 들어 문제 관리는 `ProblemEditorPanel`, `ProblemPackagePanel`, `ProblemPickerModal`, `ProblemPreviewModal`, `useOperatorProblemMutations`로 나눈다.

### components

- 현재 상태: layout, contest, operator, admin, common, main, ui로 나뉘어 있다.
- 좋은 점: `ContestSubmissionsTable`, `ContestScoreboardTable`, `ProblemStatementPanel`, `ProblemSubmitPanel`처럼 도메인 재사용 컴포넌트가 있다.
- 문제점: `AdminShell`과 `OperatorShell`의 Panel/Metric/Tabs/Icon 패턴이 유사하다. 아이콘이 수동 SVG로 각 파일에 흩어져 있다. Modal 공통 컴포넌트가 없어 페이지마다 dialog 구조가 반복된다.
- 개선 제안: `ManagementPanel`, `MetricCard`, `ManagementTabs`, `ConfirmModal`, `PickerModal`을 공통화하고 tone만 props로 받는다. 아이콘은 lucide 같은 라이브러리를 도입하거나 내부 icon set을 단일화한다.

### hooks

- 현재 상태: `useDocumentVisibility`, `useAutoRefresh`, `useContestParticipantSession`이 있다.
- 좋은 점: document visibility와 participant session 중복 생성 방지는 방향이 좋다.
- 문제점: `useAutoRefresh`는 거의 쓰이지 않고 실제 polling은 페이지에 직접 들어간다. `useContestParticipantSession`은 session 생성과 token 선택을 같이 하며, API client의 자동 token 선택과 책임이 겹친다.
- 개선 제안: `useContestProblems`, `useContestScoreboard`, `useSubmissionPolling`, `useOperatorDashboard` 같은 query hook으로 page-local query를 이동한다.

### api

- 현재 상태: 기능별 `domains/*/api.ts`로 분리되어 있다. API base와 refresh 처리는 `shared/api/client.ts`가 담당한다.
- 좋은 점: page 내부 fetch는 거의 없고 API 함수명도 대체로 명확하다. FormData 처리와 presigned upload도 API 모듈에 있다.
- 문제점: `apiRequest<T>`가 응답 shape을 신뢰하고 token 선택/refresh/session clear까지 모두 담당한다. `getStorageObjectText()`는 `API_BASE_URL` 대신 `/api`를 직접 사용한다.
- 개선 제안: API client를 `rawFetch`, `authorizedFetch`, `refreshManager`, `responseParser`로 분리한다. `getStorageObjectText()`도 `API_BASE_URL`을 사용하거나 storage client로 이동한다.

### types

- 현재 상태: `domains/*/types.ts`에 주요 타입이 있다.
- 좋은 점: Contest, Problem, Submission, ParticipantTeam 등 핵심 도메인 타입은 정의되어 있다.
- 문제점: `status: string`, `ContestFormatType | string`, API envelope 단언 등 느슨한 부분이 많다. 백엔드 변경을 컴파일 단계에서 잡기 어렵다.
- 개선 제안: 인증/세션/권한/제출 상태처럼 화면 제어에 직접 쓰는 값은 union type을 강화하고 unknown fallback 처리 함수를 둔다.

### utils

- 현재 상태: `src/shared/lib/dateTime.ts`, `files.ts`, `src/utils/Icons.tsx`, `iconRegistry.ts`가 있다.
- 좋은 점: 파일 hash, 날짜 포맷, SVG registry가 분리되어 있다.
- 문제점: `SvgIcon`은 `dangerouslySetInnerHTML`을 사용한다. 현재는 내부 `Arrow.svg?raw`만 쓰므로 위험이 제한적이지만, registry에 외부 입력을 넣으면 XSS 위험이 커진다.
- 개선 제안: registry는 내부 asset only 원칙을 문서화하고, 가능하면 raw SVG 삽입 대신 React SVG component import 방식을 검토한다.

### styles

- 현재 상태: Tailwind v4와 `index.css`의 theme/base/utility를 사용한다.
- 좋은 점: Pretendard, 브랜드 컬러, 버튼 cursor, emergency marquee가 전역에서 관리된다.
- 문제점: Pretendard를 `cdn.jsdelivr.net`에서 import한다. 외부 CDN 장애/네트워크 정책에 영향을 받는다. Tailwind class가 페이지별로 길게 반복된다.
- 개선 제안: 폰트 self-host 또는 시스템 폰트 fallback 정책을 확정한다. Button/Input/Panel class를 공통 컴포넌트로 흡수한다.

### router

- 현재 상태: `routeConfig.ts` 배열을 `AppRoutes.tsx`가 순회한다.
- 좋은 점: 라우트 목록이 한 곳에 있고 404 route가 있다.
- 문제점: 모든 페이지를 정적 import한다. route metadata가 없어 인증/권한 요구사항을 라우터에서 알 수 없다.
- 개선 제안: lazy route와 access metadata를 도입한다.

### auth/session

- 현재 상태: Zustand store, sessionStorage wrapper, tab sync, refresh in-flight dedupe가 있다.
- 좋은 점: refresh token을 저장소에 persist하지 않는 방향은 좋다. 로그아웃 시 `clearSessions()`와 `queryClient.clear()`도 있다.
- 문제점: access token은 storage에 남는다. API client의 token 자동 선택이 복잡하다. general/operator/participant session 책임 경계가 아직 명확하지 않다.
- 개선 제안: access token 저장 전략을 확정하고, token 선택은 호출부 또는 auth query hook에서 명시화한다.

### config

- 현재 상태: Vite, strict TS, ESLint recommended, React Hooks lint, Prettier가 있다.
- 좋은 점: `strict`, `noUnusedLocals`, `noUnusedParameters`가 켜져 있고 lint/typecheck가 통과한다.
- 문제점: 번들 분석, test runner, e2e, CI 설정은 보이지 않는다. Vite dev proxy가 고정 백엔드 `https://judge.zerone01.kr`를 본다.
- 개선 제안: `npm run analyze`, Playwright smoke, CI에서 lint/typecheck/build를 실행한다. dev proxy target은 env로 분리한다.

## 4. API 및 상태 관리 리뷰

### API 호출 구조

- 현재 API 함수는 `domains/contestAdministration/api.ts`, `problemManagement/api.ts`, `submissionScoreboard/api.ts`, `teamParticipation/api.ts`, `serviceCommunication/api.ts`, `auditMonitoring/api.ts`, `identityAccess/api.ts`로 나뉜다.
- 페이지 내부에 직접 `fetch`를 쓰는 경우는 거의 없고, 이 점은 좋다.
- 다만 `shared/api/client.ts`가 base URL, credentials, auth header, refresh, token replacement, envelope parsing, session clear까지 맡는다. 장애 원인을 추적하기 어렵고 보안 로직 변경이 부담스럽다.

### 에러 처리

- `ApiClientError`와 `formatApiError()`가 있어 최소 통일성은 있다.
- 공개 화면과 운영 화면이 같은 formatter를 공유하면서 서버 메시지가 그대로 드러난다.
- 개선은 formatter를 사용자용/운영자용으로 분리하는 것이다.

### 로딩 처리

- `PageNotice`로 loading/error/empty를 표시하는 패턴이 있다.
- 다만 skeleton이나 table-level loading은 부족하다. 긴 관리 페이지에서 상단 query 하나가 늦을 때 어떤 영역이 로딩인지 구분이 약하다.

### 캐싱 전략

- 전역 `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: true`는 일반적인 기본값이다.
- contest query keys는 token/participant division을 포함해 비교적 안전하다.
- operator/admin query keys는 token/identity를 거의 포함하지 않아 개선이 필요하다.

### mutation 후 갱신 전략

- 주요 mutation은 `invalidateQueries`를 호출한다.
- 문제는 query key가 페이지별 문자열 배열로 흩어져 있어 오타와 누락 위험이 있다. operator/admin도 query key factory가 필요하다.

### 중복 요청 가능성

- `useContestParticipantSession`은 participant session 생성 중복을 `Map`으로 막는다.
- 그러나 contest shell prefetch, 페이지 query, `refetchInterval`이 함께 돌면서 notices/questions/problems/scoreboard가 중복될 수 있다.
- long polling과 interval의 조합은 특히 다시 설계하는 편이 좋다.

### polling/long polling 적용 여부

- 공개 notices/contests/main: 15초 polling
- judge status/admin judge: document visibility 기준 5초 polling
- contest submissions/operator submissions: pending 여부에 따라 3초 또는 15초 polling
- contest/operator scoreboard: wait endpoint + 1초 interval
- 제출 status wait: operator submissions effect와 test submission mutation에서 사용

실시간성이 필요한 데이터에 갱신은 들어가 있지만 정책이 페이지마다 직접 구현되어 있다. 공통 hook으로 묶을 가치가 높다.

### 서버 응답 타입 안정성

- TypeScript 타입은 있으나 런타임 검증은 거의 없다.
- auth/session 응답만이라도 guard를 강화해야 한다. 현재 `mapStaffSession`은 일부 guard가 있지만 `mapGeneralSession`은 더 느슨하다.

## 5. UI/UX 리뷰

### 공통 UI 일관성

- 기본 색상과 panel/card 스타일은 대체로 일관적이다.
- 다만 admin은 violet, operator는 indigo로 나뉘고 구조가 유사한데 구현이 중복된다.
- Button, Modal, Field, Table, StatusPill 공통화가 필요하다.

### 반응형 대응

- `grid`, `overflow-x-auto`, `flex-wrap`를 잘 사용하고 있다.
- 대형 관리 페이지는 모바일에서 기능은 보이겠지만 긴 form과 table이 이어져 조작 피로가 크다.
- 문제 프리뷰 모달처럼 큰 모달은 모바일에서 제출 패널과 본문 순서/스크롤 UX를 별도 확인해야 한다.

### 접근성

- 주요 clickable은 대부분 `button`/`Link`를 사용한다.
- 모달에 `role="dialog"`와 `aria-modal`은 있으나 focus trap, ESC close, background scroll lock은 없다.
- 아이콘 버튼의 aria-label은 일부만 있다.

### 로딩/에러/빈 상태

- `PageNotice`와 dashed empty state가 여러 곳에 있다.
- 하지만 페이지마다 문구와 스타일이 다르고, table 내부 loading state는 부족하다.

### 사용자가 헷갈릴 수 있는 흐름

- 문제 생성 프리뷰는 저장 전에도 지문 preview는 가능하지만 테스트 제출은 저장된 문제만 가능하다. 안내는 추가됐지만 UX상 "저장 전 테스트 제출 불가"를 더 명확하게 버튼 disabled 사유로 보여주는 편이 좋다.
- 대회 참가 접근 차단은 modal로 처리되는데, 로그인/참가 권한 상태가 바뀐 경우 사용자가 왜 막혔는지 문구가 더 구체적이면 좋다.

### 디자인 시스템 후보

- `Button`: variant, tone, size, loading, disabledReason
- `Modal`: confirm, picker, detail, full-screen preview
- `Panel`: admin/operator tone 통합
- `Field`: TextInput, Select, Textarea, FileInput
- `DataTable`: column render, row key, empty/loading/error
- `StatusPill`: submission, contest, package, permission

## 6. 보안 리뷰

### 토큰 저장 방식

- refresh token은 저장소에 persist하지 않는다.
- access token은 `sessionStorage`에 저장한다. 실제 운영에서는 XSS 대응과 token TTL 정책이 중요하다.

### refresh 처리

- refresh in-flight dedupe가 있어 중복 refresh를 줄인다.
- staff/general/participant refresh가 하나의 client에 섞여 있고, 저장소 token 우선순위가 복잡하다.
- refresh 실패 시 session clear는 있지만 사용자가 왜 로그아웃됐는지 UX는 약하다.

### 인증 라우팅

- page-level gate는 있으나 route-level guard는 없다.
- 기능이 늘어날수록 gate 누락이 가장 현실적인 위험이다.

### XSS 가능성

- `MarkdownPreview`는 raw HTML을 활성화하지 않으므로 일반 문제 지문 HTML은 escape된다.
- `SvgIcon`은 `dangerouslySetInnerHTML`을 쓰지만 내부 registry만 사용한다. 이 제한을 유지해야 한다.
- KaTeX 렌더링을 위해 `rehype-sanitize`를 제거했으므로 Markdown raw HTML 비활성 상태를 계속 유지해야 한다.

### 민감 정보 노출

- `console.log`는 발견되지 않았다.
- API 에러에 request_id와 서버 message가 UI에 노출된다. 공개 화면에서는 줄이는 편이 좋다.

### env 사용

- `.env.example`은 `VITE_API_BASE_URL=/api`만 있다.
- Vite의 `VITE_` 변수는 클라이언트에 노출된다는 점이 README에 설명되어 있다.

### API 에러 노출

- 운영자 화면에는 유용하지만 참가자/공개 화면에는 과하다.
- error code별 사용자 문구 매핑이 필요하다.

### 로그아웃 처리

- 로그아웃 확인 모달, 서버 revoke 시도, 로컬 session clear, query cache clear가 있다.
- server revoke 실패를 무시하고 로컬 정리를 보장하는 점은 좋다.

## 7. 리팩토링 제안

### 제안 1

- 대상: `src/routes`
- 현재 문제: 모든 페이지 정적 import, route-level auth metadata 없음
- 바꿀 구조:

```text
src/routes/
  routeConfig.ts
  AppRoutes.tsx
  guards/
    ProtectedRoute.tsx
    ContestPermissionRoute.tsx
```

- 코드 방향: route config에 `lazy`, `access`, `permission`을 추가하고 `Suspense`로 감싼다.
- 기대 효과: 초기 번들 감소, 접근 제어 누락 방지, route 구조 가독성 향상

### 제안 2

- 대상: `src/shared/api/client.ts`
- 현재 문제: token 선택, refresh, parsing, session clear가 한 파일에 집중
- 바꿀 구조:

```text
src/shared/api/
  client.ts
  refreshManager.ts
  responseParser.ts
  queryKey.ts
src/domains/identityAccess/
  tokenProvider.ts
```

- 기대 효과: 인증 장애 디버깅 쉬움, token 혼선 감소, 테스트 가능성 증가

### 제안 3

- 대상: operator/admin query
- 현재 문제: query key가 문자열 배열로 산발적이고 identity 미포함
- 바꿀 구조:

```text
src/domains/operator/queryKeys.ts
src/domains/admin/queryKeys.ts
```

- 코드 방향: `operatorQueryKeys.dashboard(contestId, staffEmail)`처럼 factory를 만든다.
- 기대 효과: invalidate 누락 감소, account switch stale data 방지

### 제안 4

- 대상: `src/pages/operator/OperatorProblemsPage.tsx`
- 현재 문제: 1211줄 페이지가 editor/package/preview/upload/test submission을 모두 담당
- 바꿀 구조:

```text
src/features/operatorProblems/
  OperatorProblemsPageContent.tsx
  ProblemEditorPanel.tsx
  ProblemPackagePanel.tsx
  ProblemPickerModal.tsx
  ProblemPreviewModal.tsx
  useOperatorProblemQueries.ts
  useOperatorProblemMutations.ts
```

- 기대 효과: 변경 단위 축소, 문제 관리 기능 추가 비용 감소

### 제안 5

- 대상: polling/long polling
- 현재 문제: `refetchInterval`, wait API, visibility 체크가 페이지별 구현
- 바꿀 구조:

```text
src/domains/submissionScoreboard/hooks/
  useScoreboardLiveQuery.ts
  useSubmissionStatusPolling.ts
src/shared/hooks/
  useVisibleIntervalQuery.ts
```

- 기대 효과: 서버 부하 정책 통일, hidden tab 요청 감소, 실시간 기능 유지보수 향상

### 제안 6

- 대상: UI
- 현재 문제: button/input/modal/table 스타일 반복
- 바꿀 구조:

```text
src/shared/ui/
  Button.tsx
  Modal.tsx
  FormField.tsx
  Panel.tsx
  EmptyState.tsx
  StatusPill.tsx
```

- 기대 효과: UI 일관성, 접근성 보강, 페이지 JSX 축소

## 8. 바로 적용 가능한 수정 목록

- `routeConfig.ts`를 `React.lazy` 기반으로 바꿔 초기 번들을 줄인다.
- operator/admin query key에 `session.staff.email` 또는 token fingerprint를 포함한다.
- `shared/api/client.ts`의 `preferredStoredTokenForRequest()`가 명시 token을 덮어쓰지 않게 수정한다.
- `getStorageObjectText()`의 hard-coded `/api`를 `API_BASE_URL` 기반으로 바꾼다.
- `formatApiError()`를 공개 사용자용과 운영자용으로 나눈다.
- `ContestScoreboardPage.tsx`의 wait endpoint + 1초 interval 조합을 공통 long polling hook으로 바꾼다.
- 모달에 ESC close, focus trap, initial focus를 추가한다.
- `AdminPanel`/`OperatorPanel`을 공통 `Panel`로 통합한다.
- `OperatorProblemsPage.tsx`에서 `ProblemPickerModal`, `ProblemPreviewModal`, `ProblemPackagePanel`을 별도 파일로 분리한다.
- `OperatorParticipantsPage.tsx`의 팀 등록/팀원 추가/일괄 등록 form validation을 Zod로 통일한다.
- 공개/참가자 화면의 API 에러는 서버 message 대신 사용자 친화 문구로 매핑한다.
- `src/utils/Icons.tsx`의 raw SVG registry 사용 원칙을 코드 주석 또는 docs에 명시한다.
- external font CDN 의존 여부를 결정하고 self-host를 검토한다.
- Playwright smoke test를 추가해 로그인, 대회 문제, 제출, 운영자 문제 프리뷰, 로그아웃을 확인한다.
- CI에서 `npm run lint`, `npm run typecheck`, `npm run build`를 필수로 실행한다.

## 9. 최종 결론

지금 상태로 제한된 내부 베타나 운영자 동행 테스트는 가능하다. 다만 공개 서비스로 바로 올리기에는 인증/세션 token 처리, route-level 접근 제어, 초기 번들 크기, 관리 페이지 유지보수성이 위험하다.

가장 위험한 부분은 access token storage와 API client의 저장소 token 자동 대체가 결합된 세션 혼선 가능성이다. XSS가 없다는 전제에서는 당장 장애가 나지 않을 수 있지만, 운영자/관리자 권한이 있는 서비스에서는 출시 전 반드시 보수적으로 정리해야 한다.

출시 전 최소 필수 수정:

1. API client token 우선순위와 operator/admin query key identity 포함
2. route-level access metadata와 guard 추가
3. route lazy loading 및 Monaco lazy loading
4. scoreboard long polling 정책 정리
5. 공개 화면 API 에러 노출 축소
6. refresh token httpOnly cookie E2E 확인

이후 고도화 단계:

1. operator/admin 대형 페이지 feature 단위 분리
2. 공통 UI 컴포넌트와 디자인 token 정리
3. Zod 기반 응답/폼 validation 확대
4. polling/live query hook 통합
5. Playwright 기반 핵심 사용자 흐름 테스트
