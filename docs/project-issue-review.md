# 프로젝트 종합 리뷰

갱신일: 2026-05-17

참고 기준:

- `C:\GITHUB\demo-frontend` 커밋 `c94d40c`
- `C:\GITHUB\docs`
- `C:\GITHUB\ZOJ_frontend\docs`

검증 상태:

- `npm run typecheck`: 통과
- `npm run lint`: 통과
- `npm run build`: 통과. 단, 500kB 초과 chunk 경고가 남아 있어 code splitting 검토가 필요하다.
- 이번 점검에서 운영자 권한 gate, 운영자 게시판 답변, 참가팀 상태/멤버/삭제/file import, 문제 지원 파일/testcase set/테스트 제출, 설정 quick action, 스코어보드 wait 갱신, 헤더 반응형, SVG 아이콘 입력 범위를 보완했다.
- refresh token은 더 이상 `sessionStorage`/`localStorage`에 저장하지 않는다. refresh/logout 요청은 `credentials: include`를 사용해 httpOnly cookie 기반 전환을 받을 수 있게 했고, 기존 body 기반 refresh token은 현재 탭 메모리에서만 임시 호환한다.
- Vite production build는 Windows sandbox에서 Tailwind oxide native module 권한 문제로 한 번 실패했고, 승인 실행으로 재검증했다.

## 1. 전체 평가

- 코드 상태: 보통
- 구조 설계: 보통
- UI 일관성: 보통
- API 설계: 보통
- 인증/세션: 보통
- 성능: 보통
- 보안: 보통
- 유지보수성: 주의
- 실제 서비스 준비도: 주의

평가 요약:

- 공개/대회/관리자/운영자 화면의 주요 흐름은 들어왔고 `domains`, `pages`, `components`, `shared` 분리 방향도 유지되고 있다.
- refresh token 저장소 보관 위험은 제거했다. 운영자/관리자 화면이 빠르게 붙으면서 페이지 파일이 커졌고, 문제 패키지 세부 편집, 에러/빈 상태 표준화는 출시 전 주의 항목으로 남아 있다.
- `C:\GITHUB\docs\03-permissions` 기준의 운영자 contest scope/permission gate는 route와 탭 수준에 1차 반영했다. 버튼/폼 action 단위의 세밀한 권한 제한은 추가 보완이 필요하다.

## 2. 가장 먼저 고쳐야 할 문제 TOP 10

### [Medium] refresh token cookie 전환 백엔드 연동 확인 필요

- 위치: `src/domains/identityAccess/sessionStorage.ts`, `src/shared/api/client.ts`, `src/domains/identityAccess/types.ts`
- 현재 상태: `saveGeneralSession`은 refresh token을 저장소에 쓰기 전에 제거한다. `/auth/general/refresh`, `/auth/staff/refresh`, logout 요청은 `credentials: include`를 사용하며, refresh token body는 현재 탭 메모리에 값이 있을 때만 legacy 호환용으로 보낸다.
- 남은 확인: 백엔드가 refresh token을 httpOnly, secure, sameSite cookie로 내려주고 cookie 기반 refresh/logout을 정상 처리하는지 E2E로 확인해야 한다.
- 왜 필요한가: 프론트 저장소 위험은 제거됐지만, 서버 쿠키 설정이 맞지 않으면 새로고침 후 access token 만료 시 재인증 UX가 깨질 수 있다.
- 개선 방향: 백엔드 쿠키 정책과 CORS credentials 설정을 확정하고, refresh token 문자열 응답을 중단한다.
- 예상 수정 난이도: 중간
- 우선순위: 중간

### [High] 운영자 권한 gate의 버튼/액션 단위 제한이 아직 부족함

- 위치: `src/components/operator/OperatorShell.tsx`, `src/pages/operator/*`, `src/routes/routeConfig.ts`
- 문제: `OperatorAccessGate`와 `OperatorTabs`는 contest scope/permission을 보기 시작했지만, 각 페이지 내부의 생성/수정/삭제 버튼과 mutation 가능 여부는 아직 대부분 같은 기준으로 세분화되지 않았다.
- 왜 문제인가: URL 직접 진입은 1차 차단되지만, 예를 들어 `contest.problem.view`만 가진 사용자가 문제 화면 내부의 생성/수정 UI까지 보게 될 가능성이 있다. API가 최종 차단하더라도 UX와 보안 경계가 흐려진다.
- 개선 방향: `hasContestPermission(session, contestId, permission)`을 버튼, form submit, mutation enabled 조건에도 적용한다. 서비스 마스터는 우회, 대회 운영자는 해당 대회 전체 허용, 운영매니저는 permission code별 허용으로 나눈다.
- 예상 수정 난이도: 중간
- 우선순위: 높음

