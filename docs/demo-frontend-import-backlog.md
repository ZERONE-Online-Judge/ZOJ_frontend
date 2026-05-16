# demo-frontend 반영 현황 및 잔여 백로그

기준 소스: `C:\GITHUB\demo-frontend`

기준 커밋: `c94d40c chore: 스코어보드 총 시간 표시`

갱신일: 2026-05-16

이 문서는 `demo-frontend`에서 가져와야 할 기능과 현재 `ZOJ_frontend`의 반영 상태를 정리한다. 예전 문서에는 이미 구현된 항목과 미구현 항목이 섞여 있었고 일부 한글이 깨져 있었으므로, 현재 프로젝트 진행 상황 기준으로 다시 정리했다.

## 0. 검토 기준과 문서 상태

2026-05-15 재검토 결과:

- `C:\GITHUB\demo-frontend` 워킹트리는 clean 상태다.
- 최신 커밋은 `c94d40c chore: 스코어보드 총 시간 표시`다.
- 이 문서는 demo 변경이 ZOJ에 적용됐는지, 아직 안 가져온 것이 무엇인지 추적하는 문서다.
- 프로젝트 품질 리뷰 이슈는 별도 문서 `docs/project-issue-review.md`에 정리한다.

## 1. demo 최근 변경 반영 현황

최근 커밋 기준으로 확인한 반영 상태는 아래와 같다.

| 커밋                                                          | 내용                                                                                                                                   | ZOJ 반영 판단                                                                                                                                   |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `c94d40c chore: 스코어보드 총 시간 표시`                      | 스코어보드에 `총시간(min)` 컬럼을 항상 표시하고 `submission_count`를 `시도`로 분리                                                     | 반영. ZOJ도 `총시간(min)`과 `시도`를 분리 표시함                                                                                                |
| `75d068b chore: 채점시 메모리, 런타임 계산 및 표시`           | 제출 타입에 `runtime_ms`, `memory_kb` 추가, 제출 목록에 시간/메모리 컬럼 표시                                                          | 반영. ZOJ 채점 현황 테이블에서 `runtime_ms`, `memory_kb`와 호환 필드까지 방어적으로 표시함                                                      |
| `35c6656 공지 자동 갱신 추가. 테스트케이스 수 비공개`         | 공개 공지/대회 정보 refresh, 대회 공지 관리, 스코어보드 타입 보강, 제출 진행률 필드 추가, 운영자 문제 화면의 테스트케이스 수 노출 축소 | 공개 공지/대회/대회 공지 refresh는 일부 반영됨. 운영자 문제 화면은 아직 없으므로 테스트케이스 수 비공개 정책은 향후 운영자 UI 구현 시 반영 필요 |
| `c3dd346 chore: 운영자 화면 문제집에 팀 수 표시`              | 운영자 문제 목록에서 해결 팀 수/전체 팀 수를 표시                                                                                      | 미반영. ZOJ에 운영자 문제 관리 화면이 아직 없음                                                                                                 |
| `6532ffa fix: 스코어보드 전체 유형 제거`                      | 스코어보드 division 전체 선택 제거                                                                                                     | 참가자 화면 기준 영향 작음. ZOJ 참가자 스코어보드는 현재 참가 세션 division 중심이며 운영자 division UI는 아직 없음                             |
| `9b84fea fix: 운영자 스코어보드/채점현황 유형 선택 버그 수정` | 운영자 화면의 division 선택 흐름 수정                                                                                                  | 미반영/비해당. ZOJ 운영자 스코어보드/채점현황 페이지가 아직 없음                                                                                |
| `8187872 fix: 운영자 세션 대기 버그 수정`                     | 운영자 세션 로딩/대기 상태 보정                                                                                                        | 부분 반영. ZOJ는 session sync와 일반 세션 내부 operatorSession 구조를 갖췄고, 관리자 페이지는 `AdminAccessGate`로 권한 gate를 적용함            |
| `50bd6d9 chore: 한 번에 정답 아이콘 변경`                     | 스코어보드에서 한 번에 맞힌 문제 표시를 아이콘/체크 형태로 변경                                                                        | 반영. 한 번에 정답은 체크, 오답 후 정답은 `+n`, 실패는 `-n`으로 표시함                                                                          |
| `cda0096 chore: 서비스 마스터 토큰 병합`                      | service master/staff 토큰 흐름 정리                                                                                                    | 부분 반영. `is_service_master`, `operatorSession` 저장/refresh 구조와 서비스 마스터용 관리자 콘솔, 대회 관리, 채점 관리 화면이 반영됨           |
| `3f28b37 fix: 스코어보드 한번에 해결한 문제 표시 수정`        | 스코어보드 정답 셀 표시 보정                                                                                                           | 반영. `ContestScoreboardProblemCell`의 solved 표시 규칙을 demo 최신 흐름에 맞춤                                                                 |

