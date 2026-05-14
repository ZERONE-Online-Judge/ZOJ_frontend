# demo-frontend 미반영 기능 정리

기준 소스: `C:\GITHUB\demo-frontend`

기준 커밋: `c3dd346 chore: 운영자 화면 문제집에 팀 수 표시`

작성일: 2026-05-14

이 문서는 demo에는 있으나 ZOJ_frontend에는 아직 완전히 들여오지 않은 기능을 다음 작업자가 빠르게 파악하도록 남긴 백로그이다. demo는 대부분 `src/main.tsx` 한 파일에 있으므로, 아래의 "demo 위치"를 먼저 보고 ZOJ의 도메인 모듈 구조에 맞춰 분리해 가져오면 된다.

## 현재 ZOJ에 이미 반영된 것

| 기능 | ZOJ 상태 | 관련 파일 |
| --- | --- | --- |
| 공개 공지 목록 | 반영됨. `/notices`에서 `/public/service-notices` 조회 | `src/pages/public/NoticesPage.tsx`, `src/domains/serviceCommunication/api.ts` |
| 공개 대회 목록 | 반영됨. `/contests`에서 `/public/contests` 조회 | `src/pages/public/ContestsPage.tsx`, `src/domains/contestAdministration/api.ts` |
| 공개 채점 상태 | 반영됨. `/judge-status`에서 `/public/judge-status` polling | `src/pages/public/JudgeStatusPage.tsx`, `src/domains/auditMonitoring/api.ts` |
| 문의/도움말/규정 통합 페이지 | 부분 반영됨. demo의 개별 `/contact`, `/help`, `/rules`를 ZOJ에서는 `/support` 탭 페이지로 통합 | `src/pages/public/SupportGuidePage.tsx`, `src/routes/routeConfig.ts` |
| API 클라이언트 기본 구조 | 반영됨. envelope 해제, 토큰 자동 refresh, 저장 세션 우선 사용 구조 존재 | `src/shared/api/client.ts` |
| 참가팀 bulk import parser | 반영됨 | `src/domains/teamParticipation/importParser.ts` |
| 문제 패키지/테스트케이스 관련 API 일부 | 반영됨. 단 UI는 아직 없음 | `src/domains/problemManagement/api.ts` |
| Markdown Preview + LaTeX | 반영됨 | `src/shared/ui/MarkdownPreview.tsx` |

## 우선 가져올 후보

| 우선순위 | 항목 | 이유 |
| --- | --- | --- |
| 높음 | 일반 로그인/운영자 세션 병합 변경 | demo 최신 흐름은 일반 OTP 세션 하나로 참가자, 운영자, 서비스 관리자 권한을 전환하는 방향이다. ZOJ의 기존 password OTP/login-method API와 충돌 가능성이 있다. |
| 높음 | `Problem`, `Submission`, `Scoreboard` 타입 최신화 | 백엔드 응답 스키마와 UI 구현의 기반이다. 지금 타입이 오래되면 이후 페이지 구현 때 연쇄 수정이 커진다. |
| 중간 | 문제집/문제 상세 공개 페이지 | 참가자가 대회를 실제로 이용하려면 필요하다. UI 포함 범위가 커서 타입/API 먼저 맞추는 편이 좋다. |
| 중간 | 제출/채점현황/스코어보드 페이지 | 대회 핵심 기능이다. polling, pending 상태, division 필터와 강하게 연결된다. |
| 낮음 | 운영자/관리자 화면 전체 | 기능 범위가 매우 크다. 권한/세션 구조를 먼저 정리한 뒤 단계적으로 가져오는 것이 좋다. |

## 최신 demo 변경 중 미반영 항목

### 1. 일반 로그인 흐름 단순화

- demo 위치: `src/main.tsx`
  - `GeneralLoginPage`: 약 2747라인 이후
  - `canAttemptAutoRefresh`: 약 524라인
  - `mapGeneralSession`: 약 1260라인
  - 세션 선택/운영자 세션 생성: 약 1511라인 이후
- ZOJ 관련 파일:
  - `src/domains/identityAccess/api.ts`
  - `src/domains/identityAccess/sessionStorage.ts`
  - `src/shared/api/client.ts`
- 현재 차이:
  - demo는 `/auth/general/login-method`, `/auth/general/password/otp/request`, `/auth/general/password/otp/verify` 흐름을 UI에서 제거했다.
  - ZOJ에는 아직 `detectGeneralLoginMethod`, `requestGeneralPasswordOtp`, `verifyGeneralPasswordOtp`가 남아 있다.
  - demo는 일반 세션의 access/refresh token을 운영자 세션에도 병합해 쓴다.
