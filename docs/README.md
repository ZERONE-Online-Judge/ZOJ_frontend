# ZOJ Frontend 문서

갱신일: 2026-05-17

이 문서는 현재 프론트엔드 진행 상황과 `C:\GITHUB\demo-frontend`, `C:\GITHUB\docs`를 기준으로 확인한 반영 상태를 한곳에 묶은 작업 문서다.

## 참고 기준

- `C:\GITHUB\demo-frontend`: 단일 파일 prototype 형태의 기능 참고 소스
- `C:\GITHUB\docs`: 권한, 운영자, 대회, 서비스 관리자 요구사항 기준 문서
- `C:\GITHUB\ZOJ_frontend`: 현재 모듈화된 실제 구현 프로젝트

## 현재 구현 요약

| 영역               | 현재 상태                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 공개 페이지        | 메인, 대회 목록, 공지사항, 채점 상태, 지원 안내 구현                                                                       |
| 참가자 대회 페이지 | 개요, 문제집, 문제/제출, 채점 현황, 스코어보드, 게시판 구현                                                                |
| 인증/세션          | 일반/참가자/운영자 세션 분리, 탭 간 세션 동기화, 로그아웃 시 Query Cache 정리                                              |
| 관리자             | 서비스 마스터용 대시보드, 대회 관리, 채점 관리 구현                                                                        |
| 운영자             | 대회 선택, 설정, 공지, 게시판 답변, 참가팀, 문제, 제출, 스코어보드 구현                                                    |
| 문제 관리          | 문제 CRUD, Markdown/LaTeX 미리보기, 본문/지원 파일 업로드, ZIP/.in/.out 테스트케이스, 패키지 빌드, 운영자 테스트 제출 연결 |
| 권한               | 운영자 대회 화면은 contest scope/permission 기반 gate와 탭 필터링 적용                                                     |
| 문서               | demo 반영 현황과 출시 전 품질 리뷰를 이 docs 아래에 정리                                                                   |

## 이번 점검에서 반영한 내용

- legacy/current 기능 동등성 검증에서 Critical/High로 분류된 운영자 게시판 답변, 참가팀 관리, 문제 관리, 설정 quick action, 스코어보드 갱신 항목을 우선 반영했다.
- 운영자 게시판 답변 화면을 추가하고 `/operator/contests/:contestId/board` route와 운영자 탭에 연결했다.
- 참가팀 관리에서 팀 상태 변경, 팀 삭제, 팀원 추가/수정, 세션 revoke, division filter, CSV/TSV 파일 import를 보강했다.
- 운영자 문제 관리에서 지원 파일 역할별 업로드, `.in/.out` 묶음 업로드, testcase set 활성화/삭제, 운영자 테스트 제출을 추가했다.
- 운영자 설정에서 진행 중 운영 잠금 안내와 빠른 액션(지금 시작, 종료/프리즈 시간 조정, 종료 후 공개)을 추가했다.
- 참가자 스코어보드는 legacy `scoreboard:wait`/`divisions/:id/scoreboard:wait` endpoint를 사용하고, 운영자 스코어보드는 1초 갱신으로 맞췄다.
- 로그인한 사용자가 본인 참가 대회가 아닌 대회에 접근하지 못하도록 대회 shell과 카드/목록 링크를 차단했다.
- 긴급 공지가 화면 폭을 초과하지 않도록 contest shell의 banner overflow 처리를 보강했다.
- refresh token은 더 이상 브라우저 저장소에 persist하지 않고, refresh/logout 요청은 `credentials: include` 기반 cookie 전환을 받을 수 있게 했다.
- 운영자 화면 접근을 `operatorSession` 존재 여부만 보던 방식에서 contest scope/permission 기준으로 보강했다.
- 운영자 메뉴 탭도 권한이 없는 항목은 노출하지 않도록 필터링했다.
- 운영자 문제 관리에 본문 이미지 리소스 업로드와 ZIP 테스트케이스 업로드를 연결했다.
- 문제 생성/수정 시 시간 제한, 메모리 제한, 배점, 정렬 순서에 대한 최소 숫자 검증을 추가했다.
- 헤더가 관리자/운영자/팀명/로그아웃 버튼과 겹치지 않도록 작은 화면에서는 nav가 다음 줄로 내려가게 조정했다.
- `SvgIcon`의 외부 `markup` prop을 제거해 서버 문자열을 SVG로 직접 삽입할 수 있는 확장점을 막았다.

## 검증 상태

- `npm run typecheck`: 통과
- `npm run lint`: 통과
- `npm run build`: 통과
- 빌드 경고: Monaco/KaTeX/앱 코드가 포함된 chunk가 500kB를 넘는다. 기능에는 영향이 없지만, 이후 Monaco lazy loading 또는 route 단위 code splitting을 검토한다.

## 인증/세션 메모

- access token은 하나로 합쳐서 사용한다.
- 세션은 역할과 사용 맥락별로 분리한다.
- 프론트 기준 세션 구분은 일반 로그인 세션, 참가자 대회 세션, 운영자/관리자 세션이다.
- 같은 access token을 쓰더라도 화면 접근, 권한 판단, 선택된 참가 유형/대회 운영 권한은 각 세션 객체 기준으로 분리해서 처리한다.
- 백엔드 계약이 바뀌지 않는 한 참가자/운영자용 access token을 별도로 발급하는 구조로 보지 않는다.

