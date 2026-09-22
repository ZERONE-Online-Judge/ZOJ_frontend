import type { StaffAccount } from '@/domains/identityAccess/types';

export const CONTEST_ROLES = [
  {
    value: 'master',
    label: '대회 마스터',
    description:
      '이 대회의 모든 권한을 가집니다. 다른 역할과 함께 선택할 수 없습니다.',
  },
  {
    value: 'settings_manager',
    label: '대회 운영진 · 대회 설정 관리',
    description: '대회 정보, 일정, 공개 범위와 참가 유형을 관리합니다.',
  },
  {
    value: 'participants_manager',
    label: '대회 운영진 · 참가자 관리',
    description: '참가팀을 등록·수정·제거하고 참가자 접속 기록을 확인합니다.',
  },
  {
    value: 'posts_manager',
    label: '대회 운영진 · 게시글 관리',
    description: '공지와 게시판을 관리하고 질문에 답변합니다.',
  },
  {
    value: 'staff_manager',
    label: '대회 운영진 · 운영자 관리',
    description:
      '운영진의 이름과 역할을 관리합니다. 마스터 권한은 부여할 수 없습니다.',
  },
  {
    value: 'submissions_viewer',
    label: '대회 운영진 · 제출 확인',
    description: '참가팀의 제출, 소스 코드와 채점 결과를 확인합니다.',
  },
  {
    value: 'scoreboard_viewer',
    label: '대회 운영진 · 스코어보드 확인',
    description: '스코어보드와 프레젠테이션을 조회합니다.',
  },
  {
    value: 'scoreboard_manager',
    label: '대회 운영진 · 스코어보드 관리',
    description: '스코어보드 상태를 관리하고 프레젠테이션의 순위를 공개합니다.',
  },
  {
    value: 'problem_author',
    label: '출제진',
    description:
      '문제 추가·수정, 테스트케이스와 채점 파일을 관리하고 검증 코드를 채점합니다.',
  },
  {
    value: 'problem_reviewer',
    label: '검수진',
    description: '문제 모아보기에서 문제를 풀고 자신의 검수 코드를 제출합니다.',
  },
] as const;

export type ContestRole = (typeof CONTEST_ROLES)[number]['value'];

const roleScopes: Record<Exclude<ContestRole, 'master'>, string> = {
  settings_manager: 'contest.settings.manage',
  participants_manager: 'contest.participant.manage',
  posts_manager: 'contest.notice.manage',
  staff_manager: 'contest.staff.manage',
  submissions_viewer: 'contest.submission.view',
  scoreboard_viewer: 'contest.scoreboard.view',
  scoreboard_manager: 'contest.scoreboard.manage',
  problem_author: 'contest.problem.manage',
  problem_reviewer: 'contest.problem.review',
};

export function contestRolesForAccount(
  account: StaffAccount,
  contestId: string,
): ContestRole[] {
  const configured = account.contest_roles?.[contestId];
  if (configured) return configured;
  const scopes = account.contest_scopes[contestId] ?? [];
  if (scopes.some((scope) => ['*', 'master', 'contest.*'].includes(scope)))
    return ['master'];
  return CONTEST_ROLES.flatMap(({ value }) => {
    if (value === 'master' || !scopes.includes(roleScopes[value])) return [];
    if (
      value === 'scoreboard_viewer' &&
      scopes.includes(roleScopes.scoreboard_manager)
    )
      return [];
    if (
      value === 'problem_reviewer' &&
      scopes.includes(roleScopes.problem_author)
    )
      return [];
    return [value];
  });
}

export function isAssignedContestMaster(
  account: StaffAccount,
  contestId: string,
) {
  return account.protected_master_contests?.includes(contestId) ?? false;
}