- 연계 기능:
  - 참가자 로그인
  - 운영자 페이지 접근
  - 서비스 관리자 페이지 접근
  - 토큰 refresh
- 관련 UI:
  - 로그인 폼
  - 로그인 상태 표시
  - 운영자/관리자 접근 gate
- 효과:
  - 이메일 OTP 하나로 참가자/운영자/서비스 관리자 권한 전환 가능
  - password OTP 분기가 사라져 로그인 UX가 단순해짐
  - 일반 계정에 포함된 운영자 권한을 별도 staff login 없이 사용할 수 있음
- 가져올 때 주의:
  - 백엔드가 실제로 password OTP/login-method를 폐기했는지 먼저 확인해야 한다.
  - ZOJ는 로그인 페이지를 한 번 제거한 상태라, 페이지 구현 전 도메인 API부터 정리하는 것이 좋다.

### 2. 문제 타입 최신화

- demo 위치:
  - `Problem` 타입: `src/main.tsx` 약 80라인대
  - `ProblemSolveBadge`: 약 8080라인
- ZOJ 관련 파일:
  - `src/domains/problemManagement/types.ts`
  - `src/domains/problemManagement/api.ts`
  - `src/domains/auditMonitoring/types.ts`
- 현재 차이:
  - demo: `max_score?: number`
  - ZOJ: `max_score: number`
  - demo: `solve_status?: "accepted" | "wrong" | "unsolved"`
  - demo 최신: `solved_team_count?: number`, `total_team_count?: number`
- 연계 기능:
  - 문제집
  - 문제 상세
  - 운영자 문제 목록
  - 관리자 채점 상세
- 관련 UI:
  - 참가자 문제 해결 상태 뱃지: `정답`, `오답`, `미해결`
  - 운영자 문제별 해결 팀 수: `해결 n/m팀`
  - 문제 점수 표시 제거
- 효과:
  - 점수 기반 문제에서 해결 여부 기반 문제로 화면 표현이 바뀐다.
  - 운영자는 문제별 난이도/진행도를 해결 팀 수로 파악할 수 있다.
- 가져올 때 주의:
  - `createOperatorProblem`의 `max_score` 필수 여부를 백엔드와 맞춰야 한다.
  - 문제 생성 UI가 들어오기 전이라도 타입은 optional로 바꿔두는 편이 안전하다.

### 3. 스코어보드 스키마와 표시 로직

- demo 위치:
  - `ScoreboardPage`: 약 3791라인
  - `ResultCell`: 약 8062라인
  - `Segmented`: 약 8028라인
- ZOJ 관련 파일:
  - `src/domains/submissionScoreboard/types.ts`
  - `src/domains/submissionScoreboard/api.ts`
  - 추후 `src/pages/.../ScoreboardPage.tsx`
- 현재 차이:
  - demo 최신은 `score/max_score` 대신 `solved`, `wrong_attempts`, `penalty`, `last_solved_at` 중심이다.
  - 한 번에 정답은 `✓`, 오답 후 정답은 `+n`, 실패는 `-n`으로 표시한다.
  - 운영자 화면에서 division 전체 선택이 가능하도록 `Segmented`에 `allLabel`이 추가됐다.
- 연계 기능:
  - 참가자 스코어보드
  - 운영자 live/internal 스코어보드
  - division 필터
  - 채점 상태 polling
- 관련 UI:
  - 스코어보드 테이블
  - division segmented control
  - 문제별 결과 셀
  - frozen/public/live view 안내
- 효과:
  - ICPC식 스코어보드 표현에 가까워진다.
  - 운영자는 전체 유형 또는 특정 유형 스코어보드를 볼 수 있다.
  - 한 번에 해결한 문제를 더 명확하게 구분할 수 있다.
- 가져올 때 주의:
  - ZOJ에는 아직 스코어보드 페이지가 없으므로 우선 타입부터 최신화하는 것이 좋다.
  - `getOperatorScoreboard`와 `getOperatorDivisionScoreboard` 응답 타입을 demo 스키마에 맞춰야 한다.

### 4. 제출/채점현황 페이지

- demo 위치:
  - `SubmissionsPage`: 약 3416라인
  - 제출 상세 조회: 약 3585라인
  - 재채점/상세 polling: 약 3545라인, 3612라인 이후