## 2. 현재 반영 완료된 내용

| 영역                     | 현재 상태                                                                                                   | 주요 파일                                                                                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 공통 공개 페이지         | 공지사항, 대회 목록, 채점 상태, 지원 안내 페이지가 라우트와 API 모듈, 공통 `PageLayout`으로 구성되어 있음   | `src/pages/public/*`, `src/components/common/PageLayout.tsx`, `src/domains/serviceCommunication/*`, `src/domains/auditMonitoring/*`                                              |
| 공개/대회 공지 자동 갱신 | 공개 공지, 메인 페이지 공지, 대회 게시판 공지는 TanStack Query `refetchInterval`로 주기 갱신됨              | `src/pages/public/NoticesPage.tsx`, `src/pages/main/MainPage.tsx`, `src/pages/contest/ContestBoardPage.tsx`                                                                      |
| 로그인 안내              | 대회 참가자가 이해하기 쉬운 유의사항과 계정 관련 안내 문구로 정리됨                                         | `src/pages/auth/LoginPage.tsx`                                                                                                                                                   |
| 헤더 구조                | 일반 헤더와 대회 헤더의 중복 구현을 `HeaderShell`, `HeaderAuthControls`로 통합함                            | `src/components/layout/HeaderShell.tsx`, `src/components/layout/HeaderAuthControls.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/ContestHeader.tsx`           |
| 대회 전용 레이아웃       | 대회 페이지는 전용 헤더와 공통 페이지 폭을 사용하는 구조로 정리됨                                           | `src/components/contest/ContestPageShell.tsx`, `src/components/layout/ContestHeader.tsx`                                                                                         |
| 대회 개요                | 대회명, division, 참가자/팀/남은 시간 카드 구성 반영                                                        | `src/pages/contest/ContestOverviewPage.tsx`                                                                                                                                      |
| 문제집                   | 대회 문제 목록, 상태 배지, 제한 시간/메모리/배점 테이블 구성 반영                                           | `src/pages/contest/ContestProblemsPage.tsx`                                                                                                                                      |
| 문제 상세/제출           | 문제+제출, 문제, 코드 제출 탭으로 분리하고 Markdown/LaTeX 렌더링과 Monaco 제출창을 적용함                   | `src/pages/contest/ContestProblemDetailPage.tsx`, `src/components/contest/problem/*`, `src/shared/ui/MarkdownPreview.tsx`, `src/shared/ui/CodeEditor.tsx`                        |
| 채점 현황                | 제출 목록, 결과 상태 디자인, 문제 번호/언어 클릭 이동, 제출 코드 재표시, 런타임/메모리 표시 흐름을 반영함   | `src/pages/contest/ContestSubmissionsPage.tsx`, `src/components/contest/submissions/*`, `src/domains/submissionScoreboard/types.ts`                                              |
| 스코어보드               | 대회 스코어보드 화면과 기본 테이블 UI가 구현되고, demo 최신 총시간/시도 분리와 체크 아이콘 표시가 반영됨    | `src/pages/contest/ContestScoreboardPage.tsx`, `src/components/contest/scoreboard/*`                                                                                             |
| 게시판                   | 대회 게시판 읽기 흐름이 연결됨                                                                              | `src/pages/contest/ContestBoardPage.tsx`                                                                                                                                         |
| 인증/세션 보완           | 세션 저장소를 `sessionStorage` 중심으로 변경하고, 탭 간 세션 동기화와 로그아웃 시 Query Cache 정리를 추가함 | `src/domains/identityAccess/*`, `src/app/providers/SessionSyncProvider.tsx`, `src/app/providers/AppProviders.tsx`                                                                |
| 대회 참가 세션           | 대회 참가자 세션 조회 hook과 query key factory를 추가함                                                     | `src/domains/contestRuntime/*`                                                                                                                                                   |
| 라우팅 안전장치          | 알 수 없는 경로용 404 페이지를 추가함                                                                       | `src/pages/public/NotFoundPage.tsx`, `src/routes/routeConfig.ts`                                                                                                                 |
| 관리자 콘솔              | 서비스 마스터 전용 대시보드, 서비스 공지 발행, 대회 생성/운영자 배정, 채점 노드/큐/제출 상세 확인을 추가함  | `src/pages/admin/*`, `src/components/admin/AdminShell.tsx`, `src/domains/auditMonitoring/*`, `src/domains/contestAdministration/*`, `src/domains/serviceCommunication/*`         |
| 운영자 콘솔              | 대회 운영자용 대시보드, 설정/유형/운영자, 공지, 참가팀, 문제, 제출, 스코어보드 화면을 추가함                | `src/pages/operator/*`, `src/components/operator/OperatorShell.tsx`, `src/domains/contestAdministration/*`, `src/domains/problemManagement/*`, `src/domains/teamParticipation/*` |

