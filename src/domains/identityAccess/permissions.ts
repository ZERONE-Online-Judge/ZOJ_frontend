import type {
  GeneralSession,
  StaffSession,
} from '@/domains/identityAccess/types';

export type ContestPermissionCode =
  | 'contest.view'
  | 'contest.update_overview'
  | 'contest.update_organization'
  | 'contest.update_rule'
  | 'contest.update_schedule'
  | 'contest.participant.view'
  | 'contest.participant.create'
  | 'contest.participant.update'
  | 'contest.participant.remove'
  | 'contest.participant.bulk_create'
  | 'contest.problem.view'
  | 'contest.problem.create'
  | 'contest.problem.update'
  | 'contest.problem.delete'
  | 'contest.problem.reorder'
  | 'contest.problem.resource.view'
  | 'contest.problem.resource.manage'
  | 'contest.testcase.view'
  | 'contest.testcase.manage'
  | 'contest.generator.view'
  | 'contest.generator.manage'
  | 'contest.submission.view'
  | 'contest.submission.source.view'
  | 'contest.scoreboard.view'
  | 'contest.scoreboard.freeze'
  | 'contest.scoreboard.unfreeze'
  | 'contest.scoreboard.setting'
  | 'contest.scoreboard.score_adjust'
  | 'contest.notice.view'
  | 'contest.notice.create'
  | 'contest.notice.update'
  | 'contest.notice.delete'
  | 'contest.notice.emergency_publish'
  | 'contest.board.question.view'
  | 'contest.board.answer.create';

type PermissionSession = GeneralSession | StaffSession | null | undefined;

function isStaffSession(session: PermissionSession): session is StaffSession {
  return Boolean(session && 'staff' in session);
}

function scopeMatches(scope: string, permission: string) {
  if (
    scope === '*' ||
    scope === 'master' ||
    scope === 'contest.*' ||
    scope === permission
  ) {
    return true;
  }

  if (scope.endsWith('.*')) {
    return permission.startsWith(scope.slice(0, -1));
  }

  return permission.startsWith(`${scope}.`);
}

export function contestScopesFor(
  session: PermissionSession,
  contestId: string,
) {
  if (!session) return [];

  const scopes = isStaffSession(session)
    ? (session.staff.contest_scopes[contestId] ?? [])
    : [
        ...(session.operatorContests.find(
          (item) => item.contest.contest_id === contestId,
        )?.scopes ?? []),
        ...(session.operatorSession?.staff.contest_scopes[contestId] ?? []),
      ];

  return Array.from(new Set(scopes.filter(Boolean)));
}

export function isServiceMaster(session: PermissionSession) {
  if (isStaffSession(session)) return session.staff.is_service_master;

  return Boolean(
    session?.operatorSession?.staff.is_service_master ||
    session?.operatorContests.some((entry) => entry.scopes.includes('master')),
  );
}

export function hasContestAccess(
  session: PermissionSession,
  contestId: string,
) {
  return (
    isServiceMaster(session) || contestScopesFor(session, contestId).length > 0
  );
}

export function hasContestPermission(
  session: PermissionSession,
  contestId: string,
  permission?: ContestPermissionCode,
) {
  if (!permission) return hasContestAccess(session, contestId);
  if (isServiceMaster(session)) return true;

  return contestScopesFor(session, contestId).some((scope) =>
    scopeMatches(scope, permission),
  );
}