- ZOJ 관련 파일:
  - `src/domains/submissionScoreboard/types.ts`
  - `src/domains/submissionScoreboard/status.ts`
  - `src/domains/submissionScoreboard/api.ts`
  - `src/shared/ui/SubmissionStatusBadge.tsx`
- 현재 차이:
  - demo는 `Submission.source_code_length?: number`를 사용한다.
  - demo는 문제/언어 셀 링크, 소스 모달, 상세 제출 정보 UI를 가진다.
  - demo 최신은 운영자 채점현황에서 division `전체` 필터를 지원한다.
- 연계 기능:
  - 문제 제출
  - 제출 목록 polling
  - 제출 상세
  - 운영자 제출 현황
  - 관리자 judge 상세
- 관련 UI:
  - 제출 테이블
  - 상태 뱃지
  - 진행률 바
  - 소스 보기 모달
  - 테스트케이스 실패 상세
- 효과:
  - 사용자가 제출 상태 변화를 실시간에 가깝게 확인한다.
  - 운영자는 전체 division 제출 상태를 모니터링할 수 있다.
  - 소스 길이를 백엔드 값으로 표시할 수 있어 대용량 소스 처리 비용을 줄인다.
- 가져올 때 주의:
  - UI 범위가 커서 status/type/API 먼저 반영 후 페이지를 만드는 편이 좋다.
  - 현재 ZOJ의 기존 HEPC 제출 페이지는 제거된 상태다.

### 5. 제출 상태 라벨/톤 보강

- demo 위치:
  - 상태 라벨/톤 유틸: `src/main.tsx` 상단 유틸 영역
- ZOJ 관련 파일:
  - `src/domains/submissionScoreboard/status.ts`
  - `src/shared/ui/SubmissionStatusBadge.tsx`
- 현재 차이:
  - demo는 `presentation_error`, `output_format_error`, `system_error` 등을 더 명확히 다룬다.
  - `judging`은 running 계열, `runtime_error`는 runtime 계열처럼 세분화된 tone을 쓴다.
- 연계 기능:
  - 제출 목록
  - 제출 상세
  - 채점현황
  - 관리자 judge 대시보드
- 관련 UI:
  - verdict pill
  - progress bar
  - 상태별 색상
- 효과:
  - 채점 결과가 더 정확한 한국어 라벨로 표시된다.
  - 진행 중/실패/시스템 오류/런타임 오류를 시각적으로 구분하기 쉽다.
- 가져올 때 주의:
  - 기존 `SubmissionStatusBadge`의 허용 tone과 CSS class를 같이 확장해야 한다.

## 대회 참가자 화면 미반영 항목

### 6. 대회 상세 홈

- demo 위치:
  - route parser: 약 702라인 이후, `/contests/:contestId`
  - `ContestPage`: 약 2932라인
- 연계 API:
  - `GET /public/contests/:contestId`
  - 세션이 있으면 참가자/운영자 권한별 접근 판단
- 관련 UI:
  - 대회 개요
  - 공개 범위 안내
  - 문제/제출/스코어보드/게시판 진입 버튼
  - 참가자 로그인 gate
- 효과:
  - 공개 대회 목록에서 실제 대회 워크스페이스로 이동할 수 있다.
- ZOJ 상태:
  - 공개 대회 목록만 있음. 대회 상세 페이지는 없음.

### 7. 문제집 페이지

- demo 위치:
  - route: `/contests/:contestId/problems`
  - `ProblemSetPage`: 약 3000라인
- 연계 API:
  - `GET /contests/:contestId/problems`
  - `GET /contests/:contestId/divisions/:divisionId/problems`
  - 운영자일 때 `GET /operator/contests/:contestId/problems`
- 관련 UI:
  - 문제 목록
  - division lock/selector
  - 해결 상태 뱃지
  - 운영자 해결 팀 수 뱃지
- 효과:
  - 참가자는 본인 division 기준 문제를 볼 수 있다.
  - 운영자는 전체 문제와 해결 팀 수를 확인할 수 있다.
- ZOJ 상태:
  - domain API는 일부 있음. 페이지는 없음.

### 8. 문제 상세/제출

- demo 위치:
  - route: `/contests/:contestId/problems/:problemId`
  - `ProblemPage`: 약 3147라인
- 연계 API:
  - `GET /contests/:contestId/problems/:problemId`
  - `POST /contests/:contestId/problems/:problemId/submissions`
  - 문제 assets/package status 관련 API
