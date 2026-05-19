# 프로젝트 종합 리뷰

갱신일: 2026-05-18

검토 범위: `package.json`, Vite/ESLint 설정, 라우터, 전역 Provider, API 클라이언트, auth/session 저장소, TanStack Query 사용부, `pages`, `components`, `domains`, `shared`, `utils`, `styles`, `assets`, `docs`.

이 문서는 실제 출시 전 점검 기준으로 작성했다. 단순 문법 문제보다 운영 중 장애, 인증/세션 안정성, UI 일관성, 유지보수성, 성능 비용을 우선해 판단했다.

## 1. 전체 평가

- 코드 상태: 보통
- 구조 설계: 보통
- UI 일관성: 보통
- API 설계: 보통
- 인증/세션: 위험
- 성능: 보통
- 보안: 위험
- 유지보수성: 위험
- 실제 서비스 준비도: 위험

현재 구조는 React 19, Vite, TanStack Query, Zustand, domain별 API 모듈로 기본 골격은 괜찮다. `src/routes/routeConfig.ts`, `src/shared/api/client.ts`, `src/domains/*/api.ts`, `src/components/*`로 책임이 나뉘어 있고 route lazy loading도 적용되어 있다.

다만 실제 서비스 출시 기준으로는 큰 페이지 파일, 폼 검증 편차, action 단위 권한 검증 부족, refresh token 운용 방식의 백엔드 의존성, 일부 polling의 hidden-state 최적화 부족, 공통 UI 컴포넌트 미흡이 가장 큰 리스크다.

## 2. 가장 먼저 고쳐야 할 문제 TOP 10

### [Critical] refresh token 수명과 저장 방식이 백엔드 cookie 정책에 강하게 의존함

- 위치: `src/domains/identityAccess/sessionStorage.ts`, `src/shared/api/client.ts`, `src/app/providers/SessionRefreshProvider.tsx`
- 문제: refresh token은 저장 시 sessionStorage에 남기지 않고 `volatileGeneralSession` 메모리에만 유지한다. 새로고침 후에는 refresh token이 사라지고, 백엔드가 httpOnly cookie를 정확히 제공하지 않으면 silent refresh가 실패한다.
- 왜 문제인가: 사용자가 대회 중 새로고침하거나 장시간 머무르면 세션 갱신 실패 가능성이 있다. access token은 sessionStorage에 남기 때문에 XSS 발생 시 탈취 위험도 남는다.
- 개선 방향: 백엔드와 계약을 확정해야 한다. 권장 구조는 refresh token은 httpOnly Secure SameSite cookie, 프론트는 access token만 짧게 보관 또는 메모리 보관, refresh endpoint는 cookie 기반으로 동작하도록 고정하는 것이다. 현재 구조를 유지한다면 새로고침 후 refresh 가능 여부를 E2E로 검증해야 한다.
- 예상 수정 난이도: 중간
- 우선순위: 높음

### [High] 운영자/관리자 action 단위 권한 차단이 부족함

- 위치: `src/components/operator/OperatorShell.tsx`, `src/components/admin/AdminShell.tsx`, `src/pages/operator/*`, `src/pages/admin/*`
- 문제: route-level guard와 tab filtering은 있지만, 각 mutation 버튼과 submit handler가 권한별로 일관되게 막히는 구조는 아니다.
- 왜 문제인가: UI에 보이지 않는 버튼이라도 직접 route 접근, 상태 조작, 오래된 화면 상태에서 mutation이 호출될 수 있다. 서버가 최종 권한 검사를 해야 하지만 프론트도 사용자 흐름을 막아야 한다.
- 개선 방향: `useOperatorPermission(contestId, permission)` 같은 hook을 만들고, 각 mutation 버튼과 handler 앞에서 동일하게 차단한다. 서버 403은 `PageNotice`로 명확히 표시한다.
- 예상 수정 난이도: 중간
- 우선순위: 높음

### [High] 대형 페이지 파일이 UI, validation, API orchestration을 모두 들고 있음

- 위치: `src/pages/operator/OperatorProblemsPage.tsx` 약 1284줄, `OperatorSettingsPage.tsx` 약 747줄, `OperatorParticipantsPage.tsx` 약 729줄, `ContestBoardPage.tsx` 약 613줄, `AdminJudgePage.tsx` 약 578줄
- 문제: 한 파일 안에 form state, validation, query/mutation, modal, list rendering, preview, 업로드 로직이 섞여 있다.
- 왜 문제인가: 작은 UI 변경도 넓은 파일을 건드리게 되고, 버그 수정 시 영향 범위를 추적하기 어렵다. 운영자 문제 관리처럼 업로드/빌드/테스트 제출이 얽힌 화면은 회귀 위험이 특히 크다.
- 개선 방향: 페이지를 container로 유지하고 `features/operator-problems/*` 하위에 form, package panel, picker modal, preview modal, hooks를 분리한다.
- 예상 수정 난이도: 높음
- 우선순위: 높음

