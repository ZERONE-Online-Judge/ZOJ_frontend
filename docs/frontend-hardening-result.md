# 프론트엔드 개선 결과 및 종합 리뷰

갱신일: 2026-05-18

이 문서는 기존 `docs/README.md`, `docs/project-issue-review.md`, `docs/service-readiness-review.md`, `docs/demo-frontend-import-backlog.md`에 흩어져 있던 점검 내용을 하나로 합친 기준 문서다. 이번 작업에서는 문서에 적힌 항목 중 프론트엔드에서 바로 고칠 수 있고 기능 회귀 위험이 낮은 항목을 우선 수정했다.

## 1. 해결한 것

### API 토큰 우선순위 정리

- 위치: `src/shared/api/client.ts`
- 해결: API 호출자가 명시적으로 넘긴 token을 저장소 token이 덮어쓰지 않도록 수정했다.
- 방식: `preferredStoredTokenForRequest()`가 token을 받으면 즉시 그 token을 사용하게 했다. 401 발생 시 저장소의 다른 token으로 조용히 교체하던 `storedReplacementTokenForRequest()`도 비활성화했다.
- 효과: query key는 A 세션인데 실제 요청은 B 세션 token으로 나가는 혼선 가능성을 줄였다.

### Storage object API base URL 통일

- 위치: `src/domains/problemManagement/api.ts`
- 해결: `getStorageObjectText()`가 hard-coded `/api` 대신 `API_BASE_URL`을 사용하도록 변경했다.
- 방식: 기존 직접 fetch 경로를 `${API_BASE_URL}/storage/objects/...`로 바꾸고 `credentials: include`를 추가했다.
- 효과: dev/prod에서 API base URL 정책이 더 일관되게 동작한다.

### 공개/참가자 화면 API 에러 노출 축소

- 위치: `src/shared/api/errors.ts`, `src/pages/auth/LoginPage.tsx`, `src/pages/contest/ContestBoardPage.tsx`
- 해결: 서버 message, code, HTTP status, request_id가 공개/참가자 화면에 그대로 보이지 않도록 사용자용 formatter를 추가했다.
- 방식: `formatUserApiError()`를 만들고 로그인/대회 게시판 질문 작성 오류에 적용했다. 운영자/관리자 화면은 진단 정보가 필요하므로 기존 `formatApiError()`를 유지했다.
- 효과: 일반 사용자가 내부 서버 메시지나 request id를 볼 가능성을 줄였다.

### Route lazy loading 적용

- 위치: `src/routes/routeConfig.ts`, `src/routes/AppRoutes.tsx`
- 해결: 모든 page component 정적 import를 `React.lazy` 기반 route-level code splitting으로 바꿨다.
- 방식: route config의 `Component`를 lazy component로 선언하고 `AppRoutes`에서 `Suspense` fallback을 제공했다.
- 효과: 공개 메인/대회 목록 진입 시 운영자/관리자/문제 편집 관련 코드가 초기 번들에 섞이는 부담을 줄였다.

### Route-level access metadata 추가

- 위치: `src/routes/routeConfig.ts`, `src/routes/AppRoutes.tsx`
- 해결: 관리자/운영자 route에 `access: 'admin' | 'operator'` 메타를 추가했다.
- 방식: `RouteAccessGuard`를 추가해 operator session이 없으면 로그인으로 보내고, admin route는 service master 권한을 확인한다.
- 효과: 페이지 내부 gate에만 의존하던 접근 제어가 라우터 수준에서도 한 번 더 걸린다.

### 관리자/운영자 query key에 세션 경계 추가

- 위치: `src/domains/identityAccess/queryIdentity.ts`, `src/pages/admin/*`, `src/pages/operator/*`
- 해결: admin/operator 주요 query key에 token fingerprint를 포함했다.
- 방식: `tokenQueryIdentity()`를 추가하고 `['operator', 'dashboard', contestId, queryIdentity]` 같은 형태로 query key를 확장했다. invalidate는 기존 prefix가 그대로 동작하도록 identity를 뒤쪽에 붙였다.
- 효과: 같은 탭에서 다른 운영자/관리자 세션으로 바뀔 때 stale data가 잠깐 보일 가능성을 줄였다.

### 스코어보드 polling 정책 완화

- 위치: `src/pages/contest/ContestScoreboardPage.tsx`, `src/pages/operator/OperatorScoreboardPage.tsx`
- 해결: wait endpoint와 1초 interval 조합을 제거하거나 완화했다.
- 방식: 참가자 스코어보드는 wait endpoint 대신 일반 scoreboard endpoint를 5초 간격으로 조회하도록 바꿨다. 운영자 스코어보드도 1초 polling을 5초로 조정했다.
- 효과: 탭을 여러 개 열거나 네트워크가 느릴 때 서버 연결이 과도하게 늘어나는 위험을 낮췄다.