- 관련 UI:
  - 문제 본문 Markdown
  - LaTeX 렌더링
  - 코드 에디터
  - 언어 선택
  - 제출 버튼
  - 문제 네비게이션
- 효과:
  - 실제 풀이 제출 흐름이 완성된다.
- ZOJ 상태:
  - MarkdownPreview와 CodeEditor는 있음. 페이지 조립은 없음.

### 9. 대회 게시판/질문/공지

- demo 위치:
  - route: `/contests/:contestId/board`
  - `BoardPage`: 약 3947라인
- 연계 API:
  - `GET /contests/:contestId/notices`
  - `GET /contests/:contestId/boards`
  - `POST /contests/:contestId/boards`
  - `POST /operator/contests/:contestId/boards/:questionId/answers`
  - `POST /operator/contests/:contestId/notices`
- 관련 UI:
  - 공지/질문 탭
  - 비공개 질문
  - 운영자 답변
  - 공지 작성 폼
- 효과:
  - 대회 중 운영자와 참가자 간 커뮤니케이션이 가능해진다.
- ZOJ 상태:
  - API 함수는 있음. 페이지는 없음.

## 운영자 화면 미반영 항목

### 10. 운영자 대시보드

- demo 위치:
  - route: `/operator`, `/operator/contests/:contestId`
  - `OperatorPage`: 약 4296라인
- 연계 API:
  - `GET /operator/contests`
  - `GET /operator/contests/:contestId/dashboard`
- 관련 UI:
  - 운영 대회 목록
  - 운영 지표 카드
  - 참가팀/문제/공지/채점현황 이동
- 효과:
  - 운영자가 자신의 대회 운영 상태를 한 화면에서 확인한다.
- ZOJ 상태:
  - API 타입/함수 일부 있음. 페이지는 없음.

### 11. 대회 설정/Division/공개 범위

- demo 위치:
  - route: `/operator/contests/:contestId/settings`
  - `OperatorSettingsPage`: 약 4484라인
- 연계 API:
  - `PATCH /operator/contests/:contestId/settings`
  - `POST/PATCH /operator/contests/:contestId/divisions`
  - 운영자 계정 조회/등록 API
- 관련 UI:
  - 일정 수정
  - 공개 범위 토글
  - freeze 설정
  - division 관리
  - 긴급 공지 설정
- 효과:
  - 대회 운영 정책을 UI에서 변경할 수 있다.
- ZOJ 상태:
  - types/logic 일부 있음. 페이지는 없음.

### 12. 운영자 공지 관리

- demo 위치:
  - route: `/operator/contests/:contestId/notices`
  - `OperatorNoticesPage`: 약 4899라인
- 연계 API:
  - `GET /operator/contests/:contestId/notices`
  - `POST /operator/contests/:contestId/notices`
  - `PATCH /operator/contests/:contestId/notices/:noticeId`
  - `PATCH /operator/contests/:contestId/settings` for emergency notice
- 관련 UI:
  - 공지 목록
  - 공지 작성/수정 폼
  - 공개 범위, 상단 고정, 긴급 표시
- 효과:
  - 대회별 공지 운영이 가능해진다.
- ZOJ 상태:
  - API 함수는 있음. 페이지는 없음.

### 13. 운영자 스태프 관리

- demo 위치:
  - route: `/operator/contests/:contestId/staff`
  - `OperatorStaffPage`: 약 5092라인
- 연계 API:
  - `GET /operator/contests/:contestId/operators`
  - `POST /operator/contests/:contestId/operators`
  - `PATCH /operator/contests/:contestId/operators/:email`
  - `DELETE /operator/contests/:contestId/operators/:email`
- 관련 UI:
  - 운영자 목록
  - 권한 scope 선택
  - 운영자 추가/수정/삭제
- 효과:
  - 대회 운영 권한을 분산 관리할 수 있다.
- ZOJ 상태:
  - 아직 페이지 없음. 세션/권한 구조 정리 후 가져오는 것이 좋다.

### 14. 참가팀/팀원 관리

- demo 위치:
  - route: `/operator/contests/:contestId/participants`
  - `OperatorParticipantsPage`: 약 5231라인
- 연계 API:
  - `GET /operator/contests/:contestId/participants`
  - `POST /operator/contests/:contestId/participants`
  - `PATCH /operator/contests/:contestId/participants/:teamId`
  - `POST /operator/contests/:contestId/participants:bulk-create`
  - 팀원 create/update/session revoke API