### [High] 서버 응답 runtime validation이 거의 없음

- 위치: `src/domains/*/api.ts`, `src/domains/*/types.ts`, `src/shared/api/client.ts`
- 문제: API 응답을 TypeScript generic으로만 단언한다. `apiRequest<Problem[]>`처럼 컴파일 타입은 있지만 런타임 payload 검증은 없다.
- 왜 문제인가: 서버 필드가 누락되거나 union shape가 바뀌면 화면에서 조용히 깨진다. 특히 contest status, submission status, staff permission, problem document meta는 운영 중 변경 가능성이 크다.
- 개선 방향: 로그인/session, contest detail, submission, operator dashboard부터 zod schema 또는 최소 type guard를 적용한다.
- 예상 수정 난이도: 중간
- 우선순위: 높음

### [High] SVG raw 삽입이 XSS 관점에서 안전 계약에 의존함

- 위치: `src/utils/Icons.tsx`, `src/utils/iconRegistry.ts`
- 문제: `dangerouslySetInnerHTML`로 raw SVG를 삽입한다.
- 왜 문제인가: 현재는 repo 내부 SVG만 import하므로 즉시 취약점은 낮다. 하지만 외부 업로드 SVG나 원격 아이콘으로 확장되면 스크립트 삽입 위험이 커진다.
- 개선 방향: repo 내부 static SVG만 허용한다는 주석/테스트를 추가하거나 SVGR 방식으로 React component import를 사용한다. `getIconMarkup`은 외부 입력을 절대 받지 않게 유지한다.
- 예상 수정 난이도: 낮음
- 우선순위: 높음

### [Medium] polling 정책이 화면별로 흩어져 있음

- 위치: `ContestPageShell.tsx`, `ContestOverviewPage.tsx`, `ContestProblemsPage.tsx`, `ContestBoardPage.tsx`, `ContestSubmissionsPage.tsx`, `OperatorSubmissionsPage.tsx`, `AdminJudgePage.tsx`, `JudgeStatusPage.tsx`
- 문제: 일부 화면은 `useDocumentVisibility`로 hidden polling을 막지만, 공지/질문/공개 목록 등은 `refetchInterval`만 있고 visibility 조건이 없다.
- 왜 문제인가: 탭을 오래 열어둔 사용자가 많아지면 불필요한 요청이 누적된다. 대회 당일에는 scoreboard/submission/judge status만 실시간성이 높고, 공지/목록은 낮은 주기로 충분하다.
- 개선 방향: `useVisibleRefetchInterval(baseMs)` 또는 query option factory를 만들고 실시간성 등급별 주기를 통일한다.
- 예상 수정 난이도: 낮음
- 우선순위: 중간

### [Medium] query key에 token 원문이 포함되는 곳이 있음

- 위치: `src/domains/contestRuntime/queryKeys.ts`
- 문제: contest participant query key에 `generalToken`, `participantToken` 원문이 들어간다. operator/admin 쪽은 `tokenQueryIdentity()`를 사용하지만 contest runtime은 아직 원문 token 기반이다.
- 왜 문제인가: TanStack Query devtools, 로그, 메모리 스냅샷에서 token이 노출될 가능성이 있다. 또한 token 갱신마다 query cache가 과하게 분리된다.
- 개선 방향: contest runtime query key도 `tokenQueryIdentity(token)` 또는 session id/fingerprint로 바꾼다.
- 예상 수정 난이도: 낮음
- 우선순위: 중간

### [Medium] 폼 검증 방식이 화면마다 다름

- 위치: `src/pages/auth/LoginPage.tsx`, `src/pages/operator/*`, `src/pages/admin/*`
- 문제: 로그인은 `react-hook-form` + zod를 사용하지만 운영자/관리자 폼은 대부분 수동 문자열 검사다.
- 왜 문제인가: 이메일 형식, 날짜 순서, 점수/시간 범위, 역할 값 같은 검증이 화면마다 다르게 동작할 수 있다.
- 개선 방향: 즉시 모든 폼을 바꾸기보다 contest settings, participants import, problem form부터 zod schema를 도입한다.
- 예상 수정 난이도: 중간
- 우선순위: 중간