### SVG 아이콘 체계 정리

- 위치: `src/assets/icons/*`, `src/utils/iconRegistry.ts`, 공통 UI 컴포넌트
- 해결: 새로 들어온 SVG 파일명을 의미 기준으로 정리하고 registry에 등록했다.
- 방식: `alert`, `check`, `close`, `clipboard`, `megaphone`, `timer`, `trophy`, `arrow-right`로 이름을 정리하고 `currentColor` 기반으로 색상을 따르게 했다.
- 효과: 공지, 대회 카드, 상태 알림, 모달, 문제 예제 복사 버튼에서 같은 아이콘 체계를 재사용한다.

## 2. 프론트에서 가능하지만 이번에 남긴 것

- 운영자/관리자 대형 페이지 분리: 가능하지만 `OperatorProblemsPage`, `OperatorParticipantsPage`, `OperatorSettingsPage`, `AdminJudgePage`는 기능이 많이 얽혀 있어 한 번에 쪼개면 회귀 위험이 크다. 기능 단위 PR로 분리하는 편이 안전하다.
- 버튼/action 단위 권한 세분화: route/tab gate는 보강되어 있지만 각 mutation 버튼별 permission 적용은 페이지별 도메인 규칙 확인이 필요하다.
- 런타임 API 응답 검증: Zod 또는 수동 guard 도입은 가능하지만 auth/session, contest, submission 순서로 점진 적용하는 것이 좋다.
- 공통 UI 컴포넌트 도입: `Button`, `Modal`, `Panel`, `DataTable`, `StatusPill` 후보가 명확하지만 전체 치환은 대규모 UI 변경이다.
- Playwright smoke test: 프로젝트에 테스트 러너와 E2E 설정이 아직 없으므로 별도 설정 작업이 필요하다.
- refresh token httpOnly cookie E2E 확인: 프론트 요청은 `credentials: include`를 사용하지만, 최종 검증은 백엔드 cookie/CORS 설정과 함께 해야 한다.

## 3. 프로젝트 종합 리뷰

- 코드 상태: 보통
- 구조 설계: 보통
- UI 일관성: 보통
- API 설계: 보통
- 인증/세션: 보통
- 성능: 보통
- 보안: 보통
- 유지보수성: 주의
- 실제 서비스 준비도: 주의

전체적으로 기능 구현 폭은 넓고, `domains/*/api.ts`, `ContestPageShell`, `OperatorAccessGate`, `AdminAccessGate`, TanStack Query 사용 등 기본 구조는 잡혀 있다. 이번 수정으로 token 혼선, 초기 번들, query cache 경계, 공개 에러 노출, scoreboard polling 같은 출시 전 위험도는 낮아졌다.

다만 운영자/관리자 페이지가 여전히 크고, 폼 validation과 action 단위 권한 제어는 더 보강해야 한다. 실제 서비스 출시 전에는 대형 페이지 분리보다 먼저 권한별 mutation 차단, refresh cookie E2E, 주요 응답 guard, smoke test를 추가하는 것이 효과 대비 우선순위가 높다.

## 4. 남은 우선순위

### High

- 운영자/관리자 action 단위 permission 적용
- refresh token cookie 기반 동작 E2E 확인
- 문제/참가팀/설정 mutation validation 강화
- 주요 auth/session 응답 guard 추가

### Medium

- 운영자/관리자 대형 페이지를 feature 단위로 분리
- 공통 UI 컴포넌트 도입
- submission/scoreboard/judge polling hook 통합
- Playwright smoke test와 CI 검증 추가

### Low

- 문서에 route/access 정책 표 추가
- legacy URL alias 필요 여부 확인
- font self-host 여부 결정

## 5. 결론

지금 상태는 내부 베타나 운영자 동행 테스트에는 사용할 수 있다. 공개 서비스로 바로 올리려면 인증/세션 E2E, 권한별 action 차단, validation, 최소 smoke test는 추가로 필요하다.

가장 위험한 부분은 운영자/관리자 권한이 있는 화면에서 action 단위 제어가 아직 충분하지 않다는 점이다. 이번 작업으로 route-level guard와 query cache 경계는 보강했지만, 최종 mutation 버튼과 submit handler의 permission 적용은 다음 작업에서 반드시 이어가야 한다.