- 관련 UI:
  - 참가팀 목록
  - 팀/팀원 편집 폼
  - CSV/Excel bulk import
  - 세션 revoke 버튼
- 효과:
  - 운영자가 참가팀을 직접 등록하고 세션을 관리할 수 있다.
- ZOJ 상태:
  - bulk import parser와 API 타입 일부 있음. 페이지는 없음.

### 15. 운영자 문제/테스트케이스/패키지 관리

- demo 위치:
  - route: `/operator/contests/:contestId/problems`
  - `OperatorProblemsPage`: 약 5655라인
- 연계 API:
  - 문제 CRUD
  - 문제 assets upload/delete
  - testcase set CRUD
  - testcase CRUD
  - verified testcase set 생성
  - zip testcase import
  - package build
  - Polygon import
- 관련 UI:
  - 문제 목록/편집 폼
  - Markdown 문제 편집
  - assets 목록
  - 테스트케이스 업로드/매칭
  - package support file 상태
  - Polygon import 폼
- 효과:
  - 문제 출제부터 테스트케이스 검증까지 운영자 UI에서 처리할 수 있다.
- ZOJ 상태:
  - API와 helper는 많이 들어와 있음. UI는 없음.
- 가져올 때 주의:
  - 가장 큰 기능 묶음이다. `problemManagement` 도메인 아래 API/타입을 먼저 최신화하고 페이지를 분할해야 한다.

## 관리자 화면 미반영 항목

### 16. 서비스 관리자 홈/대회 생성/서비스 공지 관리

- demo 위치:
  - route: `/admin`, `/admin/contests`
  - `AdminPage`: 약 7286라인
- 연계 API:
  - `GET /admin/dashboard`
  - `GET /admin/contests`
  - `POST /admin/contests`
  - `GET /admin/service-notices`
  - `POST /admin/service-notices`
- 관련 UI:
  - 관리자 지표
  - 대회 생성 폼
  - 서비스 공지 작성
- 효과:
  - 서비스 관리자가 대회와 전역 공지를 관리할 수 있다.
- ZOJ 상태:
  - 공지 API 함수는 있음. 관리자 페이지 없음.

### 17. 관리자 judge 대시보드/제출 상세

- demo 위치:
  - route: `/admin/judge`
  - `AdminPage` 내부 judge 탭: 약 7381라인 이후
- 연계 API:
  - `GET /admin/judge/dashboard`
  - `GET /admin/judge/submissions/:submissionId`
  - 재채점 관련 operator/admin API
- 관련 UI:
  - judge node 목록
  - queue 목록
  - 제출 상세
  - 실패 testcase 정보
- 효과:
  - 서비스 전체 채점 인프라와 제출 문제를 관리자 관점에서 진단할 수 있다.
- ZOJ 상태:
  - 공개 judge status 페이지만 있음. 관리자 judge UI 없음.

## 공통 UI/헬퍼 미반영 항목

### 18. 데모 공통 UI 컴포넌트

- demo 위치:
  - `PageHeader`: 약 7797라인
  - `PageNotice`: 약 7807라인
  - `Segmented`: 약 8028라인
  - `ProblemSolveBadge`: 약 8080라인
  - `ResultCell`: 약 8062라인
- ZOJ 상태:
  - `PageNotice`는 별도 컴포넌트로 있음.
  - `Segmented`, `ProblemSolveBadge`, `ResultCell`은 아직 없음.
- 가져올 기준:
  - 단독 UI로 먼저 가져오기보다는 사용하는 페이지를 만들 때 함께 도입한다.
  - `Segmented`는 division 필터가 여러 페이지에서 반복되므로 공통화 후보.
  - `ProblemSolveBadge`는 문제집/문제 상세 구현 시 필요.
  - `ResultCell`은 스코어보드 구현 시 필요.

### 19. 서비스 상단바/라우팅 구조

- demo 위치:
  - `type Page`: 약 38라인
  - route parser: 약 702라인
  - `ServiceTopBar`: 약 2105라인
- ZOJ 상태:
  - React Router 기반의 `routeConfig.ts`로 대체 중.
- 가져올 기준:
  - demo의 route parser는 그대로 가져오지 않는다.
  - URL 구조와 navigation label만 참고하고, ZOJ에서는 `src/routes/routeConfig.ts`에 페이지 단위로 추가한다.

## API 엔드포인트 목록 중 ZOJ 페이지가 아직 없는 것

### 참가자/대회