### [Medium] 공통 UI 컴포넌트 사용 범위가 좁음

- 위치: `src/shared/ui/DataTable.tsx`, `PageNotice.tsx`, `SubmissionStatusBadge.tsx`, `src/pages/operator/*`, `src/pages/admin/*`
- 문제: `DataTable`이 있지만 많은 페이지는 직접 table/card/button/modal class를 반복한다. modal, button, panel, form field가 공통화되어 있지 않다.
- 왜 문제인가: hover/focus/disabled/loading 상태가 페이지마다 다르게 구현되고, 디자인 변경 비용이 커진다.
- 개선 방향: `Button`, `Modal`, `FormField`, `StatusPill`, `Panel`, `ScrollableTable`을 현재 스타일에 맞춰 작은 단위부터 도입한다.
- 예상 수정 난이도: 중간
- 우선순위: 중간

### [Low] 빌드/배포 설정에서 production API 계약이 문서화되어 있지 않음

- 위치: `vite.config.ts`, `src/shared/api/client.ts`, docs
- 문제: dev server는 `/api`를 `https://judge.zerone01.kr`로 proxy하지만 production은 `VITE_API_BASE_URL ?? '/api'`에 의존한다.
- 왜 문제인가: 배포 환경에서 reverse proxy가 없거나 CORS/cookie 설정이 다르면 인증이 실패한다.
- 개선 방향: `.env.example`과 배포 README에 `VITE_API_BASE_URL`, cookie domain, SameSite, credentials 정책을 명시한다.
- 예상 수정 난이도: 낮음
- 우선순위: 중간

## 3. 파일/폴더별 상세 리뷰

### pages

- 현재 상태: 공개 페이지, 대회 참가자 페이지, 운영자 페이지, 관리자 페이지로 구분되어 있다. TanStack Query와 mutation은 대부분 page 내부에서 직접 선언한다.
- 좋은 점: page entry가 명확하고 route lazy loading이 적용되어 있다. `OperatorAccessGate`, `AdminAccessGate`, `ContestPageShell` 같은 상위 guard가 있다.
- 문제점: `OperatorProblemsPage.tsx`, `OperatorParticipantsPage.tsx`, `OperatorSettingsPage.tsx`, `AdminJudgePage.tsx`가 너무 크다. 일부 페이지는 validation, query, mutation, modal, table, form이 한 파일에 섞여 있다.
- 개선 제안: 대형 페이지부터 feature 폴더로 분리한다. 예: `features/operator-problems/useProblemEditor.ts`, `ProblemEditorForm.tsx`, `PackageStatusPanel.tsx`, `ProblemPickerModal.tsx`, `ProblemPreviewModal.tsx`.

### components

- 현재 상태: layout, main, contest, admin, operator, ui로 나뉘어 있다.
- 좋은 점: contest problem/submissions/scoreboard 일부는 잘게 나뉘어 있고, header/footer/layout도 별도 컴포넌트다.
- 문제점: button/modal/form/table의 공통 레이어가 부족해서 페이지마다 Tailwind class가 반복된다. `SvgIcon`은 raw SVG 삽입 방식이다.
- 개선 제안: 공통 `Button`, `Modal`, `FormField`, `StatusPill`, `Panel`을 만들고 새 화면부터 적용한다. `SvgIcon`은 static SVG 전용임을 명시하거나 SVGR로 전환한다.

### hooks

- 현재 상태: `useDocumentVisibility`, `useAutoRefresh`, `useContestParticipantSession`이 있다.
- 좋은 점: visible 상태 기반 polling 최적화가 일부 화면에 적용되어 있다. 참가자 세션 생성도 hook으로 모아져 있다.
- 문제점: polling interval 로직은 page마다 흩어져 있고 `useAutoRefresh`는 cooldown/tick/autoRefresh가 한 파일에 섞여 이름 대비 범위가 넓다.
- 개선 제안: `shared/hooks/useVisiblePolling.ts`, `useClockTick.ts`, `useCooldown.ts`로 분리한다.

### api

