# demo-frontend 반영 현황

갱신일: 2026-05-16

기준 소스: `C:\GITHUB\demo-frontend`

기준 커밋: `c94d40c chore: 스코어보드 총 시간 표시`

이 문서는 demo prototype에서 확인한 기능이 현재 `ZOJ_frontend`에 어떻게 흡수됐는지 추적한다. 전체 현황과 우선순위는 `docs/README.md`를 먼저 본다.

## 반영 완료

| demo 흐름                                                   | 현재 반영                                                                         |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 공개 메인, 대회 목록, 공지, 채점 상태, 지원 안내            | `src/pages/public/*`, `src/pages/main/MainPage.tsx`                               |
| 대회 전용 헤더와 개요/문제집/채점현황/스코어보드/게시판 탭  | `src/components/layout/ContestHeader.tsx`, `src/pages/contest/*`                  |
| 문제 상세의 문제+제출 / 문제 / 코드 제출 탭                 | `src/pages/contest/ContestProblemDetailPage.tsx`                                  |
| Markdown/LaTeX 문제 렌더링                                  | `src/shared/ui/MarkdownPreview.tsx`                                               |
| 제출 시간/메모리 표시                                       | `src/components/contest/submissions/ContestSubmissionsTable.tsx`                  |
| 제출 상태 배지와 진행률 표시                                | `src/components/contest/submissions/*`, `src/shared/ui/SubmissionStatusBadge.tsx` |
| 스코어보드 총시간/시도 분리                                 | `src/components/contest/scoreboard/ContestScoreboardTable.tsx`                    |
| 한 번에 정답/오답 후 정답/실패 셀 표시                      | `src/components/contest/scoreboard/ContestScoreboardProblemCell.tsx`              |
| 관리자 대시보드, 대회 관리, 채점 관리                       | `src/pages/admin/*`, `src/components/admin/AdminShell.tsx`                        |
| 운영자 대시보드, 설정, 공지, 참가팀, 문제, 제출, 스코어보드 | `src/pages/operator/*`, `src/components/operator/OperatorShell.tsx`               |
| 공지와 실시간성 화면의 주기 갱신                            | 각 page query의 `refetchInterval`, `useDocumentVisibility`                        |

## 이번 점검에서 추가 반영

| 항목                    | 내용                                                                |
| ----------------------- | ------------------------------------------------------------------- |
| 운영자 권한 gate        | contest scope/permission helper를 추가하고 운영자 route와 탭에 적용 |
| 문제 리소스 업로드      | 운영자 문제 관리에서 본문 이미지 업로드 연결                        |
| ZIP 테스트케이스 업로드 | 운영자 문제 관리에서 ZIP testcase set 생성 API 연결                 |
| 문제 폼 검증            | 시간/메모리/배점/정렬 순서의 최소 숫자 검증 추가                    |
| 헤더 반응형             | 관리자/운영자 버튼 증가 시 작은 화면에서 nav가 줄바꿈되도록 보완    |
| SVG XSS 확장점 제거     | `SvgIcon`의 임의 `markup` 입력 제거                                 |

## 아직 남은 demo/docs 차이

| 우선순위 | 차이                                                                   | 현재 판단                                          |
| -------- | ---------------------------------------------------------------------- | -------------------------------------------------- |
| 높음     | 문제 관리의 개별 테스트케이스 편집, active set 전환, Polygon import UI | API는 일부 있으나 UI가 부족함                      |
| 높음     | 대회 게시판 질문 작성/답변/공개 범위 변경                              | 참가자 페이지는 읽기 중심, 운영자 질문 관리도 미흡 |
| 중간     | 운영자 스코어보드 freeze/unfreeze/finalize/score adjustment            | 목록 조회는 있으나 운영 액션 UI는 부족             |
| 중간     | 서비스 매니저 권한 세분화                                              | 현재 관리자 화면은 서비스 마스터 중심              |
| 중간     | long polling 정책 통합                                                 | 일부 wait API는 있으나 화면별 구현이 흩어져 있음   |

## 적용 원칙

- demo의 단일 파일 구현은 그대로 복사하지 않는다.
- 실제 구현은 `domains`, `pages`, `components`, `shared` 구조에 맞춰 흡수한다.
- `C:\GITHUB\docs`의 권한/운영 정책이 demo보다 우선한다.
- 이미 현재 프로젝트에 더 나은 구조로 반영된 기능은 다시 가져오지 않는다.