### [High] 운영자/관리자 페이지가 비대해 유지보수 리스크가 큼

- 위치: `src/pages/operator/OperatorSettingsPage.tsx` 약 627줄, `src/pages/admin/AdminJudgePage.tsx` 약 523줄, `src/pages/operator/OperatorProblemsPage.tsx` 약 513줄, `src/pages/operator/OperatorParticipantsPage.tsx` 약 446줄
- 문제: 페이지 파일 안에 폼 상태, API mutation, 테이블, 세부 행 컴포넌트, validation, 표시 로직이 한꺼번에 들어 있다.
- 왜 문제인가: 기능 추가 시 충돌이 커지고 테스트/리뷰 단위가 커진다. 운영자 문제/참가팀/설정은 도메인 규칙이 많은 영역이라 한 파일에 둘수록 버그가 숨어들 가능성이 높다.
- 개선 방향: 각 페이지를 `hooks`, `forms`, `tables`, `panels`로 나눈다. 예: `useOperatorContestSettings`, `ContestSettingsForm`, `OperatorListPanel`, `DivisionForm`.
- 예상 수정 난이도: 중간
- 우선순위: 높음

### [Medium] Header 반응형은 보완됐지만 실제 스크린샷 검증이 필요함

- 위치: `src/components/layout/HeaderShell.tsx`, `src/components/layout/HeaderAuthControls.tsx`
- 문제: 작은 화면에서 nav가 다음 줄로 내려가도록 보완했지만, 실제 360/768/1280px 화면 검증은 아직 수행하지 않았다.
- 왜 문제인가: 관리자/운영자 계정일수록 가장 중요한 진입 버튼이 깨질 수 있고, 모바일/태블릿에서 헤더 전체가 overflow될 가능성이 높다.
- 개선 방향: Playwright screenshot 기준으로 360/768/1280px를 확인하고, 필요하면 모바일 메뉴 버튼 또는 별도 접힘 메뉴로 전환한다.
- 예상 수정 난이도: 중간
- 우선순위: 높음

### [Medium] 문제 관리 UI의 세부 편집 기능이 아직 부족함

- 위치: `src/pages/operator/OperatorProblemsPage.tsx`, `src/domains/problemManagement/api.ts`
- 문제: 문제 CRUD, Markdown 미리보기, 본문/지원 파일 업로드, ZIP testcase import, `.in/.out` 묶음 업로드, testcase set 활성화/삭제, package recipe build, 운영자 테스트 제출은 들어왔으나 Polygon import, split document, 예제 전용 편집, testcase 개별 preview/delete, 문제 삭제/순서 변경 UI가 아직 부족하다.
- 왜 문제인가: 핵심 출제 운영은 가능해졌지만, legacy의 세부 편집 경험과 외부 운영 문서의 일부 작업을 완전히 대체하려면 추가 UI가 필요하다.
- 개선 방향: 문제 관리 화면을 탭 단위로 분리한다. `기본 정보`, `본문/예제`, `리소스`, `테스트케이스`, `패키지 빌드`, `검증 제출`로 나누고 남은 API 함수를 화면에 연결한다.
- 예상 수정 난이도: 높음
- 우선순위: 중간

### [Medium] API 에러 메시지를 사용자에게 거의 그대로 노출함

- 위치: `src/shared/api/errors.ts`, `src/pages/admin/*`, `src/pages/operator/*`, `src/pages/auth/LoginPage.tsx`
- 문제: `formatApiError`는 서버 메시지, error code, HTTP status, request_id를 그대로 붙여 UI에 노출한다. 로그인 일부만 친화적으로 감싼다.
- 왜 문제인가: 운영자에게 request_id는 유용하지만 일반 참가자/공개 화면에는 과한 정보다. 서버 message가 내부 사정을 포함하면 노출 위험이 있다.
- 개선 방향: 사용자용 메시지와 운영자 진단 메시지를 분리한다. 공개/참가자 화면은 안전한 한국어 문구만 표시하고, 운영자/관리자 화면은 접을 수 있는 상세 정보로 request_id를 제공한다.
- 예상 수정 난이도: 낮음
- 우선순위: 중간