- 현재 상태: `domains/*/api.ts`로 기능별 API 함수가 분리되어 있다. `shared/api/client.ts`에서 fetch, credentials, 401 refresh, page response를 처리한다.
- 좋은 점: 페이지 내부 직접 fetch는 거의 없고 API 모듈을 통한다. FormData content-type 처리, credentials 포함, 401 retry, refresh 중복 방지가 들어 있다.
- 문제점: API 응답 validation이 없고, query key 체계가 일부는 `contestQueryKeys`, 일부는 배열 literal로 혼재한다. `apiRequest`가 인증 refresh까지 책임져 419줄로 비대하다.
- 개선 제안: `authRefresh.ts`, `request.ts`, `queryKeys.ts`로 분리하고 핵심 응답부터 schema 검증을 추가한다.

### types

- 현재 상태: domain별 `types.ts`가 있다.
- 좋은 점: contest/problem/submission/team/staff 타입이 분리되어 있어 API 함수 시그니처는 비교적 명확하다.
- 문제점: 서버 enum 값이 대부분 string으로 남아 있다. `status`, `visibility`, `role` 등은 실제 허용값이 더 명확해야 한다.
- 개선 제안: 서버 enum은 union type으로 좁히고 unknown fallback 처리 함수를 둔다. submission status는 `status.ts` 같은 mapper와 타입을 더 강하게 연결한다.

### utils

- 현재 상태: icon registry와 `SvgIcon`이 있다.
- 좋은 점: 아이콘 파일명과 사용처를 registry로 통합한 점은 좋다.
- 문제점: raw markup 삽입 구조라 확장 시 XSS 계약을 문서화해야 한다.
- 개선 제안: 내부 static asset 전용으로 제한하거나 SVGR 전환을 검토한다.

### styles

- 현재 상태: Tailwind v4 중심이고 `src/index.css`에 Pretendard CDN import, theme color, base cursor rule, marquee animation이 있다.
- 좋은 점: 전역 cursor rule로 disabled가 아닌 button cursor를 통일했다.
- 문제점: 외부 CDN font는 네트워크 실패 시 폰트 경험이 달라진다. 긴급공지 marquee 속도는 CSS 유틸 하나에 고정되어 화면별 조정이 어렵다.
- 개선 제안: font self-host 여부를 결정하고, marquee duration을 CSS variable로 받을 수 있게 한다.

### router

- 현재 상태: `routeConfig.ts`가 lazy component와 access metadata를 가진다. `AppRoutes.tsx`에서 `RouteAccessGuard`로 admin/operator 접근을 막는다.
- 좋은 점: route-level code splitting과 접근 제어가 한 곳에서 보인다. 404 route도 있다.
- 문제점: contest participant 접근은 각 페이지의 `ContestPageShell`/logic에 분산되어 있다. 로그인 redirect 후 `next` 처리도 제한적으로 보인다.
- 개선 제안: public/operator/admin/participant access policy를 문서화하고, login 후 `next` 복귀 흐름을 일관화한다.

### auth/session

- 현재 상태: Zustand store와 sessionStorage, volatile refresh token, 401 refresh retry, session sync provider, session refresh provider가 있다.
- 좋은 점: refresh in-flight promise로 중복 refresh를 막고, logout 시 query cache clear가 적용되어 있다.
- 문제점: access token은 sessionStorage에 저장된다. refresh token은 메모리와 cookie 동작에 의존한다. query key에 token 원문이 포함되는 contest runtime 경로가 있다.
- 개선 제안: refresh cookie 계약을 확정하고, access token은 가능하면 메모리 중심으로 줄인다. query key token 원문을 fingerprint로 교체한다.

### config

- 현재 상태: `vite.config.ts`, `eslint.config.js`, `package.json` scripts가 있다.
- 좋은 점: typecheck, lint, build script가 명확하다. Vite alias `@`가 설정되어 있다.
- 문제점: `.env.example`, production proxy/cookie 문서, 테스트 script가 없다.
- 개선 제안: `npm run test` 또는 smoke test를 추가하고 배포 환경 변수 문서를 만든다.

### 기타

- 현재 상태: assets는 정리되어 있고 큰 hero 이미지는 `hero-image.jpg` 약 112KB로 줄어 있다.
- 좋은 점: bundle에 들어가는 이미지 크기가 낮아졌다.
- 문제점: `docs` 문서가 출시 기준 체크리스트와 실제 수정 내역을 함께 담고 있어 장기적으로 분리 필요가 있다.
- 개선 제안: `frontend-hardening-result.md`는 종합 리뷰로 유지하고, 실행 backlog는 별도 `frontend-hardening-backlog.md`로 분리한다.

## 4. API 및 상태 관리 리뷰