- `POST /auth/general/otp/request`
- `POST /auth/general/otp/verify`
- `GET /auth/general/me`
- `POST /auth/general/contests/:contestId/participant-session`
- `GET /public/contests/:contestId`
- `GET /contests/:contestId/problems`
- `GET /contests/:contestId/divisions/:divisionId/problems`
- `GET /contests/:contestId/problems/:problemId`
- `POST /contests/:contestId/problems/:problemId/submissions`
- `GET /contests/:contestId/submissions`
- `GET /contests/:contestId/submissions/:submissionId`
- `GET /contests/:contestId/scoreboard`
- `GET /contests/:contestId/divisions/:divisionId/scoreboard`
- `GET /contests/:contestId/notices`
- `GET /contests/:contestId/boards`
- `POST /contests/:contestId/boards`

### 운영자

- `GET /operator/contests`
- `GET /operator/contests/:contestId/dashboard`
- `PATCH /operator/contests/:contestId/settings`
- `GET/POST/PATCH/DELETE /operator/contests/:contestId/operators`
- `GET/POST/PATCH /operator/contests/:contestId/participants`
- `POST /operator/contests/:contestId/participants:bulk-create`
- `POST /operator/contests/:contestId/participants/:teamId/members`
- `PATCH /operator/contests/:contestId/participants/:teamId/members/:memberId`
- `POST /operator/contests/:contestId/participants/:teamId/members/:memberId/sessions:revoke`
- `GET/POST/PATCH /operator/contests/:contestId/problems`
- `GET/POST/DELETE /operator/contests/:contestId/problems/:problemId/assets`
- `GET/POST/PATCH/DELETE /operator/contests/:contestId/problems/:problemId/testcase-sets`
- `POST /operator/contests/:contestId/problems/:problemId/verified-testcase-sets`
- `POST /operator/contests/:contestId/problems/:problemId/verified-testcase-sets:zip`
- `POST /operator/contests/:contestId/problems/:problemId/package-builds`
- `POST /operator/contests/:contestId/problems/import-polygon`
- `GET /operator/contests/:contestId/scoreboard/internal`
- `GET /operator/contests/:contestId/divisions/:divisionId/scoreboard/internal`
- `GET/POST/PATCH /operator/contests/:contestId/notices`
- `POST /operator/contests/:contestId/boards/:questionId/answers`

### 관리자

- `GET /admin/dashboard`
- `GET /admin/contests`
- `POST /admin/contests`
- `GET /admin/service-notices`
- `POST /admin/service-notices`
- `GET /admin/judge/dashboard`
- `GET /admin/judge/submissions/:submissionId`

## 다음에 가져올 때 권장 순서

1. 타입 최신화
   - `Problem.max_score` optional
   - `Problem.solve_status`, `solved_team_count`, `total_team_count`
   - `Submission.source_code_length`
   - `ScoreboardRow`, `ScoreboardProblemScore`를 demo 최신 스키마로 변경
   - `AdminJudgeSubmissionEntry.problem.max_score` optional 또는 제거

2. 세션/로그인 도메인 정리
   - password OTP/login-method 유지 여부를 백엔드와 확인
   - demo처럼 일반 세션 기반 운영자 권한 병합을 적용할지 결정
   - `mapGeneralSession`, `canAttemptAutoRefresh`, `refreshStaffAccessToken` 조정

3. 참가자 대회 흐름 구현
   - 대회 상세
   - 문제집
   - 문제 상세/제출
   - 제출 현황
   - 스코어보드
   - 게시판

4. 운영자 기능 구현
   - 운영자 대시보드
   - 참가팀 관리
   - 문제 관리
   - 공지/게시판 관리
   - 스코어보드/채점현황

5. 관리자 기능 구현
   - 서비스 관리자 홈
   - 대회 생성
   - 서비스 공지 관리
   - judge 대시보드

## 가져오기 판단 메모

- demo는 단일 `main.tsx`에 모든 기능이 들어 있으므로 그대로 복사하지 말고 ZOJ의 현재 구조에 맞춰 `domains`, `pages`, `components`, `shared`로 분리한다.
- UI 요소는 페이지 구현 시 같이 가져오고, API/type/status 유틸은 먼저 가져와도 부작용이 적다.
- 현재 ZOJ는 공개 페이지 중심으로 정리된 상태다. 운영자/관리자 기능은 세션 구조가 먼저 안정되어야 한다.
- demo 최신 변경은 백엔드 계약 변화가 섞여 있다. 특히 로그인과 문제/스코어보드 타입은 UI보다 먼저 확인해야 한다.