### [Medium] mutation 전 폼 validation이 약하고 NaN/빈 값이 API로 갈 수 있음

- 위치: `src/pages/operator/OperatorProblemsPage.tsx`, `src/pages/operator/OperatorSettingsPage.tsx`, `src/pages/operator/OperatorParticipantsPage.tsx`, `src/pages/admin/AdminContestsPage.tsx`
- 문제: 숫자 입력은 `Number(...)`로 바로 변환하고, 날짜/시간은 `dateTimeLocalToIso`에 직접 넣는다. 입력값 범위, NaN, start/end/freeze 관계 검증이 부족하다.
- 왜 문제인가: 서버 validation에 의존하면 UI에서 실패 원인이 늦게 드러나고 운영 중 잘못된 상태 전이 시도가 늘어난다.
- 개선 방향: React Hook Form + Zod 또는 현재 스타일에 맞춘 도메인 validation helper를 도입한다. 최소한 `time_limit_ms > 0`, `memory_limit_mb > 0`, `start_at < end_at`, `freeze_at <= end_at`, 이메일 형식을 프론트에서도 검사한다.
- 예상 수정 난이도: 중간
- 우선순위: 중간

### [Medium] polling/long polling 정책이 화면별로 흩어져 있음

- 위치: `src/pages/contest/*`, `src/pages/admin/AdminJudgePage.tsx`, `src/pages/operator/OperatorSubmissionsPage.tsx`, `src/pages/operator/OperatorScoreboardPage.tsx`, `src/pages/public/JudgeStatusPage.tsx`
- 문제: `refetchInterval` 값과 `status:wait` 보조 갱신 로직이 페이지별로 직접 들어가 있다.
- 왜 문제인가: 대회 상태가 `ended/finalized/archived`일 때도 일부 화면은 계속 polling할 수 있고, 새 실시간 화면 추가 시 같은 판단이 반복된다.
- 개선 방향: `useSubmissionPolling`, `useScoreboardPolling`, `useVisiblePollingInterval` 같은 작은 hook으로 공통화한다. 대회 상태와 document visibility를 같이 고려한다.
- 예상 수정 난이도: 중간
- 우선순위: 중간

### [Medium] queryKey에 사용자/권한 경계가 일관되게 들어가지 않음

- 위치: `src/pages/admin/*`, `src/pages/operator/*`, `src/domains/contestRuntime/queryKeys.ts`
- 문제: 참가자 query key는 token 일부를 포함하지만, admin/operator query key는 대부분 `['operator', ... contestId]`, `['admin', ...]` 형태다.
- 왜 문제인가: logout 시 `queryClient.clear()`가 있어 대부분 정리되지만, 같은 탭에서 다른 권한 세션으로 교체되거나 refresh 중 권한이 바뀌는 경우 stale data가 보일 수 있다.
- 개선 방향: admin/operator query key에 최소한 `staff.email` 또는 `accessToken fingerprint`를 넣고, 권한 변화 시 관련 query를 명시적으로 clear/invalidate한다.
- 예상 수정 난이도: 낮음
- 우선순위: 중간

### [Low] 프로젝트 문서는 갱신됐지만 배포 문서가 부족함

- 위치: `README.md`, root의 `vite-dev.log`, `.vite-dev.out.log`, `dist`
- 문제: README와 docs index는 현재 기능 기준으로 갱신했지만, 배포 산출물 정책과 운영 환경 문서는 아직 짧다. 루트에는 개발 서버 로그 파일이 남아 있을 수 있다.
- 왜 문제인가: 새 작업자가 현재 앱 상태를 잘못 이해하고, 불필요한 파일이 커밋 후보에 섞일 수 있다.
- 개선 방향: 로그 파일은 제거하거나 `.gitignore`에 명시한다. `dist`를 커밋 대상에서 제외하는 정책과 운영 배포 절차를 문서화한다.
- 예상 수정 난이도: 낮음
- 우선순위: 낮음

## 3. 파일/폴더별 상세 리뷰

### pages