- API 호출 구조: 기능별 `domains/*/api.ts`로 분리되어 있어 기본 구조는 좋다. `apiRequest`, `apiPageRequest`가 공통 envelope를 처리한다.
- 에러 처리: `ApiClientError`, `formatApiError`, `formatUserApiError`가 있다. 공개 화면과 운영자 화면의 에러 노출 수준을 분리하려는 방향은 좋다. 다만 운영자 화면에서도 사용자에게 너무 긴 서버 메시지를 보여주는 경우는 정리할 필요가 있다.
- 로딩 처리: `PageNotice` 기반 로딩/에러/빈 상태가 다수 화면에 있다. skeleton은 거의 없다.
- 캐싱 전략: global staleTime 30초, retry 1회다. query key는 일부 domain helper와 배열 literal이 혼재한다.
- mutation 후 갱신 전략: 대부분 `invalidateQueries`를 사용한다. 낙관적 업데이트는 거의 없는데, 현재 서비스 성격상 필수는 아니다.
- 중복 요청 가능성: session refresh는 in-flight로 막고 있다. 참가자 세션 생성도 `participantSessionRequests` map으로 중복을 줄인다. 다만 여러 페이지의 public contests/notices polling은 중복될 수 있다.
- polling/long polling 적용 여부: scoreboard/submissions/judge status는 polling과 status wait endpoint를 사용한다. WebSocket/SSE는 없다. 현재 규모에서는 단순 polling으로 충분하지만, 대회 동시 접속자가 늘면 scoreboard/submission은 SSE 또는 WebSocket을 검토할 가치가 있다.
- 서버 응답 타입 안정성: TypeScript generic만 사용하고 런타임 검증은 부족하다. auth/session부터 보강해야 한다.

## 5. UI/UX 리뷰

- 공통 UI 일관성: 전체적으로 Tailwind 기반 톤은 맞지만 button, modal, panel, form field가 페이지마다 반복 구현된다.
- 반응형 대응: 주요 table은 `overflow-x-auto`가 적용되어 있다. 대형 운영자 화면은 모바일에서 조작 가능하나 정보량이 많아 밀도가 높다.
- 접근성: 대부분 `button` 요소를 사용하고 modal에 `role="dialog"`, `aria-modal`이 있다. 다만 focus trap, ESC close, initial focus 관리가 부족하다.
- 로딩/에러/빈 상태: `PageNotice`가 있어 기본 처리는 좋다. 일부 table/list는 skeleton 없이 layout jump가 있다.
- 사용자가 헷갈릴 수 있는 흐름: 대회 참가 세션이 일반 세션에서 파생되는 구조가 UI상 명확하지 않다. token refresh 실패 시 작성 중 코드 보존 안내도 아직 없다.
- 디자인 시스템 후보: `Button`, `IconButton`, `Modal`, `FormField`, `TextArea`, `Select`, `Panel`, `StatusPill`, `DataTable`, `EmptyState`, `LoadingState`.

## 6. 보안 리뷰

- 토큰 저장 방식: access token은 sessionStorage에 저장된다. refresh token은 저장 직전 제거하고 메모리에만 유지하므로 localStorage 장기 노출은 줄였지만, XSS 시 access token 탈취 위험은 남는다.
- refresh 처리: 401 발생 시 refresh 후 재시도, in-flight promise, 사전 refresh provider가 있다. 구조는 좋아졌지만 backend cookie 기반 refresh 계약 검증이 필요하다.
- 인증 라우팅: admin/operator route guard가 있다. participant 접근은 contest logic에 분산되어 있어 문서화가 필요하다.
- XSS 가능성: Markdown은 `react-markdown` 기본 escaping과 `rehype-katex`를 사용해 상대적으로 안전하다. raw SVG `dangerouslySetInnerHTML`은 내부 asset 전용으로 제한해야 한다.
- 민감 정보 노출: `console.log`는 검색상 발견되지 않았다. 다만 query key token 원문은 devtools/메모리 노출 가능성이 있다.
- env 사용: `VITE_API_BASE_URL`만 사용한다. 클라이언트 노출 가능한 값인지 문서화해야 한다.
- API 에러 노출: 공개 화면 formatter는 축소되어 있다. 운영자 화면은 진단용 상세를 노출하는데 운영 배포에서는 권한별 노출 수준이 필요하다.
- 로그아웃 처리: logout API 호출 후 session clear, query cache clear가 있다. 서버 revoke 실패 시에도 로컬 cleanup을 수행하는 점은 좋다.

## 7. 리팩토링 제안

### 제안 1