## 3. demo 최신 변경 기준 추가 확인 필요

### 스코어보드 총 시간 표시

- demo 최신 커밋 `c94d40c`는 스코어보드에 `총시간(min)` 개념을 명시하는 변경이다.
- ZOJ는 `총시간(min)`을 `row.penalty ?? row.score`, `시도`를 `row.submission_count`로 분리 표시하도록 반영했다.

### 스코어보드 응답 타입 정합성

- demo 쪽 스코어보드는 `last_solved_at`, problem별 `penalty`, `attempts` 중심 구조를 사용한다.
- ZOJ 쪽 타입은 호환성을 위해 `score`, `max_score`, `last_improved_at` 같은 과거 필드도 유지하면서 demo의 `last_solved_at`, problem별 `solved_at`, `penalty` 필드를 추가했다.
- 장기적으로는 실제 백엔드 응답에서 과거 필드가 사라지는지 확인한 뒤 타입을 더 좁히는 것이 좋다.

### 스코어보드 결과 셀 표시

- demo 최신 흐름은 제출 없음은 빈칸, 오답은 `-n`, 한 번에 정답은 체크 표시, 오답 후 정답은 `+n`에 가깝다.
- ZOJ 현재 구현은 한 번에 정답을 체크 표시, 오답 후 정답을 `+n`, 실패를 `-n`으로 표시한다.
- 관련 파일: `src/components/contest/scoreboard/ContestScoreboardProblemCell.tsx`

### 제출 런타임/메모리 표시

- demo 최신 커밋 `75d068b`는 제출 응답의 `runtime_ms`, `memory_kb`를 채점 현황에 표시한다.
- ZOJ는 `Submission` 타입에 `runtime_ms`, `memory_kb`를 포함하고, `time_ms`, `execution_time_ms`, `memory_usage_kb`, `max_memory_kb` 같은 호환 필드도 같이 처리한다.
- 따라서 이 항목은 참가자 채점 현황 기준으로는 반영 완료로 본다. 운영자/관리자 제출 화면이 들어올 때 같은 표시 규칙을 재사용하면 된다.

### 관리자 화면 반영 현황

- demo의 `AdminPage`에서 확인한 관리자 핵심 기능 중 ZOJ에 이미 API 모듈이 존재하던 부분을 현재 구조에 맞춰 페이지로 조립했다.
- 반영된 기능은 `/admin` 서비스 마스터 대시보드, 서비스 공지 발행, `/admin/contests` 대회 생성 및 운영자 배정, `/admin/judge` 채점 노드/큐/최근 제출/소스 상세 확인이다.
- 관리자 진입은 일반 헤더의 로그인 영역에 서비스 마스터 계정일 때만 `관리자` 버튼으로 표시한다.
- UI는 기존 `PageLayout`, 테이블, rounded border, 굵은 폰트 흐름을 유지하되 관리자 전용 요소는 violet/amber 계열과 아이콘을 추가해 참가자 화면과 구분했다.
- 아직 서비스 매니저별 권한 세분화 화면은 반영하지 않았다.

### 운영자 화면 반영 현황