- 현재 상태: 공개, 대회 참가자, 관리자, 운영자 페이지가 모두 있다. 핵심 route는 `src/routes/routeConfig.ts`에 정리되어 있다.
- 좋은 점: 공개/대회 페이지는 `PageLayout`, `ContestPageShell`, `ContestPageFrame`을 통해 공통 구조를 가진다. 운영자/관리자도 각각 `OperatorShell`, `AdminShell`을 사용한다.
- 문제점: 운영자/관리자 페이지는 너무 크다. `OperatorSettingsPage`, `OperatorProblemsPage`, `AdminJudgePage`는 페이지 파일이 form/table/panel/API mutation을 모두 들고 있다. 일부 페이지는 error/empty/loading 처리가 있으나 skeleton이나 disabled 상태가 세밀하지 않다.
- 개선 제안: 운영자/관리자 페이지부터 폴더형 feature 구조로 쪼갠다. 예: `pages/operator/settings/OperatorSettingsPage.tsx`, `components/operator/settings/ContestSettingsForm.tsx`, `hooks/operator/useOperatorDashboard.ts`.

### components

- 현재 상태: layout, contest, admin, operator, common, ui로 나뉜다.
- 좋은 점: 헤더 중복은 `HeaderShell`, `HeaderAuthControls`로 줄었다. `ContestSubmissionsTable`, `ContestScoreboardTable`처럼 핵심 표 컴포넌트가 일부 분리되어 있다.
- 문제점: `AdminShell`과 `OperatorShell`이 매우 비슷한 패널/탭/카드/아이콘 구현을 각각 가진다. 헤더는 desktop absolute center 구조라 인증 버튼 증가에 약하다.
- 개선 제안: `ManagementShell`, `ManagementTabs`, `MetricCard`, `Panel` 같은 공통 관리 UI를 만들고 admin/operator는 color token과 메뉴만 주입한다. 헤더는 responsive behavior를 별도 설계한다.

### hooks

- 현재 상태: `useDocumentVisibility`, `useAutoRefresh`, `useContestParticipantSession`이 있다.
- 좋은 점: document visibility를 polling에 활용하기 시작했다. 참가자 세션 생성 중복은 `Map`으로 막고 있다.
- 문제점: 실제 페이지들은 `useAutoRefresh`를 거의 쓰지 않고 각자 `refetchInterval`을 직접 정의한다. long polling도 page-local effect로 흩어져 있다.
- 개선 제안: submission/scoreboard/judge status 갱신 정책을 domain hook으로 묶는다.

### api

- 현재 상태: `shared/api/client.ts`가 envelope parsing, token 우선순위, refresh, 401 처리까지 담당한다. 도메인별 API 함수는 `domains/*/api.ts`에 있다.
- 좋은 점: API 호출이 대부분 페이지 내부 fetch가 아니라 도메인 모듈에 모여 있다. refresh 중복 방지 promise도 있다.
- 문제점: refresh 요청은 cookie 기반 전환을 받을 수 있게 바뀌었지만, `apiFetchRaw`는 fetch `signal`을 queryFn에서 받지 않아 React Query의 cancellation 이점이 약하다. 에러 메시지 표시 정책이 화면별로 분리되지 않았다.
- 개선 제안: 백엔드에서 refresh token 문자열 응답을 중단하고, API 함수가 `{ signal }`을 받을 수 있게 점진 확장한다.

### types

- 현재 상태: 각 도메인에 TypeScript 타입이 있다.
- 좋은 점: 제출/스코어보드 타입은 demo 최신 필드와 이전 호환 필드를 함께 방어적으로 처리한다.
- 문제점: 권한 모델 타입은 `contest_scopes: Record<string, string[]>` 정도만 있고, permission code union이나 helper가 없다. API 응답 envelope의 런타임 검증은 거의 없다.
- 개선 제안: `PermissionCode`, `ContestPermissionCode`, `ServicePermissionCode` 타입과 `hasPermission` helper를 추가한다.

### utils

- 현재 상태: `Icons.tsx`, `iconRegistry.ts`가 있다.
- 좋은 점: SVG raw는 현재 registry에 등록된 내부 asset만 사용한다.
- 문제점: `SvgIcon`의 임의 `markup` prop은 제거했다. 다만 내부 registry SVG는 여전히 `dangerouslySetInnerHTML`로 렌더링하므로 registry에 외부 문자열이 들어가지 않도록 유지해야 한다.
- 개선 제안: 외부 입력 icon은 허용하지 않는 현재 정책을 유지한다. 아이콘이 늘어나면 React 컴포넌트 SVG 또는 안전한 asset pipeline으로 옮기는 것도 검토한다.