- 대상: `src/pages/operator/OperatorProblemsPage.tsx`
- 현재 문제: 문제 생성/수정, 문서 meta, asset upload, testcase zip, package build, preview, test submission이 한 파일에 있다.
- 바꿀 구조:

```text
src/features/operator-problems/
  apiKeys.ts
  useOperatorProblems.ts
  useProblemEditor.ts
  ProblemEditorForm.tsx
  ProblemPickerModal.tsx
  ProblemPreviewModal.tsx
  PackageStatusPanel.tsx
  TestcaseUploadPanel.tsx
```

- 기대 효과: 문제 관리 기능 변경 시 파일 충돌과 회귀 위험을 줄인다.

### 제안 2

- 대상: `src/shared/api/client.ts`
- 현재 문제: fetch, envelope parsing, token selection, refresh, failed token cleanup이 한 파일에 있다.
- 바꿀 구조:

```text
src/shared/api/
  request.ts
  errors.ts
  pagination.ts
src/domains/identityAccess/
  tokenRefresh.ts
  sessionStorage.ts
  sessionStore.ts
```

- 기대 효과: 인증 refresh 로직을 테스트하기 쉬워지고 API 클라이언트 책임이 선명해진다.

### 제안 3

- 대상: operator/admin form
- 현재 문제: 수동 validation이 반복된다.
- 바꿀 구조: `src/features/*/schemas.ts`에 zod schema를 두고 page/hook에서 재사용한다.
- 기대 효과: 날짜/숫자/email/enum 검증이 통일되고 서버 에러 전 사용자의 입력 오류를 줄인다.

### 제안 4

- 대상: polling query options
- 현재 문제: `refetchInterval`과 visibility 조건이 화면마다 다르다.
- 바꿀 구조:

```ts
function visiblePolling(ms: number, enabled = true) {
  const isVisible = useDocumentVisibility();
  return enabled && isVisible ? ms : false;
}
```

- 기대 효과: hidden tab 요청 낭비를 줄이고 주기 정책을 한 곳에서 조정할 수 있다.

### 제안 5

- 대상: UI system
- 현재 문제: Button/Modal/Form/Table 스타일 반복.
- 바꿀 구조: `src/shared/ui/Button.tsx`, `Modal.tsx`, `FormField.tsx`, `StatusPill.tsx`, `Panel.tsx` 추가.
- 기대 효과: hover/focus/disabled/loading/accessibility 품질이 일관된다.

## 8. 바로 적용 가능한 수정 목록

- contest runtime query key의 token 원문을 `tokenQueryIdentity()`로 교체
- `SvgIcon`에 내부 static SVG 전용이라는 주석과 테스트 추가 또는 SVGR 전환
- `.env.example` 추가: `VITE_API_BASE_URL` 설명
- production cookie/CORS 설정 문서화
- `PageNotice` message regex 의존 제거, status prop 중심으로 단순화
- public contests/notices/board polling에 `useDocumentVisibility` 적용
- operator/admin mutation 버튼에 permission 기반 disabled/guard 추가
- `OperatorProblemsPage`를 form/panel/modal/hook으로 분리
- `OperatorParticipantsPage` 팀/멤버/bulk import schema 추가
- modal focus trap, ESC close, initial focus 보강
- 주요 화면 smoke test 추가: login, contest list, contest detail, problem submit, operator problem package, admin judge
- API 응답 guard 추가: login session, public contest detail, submission status
- docs에 auth/session/token 계약 추가

## 9. 최종 결론

지금 상태로 내부 시연이나 제한된 베타 운영은 가능하다. 하지만 공개 서비스에 바로 올리기에는 인증/세션 계약, 권한별 action 차단, 런타임 응답 검증, 대형 운영자 페이지 유지보수성 측면에서 위험이 남아 있다.

올린다면 가장 위험한 부분은 refresh token/cookie 계약이 실제 배포 환경에서 깨지는 경우와, 운영자/관리자 mutation이 화면 단위 guard에만 의존하는 부분이다.

출시 전 최소한 반드시 고쳐야 할 것은 다음이다.

- refresh token httpOnly cookie 기반 동작 E2E 검증
- contest runtime query key token 원문 제거
- operator/admin action 단위 permission guard
- auth/session 주요 응답 runtime validation
- 최소 smoke test

이후 고도화 단계에서는 operator/admin 대형 페이지 분리, 공통 UI 시스템 정리, polling 정책 통합, SSE/WebSocket 검토, modal 접근성 강화를 진행하는 것이 현실적인 순서다.