- demo의 운영자 화면 중 현재 ZOJ API 모듈로 안전하게 조립 가능한 기능을 `/operator` 하위 route로 추가했다.
- 반영된 기능은 `/operator` 운영 대회 선택 및 대시보드, `/operator/contests/:contestId/settings` 대회 설정/참가 유형/운영자 관리, `/notices` 대회 공지/긴급 문구, `/participants` 참가팀 등록/일괄 등록/세션 해제, `/problems` 문제 CRUD/Markdown+LaTeX 미리보기/패키지 상태, `/submissions` 운영자 제출 목록과 wait 보조 갱신, `/scoreboard` 운영자 live 스코어보드다.
- 운영자 진입은 일반 헤더 로그인 영역에 `operatorSession`이 있을 때 `운영자` 버튼으로 표시한다.
- 운영자 UI는 기존 디자인 결을 유지하되 관리자 화면과 구분되도록 indigo/cyan 계열 accent와 아이콘을 사용한다.
- 문제 관리의 파일 업로드, ZIP 테스트케이스 import, Polygon import, 세부 테스트케이스 편집은 API는 존재하지만 이번 UI에서는 기본 패키지 상태/빌드 확인 중심으로 제한했다. 이 부분은 실제 출제 운영 흐름을 보며 별도 고도화가 필요하다.

### 갱신 방식

- demo에는 대회 스코어보드/제출 현황 계열에서 `wait_seconds` 기반 long polling 패턴이 있다.
- ZOJ API 모듈에는 `waitSubmissionStatus`, `waitOperatorSubmissionStatus`, `waitAdminJudgeSubmissionStatus` 같은 wait API 함수가 이미 일부 존재한다.
- 관리자 채점 화면은 목록 polling에 더해 pending 제출에 대해 `waitAdminJudgeSubmissionStatus`를 보조로 호출해 완료 직후 목록과 상세를 invalidate한다.
- 참가자 화면의 목록 갱신은 아직 TanStack Query `refetchInterval` 기반 단순 polling 위주다.
- 실시간성이 필요한 화면은 스코어보드, 채점 현황, 공개 채점 상태 정도이며, 이 셋은 서버 부하와 UX를 고려해 조건부 polling 또는 long polling으로 정리할 가치가 있다.

### 공지 자동 갱신과 테스트케이스 수 비공개

- demo 최신 커밋 `35c6656`의 공지 자동 갱신 성격은 ZOJ의 공개 공지/메인 공지/대회 게시판 query interval로 상당 부분 반영되어 있다.
- 같은 커밋의 “테스트케이스 수 비공개”는 운영자 문제 관리 UI가 아직 없어서 현재 화면 영향은 없다.
- 향후 운영자 문제 관리 화면을 만들 때 `ProblemPackageStatus.active_testcase_count`, `testcase_set_count` 같은 필드를 운영자에게 어느 수준까지 보여줄지 다시 결정해야 한다.

## 4. 아직 남은 주요 백로그

| 우선순위 | 항목                                                    | 이유                                                                                                                      | 추천 위치                                                                                     |
| -------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 높음     | 참가자 제출/스코어보드 long polling 또는 조건부 polling | 채점 결과와 순위는 실시간성이 높고, 단순 고정 polling은 서버 부하가 커질 수 있음                                          | `src/pages/contest/ContestSubmissionsPage.tsx`, `src/pages/contest/ContestScoreboardPage.tsx` |
| 높음     | refresh token의 httpOnly cookie 전환                    | 프론트 저장소 보완은 했지만, 실제 보안 완성은 백엔드 쿠키 기반 refresh 구조가 필요함                                      | `src/shared/api/client.ts`, 백엔드 인증 API                                                   |
| 중간     | 대회 게시판 작성/수정/답변 흐름                         | 현재는 읽기 중심이며 실제 대회 운영에는 공지/질문 흐름이 필요함                                                           | `src/pages/contest/ContestBoardPage.tsx`, `src/domains/contestRuntime/api.ts`                 |
| 중간     | 운영자 고급 문제 패키지 관리                            | 기본 문제 CRUD와 패키지 상태는 추가됐지만 파일 업로드, ZIP import, Polygon import, 테스트케이스 상세 편집은 아직 제한적임 | `src/pages/operator/OperatorProblemsPage.tsx`, `src/domains/problemManagement/*`              |
| 중간     | 관리자 권한 세분화                                      | 현재 관리자 화면은 `is_service_master` 기준으로만 열리며, 서비스 매니저 권한별 화면 분기는 아직 없음                      | `src/components/admin/AdminShell.tsx`, 권한/스코프 타입                                       |
| 중간     | 운영자 문제 관리의 테스트케이스 수 노출 정책            | demo는 테스트케이스 수를 덜 드러내는 방향으로 바뀌었고, ZOJ는 운영자 UI 구현 시 같은 정책 결정이 필요함                   | `src/domains/problemManagement/types.ts`, 향후 운영자 문제 관리 페이지                        |
| 중간     | 대회 헤더 모바일 대응                                   | 중복 구현은 제거했지만, 현재 헤더는 데스크톱 폭 중심이라 작은 화면에서 추가 점검이 필요함                                 | `src/components/layout/HeaderShell.tsx`                                                       |
| 중간     | Monaco 에디터 chunk 분리                                | 현재 빌드에서 큰 chunk가 생길 수 있으므로 lazy loading 전략을 확인해야 함                                                 | `src/shared/ui/CodeEditor.tsx`, `vite.config.ts`                                              |
| 중간     | 공통 Table/Tab/Badge 정리                               | 대회 페이지가 늘어나면서 비슷한 UI가 반복되고 있음                                                                        | `src/components/contest/*`, `src/shared/ui/*`                                                 |
| 낮음     | 문서/코드 포맷 일괄 정리                                | 여러 차례 빠른 변경이 누적되어 포맷 차이가 생길 수 있음                                                                   | 전체                                                                                          |