## 빠진 기능

| 우선순위 | 항목                              | 이유                                                                                                                                              | 추천 위치                                                                              |
| -------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 중간     | refresh token cookie E2E 확인     | 프론트 저장소 persist는 제거했지만 백엔드 httpOnly cookie 설정과 refresh token 문자열 응답 중단 확인이 필요하다                                   | `src/shared/api/client.ts`, 백엔드 인증 API                                            |
| 중간     | 운영자 문제 관리 세부 고도화      | 지원 파일, testcase set, 테스트 제출은 연결했지만 split document, 예제 전용 편집, testcase 개별 preview/delete, Polygon import UI는 아직 부족하다 | `src/pages/operator/OperatorProblemsPage.tsx`                                          |
| 중간     | legacy URL alias                  | `/rules`, `/help`, `/contact`, `/contests/:id/login` 기존 URL 호환이 없다                                                                         | `src/routes/routeConfig.ts`                                                            |
| 중간     | 제출 상세/페이지네이션 UX         | legacy의 cursor pagination과 상세/source 확인 흐름보다 단순하다                                                                                   | `src/pages/contest/ContestSubmissionsPage.tsx`, `src/components/contest/submissions/*` |
| 중간     | 관리자 대회 편집                  | 관리자 화면에서 기존 대회 편집 흐름이 약하다                                                                                                      | `src/pages/admin/AdminContestsPage.tsx`                                                |
| 중간     | 문제 제출 상태별 guard            | contest 상태별 제출 불가 사유 표시가 legacy보다 약하다                                                                                            | `src/pages/contest/ContestProblemDetailPage.tsx`                                       |
| 중간     | 서비스 매니저 권한 세분화         | 관리자 화면은 서비스 마스터 중심이며 매니저별 global/contest scope UI가 없다                                                                      | `src/components/admin/AdminShell.tsx`, `src/pages/admin/*`                             |
| 중간     | score adjustment/finalize 운영 UI | 외부 문서에는 종료 후 점수 조정과 최종 결과 공개가 필요하다                                                                                       | `src/pages/operator/OperatorScoreboardPage.tsx`                                        |
| 중간     | polling 정책 공통 hook화          | 제출/스코어보드/채점 상태 갱신 정책이 아직 페이지별로 흩어져 있다                                                                                 | `src/shared/hooks`, `src/domains/submissionScoreboard`                                 |

## 불필요하거나 줄인 기능

| 항목                                | 처리                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `src/components/hepc` 임시 컴포넌트 | 이전 커밋에서 제거됨                                                        |
| VS Code workspace 파일              | Git 추적 제거 및 `*.code-workspace` ignore 처리됨                           |
| `SvgIcon`의 임의 markup 입력        | 제거됨. 내부 registry 아이콘만 렌더링                                       |
| demo의 단일 파일 구조               | 그대로 가져오지 않고 현재 프로젝트의 domain/component/page 구조에 맞춰 흡수 |

## 개선 가능 기능

| 항목                      | 개선 방향                                                                        |
| ------------------------- | -------------------------------------------------------------------------------- |
| 관리자/운영자 대형 페이지 | `forms`, `tables`, `panels`, `hooks` 단위로 분리                                 |
| API 에러 표시             | 참가자/공개 화면은 친화 문구, 운영자/관리자 화면은 진단 상세를 접을 수 있게 분리 |
| queryKey                  | 관리자/운영자 query key에 staff email 또는 권한 fingerprint 포함                 |
| 폼 validation             | 운영자/관리자 입력 폼에 Zod 또는 도메인 validation helper 적용                   |
| 공통 UI                   | `Button`, `TextField`, `Select`, `Panel`, `DataTable`, `StatusPill` 점진 분리    |
| 반응형 검증               | 헤더와 관리자/운영자 화면을 360/768/1280px 기준으로 스크린샷 점검                |

## 문서 구성

| 문서                                   | 역할                                            |
| -------------------------------------- | ----------------------------------------------- |
| `docs/README.md`                       | 현재 상태, 반영/누락/개선 목록의 중심 문서      |
| `docs/demo-frontend-import-backlog.md` | demo prototype에서 가져온 기능의 반영 여부 추적 |
| `docs/project-issue-review.md`         | 출시 전 품질 리뷰와 위험도별 개선 계획          |

## 다음 권장 순서

1. refresh token httpOnly cookie E2E와 백엔드 문자열 응답 중단을 확인한다.
2. legacy URL alias와 관리자 대회 편집을 보강한다.
3. 운영자 문제 관리에서 split document, 예제 전용 편집, 개별 testcase preview/delete, Polygon import UI를 추가한다.
4. 관리자/운영자 대형 페이지를 기능 단위 컴포넌트와 hook으로 나눈다.
5. 제출/스코어보드/채점 상태 갱신 정책을 공통 hook으로 정리한다.