### styles

- 현재 상태: Tailwind CSS v4와 `index.css` 중심이다.
- 좋은 점: 큰 별도 CSS 파일보다 utility 기반으로 유지하고 있다.
- 문제점: table/form/button class가 페이지마다 반복된다. 관리자/운영자 화면에서 비슷한 input/button 스타일이 많이 복붙되어 있다.
- 개선 제안: `Button`, `TextField`, `SelectField`, `TableShell`, `StatusPill`을 최소 단위로 도입한다.

### router

- 현재 상태: `routeConfig.ts`에서 route를 배열로 관리하고 `AppRoutes`에서 매핑한다.
- 좋은 점: 404 catch-all이 있고 공개 nav와 hidden route를 한 파일에서 관리한다.
- 문제점: route-level protected route가 없다. 각 페이지 안에서 access gate를 감싸기 때문에 route 보호 규칙이 분산된다.
- 개선 제안: route config에 `auth: 'public' | 'general' | 'operator' | 'admin'`, `requiredPermission`을 추가하고 `ProtectedRoute`에서 공통 처리한다.

### auth/session

- 현재 상태: Zustand store와 sessionStorage wrapper를 사용한다. 로그아웃 시 query cache clear가 있다.
- 좋은 점: legacy localStorage migration 제거, tab sync 이벤트, refresh in-flight dedupe가 들어가 있다. refresh token은 저장소에 persist하지 않는다.
- 문제점: 백엔드 cookie 설정 확인이 남아 있고, operator/admin 권한 gate는 버튼/액션 단위 보강이 필요하다.
- 개선 제안: refresh token 문자열 응답 중단, permission helper의 action 단위 적용, 권한별 query cache partition을 진행한다.

### config

- 현재 상태: Vite, TypeScript, ESLint, Prettier가 있다.
- 좋은 점: `strict`, `noUnusedLocals`, hooks lint가 켜져 있다.
- 문제점: Vite dev proxy가 `https://judge.zerone01.kr`로 고정되어 있다. README에는 필수 env가 없다고 되어 있지만 실제로는 `VITE_API_BASE_URL`을 쓸 수 있다.
- 개선 제안: `.env.example`을 만들고 dev/prod API base URL 정책을 명시한다. README도 현재 앱 상태로 갱신한다.

### 기타

- 현재 상태: `dist`, `node_modules`, 개발 서버 로그 파일이 작업 디렉터리에 있다.
- 문제점: 로그 파일이 untracked로 보이며, 빌드 산출물 정책이 문서화되어 있지 않다.
- 개선 제안: 로그 파일 제거, `.gitignore` 강화, 배포 산출물 커밋 여부 문서화.

## 4. API 및 상태 관리 리뷰

- API 호출 구조: 대체로 도메인 모듈에 잘 모여 있다. 다만 운영자/관리자 페이지에서 query/mutation 조합이 반복된다.
- 에러 처리: `ApiClientError`로 공통화했지만 UI 노출 정책이 단일하다. 일반 사용자/운영자/개발자용 메시지 계층이 필요하다.
- 로딩 처리: `PageNotice`와 텍스트 로딩은 있으나 큰 테이블/폼 화면에서 skeleton, disabled, optimistic feedback이 부족하다.
- 캐싱 전략: TanStack Query를 사용한다. 공개/대회 참가자 query key는 비교적 세분화되어 있으나 admin/operator query key는 권한 경계가 약하다.
- mutation 후 갱신 전략: 대체로 invalidate를 호출한다. 다만 query key가 파일별 문자열 리터럴로 흩어져 있어 오타와 누락 위험이 있다.
- 중복 요청 가능성: `useContestParticipantSession`은 세션 생성 중복을 막지만, 관리자/운영자 대시보드/문제/참가팀은 페이지별 병렬 query가 많아 common hook으로 정리할 여지가 있다.
- polling/long polling 적용 여부: 제출/스코어보드/채점 관리에 polling과 `status:wait`/`scoreboard:wait`가 적용되었다. 다만 정책이 페이지별로 흩어져 있어 공통 hook으로 정리할 여지가 있다.
- 서버 응답 타입 안정성: TypeScript 타입은 있지만 런타임 schema 검증은 없다. 공개 API가 깨질 때 UI가 조용히 빈 목록처럼 보일 수 있다.