## 5. 이전 리뷰의 Critical/High 처리 현황

| 이슈                                   | 처리 상태 | 비고                                                                                                                                             |
| -------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 토큰 저장소가 localStorage 중심인 문제 | 부분 해결 | 세션 저장소를 `sessionStorage` 중심으로 바꾸고 legacy localStorage 제거 로직을 추가함. refresh token 자체는 백엔드 httpOnly cookie 전환이 필요함 |
| 로그아웃 후 캐시/세션 잔존 가능성      | 해결      | 로그아웃 시 세션 store와 Query Cache를 같이 정리함                                                                                               |
| 인증 상태 탭 간 동기화 부족            | 해결      | `SessionSyncProvider`에서 storage 이벤트 기반 동기화를 담당함                                                                                    |
| 존재하지 않는 경로 처리 부족           | 해결      | 404 페이지와 catch-all route 추가                                                                                                                |
| 대회 참가 세션 조회 로직 반복          | 해결      | `useContestParticipantSession`과 query key factory 추가                                                                                          |
| 헤더 구현 중복                         | 해결      | `HeaderShell`, `HeaderAuthControls`로 일반/대회 헤더 공통화                                                                                      |
| 관리자 전용 기능 부재                  | 부분 해결 | 서비스 마스터용 관리자 콘솔, 대회 관리, 채점 관리 화면과 헤더 진입점을 추가함. 서비스 매니저 권한 세분화는 남아 있음                             |
| 운영자 전용 기능 부재                  | 부분 해결 | 운영자 대시보드, 설정, 공지, 참가팀, 문제, 제출, 스코어보드 화면과 헤더 진입점을 추가함. 문제 패키지 고급 관리와 권한 세분화는 남아 있음         |

## 6. 권장 작업 순서

1. 대회 진행 상태 기반 polling 중단 조건을 추가한다.
2. 단건 제출 상태는 이미 있는 wait API 함수와 더 강하게 연결한다.
3. 게시판 작성/수정/답변 플로우를 추가한다.
4. 운영자 문제 패키지 고급 관리 화면을 만들 때 테스트케이스 수 노출 정책을 demo 최신 흐름에 맞춰 결정한다.
5. 남은 build chunk warning을 빌드 결과 기준으로 추가 분석한다.
6. 공통 UI 컴포넌트 후보인 table, tab, badge를 현재 디자인에 맞춰 점진적으로 분리한다.
7. 서비스 매니저/운영자 scope별 세부 권한 정책을 확정한 뒤 route gate와 버튼 노출 조건을 더 좁힌다.

## 7. 메모

- 현재 ZOJ의 대회 참가자 화면은 demo의 주요 참가자 플로우를 대부분 따라왔고, 제출 런타임/메모리 표시와 공지 자동 갱신도 참가자 화면 기준으로는 상당 부분 반영되어 있다.
- 아직 demo 최신 흐름과 차이가 큰 부분은 참가자 목록 단위 long polling의 세부 정책, 운영자 문제 패키지 고급 관리 화면의 테스트케이스 수 노출 정책이다.
- 실제 서비스 출시 전에는 refresh token 저장 방식, 채점 현황/스코어보드 갱신 방식, 잘못된 contest/problem id에 대한 에러 화면을 우선 확인해야 한다.
- 이 문서는 “무조건 demo를 그대로 복사”하기 위한 문서가 아니라, ZOJ의 모듈화된 구조에 맞게 어떤 기능을 흡수할지 판단하기 위한 백로그다.