## 5. UI/UX 리뷰

- 공통 UI 일관성: 전체 톤은 맞지만 admin/operator form/table/button이 복붙으로 늘고 있다. 색상 accent로 구분한 점은 괜찮지만 공통 form component가 필요하다.
- 반응형 대응: 공개/대회 본문은 `max-w-7xl`, overflow table로 어느 정도 버틴다. 헤더와 운영자/관리자 대형 grid는 모바일 검증이 필요하다.
- 접근성: 대부분 button/link를 올바르게 사용한다. 다만 아이콘 버튼과 SVG에 tooltip/aria-label이 부족한 곳이 있다. table caption도 없다.
- 로딩/에러/빈 상태: 기본 상태는 있으나 화면별 깊이가 다르다. 운영자 문제/참가팀/설정 화면은 mutation 중 중복 클릭 방지가 일부 부족하다.
- 사용자가 헷갈릴 수 있는 흐름: 운영자 문제 관리에 지원 파일, 테스트케이스 업로드/활성화/삭제, 테스트 제출은 들어왔지만 split document, 예제 전용 편집, testcase 개별 preview/delete는 아직 부족하다. 운영자/관리자 권한이 없을 때 어디에 요청해야 하는지도 더 명확해야 한다.
- 디자인 시스템 후보: `Button`, `IconButton`, `TextInput`, `Select`, `Textarea`, `Toggle`, `DataTable`, `EmptyState`, `ErrorNotice`, `ManagementTabs`, `MetricCard`, `Panel`.

## 6. 보안 리뷰

- 토큰 저장 방식: access token은 sessionStorage에 남지만 refresh token은 저장소에 persist하지 않는다. cookie 기반 refresh 전환을 받을 수 있게 `credentials: include`를 적용했다.
- refresh 처리: in-flight dedupe가 있어 중복 refresh는 어느 정도 막는다. 다만 refresh token 재사용 탐지/전역 logout 처리는 백엔드 cookie 정책과 연동 확인이 필요하다.
- 인증 라우팅: page-level gate는 있으나 route-level policy가 없다. 운영자 scope 검증은 route/tab 수준에 적용됐고, 버튼/액션 단위 보강이 남아 있다.
- XSS 가능성: `MarkdownPreview`는 `rehype-sanitize`를 사용해 안전한 편이다. `SvgIcon`의 임의 `markup` prop은 제거했고, 내부 registry SVG만 허용한다.
- 민감 정보 노출: `console.log`는 발견되지 않았다. API 에러 메시지와 request_id는 UI에 광범위하게 노출된다.
- env 사용: `VITE_API_BASE_URL`은 공개되어도 되는 값이지만 README/env example에 설명이 부족하다. dev proxy는 prod endpoint로 고정되어 있다.
- API 에러 노출: 공개/참가자 화면과 운영자 화면의 표시 수준을 분리해야 한다.
- 로그아웃 처리: `clearSessions()`와 `queryClient.clear()`는 적절하다. 다만 로그아웃 API 실패를 삼키므로 서버 revoke 실패 관측은 어렵다.

## 7. 리팩토링 제안

### 제안 1

- 대상: `src/pages/operator/*`, `src/pages/admin/*`
- 현재 문제: 페이지 파일이 400~600줄 규모이고 form/table/mutation이 섞여 있다.
- 바꿀 구조:

```text
src/features/operator/settings/
├── useOperatorSettings.ts
├── ContestSettingsForm.tsx
├── DivisionPanel.tsx
└── OperatorStaffPanel.tsx

src/features/operator/problems/
├── useOperatorProblems.ts
├── ProblemListPanel.tsx
├── ProblemEditorForm.tsx
├── ProblemPreviewPanel.tsx
└── ProblemPackagePanel.tsx
```

- 기대 효과: 기능별 테스트/리뷰가 쉬워지고, 추후 테스트케이스/리소스 관리 추가 시 충돌이 줄어든다.

### 제안 2

- 대상: 권한 gate와 route config
- 현재 문제: `OperatorAccessGate`는 contest scope/permission을 보기 시작했지만, 세부 버튼/액션 제한은 아직 각 페이지에 남아 있다.
- 바꿀 구조:

```ts
type RouteAuth =
  | { kind: 'public' }
  | { kind: 'general' }
  | { kind: 'operator'; permission?: ContestPermissionCode }
  | { kind: 'admin'; permission?: ServicePermissionCode };
```

- 기대 효과: 메뉴, route, 버튼 권한이 같은 규칙을 공유한다. 문서의 permission catalog와 코드가 연결된다.

### 제안 3

- 대상: token refresh 구조
- 현재 상태: refresh token은 프론트 저장소에 persist하지 않고, refresh API는 `credentials: 'include'` 기반으로 호출한다.
- 남은 작업: 백엔드가 httpOnly, secure, sameSite cookie를 확정하고 refresh token 문자열 응답을 중단한다.
- 기대 효과: XSS 시 장기 세션 탈취 위험을 낮은 수준으로 유지한다.

### 제안 4

- 대상: polling/long polling
- 현재 문제: 각 페이지가 직접 `refetchInterval`과 wait API를 조합한다.
- 바꿀 구조:

```ts
useSubmissionLiveUpdates({
  contestId,
  token,
  scope: 'participant' | 'operator' | 'admin',
});
useScoreboardPolling({ contest, enabledByVisibility: true });
```

- 기대 효과: 서버 부하 정책과 UX가 일관된다.

### 제안 5

- 대상: 공통 UI
- 현재 문제: button/input/table class가 페이지별로 반복된다.
- 바꿀 구조: `src/shared/ui/form`, `src/shared/ui/table`, `src/shared/ui/feedback`에 작은 primitive를 둔다.
- 기대 효과: 디자인 변경 비용과 UI 불일치를 줄인다.

## 8. 바로 적용 가능한 수정 목록

- 로그 파일과 배포 산출물 정책 정리
- 개발 서버 로그 파일 제거 및 `.gitignore`에 `*.log`, `.vite-dev.*`, `vite-dev.*` 확인
- 운영자 페이지 내부 버튼과 mutation 조건에 contest permission을 추가 적용
- `HeaderShell` 모바일/태블릿 레이아웃 보완
- admin/operator query key에 staff email 또는 권한 fingerprint 추가
- 공개/참가자 화면의 API 에러 표시에서 request_id를 숨기고 운영자 화면에는 상세 접기 형태로 표시
- SVG 아이콘 registry에 외부 입력이 들어가지 않도록 유지
- `OperatorProblemsPage` 숫자/날짜/필수값 Zod validation 추가
- `OperatorSettingsPage` 일정 관계 검증 추가
- `useSubmissionLiveUpdates`, `useScoreboardPolling` hook 분리
- 문제 패키지 리소스/테스트케이스 관리 UI를 단계적으로 추가
- table caption, icon-only button aria-label, focus-visible 스타일 점검

## 9. 최종 결론

- 지금 상태로 실제 서비스에 올려도 되는가: 공개 테스트나 내부 QA에는 가능하고, 실제 서비스 공개 전에는 백엔드 cookie 설정과 권한 action 단위 UX를 추가 확인해야 한다.
- 올린다면 가장 주의할 부분은 무엇인가: 운영자 권한 UI가 버튼/액션 단위로 완전히 분리되지 않은 점과 API 에러 노출 수준이다.
- 출시 전 최소한 반드시 확인할 것은 무엇인가: refresh token httpOnly cookie E2E, 운영자/관리자 route-level permission gate, 헤더 반응형 스크린샷, 문제/대회 설정 validation, API 에러 노출 정책이다.
- 이후 고도화 단계에서 고칠 것은 무엇인가: 운영자 문제 패키지 고급 관리, 공통 UI 컴포넌트화, polling 정책 hook화, admin/operator 페이지 feature 단위 분리, 배포 문서 정리다.

## 승인 후 권장 수정 계획

1. Medium 보안: refresh token httpOnly cookie E2E와 백엔드 문자열 응답 중단을 확인한다.
2. High 권한: `ProtectedRoute`와 permission helper를 추가하고 운영자/관리자 route, 탭, 버튼을 제한한다.
3. High UX: 헤더 반응형과 관리자/운영자 화면 mobile overflow를 스크린샷 기준으로 점검한다.
4. High 유지보수: 운영자 설정/문제/참가팀 페이지를 feature 단위 컴포넌트와 hook으로 분리한다.
5. Medium 품질: 폼 validation, error display, polling hook, 공통 UI primitive를 순서대로 정리한다.
